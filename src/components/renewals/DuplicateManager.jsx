import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DuplicateManager() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedToKeep, setSelectedToKeep] = useState({});

  const { data: duplicatesData, isLoading, refetch } = useQuery({
    queryKey: ['duplicate-certificates'],
    queryFn: async () => {
      const response = await base44.functions.invoke('detectDuplicateCertificates');
      return response.data;
    },
    enabled: open
  });

  const consolidateMutation = useMutation({
    mutationFn: async ({ idsToKeep, idsToRemove }) => {
      const response = await base44.functions.invoke('consolidateDuplicateCertificates', {
        certificateIdsToKeep: idsToKeep,
        certificateIdsToRemove: idsToRemove
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['clients']);
      refetch();
      setSelectedToKeep({});
    }
  });

  const handleConsolidate = () => {
    if (!duplicatesData?.duplicates) return;

    const idsToKeep = [];
    const idsToRemove = [];

    duplicatesData.duplicates.forEach((group, index) => {
      const keepId = selectedToKeep[index] || group.certificates[0].id;
      idsToKeep.push(keepId);
      
      group.certificates.forEach(cert => {
        if (cert.id !== keepId) {
          idsToRemove.push(cert.id);
        }
      });
    });

    if (idsToRemove.length === 0) {
      alert('Nenhum certificado duplicado para remover');
      return;
    }

    if (confirm(`Confirma a remoção de ${idsToRemove.length} certificados duplicados? Esta ação não pode ser desfeita.`)) {
      consolidateMutation.mutate({ idsToKeep, idsToRemove });
    }
  };

  const toggleKeep = (groupIndex, certId) => {
    setSelectedToKeep(prev => ({
      ...prev,
      [groupIndex]: certId
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <AlertTriangle className="w-4 h-4" />
          Gerenciar Duplicatas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Certificados Duplicados</DialogTitle>
          <DialogDescription>
            Detecte e remova certificados duplicados para o mesmo cliente e tipo.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-[#6B2D8B] border-t-transparent rounded-full mx-auto" />
            <p className="text-slate-500 mt-4">Analisando certificados...</p>
          </div>
        ) : duplicatesData?.duplicates?.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">
                    {duplicatesData.duplicate_groups} grupos duplicados encontrados
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Total de {duplicatesData.total_duplicates} certificados duplicados serão removidos.
                    Selecione qual certificado manter em cada grupo.
                  </p>
                </div>
              </div>
            </div>

            {duplicatesData.duplicates.map((group, groupIndex) => {
              const keepId = selectedToKeep[groupIndex] || group.certificates[0].id;
              
              return (
                <Card key={group.key} className="border-2 border-amber-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <div>
                        <span className="font-bold">{group.client_name}</span>
                        <Badge variant="outline" className="ml-2">
                          {group.certificate_type?.replace('_', '-').toUpperCase()}
                        </Badge>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700">
                        {group.count} duplicatas
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {group.certificates.map((cert) => {
                      const isSelected = cert.id === keepId;
                      
                      return (
                        <div
                          key={cert.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-green-500 bg-green-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => toggleKeep(groupIndex, cert.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                  <Trash2 className="w-5 h-5 text-red-400" />
                                )}
                                <p className="font-medium text-sm">
                                  {isSelected ? 'Manter este' : 'Será removido'}
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 ml-7">
                                <div>
                                  <span className="font-medium">Vencimento:</span>{' '}
                                  {cert.expiry_date ? format(parseISO(cert.expiry_date), 'dd/MM/yyyy') : '-'}
                                </div>
                                <div>
                                  <span className="font-medium">Status:</span>{' '}
                                  {cert.renewal_status || 'pendente'}
                                </div>
                                <div>
                                  <span className="font-medium">Criado em:</span>{' '}
                                  {cert.created_date ? format(parseISO(cert.created_date), 'dd/MM/yyyy') : '-'}
                                </div>
                                <div>
                                  <span className="font-medium">Agente:</span>{' '}
                                  {cert.assigned_agent || '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConsolidate}
                disabled={consolidateMutation.isPending}
                className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
              >
                {consolidateMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Consolidando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Consolidar e Remover Duplicatas
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-slate-800">
              Nenhuma duplicata encontrada!
            </p>
            <p className="text-slate-500 mt-2">
              Todos os certificados estão únicos por cliente e tipo.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}