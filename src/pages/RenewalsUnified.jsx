import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { 
  RefreshCw, AlertTriangle, CheckCircle, Calendar, User, Phone, Mail,
  Filter, Search, TrendingUp, Clock, DollarSign, Users, Building2,
  Eye, Edit, Download, Upload, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RenewalsUnified() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [sortField, setSortField] = useState('expiry_date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Buscar usuário atual
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  // Buscar todos os certificados (fonte única de verdade)
  const { data: allCertificates = [], isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => base44.entities.Certificate.list('-expiry_date'),
    refetchInterval: 5000,
    staleTime: 0,
  });

  // CONSOLIDAÇÃO CRÍTICA: UM certificado por cliente_id (regra obrigatória)
  const consolidatedCertificates = React.useMemo(() => {
    console.log('🔍 === DIAGNÓSTICO DE DUPLICAÇÃO ===');
    console.log(`Total de certificados no banco: ${allCertificates.length}`);
    
    // Análise detalhada de duplicações
    const clientIdCounts = {};
    const certsWithoutClientId = [];
    const certsWithClientId = [];
    
    allCertificates.forEach(cert => {
      if (!cert.client_id || cert.client_id === '' || cert.client_id === null) {
        certsWithoutClientId.push(cert);
      } else {
        certsWithClientId.push(cert);
        clientIdCounts[cert.client_id] = (clientIdCounts[cert.client_id] || 0) + 1;
      }
    });
    
    console.log(`Certificados COM client_id: ${certsWithClientId.length}`);
    console.log(`Certificados SEM client_id: ${certsWithoutClientId.length}`);
    
    // Detectar duplicações
    const duplicatedClientIds = Object.entries(clientIdCounts)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);
    
    if (duplicatedClientIds.length > 0) {
      console.log(`⚠️ CLIENTES COM DUPLICAÇÃO: ${duplicatedClientIds.length}`);
      console.log('Top 10 clientes com mais certificados:');
      duplicatedClientIds.slice(0, 10).forEach(([clientId, count]) => {
        const certs = certsWithClientId.filter(c => c.client_id === clientId);
        console.log(`  Cliente ${clientId}: ${count} certificados`, certs.map(c => ({
          type: c.certificate_type,
          expiry: c.expiry_date,
          status: c.renewal_status
        })));
      });
    }
    
    // CONSOLIDAÇÃO: UM certificado por cliente
    const certsByClient = new Map();
    const today = new Date();
    
    certsWithClientId.forEach(cert => {
      // REGRA 1: Ignorar certificados já vencidos E renovados (histórico)
      if (cert.status === 'vencido' && cert.renewal_status === 'renovado') {
        return;
      }
      
      // REGRA 2: Verificar data de expiração
      if (!cert.expiry_date) {
        return;
      }
      
      const expiryDate = parseISO(cert.expiry_date);
      const existing = certsByClient.get(cert.client_id);
      
      if (!existing) {
        certsByClient.set(cert.client_id, cert);
      } else {
        const existingDate = parseISO(existing.expiry_date);
        const daysToExpiry = differenceInDays(expiryDate, today);
        const existingDaysToExpiry = differenceInDays(existingDate, today);
        
        // Prioridade 1: Certificados futuros sobre vencidos
        if (daysToExpiry >= 0 && existingDaysToExpiry < 0) {
          certsByClient.set(cert.client_id, cert);
        } else if (daysToExpiry >= 0 && existingDaysToExpiry >= 0) {
          // Ambos futuros - manter o mais próximo
          if (daysToExpiry < existingDaysToExpiry) {
            certsByClient.set(cert.client_id, cert);
          }
        } else if (daysToExpiry < 0 && existingDaysToExpiry < 0) {
          // Ambos vencidos - manter o mais recente
          if (daysToExpiry > existingDaysToExpiry) {
            certsByClient.set(cert.client_id, cert);
          }
        }
      }
    });
    
    const result = Array.from(certsByClient.values());
    console.log(`✅ RESULTADO CONSOLIDADO: ${result.length} clientes únicos`);
    console.log(`Redução: ${allCertificates.length} → ${result.length} (${Math.round((1 - result.length/allCertificates.length) * 100)}% de duplicatas removidas)`);
    console.log('🔍 === FIM DO DIAGNÓSTICO ===\n');
    
    return result;
  }, [allCertificates]);

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: ({ certId, status }) => 
      base44.entities.Certificate.update(certId, { renewal_status: status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['clients']);
    },
  });

  // Upload de arquivo
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            registros: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  produto: { type: "string" },
                  cpf: { type: "string" },
                  cnpj: { type: "string" },
                  nome: { type: "string" },
                  telefone: { type: "string" },
                  email: { type: "string" },
                  dt_emis: { type: "string" },
                  dt_fim: { type: "string" },
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const rawData = result.output.registros || result.output;
        const dataArray = Array.isArray(rawData) ? rawData : [rawData];
        
        // Processar cada registro garantindo unicidade por cliente_id
        for (const record of dataArray) {
          const cpf = String(record.cpf || '').replace(/\D/g, '');
          const cnpj = String(record.cnpj || '').replace(/\D/g, '');
          
          // Buscar cliente existente por CPF ou CNPJ
          let existingClient = null;
          if (cpf) {
            const clients = await base44.entities.Client.filter({ cpf });
            if (clients.length > 0) existingClient = clients[0];
          }
          if (!existingClient && cnpj) {
            const clients = await base44.entities.Client.filter({ cnpj });
            if (clients.length > 0) existingClient = clients[0];
          }

          // Criar ou atualizar cliente
          let client;
          if (existingClient) {
            client = existingClient;
          } else {
            client = await base44.entities.Client.create({
              client_name: record.nome || 'Sem nome',
              email: record.email || '',
              phone: record.telefone || '',
              cpf: cpf || '',
              cnpj: cnpj || '',
              lead_status: 'qualificado',
              lead_source: 'renovacao',
              funnel_stage: 'contato',
            });
          }

          // Determinar tipo de certificado
          let certType = 'e_cpf_a3';
          const produto = String(record.produto || '').toLowerCase();
          if (produto.includes('cnpj')) {
            certType = produto.includes('a1') ? 'e_cnpj_a1' : 'e_cnpj_a3';
          } else if (produto.includes('cpf')) {
            certType = produto.includes('a1') ? 'e_cpf_a1' : 'e_cpf_a3';
          }

          const formatDate = (dateStr) => {
            if (!dateStr) return null;
            const str = String(dateStr);
            if (str.includes('/')) {
              const parts = str.split('/');
              if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
            return str;
          };

          const expiryDate = formatDate(record.dt_fim);

          // Verificar se já existe certificado IDÊNTICO (mesmo cliente, tipo e data de vencimento)
          const existingCerts = await base44.entities.Certificate.filter({ client_id: client.id });
          const duplicateCert = existingCerts.find(cert => 
            cert.certificate_type === certType && 
            cert.expiry_date === expiryDate
          );
          
          if (!duplicateCert) {
            // Criar apenas se não existir duplicado
            await base44.entities.Certificate.create({
              client_id: client.id,
              client_name: record.nome || 'Sem nome',
              client_email: record.email || '',
              client_phone: record.telefone || '',
              certificate_type: certType,
              issue_date: formatDate(record.dt_emis),
              expiry_date: expiryDate,
              status: 'ativo',
              renewal_status: 'pendente',
            });
          }
        }

        queryClient.invalidateQueries(['certificates']);
        queryClient.invalidateQueries(['clients']);
        setUploadDialogOpen(false);
        alert(`Importação concluída! ${dataArray.length} registro(s) processado(s), duplicados ignorados.`);
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert('Erro ao processar arquivo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Calcular indicadores (KPIs) - baseado nos certificados consolidados
  const today = new Date();
  const kpis = React.useMemo(() => {
    const expiring7 = consolidatedCertificates.filter(cert => {
      if (!cert.expiry_date) return false;
      const days = differenceInDays(parseISO(cert.expiry_date), today);
      return days >= 0 && days <= 7;
    }).length;

    const expiring15 = consolidatedCertificates.filter(cert => {
      if (!cert.expiry_date) return false;
      const days = differenceInDays(parseISO(cert.expiry_date), today);
      return days >= 0 && days <= 15;
    }).length;

    const expiring30 = consolidatedCertificates.filter(cert => {
      if (!cert.expiry_date) return false;
      const days = differenceInDays(parseISO(cert.expiry_date), today);
      return days >= 0 && days <= 30;
    }).length;

    const inProgress = consolidatedCertificates.filter(cert => cert.renewal_status === 'em_contato').length;
    const renewed = consolidatedCertificates.filter(cert => cert.renewal_status === 'renovado').length;
    const total = consolidatedCertificates.length;
    const conversionRate = total > 0 ? ((renewed / total) * 100).toFixed(1) : '0.0';

    return { expiring7, expiring15, expiring30, inProgress, renewed, conversionRate };
  }, [consolidatedCertificates]);

  // Filtrar certificados consolidados
  const filteredCertificates = React.useMemo(() => {
    let filtered = consolidatedCertificates.filter(cert => {
      const matchesSearch = !searchTerm || 
        cert.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.client_phone?.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'all' || cert.renewal_status === statusFilter;
      const matchesType = typeFilter === 'all' || cert.certificate_type === typeFilter;
      const matchesAgent = agentFilter === 'all' || cert.assigned_agent === agentFilter;
      
      return matchesSearch && matchesStatus && matchesType && matchesAgent;
    });

    // Ordenar
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'expiry_date') {
        aVal = aVal ? parseISO(aVal).getTime() : 0;
        bVal = bVal ? parseISO(bVal).getTime() : 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [consolidatedCertificates, searchTerm, statusFilter, typeFilter, agentFilter, sortField, sortOrder]);

  // Lista de agentes únicos
  const agents = React.useMemo(() => {
    const uniqueAgents = new Set(consolidatedCertificates.map(c => c.assigned_agent).filter(Boolean));
    return Array.from(uniqueAgents);
  }, [consolidatedCertificates]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    return differenceInDays(parseISO(expiryDate), today);
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: 'bg-slate-100 text-slate-700',
      em_contato: 'bg-blue-100 text-blue-700',
      renovado: 'bg-green-100 text-green-700',
      nao_renovado: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#6B2D8B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Renovações</h1>
          <p className="text-slate-500">Gestão unificada de certificados e renovações</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
        </div>
      </div>

      {/* KPIs Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-slate-500">Vencem 7 dias</p>
                <p className="text-xl font-bold text-slate-800">{kpis.expiring7}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-slate-500">Vencem 15 dias</p>
                <p className="text-xl font-bold text-slate-800">{kpis.expiring15}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-slate-500">Vencem 30 dias</p>
                <p className="text-xl font-bold text-slate-800">{kpis.expiring30}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Em Contato</p>
                <p className="text-xl font-bold text-slate-800">{kpis.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-slate-500">Renovados</p>
                <p className="text-xl font-bold text-slate-800">{kpis.renewed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-[#6B2D8B]" />
              <div>
                <p className="text-xs text-slate-500">Taxa Conversão</p>
                <p className="text-xl font-bold text-slate-800">{kpis.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_contato">Em Contato</SelectItem>
                <SelectItem value="renovado">Renovado</SelectItem>
                <SelectItem value="nao_renovado">Não Renovado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="e_cpf_a1">e-CPF A1</SelectItem>
                <SelectItem value="e_cpf_a3">e-CPF A3</SelectItem>
                <SelectItem value="e_cnpj_a1">e-CNPJ A1</SelectItem>
                <SelectItem value="e_cnpj_a3">e-CNPJ A3</SelectItem>
              </SelectContent>
            </Select>

            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Agentes</SelectItem>
                {agents.map(agent => (
                  <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setAgentFilter('all');
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Unificada */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Certificados ({filteredCertificates.length} clientes únicos)</span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">✓ Sem Duplicatas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead 
                    className="font-semibold cursor-pointer"
                    onClick={() => toggleSort('client_name')}
                  >
                    <div className="flex items-center gap-2">
                      Cliente
                      {sortField === 'client_name' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Tipo</TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer"
                    onClick={() => toggleSort('expiry_date')}
                  >
                    <div className="flex items-center gap-2">
                      Vencimento
                      {sortField === 'expiry_date' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Agente</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.map((cert) => {
                  const daysRemaining = getDaysRemaining(cert.expiry_date);
                  const isExpired = daysRemaining !== null && daysRemaining < 0;
                  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

                  return (
                    <TableRow key={cert.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold text-sm">
                            {cert.client_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            {cert.client_id ? (
                              <Link 
                                to={createPageUrl(`ClientDetails?id=${cert.client_id}`)}
                                className="font-medium text-slate-800 hover:text-[#6B2D8B] hover:underline"
                              >
                                {cert.client_name}
                              </Link>
                            ) : (
                              <p className="font-medium text-slate-800">{cert.client_name}</p>
                            )}
                            {cert.client_email && (
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {cert.client_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cert.certificate_type?.replace('_', '-').toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-slate-800">
                            {cert.expiry_date ? format(parseISO(cert.expiry_date), 'dd/MM/yyyy') : '-'}
                          </p>
                          {daysRemaining !== null && (
                            <p className={`text-xs ${
                              isExpired ? 'text-red-600' :
                              isUrgent ? 'text-orange-600' :
                              'text-slate-500'
                            }`}>
                              {isExpired ? `Vencido há ${Math.abs(daysRemaining)} dias` :
                               daysRemaining === 0 ? 'Vence hoje' :
                               `Vence em ${daysRemaining} dias`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={cert.renewal_status || 'pendente'}
                          onValueChange={(value) => updateStatusMutation.mutate({ certId: cert.id, status: value })}
                        >
                          <SelectTrigger className={`w-36 ${getStatusColor(cert.renewal_status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="em_contato">Em Contato</SelectItem>
                            <SelectItem value="renovado">Renovado</SelectItem>
                            <SelectItem value="nao_renovado">Não Renovado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{cert.assigned_agent || '-'}</span>
                      </TableCell>
                      <TableCell>
                        {cert.client_id && (
                          <Link to={createPageUrl(`ClientDetails?id=${cert.client_id}`)}>
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Upload */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Certificados</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Importe uma planilha com os dados dos certificados. O sistema consolida automaticamente múltiplos certificados por cliente, exibindo apenas o mais próximo do vencimento.
            </p>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processando...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}