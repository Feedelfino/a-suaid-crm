import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  AlertTriangle, Database, RefreshCw, CheckCircle2, Users, 
  FileText, Trash2, Merge, Eye 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DatabaseCleaning() {
  const queryClient = useQueryClient();
  const [selectedGroups, setSelectedGroups] = useState(new Set());

  const { data: analysis, isLoading, refetch } = useQuery({
    queryKey: ['database-analysis'],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeDatabaseDuplicates');
      return response.data;
    }
  });

  const unifyMutation = useMutation({
    mutationFn: async ({ mainClientId, duplicateIds }) => {
      const response = await base44.functions.invoke('unifyDuplicateClients', {
        mainClientId,
        duplicateClientIds: duplicateIds
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['database-analysis']);
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['certificates']);
      refetch();
      setSelectedGroups(new Set());
    }
  });

  const handleUnifyGroup = (group) => {
    const mainClient = group.clients[0]; // O mais antigo
    const duplicateIds = group.clients.slice(1).map(c => c.id);

    if (confirm(
      `Confirma a unificação deste grupo?\n\n` +
      `Cliente principal: ${mainClient.client_name}\n` +
      `Duplicatas: ${duplicateIds.length}\n\n` +
      `Todos os registros (certificados, interações, etc.) serão transferidos para o cliente principal.`
    )) {
      unifyMutation.mutate({ mainClientId: mainClient.id, duplicateIds });
    }
  };

  const handleUnifyAll = () => {
    if (!analysis?.duplicate_clients || analysis.duplicate_clients.length === 0) {
      alert('Nenhuma duplicata para unificar');
      return;
    }

    if (!confirm(
      `⚠️ ATENÇÃO: Unificação em Massa\n\n` +
      `Isso irá unificar ${analysis.duplicate_clients.length} grupos de clientes duplicados.\n` +
      `Total de ${analysis.summary.total_duplicate_clients} clientes serão mesclados.\n\n` +
      `Esta ação NÃO pode ser desfeita!\n\n` +
      `Deseja continuar?`
    )) {
      return;
    }

    // Unificar todos os grupos sequencialmente
    const unifyAll = async () => {
      let success = 0;
      let errors = 0;

      for (const group of analysis.duplicate_clients) {
        try {
          const mainClient = group.clients[0];
          const duplicateIds = group.clients.slice(1).map(c => c.id);
          
          await base44.functions.invoke('unifyDuplicateClients', {
            mainClientId: mainClient.id,
            duplicateClientIds: duplicateIds
          });
          
          success++;
        } catch (error) {
          console.error('Error unifying group:', error);
          errors++;
        }
      }

      alert(
        `Unificação concluída!\n\n` +
        `✓ ${success} grupos unificados com sucesso\n` +
        (errors > 0 ? `✗ ${errors} grupos com erro\n` : '')
      );

      refetch();
    };

    unifyAll();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#6B2D8B] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Analisando banco de dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Limpeza de Banco de Dados</h1>
          <p className="text-slate-500">Análise e unificação de cadastros duplicados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar Análise
          </Button>
          {analysis?.duplicate_clients?.length > 0 && (
            <Button 
              onClick={handleUnifyAll}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              <Merge className="w-4 h-4 mr-2" />
              Unificar Todos
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-slate-500">Total de Clientes</p>
                <p className="text-2xl font-bold text-slate-800">
                  {analysis?.summary?.total_clients || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-slate-500">Grupos Duplicados</p>
                <p className="text-2xl font-bold text-slate-800">
                  {analysis?.summary?.duplicate_client_groups || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-slate-500">Clientes Duplicados</p>
                <p className="text-2xl font-bold text-slate-800">
                  {analysis?.summary?.total_duplicate_clients || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-slate-500">Cert. Órfãos</p>
                <p className="text-2xl font-bold text-slate-800">
                  {analysis?.summary?.orphan_certificates || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Clients */}
      {analysis?.duplicate_clients?.length > 0 ? (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Clientes Duplicados (Nome + Telefone)</span>
              <Badge className="bg-amber-100 text-amber-700">
                {analysis.duplicate_clients.length} grupos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.duplicate_clients.map((group, index) => (
                <Card key={group.key} className="border-2 border-amber-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{group.clients[0].client_name}</p>
                        <p className="text-sm text-slate-500">
                          Telefone: {group.clients[0].phone || group.clients[0].whatsapp}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-700">
                          {group.count} duplicatas
                        </Badge>
                        <Button 
                          size="sm"
                          onClick={() => handleUnifyGroup(group)}
                          disabled={unifyMutation.isPending}
                          className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                        >
                          <Merge className="w-4 h-4 mr-1" />
                          Unificar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>E-mail</TableHead>
                          <TableHead>CPF/CNPJ</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Certificado</TableHead>
                          <TableHead>Data Criação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.clients.map((client, idx) => (
                          <TableRow key={client.id} className={idx === 0 ? 'bg-green-50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {idx === 0 && (
                                  <Badge variant="outline" className="bg-green-100 text-green-700">
                                    Principal
                                  </Badge>
                                )}
                                <span className="font-medium">{client.client_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{client.email || '-'}</TableCell>
                            <TableCell className="text-sm">{client.cpf || client.cnpj || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{client.lead_status}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {client.has_certificate ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(parseISO(client.created_date), 'dd/MM/yyyy HH:mm')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Banco de Dados Limpo!
            </h3>
            <p className="text-slate-500">
              Nenhum cliente duplicado encontrado (baseado em nome + telefone)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}