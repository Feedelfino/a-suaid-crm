import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  Plus, Target, Calendar, Users, TrendingUp, 
  MoreVertical, Edit, Trash2, Play, Pause, Archive, GitBranch
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CampaignLeadsManager from '@/components/campaigns/CampaignLeadsManager';
import CampaignUserManager from '@/components/campaigns/CampaignUserManager';

export default function Campaigns() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [managingLeadsCampaign, setManagingLeadsCampaign] = useState(null);
  const [managingUsersCampaign, setManagingUsersCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    goal: '',
    goal_quantity: '',
    target_product: '',
    target_region: '',
    status: 'planejada',
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => base44.entities.Campaign.list('-created_date'),
  });

  const createCampaign = useMutation({
    mutationFn: (data) => base44.entities.Campaign.create({
      ...data,
      goal: parseFloat(data.goal) || 0,
      goal_quantity: parseInt(data.goal_quantity) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateCampaign = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Campaign.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['campaigns']);
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: (id) => base44.entities.Campaign.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['campaigns']),
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      start_date: '',
      end_date: '',
      goal: '',
      goal_quantity: '',
      target_product: '',
      target_region: '',
      status: 'planejada',
    });
    setEditingCampaign(null);
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name || '',
      description: campaign.description || '',
      start_date: campaign.start_date || '',
      end_date: campaign.end_date || '',
      goal: campaign.goal?.toString() || '',
      goal_quantity: campaign.goal_quantity?.toString() || '',
      target_product: campaign.target_product || '',
      target_region: campaign.target_region || '',
      status: campaign.status || 'planejada',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingCampaign) {
      updateCampaign.mutate({ id: editingCampaign.id, data: formData });
    } else {
      createCampaign.mutate(formData);
    }
  };

  const handleStatusChange = (campaign, newStatus) => {
    updateCampaign.mutate({ id: campaign.id, data: { ...campaign, status: newStatus } });
  };

  const statusColors = {
    planejada: 'bg-slate-100 text-slate-700',
    ativa: 'bg-green-100 text-green-700',
    pausada: 'bg-yellow-100 text-yellow-700',
    encerrada: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Campanhas</h1>
          <p className="text-slate-500">Gerencie suas campanhas de vendas</p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl('SalesPipeline')}>
            <Button variant="outline" className="border-[#6B2D8B] text-[#6B2D8B]">
              <GitBranch className="w-4 h-4 mr-2" />
              Ver Funil de Vendas
            </Button>
          </Link>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome da Campanha *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Fim</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta (R$)</Label>
                  <Input
                    type="number"
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta (Quantidade)</Label>
                  <Input
                    type="number"
                    value={formData.goal_quantity}
                    onChange={(e) => setFormData({ ...formData, goal_quantity: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produto Alvo</Label>
                  <Input
                    value={formData.target_product}
                    onChange={(e) => setFormData({ ...formData, target_product: e.target.value })}
                    placeholder="Ex: Certificado A3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Região Alvo</Label>
                  <Input
                    value={formData.target_region}
                    onChange={(e) => setFormData({ ...formData, target_region: e.target.value })}
                    placeholder="Ex: São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejada">Planejada</SelectItem>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="encerrada">Encerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                  disabled={createCampaign.isPending || updateCampaign.isPending}
                >
                  {editingCampaign ? 'Salvar' : 'Criar Campanha'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#6B2D8B]/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-[#6B2D8B]" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-800">{campaigns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Ativas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {campaigns.filter(c => c.status === 'ativa').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Pause className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pausadas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {campaigns.filter(c => c.status === 'pausada').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <Archive className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Encerradas</p>
                <p className="text-2xl font-bold text-slate-800">
                  {campaigns.filter(c => c.status === 'encerrada').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((campaign) => {
          const progress = campaign.goal ? (campaign.achieved_value / campaign.goal) * 100 : 0;
          
          return (
            <Card key={campaign.id} className="border-0 shadow-lg overflow-hidden group">
              <div className={`h-2 ${
                campaign.status === 'ativa' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                campaign.status === 'pausada' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                campaign.status === 'encerrada' ? 'bg-gradient-to-r from-red-400 to-red-500' :
                'bg-gradient-to-r from-slate-300 to-slate-400'
              }`} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <Badge className={`mt-2 ${statusColors[campaign.status]}`}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {campaign.status !== 'ativa' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(campaign, 'ativa')}>
                          <Play className="w-4 h-4 mr-2" />
                          Ativar
                        </DropdownMenuItem>
                      )}
                      {campaign.status === 'ativa' && (
                        <DropdownMenuItem onClick={() => handleStatusChange(campaign, 'pausada')}>
                          <Pause className="w-4 h-4 mr-2" />
                          Pausar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleStatusChange(campaign, 'encerrada')}>
                        <Archive className="w-4 h-4 mr-2" />
                        Encerrar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setManagingUsersCampaign(campaign)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Designar Usuários
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setManagingLeadsCampaign(campaign)}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Gerenciar Leads
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => deleteCampaign.mutate(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{campaign.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {campaign.start_date && format(parseISO(campaign.start_date), 'dd/MM/yyyy')}
                  </span>
                  {campaign.target_product && (
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {campaign.target_product}
                    </span>
                  )}
                </div>

                {campaign.goal && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">Progresso</span>
                      <span className="font-semibold text-[#6B2D8B]">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <p className="text-xs text-slate-400 mt-1">
                      R$ {(campaign.achieved_value || 0).toLocaleString('pt-BR')} / R$ {campaign.goal.toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {campaigns.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-6">Nenhuma campanha criada ainda</p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Campanha
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog para designar usuários */}
      <Dialog open={!!managingUsersCampaign} onOpenChange={(open) => !open && setManagingUsersCampaign(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Designar Usuários - {managingUsersCampaign?.name}</DialogTitle>
          </DialogHeader>
          {managingUsersCampaign && (
            <CampaignUserManager 
              campaign={managingUsersCampaign} 
              onUpdate={() => {
                queryClient.invalidateQueries(['campaigns']);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para gerenciar leads da campanha */}
      <Dialog open={!!managingLeadsCampaign} onOpenChange={(open) => !open && setManagingLeadsCampaign(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {managingLeadsCampaign && (
            <CampaignLeadsManager 
              campaign={managingLeadsCampaign} 
              onClose={() => setManagingLeadsCampaign(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}