import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { format, parseISO, differenceInDays, isPast, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function CertificateRenewals() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients-with-certificates'],
    queryFn: async () => {
      const allClients = await base44.entities.Client.filter({ has_certificate: true });
      return allClients.filter(c => c.certificate_expiry_date);
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ clientId, data }) => base44.entities.Client.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients-with-certificates']);
      toast.success('Status atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    }
  });

  const getCertificateStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', label: 'Sem data', color: 'bg-slate-100 text-slate-600', days: null };
    
    const expiry = parseISO(expiryDate);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(expiry, today);
    
    if (daysUntilExpiry < 0) {
      return {
        status: 'expired',
        label: 'Vencido',
        color: 'bg-red-100 text-red-700 border-red-200',
        days: Math.abs(daysUntilExpiry),
        daysLabel: `${Math.abs(daysUntilExpiry)} dias atraso`
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'expiring_soon',
        label: 'Vencendo',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        days: daysUntilExpiry,
        daysLabel: `${daysUntilExpiry} dias`
      };
    } else if (daysUntilExpiry <= 60) {
      return {
        status: 'attention',
        label: 'Atenção',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        days: daysUntilExpiry,
        daysLabel: `${daysUntilExpiry} dias`
      };
    } else {
      return {
        status: 'active',
        label: 'Ativo',
        color: 'bg-green-100 text-green-700 border-green-200',
        days: daysUntilExpiry,
        daysLabel: `${daysUntilExpiry} dias`
      };
    }
  };

  const handleRenewalStatus = async (client, renewed) => {
    const updates = {
      renewal_status: renewed ? 'renovado' : 'nao_renovado',
    };

    // Se renovado, podemos atualizar a data de vencimento (adicionar 1 ano)
    if (renewed && client.certificate_expiry_date) {
      const currentExpiry = parseISO(client.certificate_expiry_date);
      const newExpiry = addDays(currentExpiry, 365);
      updates.certificate_expiry_date = format(newExpiry, 'yyyy-MM-dd');
    }

    updateClientMutation.mutate({ clientId: client.id, data: updates });
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    
    const { status } = getCertificateStatus(client.certificate_expiry_date);
    return status === statusFilter;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
    const dateA = a.certificate_expiry_date ? parseISO(a.certificate_expiry_date) : new Date(9999, 12);
    const dateB = b.certificate_expiry_date ? parseISO(b.certificate_expiry_date) : new Date(9999, 12);
    return dateA - dateB;
  });

  // Estatísticas
  const stats = {
    total: clients.length,
    expired: clients.filter(c => getCertificateStatus(c.certificate_expiry_date).status === 'expired').length,
    expiring_soon: clients.filter(c => getCertificateStatus(c.certificate_expiry_date).status === 'expiring_soon').length,
    active: clients.filter(c => getCertificateStatus(c.certificate_expiry_date).status === 'active').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B2D8B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Renovação de Certificações</h1>
          <p className="text-slate-500 mt-1">Gerencie certificados digitais em renovação</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vencendo</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiring_soon}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
                <SelectItem value="expiring_soon">Vencendo (30 dias)</SelectItem>
                <SelectItem value="attention">Atenção (60 dias)</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Certificados para Renovação ({sortedClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum certificado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                sortedClients.map((client) => {
                  const statusInfo = getCertificateStatus(client.certificate_expiry_date);
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-800">{client.client_name}</p>
                          <p className="text-sm text-slate-500">{client.email || client.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {client.certificate_type?.replace('_', ' ') || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {client.certificate_expiry_date ? 
                          format(parseISO(client.certificate_expiry_date), "dd/MM/yyyy", { locale: ptBR }) :
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={
                          statusInfo.status === 'expired' ? 'text-red-600 font-semibold' :
                          statusInfo.status === 'expiring_soon' ? 'text-orange-600 font-semibold' :
                          'text-slate-600'
                        }>
                          {statusInfo.daysLabel || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {client.renewal_status === 'renovado' ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Renovado
                            </Badge>
                          ) : client.renewal_status === 'nao_renovado' ? (
                            <Badge className="bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3 mr-1" />
                              Não Renovado
                            </Badge>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => handleRenewalStatus(client, true)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Renovado
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleRenewalStatus(client, false)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Não Renovado
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}