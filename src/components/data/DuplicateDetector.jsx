import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Merge, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

function findDuplicates(clients) {
  const duplicates = [];
  const seen = new Map();

  clients.forEach(client => {
    const keys = [];
    if (client.email) keys.push(`email:${client.email.toLowerCase()}`);
    if (client.cpf) keys.push(`cpf:${client.cpf.replace(/\D/g, '')}`);
    
    keys.forEach(key => {
      if (seen.has(key)) {
        const existing = seen.get(key);
        const group = duplicates.find(d => d.includes(existing));
        if (group) {
          if (!group.includes(client.id)) group.push(client.id);
        } else {
          duplicates.push([existing, client.id]);
        }
      } else {
        seen.set(key, client.id);
      }
    });
  });

  return duplicates.map(ids => 
    clients.filter(c => ids.includes(c.id))
  );
}

function MergeDialog({ duplicates, onMerge, onDelete }) {
  const [selectedToKeep, setSelectedToKeep] = useState(duplicates[0]?.id);
  const [selectedToDelete, setSelectedToDelete] = useState(
    duplicates.slice(1).map(d => d.id)
  );

  const handleMerge = () => {
    const toKeep = duplicates.find(d => d.id === selectedToKeep);
    const toMerge = duplicates.filter(d => selectedToDelete.includes(d.id));
    
    // Mesclar dados: priorizar campos preenchidos
    const merged = { ...toKeep };
    toMerge.forEach(client => {
      Object.keys(client).forEach(key => {
        if (!merged[key] && client[key]) {
          merged[key] = client[key];
        }
      });
    });

    onMerge(selectedToKeep, merged, selectedToDelete);
  };

  return (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Merge className="w-5 h-5 text-amber-600" />
          Unificar Cadastros Duplicados
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Selecione qual registro manter e quais serão excluídos após a mesclagem dos dados.
        </p>

        <div className="grid gap-3">
          {duplicates.map((client) => (
            <Card 
              key={client.id}
              className={`border-2 ${selectedToKeep === client.id ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox
                        checked={selectedToKeep === client.id}
                        onCheckedChange={() => setSelectedToKeep(client.id)}
                      />
                      <div>
                        <p className="font-semibold text-slate-800">{client.client_name}</p>
                        {client.company_name && (
                          <p className="text-sm text-slate-500">{client.company_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm ml-7">
                      {client.cpf && <p><strong>CPF:</strong> {client.cpf}</p>}
                      {client.cnpj && <p><strong>CNPJ:</strong> {client.cnpj}</p>}
                      {client.email && <p><strong>Email:</strong> {client.email}</p>}
                      {client.phone && <p><strong>Telefone:</strong> {client.phone}</p>}
                      {client.whatsapp && <p><strong>WhatsApp:</strong> {client.whatsapp}</p>}
                      {client.business_area && <p><strong>Área:</strong> {client.business_area}</p>}
                    </div>
                  </div>

                  {selectedToKeep === client.id ? (
                    <Badge className="bg-green-600">Manter este</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedToDelete.includes(client.id)) {
                          setSelectedToDelete(prev => prev.filter(id => id !== client.id));
                        } else {
                          setSelectedToDelete(prev => [...prev, client.id]);
                        }
                      }}
                    >
                      {selectedToDelete.includes(client.id) ? (
                        <Check className="w-4 h-4 text-red-600" />
                      ) : (
                        <X className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="ml-2">Excluir</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => {}}>
          Cancelar
        </Button>
        <Button 
          onClick={handleMerge}
          className="bg-gradient-to-r from-amber-600 to-orange-600"
          disabled={selectedToDelete.length === 0}
        >
          <Merge className="w-4 h-4 mr-2" />
          Unificar Cadastros
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export default function DuplicateDetector() {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-duplicates'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    enabled: open,
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ keepId, mergedData, deleteIds }) => {
      await base44.entities.Client.update(keepId, mergedData);
      await Promise.all(deleteIds.map(id => base44.entities.Client.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['clients-for-duplicates']);
      handleScan();
    },
  });

  const handleScan = () => {
    setScanning(true);
    const found = findDuplicates(clients);
    setDuplicateGroups(found);
    setScanning(false);
  };

  React.useEffect(() => {
    if (open && clients.length > 0) {
      handleScan();
    }
  }, [open, clients]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <AlertTriangle className="w-4 h-4" />
          Detectar Duplicatas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Detecção de Cadastros Duplicados
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {scanning ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Escaneando cadastros...</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-8 text-center">
                <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="font-semibold text-green-900">Nenhuma duplicata encontrada!</p>
                <p className="text-sm text-green-700 mt-1">
                  Todos os cadastros estão únicos no sistema.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <p className="text-amber-900">
                    <strong>{duplicateGroups.length} grupos de duplicatas</strong> encontrados 
                    ({duplicateGroups.reduce((sum, g) => sum + g.length, 0)} registros no total)
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Clique em "Unificar" para mesclar os dados e remover duplicatas.
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {duplicateGroups.map((group, index) => (
                  <Card key={index} className="border-l-4 border-l-amber-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Grupo {index + 1} - {group.length} registros
                        </CardTitle>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Merge className="w-3 h-3" />
                              Unificar
                            </Button>
                          </DialogTrigger>
                          <MergeDialog
                            duplicates={group}
                            onMerge={(keepId, merged, deleteIds) => {
                              mergeMutation.mutate({ keepId, mergedData: merged, deleteIds });
                            }}
                          />
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {group.map(client => (
                          <div key={client.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{client.client_name}</p>
                              <div className="flex gap-3 text-xs text-slate-500">
                                {client.email && <span>📧 {client.email}</span>}
                                {client.cpf && <span>🪪 {client.cpf}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}