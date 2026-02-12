import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  AlertTriangle, Database, RefreshCw, CheckCircle2, Users, 
  FileText, Trash2, Merge, Eye, Search, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DatabaseCleaning() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showUnifyAssistant, setShowUnifyAssistant] = useState(false);
  const [unifyData, setUnifyData] = useState(null);

  // Buscar TODOS os clientes e certificados
  const { data: allClients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['all-clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 5000),
  });

  const { data: allCertificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ['all-certificates'],
    queryFn: () => base44.entities.Certificate.list('-created_date', 5000),
  });

  // Consolidar todos os registros em uma única lista
  const allRecords = useMemo(() => {
    const records = [];

    // Clientes da entidade Client
    allClients.forEach(client => {
      records.push({
        id: client.id,
        type: 'client',
        name: client.client_name,
        cpf: client.cpf,
        cnpj: client.cnpj,
        phone: client.phone || client.whatsapp,
        email: client.email,
        origin: 'Cadastro',
        created_date: client.created_date,
        updated_date: client.updated_date,
        status: client.lead_status,
        raw: client
      });
    });

    // Certificados da entidade Certificate (que não têm cliente vinculado)
    allCertificates.forEach(cert => {
      if (!cert.client_id) {
        records.push({
          id: cert.id,
          type: 'certificate',
          name: cert.client_name,
          cpf: '',
          cnpj: '',
          phone: cert.client_phone,
          email: cert.client_email,
          origin: 'Renovação',
          created_date: cert.created_date,
          updated_date: cert.created_date,
          status: cert.renewal_status,
          raw: cert
        });
      }
    });

    return records;
  }, [allClients, allCertificates]);

  // Busca e filtros
  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      const search = searchTerm.toLowerCase();
      return (
        record.name?.toLowerCase().includes(search) ||
        record.cpf?.includes(search) ||
        record.cnpj?.includes(search) ||
        record.phone?.includes(search) ||
        record.email?.toLowerCase().includes(search)
      );
    });
  }, [allRecords, searchTerm]);

  // Identificar possíveis duplicados
  const duplicateGroups = useMemo(() => {
    const groups = new Map();

    filteredRecords.forEach(record => {
      const phone = String(record.phone || '').replace(/\D/g, '');
      const name = String(record.name || '').toLowerCase().trim();

      if (!name || !phone) return;

      const key = `${name}_${phone}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(record);
    });

    // Filtrar apenas grupos com 2+ registros
    return Array.from(groups.values()).filter(g => g.length > 1);
  }, [filteredRecords]);

  // Toggle seleção
  const toggleSelect = (id) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredRecords.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredRecords.map(r => r.id)));
    }
  };

  // Abrir assistente de unificação
  const handleUnify = () => {
    const selected = filteredRecords.filter(r => selectedRows.has(r.id));
    if (selected.length < 2) {
      alert('Selecione pelo menos 2 registros para unificar');
      return;
    }
    setUnifyData(selected);
    setShowUnifyAssistant(true);
  };

  // Deletar selecionados
  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      const results = [];
      for (const id of ids) {
        const record = allRecords.find(r => r.id === id);
        if (!record) continue;

        try {
          if (record.type === 'client') {
            await base44.entities.Client.delete(id);
          } else {
            await base44.entities.Certificate.delete(id);
          }
          results.push({ id, success: true });
        } catch (error) {
          results.push({ id, success: false, error: error.message });
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-clients']);
      queryClient.invalidateQueries(['all-certificates']);
      setSelectedRows(new Set());
    }
  });

  const handleDelete = () => {
    if (selectedRows.size === 0) {
      alert('Selecione registros para excluir');
      return;
    }

    if (confirm(`Confirma a exclusão de ${selectedRows.size} registro(s)? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate(Array.from(selectedRows));
    }
  };

  const isLoading = loadingClients || loadingCerts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#6B2D8B] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to={createPageUrl('DataImport')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-800">Limpeza de Dados</h1>
          </div>
          <p className="text-slate-500">Gestão manual de duplicados e registros</p>
        </div>
        <div className="flex gap-2">
          {selectedRows.size > 0 && (
            <>
              <Button 
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Selecionados ({selectedRows.size})
              </Button>
              {selectedRows.size >= 2 && (
                <Button 
                  onClick={handleUnify}
                  className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                >
                  <Merge className="w-4 h-4 mr-2" />
                  Unificar Selecionados
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-slate-500">Total de Registros</p>
                <p className="text-2xl font-bold text-slate-800">{allRecords.length}</p>
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
                <p className="text-2xl font-bold text-slate-800">{duplicateGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-slate-500">Selecionados</p>
                <p className="text-2xl font-bold text-slate-800">{selectedRows.size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups Alert */}
      {duplicateGroups.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">
                  {duplicateGroups.length} grupos de possíveis duplicados detectados
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Registros agrupados por nome + telefone idênticos. Revise e unifique manualmente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Todos os Registros ({filteredRecords.length})</span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedRows.size === filteredRecords.length && filteredRecords.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-normal text-slate-500">Selecionar todos</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">CPF/CNPJ</TableHead>
                  <TableHead className="font-semibold">Telefone</TableHead>
                  <TableHead className="font-semibold">E-mail</TableHead>
                  <TableHead className="font-semibold">Origem</TableHead>
                  <TableHead className="font-semibold">Data Criação</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const isDuplicate = duplicateGroups.some(g => g.some(r => r.id === record.id));
                  
                  return (
                    <TableRow 
                      key={record.id} 
                      className={`hover:bg-slate-50 ${isDuplicate ? 'bg-amber-50/50' : ''}`}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.has(record.id)}
                          onCheckedChange={() => toggleSelect(record.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isDuplicate && (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          )}
                          <span className="font-medium">{record.name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{record.cpf || record.cnpj || '-'}</TableCell>
                      <TableCell className="text-sm">{record.phone || '-'}</TableCell>
                      <TableCell className="text-sm">{record.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.origin}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.created_date ? format(parseISO(record.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{record.status || 'ativo'}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <Database className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">Nenhum registro encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unify Assistant Dialog */}
      {showUnifyAssistant && unifyData && (
        <UnifyAssistant
          records={unifyData}
          onClose={() => {
            setShowUnifyAssistant(false);
            setUnifyData(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries(['all-clients']);
            queryClient.invalidateQueries(['all-certificates']);
            setSelectedRows(new Set());
            setShowUnifyAssistant(false);
            setUnifyData(null);
          }}
        />
      )}
    </div>
  );
}

// Assistente de Unificação
function UnifyAssistant({ records, onClose, onSuccess }) {
  const [masterId, setMasterId] = useState(records[0]?.id);
  const [fieldSelections, setFieldSelections] = useState({});

  const master = records.find(r => r.id === masterId);
  const duplicates = records.filter(r => r.id !== masterId);

  // Mutation para unificar
  const unifyMutation = useMutation({
    mutationFn: async () => {
      // 1. Mesclar dados no master
      const mergedData = { ...master.raw };
      
      Object.keys(fieldSelections).forEach(field => {
        const selectedRecordId = fieldSelections[field];
        const selectedRecord = records.find(r => r.id === selectedRecordId);
        if (selectedRecord) {
          mergedData[field] = selectedRecord.raw[field];
        }
      });

      // 2. Atualizar master
      if (master.type === 'client') {
        await base44.entities.Client.update(master.id, mergedData);
      }

      // 3. Transferir certificados e interações
      for (const dup of duplicates) {
        if (dup.type === 'client') {
          // Transferir certificados
          const certs = await base44.entities.Certificate.filter({ client_id: dup.id });
          for (const cert of certs) {
            await base44.entities.Certificate.update(cert.id, { client_id: master.id });
          }

          // Transferir interações
          const interactions = await base44.entities.Interaction.filter({ client_id: dup.id });
          for (const inter of interactions) {
            await base44.entities.Interaction.update(inter.id, { client_id: master.id });
          }

          // Deletar cliente duplicado
          await base44.entities.Client.delete(dup.id);
        } else {
          // Deletar certificado órfão
          await base44.entities.Certificate.delete(dup.id);
        }
      }

      // 4. Criar registro de auditoria
      await base44.entities.UnificationHistory.create({
        unified_client_id: master.id,
        unified_client_name: master.name,
        removed_client_ids: duplicates.map(d => d.id),
        removed_clients_data: duplicates.map(d => d.raw),
        selected_fields: fieldSelections,
        unification_reason: 'Manual - Limpeza de Dados',
        performed_by: (await base44.auth.me()).email,
        performed_at: new Date().toISOString()
      });

      return { success: true };
    },
    onSuccess: () => {
      alert('Unificação concluída com sucesso!');
      onSuccess();
    }
  });

  const fields = ['name', 'cpf', 'cnpj', 'phone', 'email'];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assistente de Unificação</DialogTitle>
          <DialogDescription>
            Escolha o registro principal e selecione os dados que deseja manter campo a campo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selecionar Master */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Registro Principal (Master)
            </label>
            <div className="space-y-2">
              {records.map(record => (
                <div 
                  key={record.id}
                  onClick={() => setMasterId(record.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    record.id === masterId 
                      ? 'border-[#6B2D8B] bg-[#6B2D8B]/5' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      record.id === masterId 
                        ? 'border-[#6B2D8B] bg-[#6B2D8B]' 
                        : 'border-slate-300'
                    }`} />
                    <div>
                      <p className="font-medium">{record.name}</p>
                      <p className="text-xs text-slate-500">
                        {record.origin} • {record.phone} • {record.email}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campos Conflitantes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Escolha os valores finais para cada campo
            </label>
            <div className="space-y-4">
              {fields.map(field => {
                const values = records.map(r => r[field]).filter(Boolean);
                const uniqueValues = [...new Set(values)];
                
                if (uniqueValues.length <= 1) return null;

                return (
                  <div key={field} className="border rounded-lg p-4">
                    <p className="font-medium text-sm mb-2 capitalize">{field}</p>
                    <div className="space-y-2">
                      {records.map(record => {
                        if (!record[field]) return null;
                        return (
                          <div 
                            key={record.id}
                            onClick={() => setFieldSelections(prev => ({ ...prev, [field]: record.id }))}
                            className={`p-2 rounded cursor-pointer text-sm ${
                              fieldSelections[field] === record.id
                                ? 'bg-[#6B2D8B] text-white'
                                : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                          >
                            {record[field]}
                            {record.id === masterId && (
                              <Badge variant="outline" className="ml-2">Master</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => unifyMutation.mutate()}
              disabled={unifyMutation.isPending}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              {unifyMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Unificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Unificação
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}