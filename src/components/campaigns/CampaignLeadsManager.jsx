import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Plus, UserPlus, Search, GitBranch, Check, X, ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FUNNEL_STAGES = [
  { id: 'lead', name: 'Lead', color: 'bg-slate-500' },
  { id: 'contato', name: 'Contato', color: 'bg-blue-500' },
  { id: 'qualificacao', name: 'Qualificação', color: 'bg-cyan-500' },
  { id: 'proposta', name: 'Proposta', color: 'bg-purple-500' },
  { id: 'negociacao', name: 'Negociação', color: 'bg-amber-500' },
  { id: 'fechamento', name: 'Fechamento', color: 'bg-green-500' },
];

export default function CampaignLeadsManager({ campaign, onClose }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [initialStage, setInitialStage] = useState('lead');
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Buscar clientes
  const { data: allClients = [] } = useQuery({
    queryKey: ['all-clients-for-campaign'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
  });

  // Clientes já na campanha
  const campaignClients = allClients.filter(c => c.campaign_id === campaign.id);

  // Clientes disponíveis (não estão em nenhuma campanha ativa ou estão sem campanha)
  const availableClients = allClients.filter(c => !c.campaign_id || c.campaign_id !== campaign.id);

  // Filtrar por busca
  const filteredAvailable = availableClients.filter(c => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      c.client_name?.toLowerCase().includes(search) ||
      c.company_name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.phone?.includes(search)
    );
  });

  // Adicionar leads à campanha
  const addLeadsMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedLeads.map(clientId => 
        base44.entities.Client.update(clientId, {
          campaign_id: campaign.id,
          funnel_stage: initialStage,
          funnel_updated_at: new Date().toISOString(),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-clients-for-campaign']);
      queryClient.invalidateQueries(['pipeline-clients']);
      setSelectedLeads([]);
      setShowAddDialog(false);
    },
  });

  // Remover lead da campanha
  const removeLeadMutation = useMutation({
    mutationFn: (clientId) => base44.entities.Client.update(clientId, {
      campaign_id: null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-clients-for-campaign']);
      queryClient.invalidateQueries(['pipeline-clients']);
    },
  });

  const toggleLeadSelection = (clientId) => {
    setSelectedLeads(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const selectAll = () => {
    if (selectedLeads.length === filteredAvailable.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredAvailable.map(c => c.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Leads da Campanha: {campaign.name}
          </h3>
          <p className="text-sm text-slate-500">
            {campaignClients.length} leads vinculados
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl(`SalesPipeline?campaign=${campaign.id}`)}>
            <Button variant="outline">
              <GitBranch className="w-4 h-4 mr-2" />
              Ver no Funil
            </Button>
          </Link>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Adicionar Leads
          </Button>
        </div>
      </div>

      {/* Leads Vinculados */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6B2D8B]" />
            Leads Vinculados ({campaignClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignClients.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Nenhum lead vinculado a esta campanha</p>
              <Button 
                onClick={() => setShowAddDialog(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Leads
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {campaignClients.map(client => (
                <div 
                  key={client.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold">
                      {client.client_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{client.client_name}</p>
                      <p className="text-xs text-slate-500">{client.email || client.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${FUNNEL_STAGES.find(s => s.id === client.funnel_stage)?.color || 'bg-slate-500'} text-white`}>
                      {FUNNEL_STAGES.find(s => s.id === client.funnel_stage)?.name || 'Lead'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLeadMutation.mutate(client.id)}
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar leads */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Adicionar Leads à Campanha</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Busca e Filtros */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={initialStage} onValueChange={setInitialStage}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Etapa inicial" />
                </SelectTrigger>
                <SelectContent>
                  {FUNNEL_STAGES.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção */}
            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox 
                  checked={selectedLeads.length === filteredAvailable.length && filteredAvailable.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm">Selecionar todos</span>
              </label>
              <Badge variant="secondary">
                {selectedLeads.length} selecionados
              </Badge>
            </div>

            {/* Lista de Leads */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredAvailable.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>Nenhum lead disponível</p>
                </div>
              ) : (
                filteredAvailable.map(client => (
                  <label
                    key={client.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedLeads.includes(client.id) 
                        ? 'bg-[#6B2D8B]/5 border-[#6B2D8B]' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox 
                      checked={selectedLeads.includes(client.id)}
                      onCheckedChange={() => toggleLeadSelection(client.id)}
                    />
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-medium">
                      {client.client_name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{client.client_name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {client.company_name || client.email || client.phone || 'Sem contato'}
                      </p>
                    </div>
                    {client.lead_source && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {client.lead_source.replace('_', ' ')}
                      </Badge>
                    )}
                  </label>
                ))
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-slate-500">
                Os leads serão adicionados na etapa "{FUNNEL_STAGES.find(s => s.id === initialStage)?.name}"
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => addLeadsMutation.mutate()}
                  disabled={selectedLeads.length === 0 || addLeadsMutation.isPending}
                  className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Adicionar ({selectedLeads.length})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}