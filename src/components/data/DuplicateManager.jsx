import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, Users, Merge, X, Check, 
  Phone, Mail, Building2, User, CheckCircle2,
  ArrowRight, FileSearch, Edit3, History, Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function DuplicateManager({ clients, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [primaryClientId, setPrimaryClientId] = useState(null);
  const [selectedClientsInGroup, setSelectedClientsInGroup] = useState([]);
  const [analyzedGroups, setAnalyzedGroups] = useState(new Set());
  const [notDuplicateGroups, setNotDuplicateGroups] = useState(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [fieldSelection, setFieldSelection] = useState({});
  const [showHistory, setShowHistory] = useState(false);

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
    
    // Função para verificar se dois clientes foram marcados como não-duplicados
    const isMarkedAsNotDuplicate = (client1, client2) => {
      const list1 = client1.not_duplicate_with || [];
      const list2 = client2.not_duplicate_with || [];
      return list1.includes(client2.id) || list2.includes(client1.id);
    };
    
    // Agrupar por CPF, CNPJ, E-mail, Telefone e Endereço
    clients.forEach(client => {
      const phone = client.phone?.replace(/\D/g, '');
      const whatsapp = client.whatsapp?.replace(/\D/g, '');
      const cnpj = client.cnpj?.replace(/\D/g, '');
      const address = client.address?.toLowerCase().trim();
      
      const identifiers = [
        client.cpf?.replace(/\D/g, '') ? `cpf:${client.cpf.replace(/\D/g, '')}` : null,
        cnpj ? `cnpj:${cnpj}` : null,
        cnpj && cnpj.length >= 8 ? `cnpj_partial:${cnpj.substring(0, 8)}` : null,
        client.email?.toLowerCase().trim() ? `email:${client.email.toLowerCase().trim()}` : null,
        phone && phone.length >= 8 ? `phone:${phone.slice(-8)}` : null,
        whatsapp && whatsapp.length >= 8 ? `phone:${whatsapp.slice(-8)}` : null,
        address && address.length > 10 ? `address:${address}` : null,
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
    
    // Consolidar grupos de CPF/CNPJ/E-mail (excluindo pares marcados como não-duplicados)
    seen.forEach((clientList, identifier) => {
      if (clientList.length > 1) {
        // Filtrar clientes que foram marcados como não-duplicados entre si
        const validPairs = [];
        for (let i = 0; i < clientList.length; i++) {
          for (let j = i + 1; j < clientList.length; j++) {
            if (!isMarkedAsNotDuplicate(clientList[i], clientList[j])) {
              validPairs.push([clientList[i], clientList[j]]);
            }
          }
        }
        
        if (validPairs.length === 0) return;
        
        const existingGroup = groups.find(g => 
          g.clients.some(c => clientList.some(cl => cl.id === c.id && !isMarkedAsNotDuplicate(c, cl)))
        );
        
        if (existingGroup) {
          clientList.forEach(c => {
            if (!existingGroup.clients.some(ec => ec.id === c.id)) {
              const hasValidPair = clientList.some(cl => 
                cl.id !== c.id && !isMarkedAsNotDuplicate(c, cl)
              );
              if (hasValidPair) {
                existingGroup.clients.push(c);
              }
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
    
    // Detectar nomes similares (similaridade > 85%, excluindo marcados como não-duplicados)
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const client1 = clients[i];
        const client2 = clients[j];
        
        // Pular se já foram marcados como não-duplicados
        if (isMarkedAsNotDuplicate(client1, client2)) continue;
        
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
    mutationFn: async ({ primaryId, duplicateIds, unifiedData, selectedFields, removedClientsData, reason }) => {
      console.log('🔄 Iniciando unificação:', { primaryId, duplicateIds, unifiedData });
      
      const user = await base44.auth.me();
      
      // Buscar todos os registros relacionados
      const [interactions, appointments, certificates, tasks] = await Promise.all([
        base44.entities.Interaction.list(),
        base44.entities.Appointment.list(),
        base44.entities.Certificate.list(),
        base44.entities.Task.list()
      ]);

      console.log('📊 Registros encontrados:', {
        interactions: interactions.length,
        appointments: appointments.length,
        certificates: certificates.length,
        tasks: tasks.length
      });

      // Atualizar interações
      const interactionsToUpdate = interactions.filter(i => duplicateIds.includes(i.client_id));
      if (interactionsToUpdate.length > 0) {
        console.log(`📝 Transferindo ${interactionsToUpdate.length} interações...`);
        await Promise.all(
          interactionsToUpdate.map(i => 
            base44.entities.Interaction.update(i.id, { client_id: primaryId })
          )
        );
      }

      // Atualizar agendamentos
      const appointmentsToUpdate = appointments.filter(a => duplicateIds.includes(a.client_id));
      if (appointmentsToUpdate.length > 0) {
        console.log(`📅 Transferindo ${appointmentsToUpdate.length} agendamentos...`);
        await Promise.all(
          appointmentsToUpdate.map(a => 
            base44.entities.Appointment.update(a.id, { client_id: primaryId })
          )
        );
      }

      // Atualizar certificados
      const certificatesToUpdate = certificates.filter(c => duplicateIds.includes(c.client_id));
      if (certificatesToUpdate.length > 0) {
        console.log(`📜 Transferindo ${certificatesToUpdate.length} certificados...`);
        await Promise.all(
          certificatesToUpdate.map(c => 
            base44.entities.Certificate.update(c.id, { client_id: primaryId })
          )
        );
      }

      // Atualizar tarefas
      const tasksToUpdate = tasks.filter(t => duplicateIds.includes(t.client_id));
      if (tasksToUpdate.length > 0) {
        console.log(`✅ Transferindo ${tasksToUpdate.length} tarefas...`);
        await Promise.all(
          tasksToUpdate.map(t => 
            base44.entities.Task.update(t.id, { client_id: primaryId })
          )
        );
      }

      // Atualizar cliente principal com dados unificados
      console.log('📝 Atualizando cliente principal com campos selecionados...');
      await base44.entities.Client.update(primaryId, unifiedData);

      // Deletar clientes duplicados
      console.log(`🗑️ Removendo ${duplicateIds.length} cadastros duplicados...`);
      await Promise.all(
        duplicateIds.map(id => base44.entities.Client.delete(id))
      );

      // Criar histórico de unificação
      console.log('📚 Registrando histórico...');
      await base44.entities.UnificationHistory.create({
        unified_client_id: primaryId,
        unified_client_name: unifiedData.client_name,
        removed_client_ids: duplicateIds,
        removed_clients_data: removedClientsData,
        selected_fields: selectedFields,
        unification_reason: reason,
        records_transferred: {
          interactions: interactionsToUpdate.length,
          appointments: appointmentsToUpdate.length,
          certificates: certificatesToUpdate.length,
          tasks: tasksToUpdate.length
        },
        performed_by: user?.email || 'unknown',
        performed_at: new Date().toISOString()
      });

      console.log('✅ Unificação concluída com sucesso!');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['certificates']);
      queryClient.invalidateQueries(['existing-clients-for-import']);
      alert('✅ Cadastros unificados com sucesso!');
      setSelectedGroup(null);
      setPrimaryClientId(null);
      setSelectedClientsInGroup([]);
    },
    onError: (error) => {
      console.error('❌ Erro ao unificar:', error);
      alert('Erro ao unificar cadastros: ' + error.message);
    }
  });

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setPrimaryClientId(group.clients[0].id);
    setSelectedClientsInGroup(group.clients.map(c => c.id));
    setEditMode(false);
    setEditedData({});
    
    // Inicializar seleção de campos com o primeiro cliente
    const initialSelection = {};
    const fields = ['client_name', 'company_name', 'cpf', 'cnpj', 'email', 'phone', 'whatsapp', 'address', 'business_area', 'notes'];
    fields.forEach(field => {
      initialSelection[field] = group.clients[0].id;
    });
    setFieldSelection(initialSelection);
  };

  const handleAnalyzeGroup = async (group, groupIndex) => {
    setIsAnalyzing(true);
    try {
      // Usar IA para análise inteligente de duplicados
      const clientsData = group.clients.map(c => ({
        id: c.id,
        nome: c.client_name,
        empresa: c.company_name,
        cpf: c.cpf,
        cnpj: c.cnpj,
        email: c.email,
        telefone: c.phone || c.whatsapp,
        endereco: c.address
      }));
      
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise se estes cadastros são duplicados da mesma pessoa/empresa:
${JSON.stringify(clientsData, null, 2)}

Responda em JSON com:
- is_duplicate: true/false
- confidence: 0-100 (%)
- reason: explicação breve
- suggested_primary: ID do melhor registro (mais completo)
- field_recommendations: para cada campo, qual ID tem o melhor valor`,
        response_json_schema: {
          type: "object",
          properties: {
            is_duplicate: { type: "boolean" },
            confidence: { type: "number" },
            reason: { type: "string" },
            suggested_primary: { type: "string" },
            field_recommendations: { 
              type: "object",
              properties: {
                client_name: { type: "string" },
                company_name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" }
              }
            }
          }
        }
      });
      
      setAnalyzedGroups(prev => new Set([...prev, groupIndex]));
      
      if (analysis.is_duplicate && analysis.confidence > 70) {
        handleSelectGroup(group);
        
        // Aplicar recomendações de campos
        if (analysis.field_recommendations) {
          setFieldSelection(analysis.field_recommendations);
        }
        
        // Definir primário sugerido
        if (analysis.suggested_primary) {
          setPrimaryClientId(analysis.suggested_primary);
        }
      }
    } catch (error) {
      console.error('Erro ao analisar:', error);
      setAnalyzedGroups(prev => new Set([...prev, groupIndex]));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMarkAsNotDuplicate = async (group, groupIndex) => {
    if (confirm('Confirma que estes cadastros NÃO são duplicados? Esta informação será salva no sistema.')) {
      try {
        // Marcar cada cliente como não-duplicado em relação aos outros do grupo
        const clientIds = group.clients.map(c => c.id);
        
        await Promise.all(
          group.clients.map(async (client) => {
            const otherIds = clientIds.filter(id => id !== client.id);
            const existingList = client.not_duplicate_with || [];
            const newList = [...new Set([...existingList, ...otherIds])];
            
            await base44.entities.Client.update(client.id, {
              not_duplicate_with: newList
            });
          })
        );
        
        setNotDuplicateGroups(prev => new Set([...prev, groupIndex]));
        queryClient.invalidateQueries(['clients']);
        alert('✅ Marcado como não-duplicado no sistema!');
      } catch (error) {
        console.error('Erro ao marcar como não-duplicado:', error);
        alert('Erro ao salvar: ' + error.message);
      }
    }
  };

  const handleFieldChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyBulkEdit = async () => {
    if (!primaryClientId || Object.keys(editedData).length === 0) return;

    try {
      await base44.entities.Client.update(primaryClientId, editedData);
      queryClient.invalidateQueries(['clients']);
      setEditMode(false);
      setEditedData({});
      alert('Dados atualizados com sucesso!');
    } catch (error) {
      alert('Erro ao atualizar dados: ' + error.message);
    }
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

  const handleMerge = async () => {
    if (!primaryClientId || !selectedGroup) return;

    const duplicateIds = selectedClientsInGroup.filter(id => id !== primaryClientId);
    if (duplicateIds.length === 0) {
      alert('Selecione pelo menos um cadastro duplicado para unificar.');
      return;
    }

    // Construir dados unificados com campos selecionados
    const unifiedData = {};
    Object.entries(fieldSelection).forEach(([field, clientId]) => {
      const client = selectedGroup.clients.find(c => c.id === clientId);
      if (client && client[field]) {
        unifiedData[field] = client[field];
      }
    });

    if (confirm(`Confirma a unificação de ${duplicateIds.length} cadastro(s) duplicado(s)? Esta ação não pode ser desfeita.`)) {
      mergeMutation.mutate({ 
        primaryId: primaryClientId, 
        duplicateIds,
        unifiedData,
        selectedFields: fieldSelection,
        removedClientsData: selectedGroup.clients.filter(c => duplicateIds.includes(c.id)),
        reason: selectedGroup.reasons.join(', ')
      });
    }
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
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-600" />
              Gerenciar Cadastros Duplicados
              <Badge variant="outline" className="ml-2">
                {duplicateGroups.length} grupos encontrados
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {duplicateGroups.filter((_, idx) => !notDuplicateGroups.has(idx)).length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium text-slate-700">Nenhum duplicado encontrado!</p>
              <p className="text-slate-500 mt-2">Todos os cadastros estão únicos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicateGroups.map((group, idx) => {
                if (notDuplicateGroups.has(idx)) return null;
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
                            r.startsWith('cnpj_partial:') ? 'CNPJ Parcial' :
                            r.startsWith('cnpj:') ? 'CNPJ' : 
                            r.startsWith('email:') ? 'E-mail' :
                            r.startsWith('phone:') ? 'Telefone' :
                            r.startsWith('address:') ? 'Endereço' :
                            r.startsWith('nome:') ? 'Nome similar' : 'Outro'
                          ).join(', ')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleAnalyzeGroup(group, idx)}
                          disabled={isAnalyzing}
                          className={analyzedGroups.has(idx) ? 'border-green-500 text-green-700 bg-green-50' : ''}
                        >
                          {isAnalyzing ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          {analyzedGroups.has(idx) ? '✓ Analisado com IA' : 'Analisar com IA'}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleSelectGroup(group)}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          <Merge className="w-4 h-4 mr-2" />
                          Revisar
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsNotDuplicate(group, idx)}
                          className="border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Não é Duplicado
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {group.clients.map((client) => (
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
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Revisão e Unificação */}
      <Dialog open={!!selectedGroup} onOpenChange={(o) => !o && setSelectedGroup(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Merge className="w-5 h-5 text-blue-600" />
                Revisar e Unificar Cadastros
              </DialogTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="w-4 h-4 mr-2" />
                Histórico
              </Button>
            </div>
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
                    {selectedGroup.clients.map((client, idx) => {
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
                            />
                            <input
                              type="radio"
                              name="primary"
                              checked={isPrimary}
                              onChange={() => setPrimaryClientId(client.id)}
                              disabled={!isSelected}
                              className="w-4 h-4"
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
                                {!isSelected && <Badge variant="outline">Excluído</Badge>}
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

              {/* Seleção Inteligente de Campos */}
              <Card className="border-purple-200 bg-purple-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    2. Selecione os melhores dados de cada campo
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Clique em cada campo para escolher qual valor manter no registro unificado
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['client_name', 'company_name', 'cpf', 'cnpj', 'email', 'phone', 'whatsapp', 'address', 'business_area', 'notes'].map(field => {
                    const fieldLabels = {
                      client_name: 'Nome',
                      company_name: 'Empresa',
                      cpf: 'CPF',
                      cnpj: 'CNPJ',
                      email: 'E-mail',
                      phone: 'Telefone',
                      whatsapp: 'WhatsApp',
                      address: 'Endereço',
                      business_area: 'Área',
                      notes: 'Observações'
                    };
                    
                    return (
                      <div key={field} className="border-b border-purple-100 last:border-0 pb-3">
                        <p className="text-xs font-medium text-slate-500 uppercase mb-2">{fieldLabels[field]}</p>
                        <div className="grid gap-2">
                          {selectedGroup.clients.filter(c => selectedClientsInGroup.includes(c.id)).map((client, idx) => {
                            const isSelected = fieldSelection[field] === client.id;
                            const value = client[field];
                            if (!value) return null;
                            
                            return (
                              <button
                                key={client.id}
                                onClick={() => setFieldSelection(prev => ({ ...prev, [field]: client.id }))}
                                className={`text-left p-2 rounded-lg border-2 transition-all ${
                                  isSelected 
                                    ? 'border-purple-500 bg-purple-100 font-medium' 
                                    : 'border-slate-200 bg-white hover:border-purple-300'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-800">{value}</span>
                                  {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                                </div>
                                <span className="text-xs text-slate-400">Cadastro #{idx + 1}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Comparação de Campos (Original) */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      3. Comparação completa (referência)
                    </CardTitle>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => setEditMode(!editMode)}
                      className="gap-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      {editMode ? 'Cancelar Edição' : 'Editar Dados'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-0">{editMode && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <p className="text-sm font-medium text-blue-900 mb-3">Editar dados do cadastro principal:</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nome</Label>
                          <Input
                            value={editedData.client_name || selectedGroup.clients.find(c => c.id === primaryClientId)?.client_name || ''}
                            onChange={(e) => handleFieldChange('client_name', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Empresa</Label>
                          <Input
                            value={editedData.company_name || selectedGroup.clients.find(c => c.id === primaryClientId)?.company_name || ''}
                            onChange={(e) => handleFieldChange('company_name', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">CPF</Label>
                          <Input
                            value={editedData.cpf || selectedGroup.clients.find(c => c.id === primaryClientId)?.cpf || ''}
                            onChange={(e) => handleFieldChange('cpf', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">CNPJ</Label>
                          <Input
                            value={editedData.cnpj || selectedGroup.clients.find(c => c.id === primaryClientId)?.cnpj || ''}
                            onChange={(e) => handleFieldChange('cnpj', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">E-mail</Label>
                          <Input
                            type="email"
                            value={editedData.email || selectedGroup.clients.find(c => c.id === primaryClientId)?.email || ''}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Telefone</Label>
                          <Input
                            value={editedData.phone || selectedGroup.clients.find(c => c.id === primaryClientId)?.phone || ''}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Observações</Label>
                          <Textarea
                            value={editedData.notes || selectedGroup.clients.find(c => c.id === primaryClientId)?.notes || ''}
                            onChange={(e) => handleFieldChange('notes', e.target.value)}
                            className="mt-1"
                            rows={2}
                          />
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={handleApplyBulkEdit}
                        disabled={Object.keys(editedData).length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Aplicar Alterações
                      </Button>
                    </div>
                  )}
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