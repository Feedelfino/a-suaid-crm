import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { 
  RefreshCw, AlertCircle, Clock, TrendingUp, Search, Filter, Eye, Phone, Mail,
  CheckCircle2, XCircle, Users, Calendar, ChevronDown, ChevronUp, Trash2
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

export default function Renewals() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilters, setDateFilters] = useState([]); // Múltiplos filtros de data
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [sortField, setSortField] = useState('expiry_date');
  const [sortOrder, setSortOrder] = useState('asc');

  // Buscar certificados do banco (fonte única)
  const { data: allCertificates = [], isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => base44.entities.Certificate.list('-expiry_date'),
    staleTime: 10000,
  });

  // Buscar clientes para enriquecer dados
  const { data: allClients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    staleTime: 10000,
  });

  // 🎯 CONSOLIDAÇÃO: UM CERTIFICADO POR CLIENTE (regra obrigatória)
  const renewalsActive = useMemo(() => {
    console.log('🔍 === DIAGNÓSTICO DE RENOVAÇÕES ===');
    console.log(`Total de certificados no banco: ${allCertificates.length}`);
    console.log(`Total de clientes no banco: ${allClients.length}`);
    
    const today = new Date();
    const certsByClient = new Map();
    const certsWithoutClient = [];
    const certsRenovados = [];

    // 1️⃣ Processar certificados da entidade Certificate
    allCertificates.forEach(cert => {
      // Análise: certificados sem client_id
      if (!cert.client_id) {
        certsWithoutClient.push(cert);
        return;
      }

      // Análise: certificados já renovados (histórico)
      if (cert.renewal_status === 'renovado') {
        certsRenovados.push(cert);
        return;
      }

      // Ignorar certificados sem data de expiração
      if (!cert.expiry_date) return;

      const expiryDate = parseISO(cert.expiry_date);
      const existing = certsByClient.get(cert.client_id);

      if (!existing) {
        certsByClient.set(cert.client_id, cert);
      } else {
        const existingDate = parseISO(existing.expiry_date);
        const daysToExpiry = differenceInDays(expiryDate, today);
        const existingDaysToExpiry = differenceInDays(existingDate, today);

        if (daysToExpiry >= 0 && existingDaysToExpiry < 0) {
          certsByClient.set(cert.client_id, cert);
        } else if (daysToExpiry >= 0 && existingDaysToExpiry >= 0) {
          if (daysToExpiry < existingDaysToExpiry) {
            certsByClient.set(cert.client_id, cert);
          }
        } else if (daysToExpiry < 0 && existingDaysToExpiry < 0) {
          if (daysToExpiry > existingDaysToExpiry) {
            certsByClient.set(cert.client_id, cert);
          }
        }
      }
    });

    console.log(`❌ Certificados SEM client_id: ${certsWithoutClient.length}`);
    console.log(`✅ Certificados JÁ renovados (ignorados): ${certsRenovados.length}`);
    console.log(`📊 Certificados ATIVOS da entidade Certificate: ${certsByClient.size}`);

    // 2️⃣ Processar clientes com certificados no cadastro (has_certificate = true)
    let clientsWithCertInProfile = 0;
    allClients.forEach(client => {
      // Pular se já tem certificado na entidade Certificate
      if (certsByClient.has(client.id)) return;
      
      // Verificar se o cliente tem certificado no cadastro
      if (client.has_certificate && client.certificate_expiry_date && client.certificate_type) {
        clientsWithCertInProfile++;
        
        // Criar objeto similar ao Certificate para compatibilidade
        certsByClient.set(client.id, {
          id: `client_cert_${client.id}`,
          client_id: client.id,
          client_name: client.client_name,
          client_email: client.email,
          client_phone: client.phone || client.whatsapp,
          certificate_type: client.certificate_type,
          expiry_date: client.certificate_expiry_date,
          renewal_status: client.renewal_status || 'pendente',
          assigned_agent: client.assigned_agent,
          source: 'client_profile' // Marcador para identificar origem
        });
      }
    });

    console.log(`📋 Certificados no cadastro de clientes: ${clientsWithCertInProfile}`);
    console.log(`📊 TOTAL de certificados após consolidação: ${certsByClient.size}`);

    // Verificar clientes sem certificado
    const clientsWithCerts = new Set(Array.from(certsByClient.keys()));
    const clientsWithoutCerts = allClients.filter(c => !clientsWithCerts.has(c.id));
    
    console.log(`👥 Clientes COM certificados: ${clientsWithCerts.size}`);
    console.log(`👥 Clientes SEM certificados: ${clientsWithoutCerts.length}`);
    
    // Enriquecer com dados do cliente
    const enrichedRenewals = Array.from(certsByClient.values()).map(cert => {
      const client = allClients.find(c => c.id === cert.client_id);
      return {
        ...cert,
        client_data: client || {}
      };
    });

    console.log(`✅ RESULTADO FINAL: ${enrichedRenewals.length} renovações ativas`);
    console.log('🔍 === FIM DO DIAGNÓSTICO ===\n');

    return enrichedRenewals;
  }, [allCertificates, allClients]);

  // 📊 DASHBOARD ESTRATÉGICO (baseado em data de expiração)
  const dashboard = useMemo(() => {
    const today = new Date();
    
    const expired = renewalsActive.filter(r => {
      const days = differenceInDays(parseISO(r.expiry_date), today);
      return days < 0;
    });

    const days30 = renewalsActive.filter(r => {
      const days = differenceInDays(parseISO(r.expiry_date), today);
      return days >= 0 && days <= 30;
    });

    const days60 = renewalsActive.filter(r => {
      const days = differenceInDays(parseISO(r.expiry_date), today);
      return days > 30 && days <= 60;
    });

    const days90 = renewalsActive.filter(r => {
      const days = differenceInDays(parseISO(r.expiry_date), today);
      return days > 60 && days <= 90;
    });

    const above90 = renewalsActive.filter(r => {
      const days = differenceInDays(parseISO(r.expiry_date), today);
      return days > 90;
    });

    const inContact = renewalsActive.filter(r => r.renewal_status === 'em_contato');
    const renewed = renewalsActive.filter(r => r.renewal_status === 'renovado');
    const conversionRate = renewalsActive.length > 0 
      ? ((renewed.length / renewalsActive.length) * 100).toFixed(1) 
      : '0.0';

    return {
      total: renewalsActive.length,
      expired: expired.length,
      days30: days30.length,
      days60: days60.length,
      days90: days90.length,
      above90: above90.length,
      inContact: inContact.length,
      renewed: renewed.length,
      conversionRate
    };
  }, [renewalsActive]);

  // 🔎 FILTROS APLICADOS
  const filteredRenewals = useMemo(() => {
    const today = new Date();
    
    let filtered = renewalsActive.filter(renewal => {
      // Busca por texto
      const matchesSearch = !searchTerm || 
        renewal.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        renewal.client_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        renewal.client_phone?.includes(searchTerm) ||
        renewal.client_data?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de tipo de certificado
      const matchesType = typeFilter === 'all' || renewal.certificate_type === typeFilter;

      // Filtro de status
      const matchesStatus = statusFilter === 'all' || renewal.renewal_status === statusFilter;

      // Filtro de agente
      const matchesAgent = agentFilter === 'all' || renewal.assigned_agent === agentFilter;

      // Filtros de data (combináveis - usar o maior intervalo)
      let matchesDate = true;
      if (dateFilters.length > 0) {
        const days = differenceInDays(parseISO(renewal.expiry_date), today);
        
        // Determinar o maior intervalo selecionado
        const maxDays = Math.max(...dateFilters.map(f => {
          if (f === 'expired') return -1;
          if (f === '30') return 30;
          if (f === '45') return 45;
          if (f === '60') return 60;
          if (f === '75') return 75;
          if (f === '90') return 90;
          return 0;
        }));

        if (dateFilters.includes('expired') && maxDays === -1) {
          // Apenas vencidos
          matchesDate = days < 0;
        } else if (dateFilters.includes('expired')) {
          // Vencidos + outros intervalos
          matchesDate = days < 0 || (days >= 0 && days <= maxDays);
        } else {
          // Apenas intervalos futuros
          matchesDate = days >= 0 && days <= maxDays;
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesAgent && matchesDate;
    });

    // Ordenação
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
  }, [renewalsActive, searchTerm, dateFilters, typeFilter, statusFilter, agentFilter, sortField, sortOrder]);

  // Lista única de agentes
  const agents = useMemo(() => {
    const uniqueAgents = new Set(renewalsActive.map(r => r.assigned_agent).filter(Boolean));
    return Array.from(uniqueAgents);
  }, [renewalsActive]);

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ certId, status, clientId, source }) => {
      if (source === 'client_profile') {
        // Atualizar no cadastro do cliente
        await base44.entities.Client.update(clientId, { renewal_status: status });
      } else {
        // Atualizar na entidade Certificate
        await base44.entities.Certificate.update(certId, { renewal_status: status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['clients']);
    },
  });

  // Mutation para deletar certificado
  const deleteCertificateMutation = useMutation({
    mutationFn: async ({ certId, clientId, source }) => {
      if (source === 'client_profile') {
        // Remover certificado do cadastro do cliente
        await base44.entities.Client.update(clientId, {
          has_certificate: false,
          certificate_type: null,
          certificate_expiry_date: null,
          renewal_status: null
        });
      } else {
        // Deletar da entidade Certificate
        await base44.entities.Certificate.delete(certId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['clients']);
    },
  });

  // Handlers
  const toggleDateFilter = (filter) => {
    setDateFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const handleCardClick = (filter) => {
    setDateFilters([filter]);
  };

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
    return differenceInDays(parseISO(expiryDate), new Date());
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

  const handleDeleteCertificate = (certId, clientId, source, clientName) => {
    if (confirm(`Confirma a exclusão do certificado de ${clientName}? Esta ação não pode ser desfeita.`)) {
      deleteCertificateMutation.mutate({ certId, clientId, source });
    }
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
          <p className="text-slate-500">
            Gestão estratégica de certificados • {dashboard.total} clientes únicos
          </p>
        </div>
      </div>

      {/* 📊 DASHBOARD COMERCIAL - Cards Clicáveis */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <Card 
          className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('expired')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-xs text-slate-500">Vencidos</p>
                <p className="text-2xl font-bold text-slate-800">{dashboard.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('30')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs text-slate-500">Até 30d</p>
                <p className="text-2xl font-bold text-slate-800">{dashboard.days30}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('60')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-xs text-slate-500">31-60d</p>
                <p className="text-2xl font-bold text-slate-800">{dashboard.days60}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleCardClick('90')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">61-90d</p>
                <p className="text-2xl font-bold text-slate-800">{dashboard.days90}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">&gt;90d</p>
                <p className="text-2xl font-bold text-slate-800">{dashboard.above90}</p>
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
                <p className="text-2xl font-bold text-slate-800">{dashboard.inContact}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-[#6B2D8B]" />
              <div>
                <p className="text-xs text-slate-500">Conversão</p>
                <p className="text-2xl font-bold text-slate-800">{dashboard.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🔎 FILTROS ESTRATÉGICOS */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Linha 1: Busca + Filtros de Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar cliente, empresa, e-mail ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <span className="text-sm text-slate-500 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Período:
                </span>
                {[
                  { value: 'expired', label: 'Vencidos', color: 'bg-red-100 text-red-700' },
                  { value: '30', label: '30d', color: 'bg-orange-100 text-orange-700' },
                  { value: '45', label: '45d', color: 'bg-amber-100 text-amber-700' },
                  { value: '60', label: '60d', color: 'bg-yellow-100 text-yellow-700' },
                  { value: '75', label: '75d', color: 'bg-blue-100 text-blue-700' },
                  { value: '90', label: '90d', color: 'bg-indigo-100 text-indigo-700' },
                ].map(filter => (
                  <Badge
                    key={filter.value}
                    className={`cursor-pointer ${
                      dateFilters.includes(filter.value) 
                        ? filter.color + ' border-2 border-current' 
                        : 'bg-slate-100 text-slate-600'
                    }`}
                    onClick={() => toggleDateFilter(filter.value)}
                  >
                    {filter.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Linha 2: Outros Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Certificado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="e_cpf_a1">e-CPF A1</SelectItem>
                  <SelectItem value="e_cpf_a3">e-CPF A3</SelectItem>
                  <SelectItem value="e_cnpj_a1">e-CNPJ A1</SelectItem>
                  <SelectItem value="e_cnpj_a3">e-CNPJ A3</SelectItem>
                </SelectContent>
              </Select>

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

              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Responsável" />
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
                  setDateFilters([]);
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setAgentFilter('all');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📋 LISTA DE RENOVAÇÕES */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Certificados para Renovação ({filteredRenewals.length})</span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              ✓ Sem Duplicatas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-w-full">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead 
                    className="font-semibold cursor-pointer min-w-[250px]"
                    onClick={() => toggleSort('client_name')}
                  >
                    <div className="flex items-center gap-2">
                      Cliente
                      {sortField === 'client_name' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold min-w-[120px]">Tipo</TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer min-w-[140px]"
                    onClick={() => toggleSort('expiry_date')}
                  >
                    <div className="flex items-center gap-2">
                      Vencimento
                      {sortField === 'expiry_date' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold min-w-[140px]">Status</TableHead>
                  <TableHead className="font-semibold min-w-[120px]">Responsável</TableHead>
                  <TableHead className="w-24 sticky right-0 bg-slate-50"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRenewals.map((renewal) => {
                  const daysRemaining = getDaysRemaining(renewal.expiry_date);
                  const isExpired = daysRemaining !== null && daysRemaining < 0;
                  const isUrgent = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

                  return (
                    <TableRow key={renewal.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold text-sm">
                            {renewal.client_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <Link 
                              to={createPageUrl(`ClientDetails?id=${renewal.client_id}`)}
                              className="font-medium text-slate-800 hover:text-[#6B2D8B] hover:underline"
                            >
                              {renewal.client_name}
                            </Link>
                            {renewal.client_data?.company_name && (
                              <p className="text-xs text-slate-500">{renewal.client_data.company_name}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {renewal.client_phone && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {renewal.client_phone}
                                </span>
                              )}
                              {renewal.client_email && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {renewal.client_email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {renewal.certificate_type?.replace('_', '-').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-slate-800">
                            {renewal.expiry_date ? format(parseISO(renewal.expiry_date), 'dd/MM/yyyy') : '-'}
                          </p>
                          {daysRemaining !== null && (
                            <p className={`text-xs font-medium ${
                              isExpired ? 'text-red-600' :
                              isUrgent ? 'text-orange-600' :
                              daysRemaining <= 30 ? 'text-amber-600' :
                              'text-slate-500'
                            }`}>
                              {isExpired ? `Vencido há ${Math.abs(daysRemaining)} dias` :
                               daysRemaining === 0 ? 'Vence hoje!' :
                               `Vence em ${daysRemaining} dias`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={renewal.renewal_status || 'pendente'}
                          onValueChange={(value) => updateStatusMutation.mutate({ 
                            certId: renewal.id, 
                            clientId: renewal.client_id,
                            source: renewal.source,
                            status: value 
                          })}
                        >
                          <SelectTrigger className={`w-36 ${getStatusColor(renewal.renewal_status)}`}>
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
                        <span className="text-sm text-slate-600">{renewal.assigned_agent || '-'}</span>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-white">
                        <div className="flex items-center gap-1">
                          <Link to={createPageUrl(`ClientDetails?id=${renewal.client_id}`)}>
                            <Button variant="ghost" size="icon">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteCertificate(renewal.id, renewal.client_id, renewal.source, renewal.client_name)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredRenewals.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">Nenhum certificado encontrado com os filtros aplicados</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}