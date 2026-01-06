import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO, isBefore } from 'date-fns';
import { Calendar, AlertTriangle, Eye, Edit, MoreVertical, Phone, Mail } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RenewalClientsView({ clients }) {
  // Filtrar apenas clientes com dt_fim ou validade preenchidos
  const renewalClients = React.useMemo(() => 
    clients.filter(c => c.dt_fim || c.validade), 
    [clients]
  );

  const getExpiryStatus = (client) => {
    const expiryDate = client.dt_fim || client.validade;
    if (!expiryDate) return { status: 'none', label: '-', color: 'bg-slate-100 text-slate-600' };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', label: 'Vencido', color: 'bg-red-100 text-red-700' };
    if (diffDays <= 7) return { status: 'urgent', label: `${diffDays}d`, color: 'bg-red-100 text-red-700' };
    if (diffDays <= 15) return { status: 'soon', label: `${diffDays}d`, color: 'bg-amber-100 text-amber-700' };
    if (diffDays <= 30) return { status: 'upcoming', label: `${diffDays}d`, color: 'bg-yellow-100 text-yellow-700' };
    return { status: 'ok', label: `${diffDays}d`, color: 'bg-green-100 text-green-700' };
  };

  // Agrupar por status de urgência
  const groupedClients = {
    expired: renewalClients.filter(c => getExpiryStatus(c).status === 'expired'),
    urgent: renewalClients.filter(c => getExpiryStatus(c).status === 'urgent'),
    soon: renewalClients.filter(c => getExpiryStatus(c).status === 'soon'),
    upcoming: renewalClients.filter(c => getExpiryStatus(c).status === 'upcoming'),
    ok: renewalClients.filter(c => getExpiryStatus(c).status === 'ok'),
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-xs text-red-600 font-medium">Vencidos</p>
          <p className="text-2xl font-bold text-red-700">{groupedClients.expired.length}</p>
        </Card>
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-xs text-red-600 font-medium">Até 7 dias</p>
          <p className="text-2xl font-bold text-red-700">{groupedClients.urgent.length}</p>
        </Card>
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-xs text-amber-600 font-medium">Até 15 dias</p>
          <p className="text-2xl font-bold text-amber-700">{groupedClients.soon.length}</p>
        </Card>
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <p className="text-xs text-yellow-600 font-medium">Até 30 dias</p>
          <p className="text-2xl font-bold text-yellow-700">{groupedClients.upcoming.length}</p>
        </Card>
        <Card className="p-4 border-green-200 bg-green-50">
          <p className="text-xs text-green-600 font-medium">Mais de 30 dias</p>
          <p className="text-2xl font-bold text-green-700">{groupedClients.ok.length}</p>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Contato</TableHead>
                <TableHead className="font-semibold">Data Vencimento</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renewalClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    Nenhum cliente com data de renovação cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                renewalClients.map((client) => {
                  const status = getExpiryStatus(client);
                  const expiryDate = client.dt_fim || client.validade;
                  
                  return (
                    <TableRow key={client.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold text-sm">
                            {client.client_name?.charAt(0) || 'C'}
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
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">
                            {expiryDate ? format(parseISO(expiryDate), 'dd/MM/yyyy') : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          {status.status === 'expired' && <AlertTriangle className="w-3 h-3 mr-1" />}
                          {status.label}
                        </Badge>
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}