import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, Users, Merge, X, Check, 
  Phone, Mail, Building2, User, CheckCircle2,
  ArrowRight
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function DuplicateManager({ clients, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [primaryClientId, setPrimaryClientId] = useState(null);
  const [selectedClientsInGroup, setSelectedClientsInGroup] = useState([]);
  const [ignoredGroups, setIgnoredGroups] = useState(new Set());
  const [ignoredClients, setIgnoredClients] = useState(new Set());

  // Função para calcular similaridade entre strings
  const calculateSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = (s1, s2) => {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
      const costs = [];
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[s2.length] = lastValue;
      }
      return costs[s2.length];
    };
    
    return (longer.length - editDistance(longer, shorter)) / longer.length;
  };

  // Detectar grupos de duplicados
  const duplicateGroups = useMemo(() => {
    const groups = [];
    const seen = new Map();
    
    // Agrupar por CPF, CNPJ e E-mail
    clients.forEach(client => {
      const identifiers = [
        client.cpf?.replace(/\D/g, '') ? `cpf:${client.cpf.replace(/\D/g, '')}` : null,
        client.cnpj?.replace(/\D/g, '') ? `cnpj:${client.cnpj.replace(/\D/g, '')}` : null,
        client.email?.toLowerCase().trim() ? `email:${client.email.toLowerCase().trim()}` : null,
      ].filter(Boolean);
      
      identifiers.forEach(id => {
        if (!seen.has(id)) {
          seen.set(id, []);
        }
        if (!seen.get(id).some(c => c.id === client.id)) {
          seen.get(id).push(client);
        }
      });
    });
    
    // Consolidar grupos de CPF/CNPJ/E-mail
    seen.forEach((clientList, identifier) => {
      if (clientList.length > 1) {
        const existingGroup = groups.find(g => 
          g.clients.some(c => clientList.some(cl => cl.id === c.id))
        );
        
        if (existingGroup) {
          clientList.forEach(c => {
            if (!existingGroup.clients.some(ec => ec.id === c.id)) {
              existingGroup.clients.push(c);
            }
          });
          if (!existingGroup.reasons.includes(identifier)) {
            existingGroup.reasons.push(identifier);
          }
        } else {
          groups.push({
            clients: [...clientList],
            reasons: [identifier]
          });
        }
      }
    });
    
    // Detectar nomes similares (similaridade > 85%)
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const client1 = clients[i];
        const client2 = clients[j];
        
        const similarity = calculateSimilarity(client1.client_name, client2.client_name);
        
        if (similarity > 0.85) {
          const existingGroup = groups.find(g => 
            g.clients.some(c => c.id === client1.id || c.id === client2.id)
          );
          
          if (existingGroup) {
            if (!existingGroup.clients.some(c => c.id === client1.id)) {
              existingGroup.clients.push(client1);
            }
            if (!existingGroup.clients.some(c => c.id === client2.id)) {
              existingGroup.clients.push(client2);
            }
            const reason = `nome:${client1.client_name}`;
            if (!existingGroup.reasons.includes(reason)) {
              existingGroup.reasons.push(reason);
            }
          } else {
            groups.push({
              clients: [client1, client2],
              reasons: [`nome:${client1.client_name}`]
            });
          }
        }
      }
    }
    
    return groups;
  }, [clients]);

  const mergeMutation = useMutation({
    mutationFn: async ({ primaryId, duplicateIds }) => {
      // Buscar todos os registros relacionados e transferi-los para o cliente principal
      const [interactions, appointments] = await Promise.all([
        base44.entities.Interaction.list(),
        base44.entities.Appointment.list()
      ]);

      // Atualizar interações
      const interactionsToUpdate = interactions.filter(i => 
        duplicateIds.includes(i.client_id)
      );
      await Promise.all(
        interactionsToUpdate.map(i => 
          base44.entities.Interaction.update(i.id, { client_id: primaryId })
        )
      );

      // Atualizar agendamentos
      const appointmentsToUpdate = appointments.filter(a => 
        duplicateIds.includes(a.client_id)
      );
      await Promise.all(
        appointmentsToUpdate.map(a => 
          base44.entities.Appointment.update(a.id, { client_id: primaryId })
        )
      );

      // Deletar clientes duplicados
      await Promise.all(
        duplicateIds.map(id => base44.entities.Client.delete(id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setSelectedGroup(null);
      setPrimaryClientId(null);
    },
  });

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setPrimaryClientId(group.clients[0].id);
    setSelectedClientsInGroup(group.clients.map(c => c.id));
  };

  const toggleClientSelection = (clientId) => {
    setSelectedClientsInGroup(prev => {
      if (prev.includes(clientId)) {
        if (prev.length <= 2) {
          alert('É necessário manter pelo menos 2 cadastros selecionados para unificar.');
          return prev;
        }
        if (clientId === primaryClientId) {
          alert('Não é possível desmarcar o cadastro principal. Selecione outro como principal primeiro.');
          return prev;
        }
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  const handleMerge = () => {
    if (!primaryClientId || !selectedGroup) return;

    const duplicateIds = selectedClientsInGroup
      .filter(id => id !== primaryClientId);

    if (duplicateIds.length === 0) {
      alert('Selecione pelo menos um cadastro duplicado para unificar.');
      return;
    }

    if (confirm(`Confirma a unificação de ${duplicateIds.length} cadastro(s) duplicado(s)? Esta ação não pode ser desfeita.`)) {
      mergeMutation.mutate({ primaryId: primaryClientId, duplicateIds });
    }
  };

  const handleIgnoreGroup = (groupId, group) => {
    // Adiciona todos os IDs do grupo aos clientes ignorados
    group.clients.forEach(client => {
      setIgnoredClients(prev => new Set([...prev, client.id]));
    });
    setIgnoredGroups(prev => new Set([...prev, groupId]));
    if (selectedGroup?.id === groupId) {
      setSelectedGroup(null);
    }
  };

  const handleIgnoreClient = (clientId) => {
    setIgnoredClients(prev => new Set([...prev, clientId]));
    // Remove da seleção se estiver selecionado
    setSelectedClientsInGroup(prev => prev.filter(id => id !== clientId));
    // Se for o principal, seleciona outro
    if (clientId === primaryClientId) {
      const remaining = selectedClientsInGroup.filter(id => id !== clientId);
      if (remaining.length > 0) {
        setPrimaryClientId(remaining[0]);
      }
    }
  };

  const handleRestoreIgnored = () => {
    setIgnoredGroups(new Set());
    setIgnoredClients(new Set());
  };

  const CompareField = ({ label, clients, field, icon: Icon }) => {
    const values = clients.map(c => c[field]).filter(Boolean);
    const allSame = values.every(v => v === values[0]);
    
    return (
      <div className="py-3 border-b border-slate-100 last:border-0">
        <div className="flex items-center gap-2 mb-2">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
          {allSame && values.length > 0 && (
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Igual
            </Badge>
          )}
        </div>
        <div className="grid gap-2">
          {clients.map((client, idx) => (
            <div 
              key={client.id} 
              className={`flex items-center gap-2 text-sm p-2 rounded ${
                client.id === primaryClientId 
                  ? 'bg-blue-50 border border-blue-200 font-medium' 
                  : 'bg-slate-50'
              }`}
            >
              <span className="text-slate-400 text-xs">#{idx + 1}</span>
              <span className={client[field] ? 'text-slate-800' : 'text-slate-400 italic'}>
                {client[field] || 'Não informado'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open && !selectedGroup} onOpenChange={(o) => !o && onOpenChange(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                Gerenciar Cadastros Duplicados
                <Badge variant="outline" className="ml-2">
                  {duplicateGroups.length} grupos encontrados
                </Badge>
              </div>
              {(ignoredGroups.size > 0 || ignoredClients.size > 0) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRestoreIgnored}
                  className="text-xs"
                >
                  Restaurar Ignorados ({ignoredGroups.size + ignoredClients.size})
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {duplicateGroups.filter((group, groupIdx) => {
            if (ignoredGroups.has(`group-${groupIdx}`)) return false;
            const hasActiveClients = group.clients.some(c => !ignoredClients.has(c.id));
            if (!hasActiveClients) return false;
            const activeCount = group.clients.filter(c => !ignoredClients.has(c.id)).length;
            return activeCount >= 2;
          }).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-slate-700">Nenhum duplicado encontrado!</p>
              <p className="text-slate-500 mt-2">Todos os cadastros estão únicos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.filter((group, groupIdx) => {
                // Filtra grupos que foram marcados como ignorados
                if (ignoredGroups.has(`group-${groupIdx}`)) return false;
                // Filtra grupos onde todos os clientes foram ignorados
                const hasActiveClients = group.clients.some(c => !ignoredClients.has(c.id));
                return hasActiveClients;
              }).map((group, idx) => {
                // Filtra apenas clientes ativos para exibição
                const activeClients = group.clients.filter(c => !ignoredClients.has(c.id));
                if (activeClients.length < 2) return null;
                
                return (
                <Card key={idx} className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Grupo {idx + 1} - {group.clients.length} cadastros
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-1">
                          Motivos: {group.reasons.map(r => 
                            r.startsWith('cpf:') ? 'CPF' : 
                            r.startsWith('cnpj:') ? 'CNPJ' : 
                            r.startsWith('email:') ? 'E-mail' : 
                            r.startsWith('nome:') ? 'Nome similar' : 'Outro'
                          ).join(', ')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleIgnoreGroup(`group-${idx}`, group);
                          }}
                          className="text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Não é duplicado
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleSelectGroup(group)}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <Merge className="w-4 h-4 mr-2" />
                          Revisar
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {activeClients.map((client) => (
                        <div key={client.id} className="p-3 bg-white rounded-lg border border-slate-200">
                          <p className="font-medium text-slate-800 truncate">{client.client_name}</p>
                          {client.company_name && (
                            <p className="text-xs text-slate-500 truncate">{client.company_name}</p>
                          )}
                          {client.email && (
                            <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {client.email}
                            </p>
                          )}
                          {(client.phone || client.whatsapp) && (
                            <p className="text-xs text-slate-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {client.phone || client.whatsapp}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                );
              }).filter(Boolean)}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Revisão e Unificação */}
      <Dialog open={!!selectedGroup} onOpenChange={(o) => !o && setSelectedGroup(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5 text-blue-600" />
              Revisar e Unificar Cadastros
            </DialogTitle>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-6">
              {/* Seleção do Registro Principal */}
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    1. Selecione o cadastro principal (será mantido)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {selectedGroup.clients.filter(c => !ignoredClients.has(c.id)).map((client, idx) => {
                      const isSelected = selectedClientsInGroup.includes(client.id);
                      const isPrimary = client.id === primaryClientId;
                      
                      return (
                        <div key={client.id} className="flex items-start gap-3">
                          <div className="flex flex-col gap-2 pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleClientSelection(client.id)}
                              className="w-4 h-4 rounded border-slate-300"
                              title="Incluir na unificação"
                            />
                            <input
                              type="radio"
                              name="primary"
                              checked={isPrimary}
                              onChange={() => setPrimaryClientId(client.id)}
                              disabled={!isSelected}
                              className="w-4 h-4"
                              title="Definir como principal"
                            />
                          </div>
                          <div 
                            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                              !isSelected ? 'opacity-50 bg-slate-100' : 
                              isPrimary ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-slate-800">
                                Cadastro #{idx + 1}
                              </span>
                              <div className="flex gap-2">
                                {!isSelected && <Badge variant="outline">Não unificar</Badge>}
                                {isPrimary && <Badge className="bg-blue-600">Principal</Badge>}
                              </div>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p><strong>Nome:</strong> {client.client_name}</p>
                              {client.client_code && <p><strong>Código:</strong> {client.client_code}</p>}
                              {client.company_name && <p><strong>Empresa:</strong> {client.company_name}</p>}
                              {client.email && <p><strong>E-mail:</strong> {client.email}</p>}
                              {client.phone && <p><strong>Telefone:</strong> {client.phone}</p>}
                              <p className="text-xs text-slate-500 mt-2">
                                Criado em: {new Date(client.created_date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleIgnoreClient(client.id)}
                            className="text-slate-400 hover:text-red-600 mt-1"
                            title="Marcar como não duplicado"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 mt-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Use o checkbox para incluir/excluir cadastros da unificação. Use o radio button para definir qual será o principal (mantido).</span>
                  </p>
                </CardContent>
              </Card>

              {/* Comparação de Campos */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    2. Compare os dados (cadastros não selecionados serão removidos)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <CompareField label="Código" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="client_code" />
                  <CompareField label="Nome" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="client_name" icon={User} />
                  <CompareField label="Empresa" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="company_name" icon={Building2} />
                  <CompareField label="CPF" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="cpf" />
                  <CompareField label="CNPJ" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="cnpj" />
                  <CompareField label="E-mail" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="email" icon={Mail} />
                  <CompareField label="Telefone" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="phone" icon={Phone} />
                  <CompareField label="WhatsApp" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="whatsapp" />
                  <CompareField label="Área de Atuação" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="business_area" />
                  <CompareField label="Observações" clients={selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id))} field="notes" />
                </CardContent>
              </Card>

              {/* Informações da Unificação */}
              <Card className="border-amber-200 bg-amber-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-slate-800 mb-2">O que vai acontecer:</p>
                      <ul className="space-y-1 text-slate-600">
                        <li className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          O cadastro principal será mantido com todos os seus dados
                        </li>
                        <li className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          Todas as interações e agendamentos dos duplicados serão transferidos para o principal
                        </li>
                        <li className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4" />
                          Os cadastros duplicados serão removidos permanentemente
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ações */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedGroup(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={handleMerge}
                  disabled={!primaryClientId || mergeMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {mergeMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Unificando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirmar Unificação
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}