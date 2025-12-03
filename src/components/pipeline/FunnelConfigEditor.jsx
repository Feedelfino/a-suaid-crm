import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Trash2, GripVertical, Check, X, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_STAGES = [
  { id: 'lead', name: 'Lead', color: 'from-slate-400 to-slate-500', active: true },
  { id: 'contato', name: 'Contato', color: 'from-blue-400 to-blue-500', active: true },
  { id: 'qualificacao', name: 'Qualificação', color: 'from-cyan-400 to-cyan-500', active: true },
  { id: 'proposta', name: 'Proposta', color: 'from-purple-400 to-purple-500', active: true },
  { id: 'negociacao', name: 'Negociação', color: 'from-amber-400 to-amber-500', active: true },
  { id: 'fechamento', name: 'Fechamento', color: 'from-green-400 to-green-500', active: true },
  { id: 'perdido', name: 'Perdido', color: 'from-red-400 to-red-500', active: true },
];

const STAGE_COLORS = [
  { name: 'Cinza', value: 'from-slate-400 to-slate-500' },
  { name: 'Azul', value: 'from-blue-400 to-blue-500' },
  { name: 'Ciano', value: 'from-cyan-400 to-cyan-500' },
  { name: 'Roxo', value: 'from-purple-400 to-purple-500' },
  { name: 'Âmbar', value: 'from-amber-400 to-amber-500' },
  { name: 'Verde', value: 'from-green-400 to-green-500' },
  { name: 'Vermelho', value: 'from-red-400 to-red-500' },
  { name: 'Rosa', value: 'from-pink-400 to-pink-500' },
  { name: 'Índigo', value: 'from-indigo-400 to-indigo-500' },
];

export default function FunnelConfigEditor({ 
  campaigns = [], 
  funnelConfigs = [], 
  selectedCampaign,
  onConfigChange 
}) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState('default');
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [editingStageId, setEditingStageId] = useState(null);
  const [newStageName, setNewStageName] = useState('');

  // Carregar config da campanha selecionada
  React.useEffect(() => {
    if (editingCampaign === 'default') {
      const defaultConfig = funnelConfigs.find(c => !c.campaign_id);
      setStages(defaultConfig?.stages || DEFAULT_STAGES);
    } else {
      const campaignConfig = funnelConfigs.find(c => c.campaign_id === editingCampaign);
      setStages(campaignConfig?.stages || DEFAULT_STAGES);
    }
  }, [editingCampaign, funnelConfigs]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const existingConfig = funnelConfigs.find(c => 
        editingCampaign === 'default' ? !c.campaign_id : c.campaign_id === editingCampaign
      );
      
      if (existingConfig) {
        return base44.entities.FunnelConfig.update(existingConfig.id, data);
      } else {
        return base44.entities.FunnelConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['funnel-configs']);
      if (onConfigChange) onConfigChange();
    },
  });

  const handleSave = () => {
    const campaign = campaigns.find(c => c.id === editingCampaign);
    saveMutation.mutate({
      campaign_id: editingCampaign === 'default' ? '' : editingCampaign,
      campaign_name: editingCampaign === 'default' ? 'Configuração Padrão' : campaign?.name,
      stages,
    });
    setIsOpen(false);
  };

  const toggleStage = (stageId) => {
    setStages(prev => prev.map(s => 
      s.id === stageId ? { ...s, active: !s.active } : s
    ));
  };

  const updateStageName = (stageId, newName) => {
    setStages(prev => prev.map(s => 
      s.id === stageId ? { ...s, name: newName } : s
    ));
    setEditingStageId(null);
  };

  const updateStageColor = (stageId, color) => {
    setStages(prev => prev.map(s => 
      s.id === stageId ? { ...s, color } : s
    ));
  };

  const addNewStage = () => {
    if (!newStageName.trim()) return;
    const newId = newStageName.toLowerCase().replace(/\s+/g, '_');
    setStages(prev => [
      ...prev.slice(0, -1), // Antes do "Perdido"
      { id: newId, name: newStageName, color: 'from-indigo-400 to-indigo-500', active: true },
      prev[prev.length - 1], // "Perdido" sempre no final
    ]);
    setNewStageName('');
  };

  const removeStage = (stageId) => {
    if (['lead', 'fechamento', 'perdido'].includes(stageId)) return; // Não pode remover esses
    setStages(prev => prev.filter(s => s.id !== stageId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Configurar Etapas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Etapas do Funil</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Campanha */}
          <div className="space-y-2">
            <Label>Configuração para:</Label>
            <Select value={editingCampaign} onValueChange={setEditingCampaign}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Configuração Padrão (Todas)</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Cada campanha pode ter suas próprias etapas de funil personalizadas.
            </p>
          </div>

          {/* Lista de Etapas */}
          <div className="space-y-2">
            <Label>Etapas do Funil</Label>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div 
                  key={stage.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    stage.active ? 'bg-white' : 'bg-slate-50 opacity-60'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                  
                  <div className={`w-4 h-4 rounded bg-gradient-to-r ${stage.color}`} />
                  
                  {editingStageId === stage.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={stage.name}
                        onChange={(e) => setStages(prev => prev.map(s => 
                          s.id === stage.id ? { ...s, name: e.target.value } : s
                        ))}
                        className="h-8"
                        autoFocus
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => setEditingStageId(null)}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <span className="flex-1 font-medium">{stage.name}</span>
                  )}

                  <Select 
                    value={stage.color} 
                    onValueChange={(v) => updateStageColor(stage.id, v)}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_COLORS.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded bg-gradient-to-r ${color.value}`} />
                            {color.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditingStageId(stage.id)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>

                  <Switch
                    checked={stage.active}
                    onCheckedChange={() => toggleStage(stage.id)}
                    disabled={['lead', 'fechamento'].includes(stage.id)}
                  />

                  {!['lead', 'fechamento', 'perdido'].includes(stage.id) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => removeStage(stage.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Adicionar Nova Etapa */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome da nova etapa..."
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewStage()}
            />
            <Button onClick={addNewStage} disabled={!newStageName.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}