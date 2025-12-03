import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Target, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';

export default function GoalManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [goalType, setGoalType] = useState('mensal');
  const { accessRecords } = useUserDisplayName();
  
  // Todos os usuários aprovados podem receber metas
  const approvedAgents = accessRecords.filter(r => r.status === 'approved');

  const [formData, setFormData] = useState({
    period_type: 'mensal',
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    month: format(new Date(), 'yyyy-MM'),
    agent: '',
    agent_email: '',
    goal_value: '',
    goal_quantity: '',
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['admin-goals-all'],
    queryFn: () => base44.entities.Goal.list('-year'),
  });

  const createGoal = useMutation({
    mutationFn: (data) => base44.entities.Goal.create({
      ...data,
      goal_value: parseFloat(data.goal_value) || 0,
      goal_quantity: parseInt(data.goal_quantity) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-goals-all']);
      resetForm();
    },
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-goals-all']),
  });

  const resetForm = () => {
    setFormData({
      period_type: 'mensal',
      year: new Date().getFullYear(),
      quarter: Math.ceil((new Date().getMonth() + 1) / 3),
      month: format(new Date(), 'yyyy-MM'),
      agent: '',
      agent_email: '',
      goal_value: '',
      goal_quantity: '',
    });
    setDialogOpen(false);
  };

  const filteredGoals = goals.filter(g => (g.period_type || 'mensal') === goalType);

  const GoalCard = ({ goal }) => {
    const progress = goal.goal_value > 0 ? (goal.achieved_value || 0) / goal.goal_value * 100 : 0;
    return (
      <div className="p-4 rounded-xl bg-slate-50 border">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant={goal.period_type === 'anual' ? 'default' : goal.period_type === 'trimestral' ? 'secondary' : 'outline'}>
                {goal.period_type === 'anual' ? `Ano ${goal.year}` : 
                 goal.period_type === 'trimestral' ? `T${goal.quarter}/${goal.year}` : 
                 goal.month}
              </Badge>
              <span className="text-sm text-slate-500">
                {goal.agent || 'Empresa'}
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => deleteGoal.mutate(goal.id)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Valor</span>
            <span className="font-semibold">
              R$ {(goal.achieved_value || 0).toLocaleString('pt-BR')} / R$ {(goal.goal_value || 0).toLocaleString('pt-BR')}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{progress.toFixed(1)}% atingido</span>
            {goal.goal_quantity && (
              <span>{goal.achieved_quantity || 0} / {goal.goal_quantity} unidades</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#6B2D8B]" />
          Gestão de Metas
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Período *</Label>
                <Select 
                  value={formData.period_type} 
                  onValueChange={(v) => setFormData({ ...formData, period_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.period_type === 'anual' && (
                <div className="space-y-2">
                  <Label>Ano *</Label>
                  <Input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
              )}

              {formData.period_type === 'trimestral' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ano *</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trimestre *</Label>
                    <Select 
                      value={formData.quarter?.toString()} 
                      onValueChange={(v) => setFormData({ ...formData, quarter: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1º Trimestre</SelectItem>
                        <SelectItem value="2">2º Trimestre</SelectItem>
                        <SelectItem value="3">3º Trimestre</SelectItem>
                        <SelectItem value="4">4º Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formData.period_type === 'mensal' && (
                <div className="space-y-2">
                  <Label>Mês *</Label>
                  <Input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Usuário (vazio = meta da empresa)</Label>
                <Select 
                  value={formData.agent_email || ''} 
                  onValueChange={(v) => {
                    const selectedUser = approvedAgents.find(a => a.user_email === v);
                    setFormData({ 
                      ...formData, 
                      agent_email: v || '',
                      agent: selectedUser ? (selectedUser.nickname || selectedUser.user_name) : ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Meta da Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Meta da Empresa</SelectItem>
                    {approvedAgents.map((agent) => (
                      <SelectItem key={agent.user_email} value={agent.user_email}>
                        {agent.nickname || agent.user_name} ({agent.user_email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta em Valor (R$) *</Label>
                  <Input
                    type="number"
                    value={formData.goal_value}
                    onChange={(e) => setFormData({ ...formData, goal_value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Meta em Quantidade</Label>
                  <Input
                    type="number"
                    value={formData.goal_quantity}
                    onChange={(e) => setFormData({ ...formData, goal_quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createGoal.mutate(formData)}
                  disabled={!formData.goal_value}
                  className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                >
                  Criar Meta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs value={goalType} onValueChange={setGoalType}>
          <TabsList className="mb-4">
            <TabsTrigger value="anual" className="gap-2">
              <Calendar className="w-4 h-4" />
              Anuais ({goals.filter(g => g.period_type === 'anual').length})
            </TabsTrigger>
            <TabsTrigger value="trimestral" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Trimestrais ({goals.filter(g => g.period_type === 'trimestral').length})
            </TabsTrigger>
            <TabsTrigger value="mensal" className="gap-2">
              <Target className="w-4 h-4" />
              Mensais ({goals.filter(g => (g.period_type || 'mensal') === 'mensal').length})
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>

          {filteredGoals.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Target className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma meta {goalType} cadastrada</p>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}