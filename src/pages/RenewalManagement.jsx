import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { 
  Upload, AlertTriangle, Clock, CheckCircle, Phone, Mail, 
  Search, Filter, RefreshCw, Target, Calendar, Users, TrendingUp,
  FileText, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import RenewalSyncUtility from '@/components/renewals/RenewalSyncUtility';
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';

const CERTIFICATE_TYPES = {
  e_cpf_a1: 'e-CPF A1',
  e_cpf_a3: 'e-CPF A3',
  e_cnpj_a1: 'e-CNPJ A1',
  e_cnpj_a3: 'e-CNPJ A3',
};

/**
 * Módulo Unificado de Gestão de Renovações
 * Fonte única de dados: Client + Certificate
 * Sincronização automática e bidirecional
 */
export default function RenewalManagement() {
  const queryClient = useQueryClient();
  const { getDisplayName, accessRecords } = useUserDisplayName();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const [user, setUser] = useState(null);
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  // FONTE ÚNICA DE DADOS - Unified Data Source
  const { data: renewalData = [], isLoading } = useQuery({
    queryKey: ['renewals-unified'],
    queryFn: async () => {
      // Buscar TODOS os clientes
      const allClients = await base44.entities.Client.list('-created_date', 2000);
      
      // Filtrar clientes com certificado e data de validade (fonte primária)
      const clientsWithCert = allClients.filter(c => 
        c.has_certificate === true && c.certificate_expiry_date
      );
      
      // Buscar certificados da entidade Certificate
      const existingCerts = await base44.entities.Certificate.list('-expiry_date', 2000);
      
      // Criar mapa de certificados por client_id (evitar duplicação)
      const certMap = new Map();
      existingCerts.forEach(cert => {
        if (cert.client_id) {
          certMap.set(cert.client_id, cert);
        }
      });
      
      // UNIFIED RECORDS - Um registro por cliente (cliente_id é chave única)
      const unifiedRecords = clientsWithCert.map(client => {
        const existingCert = certMap.get(client.id);
        
        // Dados unificados priorizando Certificate quando existe
        return {
          // Identificadores únicos
          client_id: client.id,
          certificate_id: existingCert?.id || null,
          
          // Dados do cliente (fonte: Client)
          client_name: client.client_name,
          client_email: client.email || existingCert?.client_email || '',
          client_phone: client.phone || client.whatsapp || existingCert?.client_phone || '',
          client_code: client.client_code,
          company_name: client.company_name,
          
          // Dados do certificado (prioriza Certificate, fallback Client)
          certificate_type: existingCert?.certificate_type || client.certificate_type || 'e_cpf_a3',
          issue_date: existingCert?.issue_date || null,
          expiry_date: existingCert?.expiry_date || client.certificate_expiry_date,
          
          // Status e gestão
          status: existingCert?.status || 'ativo',
          renewal_status: existingCert?.renewal_status || client.renewal_status || 'pendente',
          assigned_agent: existingCert?.assigned_agent || client.assigned_agent || '',
          last_contact_date: existingCert?.last_contact_date || null,
          notes: existingCert?.notes || client.notes || '',
          
          // Metadados
          is_synced: !!existingCert, // Indica se está na tabela Certificate
          source: existingCert ? 'certificate' : 'client',
        };
      });
      
      return unifiedRecords;
    },
    staleTime: 10000, // Cache de 10s para performance
  });

  // Mutation para atualizar status (sincroniza ambas entidades)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ record, newStatus }) => {
      // Atualizar Certificate se existir
      if (record.certificate_id) {
        await base44.entities.Certificate.update(record.certificate_id, {
          renewal_status: newStatus,
        });
      }
      
      // Atualizar Client sempre (fonte primária)
      await base44.entities.Client.update(record.client_id, {
        renewal_status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['renewals-unified']);
    },
  });

  const today = new Date();

  // Filtros aplicados
  const filteredData = renewalData.filter(record => {
    const matchesSearch = !searchTerm || 
      record.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.client_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || record.certificate_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || record.renewal_status === statusFilter;
    const matchesAgent = agentFilter === 'all' || record.assigned_agent === agentFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesAgent;
  });

  // Classificação por vencimento
  const expiredCerts = filteredData.filter(r => {
    const daysUntil = differenceInDays(parseISO(r.expiry_date), today);
    return daysUntil < -45;
  });

  const recentlyExpired = filteredData.filter(r => {
    const daysUntil = differenceInDays(parseISO(r.expiry_date), today);
    return daysUntil >= -45 && daysUntil < 0;
  });

  const expiringIn45Days = filteredData.filter(r => {
    const daysUntil = differenceInDays(parseISO(r.expiry_date), today);
    return daysUntil >= 0 && daysUntil <= 45;
  });

  const expiringIn15Days = filteredData.filter(r => {
    const daysUntil = differenceInDays(parseISO(r.expiry_date), today);
    return daysUntil >= 0 && daysUntil <= 15;
  });

  const expiringIn7Days = filteredData.filter(r => {
    const daysUntil = differenceInDays(parseISO(r.expiry_date), today);
    return daysUntil >= 0 && daysUntil <= 7;
  });

  // Status
  const inProgress = filteredData.filter(r => r.renewal_status === 'em_contato');
  const completed = filteredData.filter(r => r.renewal_status === 'renovado');
  const notRenewed = filteredData.filter(r => r.renewal_status === 'nao_renovado');
  const pending = filteredData.filter(r => r.renewal_status === 'pendente');

  // Taxa de conversão
  const totalProcessed = completed.length + notRenewed.length;
  const conversionRate = totalProcessed > 0 ? (completed.length / totalProcessed * 100).toFixed(1) : 0;

  // Upload de planilha
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({ type: 'loading', message: 'Processando arquivo...' });

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
                  cnpj: { type: "string" },
                  cpf: { type: "string" },
                  nome: { type: "string" },
                  telefone: { type: "string" },
                  email: { type: "string" },
                  unid_atendimento: { type: "string" },
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
        const records = Array.isArray(rawData) ? rawData : [rawData];
        let imported = 0;

        const existingClients = await base44.entities.Client.list('-created_date', 2000);

        for (const record of records) {
          try {
            const cpf = String(record.cpf || '').replace(/\D/g, '');
            const cnpj = String(record.cnpj || '').replace(/\D/g, '');
            
            // Buscar cliente existente por CPF/CNPJ (evitar duplicação)
            let client = existingClients.find(c => {
              const cCpf = String(c.cpf || '').replace(/\D/g, '');
              const cCnpj = String(c.cnpj || '').replace(/\D/g, '');
              if (cpf && cCpf && cpf === cCpf) return true;
              if (cnpj && cCnpj && cnpj === cCnpj) return true;
              return false;
            });

            const clientData = {
              client_name: record.nome || 'Sem nome',
              cpf: cpf || '',
              cnpj: cnpj || '',
              email: record.email || '',
              phone: record.telefone || '',
              whatsapp: record.telefone || '',
              has_certificate: true,
              certificate_type: record.produto?.toLowerCase().includes('cnpj') ? 
                (record.produto?.toLowerCase().includes('a1') ? 'e_cnpj_a1' : 'e_cnpj_a3') :
                (record.produto?.toLowerCase().includes('a1') ? 'e_cpf_a1' : 'e_cpf_a3'),
              certificate_expiry_date: (() => {
                const dateStr = String(record.dt_fim || '');
                if (dateStr.includes('/')) {
                  const parts = dateStr.split('/');
                  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
                return dateStr;
              })(),
              lead_status: 'qualificado',
              lead_source: 'renovacao',
            };

            if (client) {
              await base44.entities.Client.update(client.id, clientData);
            } else {
              client = await base44.entities.Client.create(clientData);
            }

            imported++;
          } catch (err) {
            console.error('Erro ao importar registro:', err);
          }
        }

        setUploadStatus({ 
          type: 'success', 
          message: `${imported} certificados importados com sucesso!` 
        });
        queryClient.invalidateQueries(['renewals-unified']);
      } else {
        setUploadStatus({ type: 'error', message: result.details || 'Erro ao processar arquivo' });
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erro ao fazer upload do arquivo' });
    }
  };

  const RenewalTable = ({ data, title, icon: Icon, color }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Dias</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(record => {
            const daysUntil = differenceInDays(parseISO(record.expiry_date), today);
            
            return (
              <TableRow key={record.client_id}>
                <TableCell>
                  <div>
                    <Link 
                      to={createPageUrl(`ClientDetails?id=${record.client_id}`)}
                      className="font-medium text-[#6B2D8B] hover:underline cursor-pointer"
                    >
                      {record.client_name}
                    </Link>
                    {!record.is_synced && (
                      <Badge variant="outline" className="ml-2 text-xs">Não sincronizado</Badge>
                    )}
                    {record.client_email && (
                      <p className="text-xs text-slate-500">{record.client_email}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {CERTIFICATE_TYPES[record.certificate_type] || record.certificate_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p>{format(parseISO(record.expiry_date), 'dd/MM/yyyy')}</p>
                </TableCell>
                <TableCell>
                  <Badge className={
                    daysUntil < 0 ? 'bg-red-500' :
                    daysUntil <= 7 ? 'bg-orange-500' :
                    daysUntil <= 15 ? 'bg-amber-500' :
                    'bg-yellow-500'
                  }>
                    {daysUntil < 0 ? `${Math.abs(daysUntil)}d vencido` : `${daysUntil}d`}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={record.renewal_status || 'pendente'}
                    onValueChange={(v) => updateStatusMutation.mutate({ record, newStatus: v })}
                  >
                    <SelectTrigger className="w-32">
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
                  <span className="text-sm text-slate-600">
                    {record.assigned_agent ? getDisplayName(record.assigned_agent) : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {record.client_phone && (
                      <a href={`https://wa.me/55${record.client_phone.replace(/\D/g, '')}`} target="_blank">
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Phone className="w-4 h-4 text-green-600" />
                        </Button>
                      </a>
                    )}
                    {record.client_email && (
                      <a href={`mailto:${record.client_email}`}>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <Mail className="w-4 h-4 text-blue-600" />
                        </Button>
                      </a>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sincronizador (apenas admin) */}
      {user?.role === 'admin' && <RenewalSyncUtility />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Renovações</h1>
          <p className="text-slate-500">Módulo unificado de renovação de certificados digitais</p>
          <Badge variant="outline" className="mt-2">
            {renewalData.length} certificados • {renewalData.filter(r => !r.is_synced).length} não sincronizados
          </Badge>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Upload className="w-4 h-4 mr-2" />
              Importar Planilha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Certificados</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Faça upload de uma planilha com os dados dos certificados.
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileUpload}
              />
              {uploadStatus && (
                <div className={`p-3 rounded-lg ${
                  uploadStatus.type === 'loading' ? 'bg-blue-50 text-blue-700' :
                  uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  {uploadStatus.message}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs">Vence em 7 dias</p>
                <p className="text-2xl font-bold">{expiringIn7Days.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs">Vence em 15 dias</p>
                <p className="text-2xl font-bold">{expiringIn15Days.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-xs">Vence em 45 dias</p>
                <p className="text-2xl font-bold">{expiringIn45Days.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Taxa Conversão</p>
                <p className="text-2xl font-bold">{conversionRate}%</p>
              </div>
              <Target className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pendente</p>
                <p className="text-xl font-bold text-slate-800">{pending.length}</p>
              </div>
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Em Contato</p>
                <p className="text-xl font-bold text-blue-600">{inProgress.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Renovado</p>
                <p className="text-xl font-bold text-green-600">{completed.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Não Renovado</p>
                <p className="text-xl font-bold text-red-600">{notRenewed.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_contato">Em Contato</SelectItem>
                <SelectItem value="renovado">Renovado</SelectItem>
                <SelectItem value="nao_renovado">Não Renovado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(CERTIFICATE_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {accessRecords.map(u => (
                  <SelectItem key={u.user_email} value={u.user_email}>
                    {u.nickname || u.user_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabelas */}
      <Tabs defaultValue="urgent" className="space-y-6">
        <TabsList>
          <TabsTrigger value="urgent">
            Urgente - 7 dias ({expiringIn7Days.length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Vence em 45 dias ({expiringIn45Days.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Vencidos recentes ({recentlyExpired.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Vencidos +45d ({expiredCerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="urgent">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Urgente - Vence em 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringIn7Days.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Nenhum certificado nesta categoria</p>
              ) : (
                <RenewalTable data={expiringIn7Days} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Vence em 45 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiringIn45Days.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Nenhum certificado nesta categoria</p>
              ) : (
                <RenewalTable data={expiringIn45Days} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Vencidos Recentemente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentlyExpired.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Nenhum certificado nesta categoria</p>
              ) : (
                <RenewalTable data={recentlyExpired} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Vencidos há mais de 45 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expiredCerts.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Nenhum certificado nesta categoria</p>
              ) : (
                <RenewalTable data={expiredCerts} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}