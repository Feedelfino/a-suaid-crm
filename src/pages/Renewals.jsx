import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Upload, AlertTriangle, Clock, CheckCircle, 
  Phone, Mail, User, FileText, Filter, Search
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

const CERTIFICATE_TYPES = {
  e_cpf_a1: 'e-CPF A1',
  e_cpf_a3: 'e-CPF A3',
  e_cnpj_a1: 'e-CNPJ A1',
  e_cnpj_a3: 'e-CNPJ A3',
};

export default function Renewals() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      // Buscar certificados da entidade Certificate
      const certs = await base44.entities.Certificate.list('-expiry_date', 1000);
      
      // Buscar clientes com certificado digital ativo
      const clients = await base44.entities.Client.filter({ has_certificate: true });
      
      // Converter clientes com certificado para formato de certificado
      const clientCerts = clients
        .filter(c => c.certificate_expiry_date) // Apenas com data de validade
        .map(c => ({
          id: `client-${c.id}`,
          client_id: c.id,
          client_name: c.client_name,
          client_email: c.email || '',
          client_phone: c.phone || c.whatsapp || '',
          certificate_type: c.certificate_type || 'e_cpf_a3',
          issue_date: null,
          expiry_date: c.certificate_expiry_date,
          status: 'ativo',
          renewal_status: 'pendente',
          assigned_agent: c.assigned_agent || '',
          notes: 'Cliente cadastrado manualmente',
        }));
      
      // Combinar e remover duplicatas (priorizar Certificate sobre Client)
      const certMap = new Map();
      
      // Adicionar certificados da entidade Certificate
      certs.forEach(cert => {
        if (cert.client_id) {
          certMap.set(cert.client_id, cert);
        }
      });
      
      // Adicionar clientes com certificado que não estão na entidade Certificate
      clientCerts.forEach(cert => {
        if (!certMap.has(cert.client_id)) {
          certMap.set(cert.client_id, cert);
        }
      });
      
      return Array.from(certMap.values());
    },
  });

  const updateCertificate = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Certificate.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['certificates']),
  });

  const today = new Date();

  // Filtrar certificados
  const filteredCerts = certificates.filter(cert => {
    const matchesSearch = !searchTerm || 
      cert.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.client_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || cert.certificate_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Classificar por categoria de vencimento
  const expiredCerts = filteredCerts.filter(cert => {
    if (!cert.expiry_date) return false;
    const expiry = parseISO(cert.expiry_date);
    const daysUntil = differenceInDays(expiry, today);
    return daysUntil < -45;
  });

  const recentlyExpired = filteredCerts.filter(cert => {
    if (!cert.expiry_date) return false;
    const expiry = parseISO(cert.expiry_date);
    const daysUntil = differenceInDays(expiry, today);
    return daysUntil >= -45 && daysUntil < 0;
  });

  const expiringIn45Days = filteredCerts.filter(cert => {
    if (!cert.expiry_date) return false;
    const expiry = parseISO(cert.expiry_date);
    const daysUntil = differenceInDays(expiry, today);
    return daysUntil >= 0 && daysUntil <= 45;
  });

  // Upload de planilha (mesmos critérios do Banco de Dados)
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
              description: "Lista de registros extraídos do arquivo",
              items: {
                type: "object",
                properties: {
                  produto: { type: "string", description: "PRODUTO, tipo de certificado digital" },
                  cnpj: { type: "string", description: "CNPJ da empresa" },
                  cpf: { type: "string", description: "CPF do titular" },
                  nome: { type: "string", description: "NOME DO TITULAR, nome completo" },
                  telefone: { type: "string", description: "TELEFONE, celular" },
                  email: { type: "string", description: "EMAIL, e-mail" },
                  unid_atendimento: { type: "string", description: "UNID_ATENDIMENTO, local de atendimento" },
                  dt_emis: { type: "string", description: "DT_EMIS, data de emissão" },
                  dt_fim: { type: "string", description: "DT_FIM, data de vencimento" },
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

        // Buscar ou criar campanha de renovação
        const campaigns = await base44.entities.Campaign.filter({ name: 'Renovação de Certificados' });
        let renovationCampaign;
        if (campaigns.length === 0) {
          renovationCampaign = await base44.entities.Campaign.create({
            name: 'Renovação de Certificados',
            description: 'Campanha automática para renovação de certificados digitais',
            status: 'ativa',
            start_date: new Date().toISOString().split('T')[0],
          });
        } else {
          renovationCampaign = campaigns[0];
        }

        // Buscar clientes existentes
        const existingClients = await base44.entities.Client.list('-created_date', 2000);

        for (const record of records) {
          try {
            const cpf = String(record.cpf || '').replace(/\D/g, '');
            const cnpj = String(record.cnpj || '').replace(/\D/g, '');
            
            // Verificar se cliente já existe por CPF ou CNPJ
            let client = existingClients.find(c => {
              const cCpf = String(c.cpf || '').replace(/\D/g, '');
              const cCnpj = String(c.cnpj || '').replace(/\D/g, '');
              if (cpf && cCpf && cpf === cCpf) return true;
              if (cnpj && cCnpj && cnpj === cCnpj) return true;
              return false;
            });

            // Criar ou atualizar cliente no Cadastro Central
            const clientData = {
              client_name: record.nome || 'Sem nome',
              cpf: cpf || '',
              cnpj: cnpj || '',
              email: record.email || '',
              phone: record.telefone || '',
              whatsapp: record.telefone || '',
              business_area: record.produto || '',
              lead_status: 'qualificado',
              lead_source: 'renovacao',
              funnel_stage: 'contato',
              campaign_id: renovationCampaign.id,
              notes: `Renovação automática - ${record.unid_atendimento || ''}`,
            };

            if (client) {
              // Atualizar cliente existente
              await base44.entities.Client.update(client.id, clientData);
            } else {
              // Criar novo cliente
              client = await base44.entities.Client.create(clientData);
            }

            // Determinar tipo de certificado
            let certType = 'e_cpf_a3';
            const produto = String(record.produto || '').toLowerCase();
            if (produto.includes('cnpj')) {
              certType = produto.includes('a1') ? 'e_cnpj_a1' : 'e_cnpj_a3';
            } else if (produto.includes('cpf')) {
              certType = produto.includes('a1') ? 'e_cpf_a1' : 'e_cpf_a3';
            }

            // Formatar datas
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

            // Criar registro de certificado
            await base44.entities.Certificate.create({
              client_id: client.id,
              client_name: record.nome || 'Sem nome',
              client_email: record.email || '',
              client_phone: record.telefone || '',
              certificate_type: certType,
              issue_date: formatDate(record.dt_emis),
              expiry_date: formatDate(record.dt_fim),
              status: 'ativo',
              renewal_status: 'pendente',
              notes: record.unid_atendimento || '',
            });

            imported++;
          } catch (err) {
            console.error('Erro ao importar registro:', err);
          }
        }

        setUploadStatus({ 
          type: 'success', 
          message: `${imported} certificados importados, clientes cadastrados e inseridos no funil!` 
        });
        queryClient.invalidateQueries(['certificates']);
        queryClient.invalidateQueries(['clients']);
      } else {
        setUploadStatus({ type: 'error', message: result.details || 'Erro ao processar arquivo' });
      }
    } catch (error) {
      setUploadStatus({ type: 'error', message: 'Erro ao fazer upload do arquivo' });
    }
  };

  const CertificateTable = ({ data, title, icon: Icon, color }) => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="secondary">{data.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center py-8 text-slate-500">Nenhum certificado nesta categoria</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status Renovação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(cert => {
                  const daysUntil = cert.expiry_date 
                    ? differenceInDays(parseISO(cert.expiry_date), today)
                    : 0;
                  
                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <Link 
                            to={createPageUrl(`ClientDetails?id=${cert.client_id}`)}
                            className="font-medium text-[#6B2D8B] hover:underline cursor-pointer"
                          >
                            {cert.client_name}
                          </Link>
                          {cert.client_email && (
                            <p className="text-xs text-slate-500">{cert.client_email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CERTIFICATE_TYPES[cert.certificate_type] || cert.certificate_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{cert.expiry_date && format(parseISO(cert.expiry_date), 'dd/MM/yyyy')}</p>
                          <p className={`text-xs ${
                            daysUntil < 0 ? 'text-red-500' : 
                            daysUntil <= 15 ? 'text-orange-500' : 
                            'text-amber-500'
                          }`}>
                            {daysUntil < 0 
                              ? `Vencido há ${Math.abs(daysUntil)} dias`
                              : `Vence em ${daysUntil} dias`
                            }
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={cert.renewal_status || 'pendente'}
                          onValueChange={(v) => updateCertificate.mutate({ id: cert.id, data: { renewal_status: v } })}
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
                        <div className="flex gap-2">
                          {cert.client_phone && (
                            <a href={`https://wa.me/55${cert.client_phone.replace(/\D/g, '')}`} target="_blank">
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <Phone className="w-4 h-4 text-green-600" />
                              </Button>
                            </a>
                          )}
                          {cert.client_email && (
                            <a href={`mailto:${cert.client_email}`}>
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
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Sincronizador */}
      {user?.role === 'admin' && <RenewalSyncUtility />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Renovações</h1>
          <p className="text-slate-500">Gestão de renovação de certificados digitais</p>
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
              <DialogTitle>Importar Certificados para Renovação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Faça upload de uma planilha (CSV, Excel ou PDF) seguindo as <strong>mesmas especificações do Banco de Dados</strong>:
              </p>
              
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-700 mb-2">Colunas necessárias na primeira linha:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">PRODUTO</Badge>
                    <span>- Tipo de certificado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">CNPJ</Badge>
                    <span>- Documento empresa</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">CPF</Badge>
                    <span>- Documento titular</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className="text-xs bg-[#6B2D8B]">NOME</Badge>
                    <span>- Nome titular *</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">TELEFONE</Badge>
                    <span>- Contato</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">EMAIL</Badge>
                    <span>- E-mail</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">DT_EMIS</Badge>
                    <span>- Data emissão</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">DT_FIM</Badge>
                    <span>- Data vencimento</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <p>✓ Formatos: CSV, Excel (.xlsx, .xls) ou PDF</p>
                <p>✓ Tamanho máximo: 15MB</p>
                <p>✓ Datas no formato: dd/mm/aaaa</p>
                <p>✓ Primeira linha deve conter os cabeçalhos</p>
              </div>

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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100">Vencidos há +45 dias</p>
                <p className="text-3xl font-bold">{expiredCerts.length}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Vencidos recentemente</p>
                <p className="text-3xl font-bold">{recentlyExpired.length}</p>
              </div>
              <Clock className="w-12 h-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100">Vence em 45 dias</p>
                <p className="text-3xl font-bold">{expiringIn45Days.length}</p>
              </div>
              <FileText className="w-12 h-12 text-amber-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(CERTIFICATE_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tables */}
      <Tabs defaultValue="expiring" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expiring">
            Vence em 45 dias ({expiringIn45Days.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Vencidos recentes ({recentlyExpired.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
            Vencidos +45 dias ({expiredCerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiring">
          <CertificateTable 
            data={expiringIn45Days} 
            title="Certificados a Vencer" 
            icon={Clock} 
            color="bg-amber-500"
          />
        </TabsContent>

        <TabsContent value="recent">
          <CertificateTable 
            data={recentlyExpired} 
            title="Vencidos Recentemente" 
            icon={AlertTriangle} 
            color="bg-orange-500"
          />
        </TabsContent>

        <TabsContent value="expired">
          <CertificateTable 
            data={expiredCerts} 
            title="Vencidos há mais de 45 dias" 
            icon={AlertTriangle} 
            color="bg-red-500"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}