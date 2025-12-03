import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getWeek, getYear } from 'date-fns';
import { Plus, Edit, Trash2, Target, TrendingUp, Calendar, CheckCircle2, Handshake, Users, Phone } from 'lucide-react';
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
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';

const GOAL_TYPES = [
  { value: 'vendas', label: 'Vendas', icon: TrendingUp, color: 'text-green-600' },
  { value: 'tarefas', label: 'Tarefas', icon: CheckCircle2, color: 'text-blue-600' },
  { value: 'parcerias', label: 'Parcerias', icon: Handshake, color: 'text-purple-600' },
  { value: 'reunioes', label: 'Reuniões', icon: Users, color: 'text-orange-600' },
  { value: 'ligacoes', label: 'Ligações', icon: Phone, color: 'text-cyan-600' },
  { value: 'leads', label: 'Leads', icon: Target, color: 'text-pink-600' },
];

const PERIOD_TYPES = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

export default function GoalManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('mensal');
  const { accessRecords } = useUserDisplayName();
  
  const approvedAgents = accessRecords.filter(r => r.status === 'approved');

  const now = new Date();
  const currentWeek = `${getYear(now)}-W${String(getWeek(now)).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    period_type: 'mensal',
    goal_type: 'vendas',
    year: now.getFullYear(),
    quarter: Math.ceil((now.getMonth() + 1) / 3),
    semester: now.getMonth() < 6 ? 1 : 2,
    month: format(now, 'yyyy-MM'),
    week: currentWeek,
    agent: '',
    agent_email: '',
    goal_value: '',
    goal_quantity: '',
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['admin-goals-all'],
    queryFn: () => base44.entities.Goal.list('-created_date'),
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

  const updateGoal = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, {
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
      goal_type: 'vendas',
      year: now.getFullYear(),
      quarter: Math.ceil((now.getMonth() + 1) / 3),
      semester: now.getMonth() < 6 ? 1 : 2,
      month: format(now, 'yyyy-MM'),
      week: currentWeek,
      agent: '',
      agent_email: '',
      goal_value: '',
      goal_quantity: '',
    });
    setEditingGoal(null);
    setDialogOpen(false);
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setFormData({
      period_type: goal.period_type || 'mensal',
      goal_type: goal.goal_type || 'vendas',
      year: goal.year || now.getFullYear(),
      quarter: goal.quarter || 1,
      semester: goal.semester || 1,
      month: goal.month || format(now, 'yyyy-MM'),
      week: goal.week || currentWeek,
      agent: goal.agent || '',
      agent_email: goal.agent_email || '',
      goal_value: goal.goal_value?.toString() || '',
      goal_quantity: goal.goal_quantity?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingGoal) {
      updateGoal.mutate({ id: editingGoal.id, data: formData });
    } else {
      createGoal.mutate(formData);
    }
  };

  const filteredGoals = goals.filter(g => (g.period_type || 'mensal') === periodFilter);

  const getGoalTypeConfig = (type) => {
    return GOAL_TYPES.find(t => t.value === type) || GOAL_TYPES[0];
  };

  const GoalCard = ({ goal }) => {
    const progress = goal.goal_value > 0 ? (goal.achieved_value || 0) / goal.goal_value * 100 : 0;
    const quantityProgress = goal.goal_quantity > 0 ? (goal.achieved_quantity || 0) / goal.goal_quantity * 100 : 0;
    const typeConfig = getGoalTypeConfig(goal.goal_type);
    const Icon = typeConfig.icon;

    const getPeriodLabel = () => {
      switch (goal.period_type) {
        case 'semanal': return goal.week;
        case 'anual': return `Ano ${goal.year}`;
        case 'trimestral': return `T${goal.quarter}/${goal.year}`;
        case 'semestral': return `S${goal.semester}/${goal.year}`;
        default: return goal.month;
      }
    };

    return (
      <div className="p-4 rounded-xl bg-slate-50 border hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${typeConfig.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{getPeriodLabel()}</Badge>
                <Badge className={`${typeConfig.color.replace('text-', 'bg-').replace('-600', '-100')} ${typeConfig.color}`}>
                  {typeConfig.label}
                </Badge>
              </div>
              <span className="text-sm text-slate-500">
                {goal.agent || 'Empresa'}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(goal)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => deleteGoal.mutate(goal.id)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {goal.goal_value > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Valor</span>
                <span className="font-semibold">
                  R$ {(goal.achieved_value || 0).toLocaleString('pt-BR')} / R$ {goal.goal_value.toLocaleString('pt-BR')}
                </span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
            </>
          )}
          {goal.goal_quantity > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Quantidade</span>
                <span className="font-semibold">
                  {goal.achieved_quantity || 0} / {goal.goal_quantity}
                </span>
              </div>
              <Progress value={Math.min(quantityProgress, 100)} className="h-2" />
            </>
          )}
          <div className="text-xs text-slate-500 text-right">
            {Math.max(progress, quantityProgress).toFixed(1)}% atingido
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#6B2D8B]" />
          Gestão de Metas
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Meta *</Label>
                  <Select 
                    value={formData.goal_type} 
                    onValueChange={(v) => setFormData({ ...formData, goal_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`w-4 h-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Período *</Label>
                  <Select 
                    value={formData.period_type} 
                    onValueChange={(v) => setFormData({ ...formData, period_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_TYPES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.period_type === 'semanal' && (
                <div className="space-y-2">
                  <Label>Semana *</Label>
                  <Input
                    type="week"
                    value={formData.week}
                    onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                  />
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

              {formData.period_type === 'semestral' && (
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
                    <Label>Semestre *</Label>
                    <Select 
                      value={formData.semester?.toString()} 
                      onValueChange={(v) => setFormData({ ...formData, semester: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1º Semestre</SelectItem>
                        <SelectItem value="2">2º Semestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

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

              <div className="space-y-2">
                <Label>Usuário (vazio = meta da empresa)</Label>
                <Select 
                  value={formData.agent_email || 'company'} 
                  onValueChange={(v) => {
                    if (v === 'company') {
                      setFormData({ ...formData, agent_email: '', agent: '' });
                    } else {
                      const selectedUser = approvedAgents.find(a => a.user_email === v);
                      setFormData({ 
                        ...formData, 
                        agent_email: v,
                        agent: selectedUser ? (selectedUser.nickname || selectedUser.user_name) : ''
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Meta da Empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Meta da Empresa</SelectItem>
                    {approvedAgents.map((agent) => (
                      <SelectItem key={agent.user_email} value={agent.user_email}>
                        {agent.nickname || agent.user_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meta em Valor (R$)</Label>
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
                  onClick={handleSubmit}
                  disabled={!formData.goal_value && !formData.goal_quantity}
                  className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                >
                  {editingGoal ? 'Salvar' : 'Criar Meta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs value={periodFilter} onValueChange={setPeriodFilter}>
          <TabsList className="mb-4 flex-wrap">
            {PERIOD_TYPES.map(p => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label} ({goals.filter(g => (g.period_type || 'mensal') === p.value).length})
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>

          {filteredGoals.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Target className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>Nenhuma meta {PERIOD_TYPES.find(p => p.value === periodFilter)?.label.toLowerCase()} cadastrada</p>
            </div>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}