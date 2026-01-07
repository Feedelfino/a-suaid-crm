import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  Search, Plus, User, Building2, Phone, Mail, 
  Filter, MoreVertical, Eye, Edit, Trash2, AlertTriangle, Download, Users, Merge
} from 'lucide-react';
import DuplicateManager from '@/components/data/DuplicateManager';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Clients() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    staleTime: 10000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
    },
  });

  const migrateMutation = useMutation({
    mutationFn: () => base44.functions.invoke('migrateCertificatesToClients'),
    onSuccess: (response) => {
      alert(response.data.message);
      queryClient.invalidateQueries(['clients']);
    },
  });

  const isAdmin = user?.role === 'admin';

  // Detectar duplicados por CPF, CNPJ, Email e Telefone
  const duplicates = React.useMemo(() => {
    const cpfMap = {};
    const cnpjMap = {};
    const emailMap = {};
    const phoneMap = {};
    const duplicatedIds = new Set();

    clients.forEach(client => {
      const cpf = client.cpf?.replace(/\D/g, '');
      const cnpj = client.cnpj?.replace(/\D/g, '');
      const email = client.email?.toLowerCase().trim();
      const phone = client.phone?.replace(/\D/g, '');

      if (cpf && cpf.length === 11) {
        if (cpfMap[cpf]) {
          duplicatedIds.add(client.id);
          duplicatedIds.add(cpfMap[cpf]);
        } else {
          cpfMap[cpf] = client.id;
        }
      }

      if (cnpj && cnpj.length === 14) {
        if (cnpjMap[cnpj]) {
          duplicatedIds.add(client.id);
          duplicatedIds.add(cnpjMap[cnpj]);
        } else {
          cnpjMap[cnpj] = client.id;
        }
      }

      if (email && email.includes('@')) {
        if (emailMap[email]) {
          duplicatedIds.add(client.id);
          duplicatedIds.add(emailMap[email]);
        } else {
          emailMap[email] = client.id;
        }
      }

      if (phone && phone.length >= 10) {
        if (phoneMap[phone]) {
          duplicatedIds.add(client.id);
          duplicatedIds.add(phoneMap[phone]);
        } else {
          phoneMap[phone] = client.id;
        }
      }
    });

    return {
      ids: duplicatedIds,
      count: duplicatedIds.size,
      clients: clients.filter(c => duplicatedIds.has(c.id))
    };
  }, [clients]);

  // Estatísticas de contatos
  const contactStats = React.useMemo(() => {
    return {
      total: clients.length,
      withPhone: clients.filter(c => c.phone).length,
      withEmail: clients.filter(c => c.email).length,
      withWhatsApp: clients.filter(c => c.whatsapp).length,
      duplicates: duplicates.count,
    };
  }, [clients, duplicates]);

  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || client.lead_status === statusFilter;
    const matchesSource = sourceFilter === 'all' || client.lead_source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const statusColors = {
    novo: 'bg-blue-100 text-blue-700',
    em_contato: 'bg-yellow-100 text-yellow-700',
    qualificado: 'bg-green-100 text-green-700',
    negociando: 'bg-purple-100 text-purple-700',
    fechado: 'bg-emerald-100 text-emerald-700',
    perdido: 'bg-red-100 text-red-700',
    indeciso: 'bg-orange-100 text-orange-700',
  };

  const handleDelete = async (id) => {
    if (!isAdmin) {
      alert('Apenas administradores podem excluir clientes.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteMutation.mutate(id);
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
          <h1 className="text-2xl font-bold text-slate-800">Cadastros</h1>
          <p className="text-slate-500">Gerencie todos os seus clientes</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                onClick={() => migrateMutation.mutate()}
                disabled={migrateMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                {migrateMutation.isPending ? 'Migrando...' : 'Migrar Renovações'}
              </Button>
              {duplicates.count > 0 && (
                <Button
                  onClick={() => setShowDuplicateManager(true)}
                  variant="outline"
                  className="border-amber-600 text-amber-600 hover:bg-amber-50"
                >
                  <Merge className="w-4 h-4 mr-2" />
                  Gerenciar Duplicados ({duplicates.count})
                </Button>
              )}
            </>
          )}
          <Link to={createPageUrl('ClientForm')}>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#6B2D8B]" />
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-xl font-bold text-slate-800">{contactStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-slate-500">Com Telefone</p>
                <p className="text-xl font-bold text-slate-800">{contactStats.withPhone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Com E-mail</p>
                <p className="text-xl font-bold text-slate-800">{contactStats.withEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-slate-500">WhatsApp</p>
                <p className="text-xl font-bold text-slate-800">{contactStats.withWhatsApp}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-md ${duplicates.count > 0 ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`w-5 h-5 ${duplicates.count > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs text-slate-500">Duplicados</p>
                <p className="text-xl font-bold text-slate-800">{duplicates.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Duplicados */}
      {duplicates.count > 0 && (
        <Card className="border-0 shadow-lg bg-amber-50 border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  {duplicates.count} cadastros duplicados detectados
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  Clientes com mesmo CPF, CNPJ, e-mail ou telefone. Recomenda-se revisar e consolidar os registros.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por nome, empresa, telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="em_contato">Em Contato</SelectItem>
                <SelectItem value="qualificado">Qualificado</SelectItem>
                <SelectItem value="negociando">Negociando</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
                <SelectItem value="perdido">Perdido</SelectItem>
                <SelectItem value="indeciso">Indeciso</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="indicacao">Indicação</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="google_ads">Google Ads</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="organico">Orgânico</SelectItem>
                <SelectItem value="renovacao">Renovação</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Contato</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Origem</TableHead>
                <TableHead className="font-semibold">Data Cadastro</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow 
                  key={client.id} 
                  className={`hover:bg-slate-50 ${duplicates.ids.has(client.id) ? 'bg-amber-50' : ''}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold text-sm relative">
                        {client.client_name?.charAt(0) || 'C'}
                        {duplicates.ids.has(client.id) && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{client.client_name}</p>
                        {client.company_name && (
                          <p className="text-sm text-slate-500">{client.company_name}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {client.phone && (
                        <p className="text-sm text-slate-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {client.phone}
                        </p>
                      )}
                      {client.email && (
                        <p className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {client.email}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[client.lead_status] || 'bg-slate-100 text-slate-600'}>
                      {client.lead_status?.replace('_', ' ') || 'novo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 capitalize">
                      {client.lead_source?.replace('_', ' ') || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-500">
                      {client.created_date ? format(parseISO(client.created_date), 'dd/MM/yyyy') : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link to={createPageUrl(`ClientDetails?id=${client.id}`)}>
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                        </Link>
                        <Link to={createPageUrl(`ClientForm?id=${client.id}`)}>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        </Link>
                        {isAdmin && (
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-16">
            <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-6">Nenhum cliente encontrado</p>
            <Link to={createPageUrl('ClientForm')}>
              <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Cliente
              </Button>
            </Link>
          </div>
        )}
      </Card>

      <DuplicateManager
        clients={clients}
        open={showDuplicateManager}
        onOpenChange={setShowDuplicateManager}
      />
    </div>
  );
}