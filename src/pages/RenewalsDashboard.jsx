import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, AlertTriangle, Clock, CheckCircle,
  DollarSign, Target, Users, Calendar, FileText, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';

export default function RenewalsDashboard() {
  const [periodFilter, setPeriodFilter] = useState('30');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [certTypeFilter, setCertTypeFilter] = useState('all');
  const { getDisplayName, accessRecords } = useUserDisplayName();

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates-dashboard'],
    queryFn: () => base44.entities.Certificate.list('-expiry_date', 2000),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-renovation'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list('-created_date');
      return allClients.filter(c => c.dt_fim || c.validade);
    },
  });

  const today = new Date();

  // Filtrar certificados
  const filteredCerts = certificates.filter(cert => {
    if (!cert.expiry_date) return false;
    
    const expiry = parseISO(cert.expiry_date);
    const daysUntil = differenceInDays(expiry, today);
    
    if (statusFilter !== 'all' && cert.renewal_status !== statusFilter) return false;
    if (agentFilter !== 'all' && cert.assigned_agent !== agentFilter) return false;
    if (certTypeFilter !== 'all' && cert.certificate_type !== certTypeFilter) return false;
    
    return true;
  });

  // Estatísticas
  const expiringIn7Days = filteredCerts.filter(c => {
    const days = differenceInDays(parseISO(c.expiry_date), today);
    return days >= 0 && days <= 7;
  });

  const expiringIn15Days = filteredCerts.filter(c => {
    const days = differenceInDays(parseISO(c.expiry_date), today);
    return days >= 0 && days <= 15;
  });

  const expiringIn30Days = filteredCerts.filter(c => {
    const days = differenceInDays(parseISO(c.expiry_date), today);
    return days >= 0 && days <= 30;
  });

  const inProgress = filteredCerts.filter(c => c.renewal_status === 'em_contato');
  const completed = filteredCerts.filter(c => c.renewal_status === 'renovado');
  const notRenewed = filteredCerts.filter(c => c.renewal_status === 'nao_renovado');

  // Taxa de conversão
  const totalProcessed = completed.length + notRenewed.length;
  const conversionRate = totalProcessed > 0 ? (completed.length / totalProcessed * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Renovação</h1>
        <p className="text-slate-500">Visão completa do processo de renovação de certificados</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Vencendo em 7 dias</p>
                <p className="text-3xl font-bold">{expiringIn7Days.length}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-amber-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Vencendo em 15 dias</p>
                <p className="text-3xl font-bold">{expiringIn15Days.length}</p>
              </div>
              <Clock className="w-12 h-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Vencendo em 30 dias</p>
                <p className="text-3xl font-bold">{expiringIn30Days.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Taxa de Conversão</p>
                <p className="text-3xl font-bold">{conversionRate}%</p>
              </div>
              <Target className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">{inProgress.length}</p>
            <p className="text-sm text-slate-500">Renovações em contato</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Concluídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">{completed.length}</p>
            <p className="text-sm text-slate-500">Renovações confirmadas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6B2D8B]" />
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">{clients.length}</p>
            <p className="text-sm text-slate-500">Cadastrados para renovação</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_contato">Em Contato</SelectItem>
                <SelectItem value="renovado">Renovado</SelectItem>
                <SelectItem value="nao_renovado">Não Renovado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={certTypeFilter} onValueChange={setCertTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="e_cpf_a1">e-CPF A1</SelectItem>
                <SelectItem value="e_cpf_a3">e-CPF A3</SelectItem>
                <SelectItem value="e_cnpj_a1">e-CNPJ A1</SelectItem>
                <SelectItem value="e_cnpj_a3">e-CNPJ A3</SelectItem>
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

      {/* Tabela de Certificados */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Certificados - Prioridade por Vencimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCerts.slice(0, 50).map(cert => {
                  const daysUntil = differenceInDays(parseISO(cert.expiry_date), today);
                  
                  return (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cert.client_name}</p>
                          {cert.client_email && (
                            <p className="text-xs text-slate-500">{cert.client_email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cert.certificate_type?.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(cert.expiry_date), 'dd/MM/yyyy')}
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
                        <Badge variant={cert.renewal_status === 'renovado' ? 'default' : 'secondary'}>
                          {cert.renewal_status === 'pendente' ? 'Pendente' :
                           cert.renewal_status === 'em_contato' ? 'Em Contato' :
                           cert.renewal_status === 'renovado' ? 'Renovado' : 'Não Renovado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cert.assigned_agent || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}