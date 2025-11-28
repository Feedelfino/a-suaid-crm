import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, TrendingUp, Target, Phone, Calendar, DollarSign,
  Award, Medal, Crown, BarChart3, ArrowUp, ArrowDown, Minus,
  Settings, Save
} from 'lucide-react';
import { useAgentNames } from '@/components/hooks/useAgentNames';
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export default function AgentPerformance() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [period, setPeriod] = useState('month');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [targetForm, setTargetForm] = useState({ agent: '', sales_target: '', interaction_target: '', appointment_target: '' });
  const { agentNamesArray: AGENTS, agentNames } = useAgentNames();
  const { accessRecords, getDisplayName } = useUserDisplayName();
  
  // Usar usuários aprovados como agentes
  const approvedUsers = accessRecords.filter(r => 
    r.roles?.includes('agente_comercial') || 
    r.roles?.includes('gerente') || 
    r.roles?.includes('administrador')
  ).map(r => r.nickname || r.user_name);
  
  const AGENT_LIST = approvedUsers.length > 0 ? approvedUsers : AGENTS;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const isAdmin = user?.role === 'admin';

  // Fetch data
  const { data: interactions = [] } = useQuery({
    queryKey: ['performance-interactions'],
    queryFn: () => base44.entities.Interaction.list('-created_date', 1000),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['performance-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 500),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['performance-clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['performance-goals'],
    queryFn: () => base44.entities.Goal.list('-month'),
  });

  // Date range
  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return { start: subDays(now, 7), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'quarter':
        return { start: subDays(now, 90), end: now };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();

  // Filter data by period
  const filterByPeriod = (data, dateField = 'created_date') => {
    return data.filter(item => {
      if (!item[dateField]) return false;
      const date = parseISO(item[dateField]);
      return date >= start && date <= end;
    });
  };

  const periodInteractions = filterByPeriod(interactions);
  const periodAppointments = filterByPeriod(appointments, 'date');

  // Calculate agent metrics
  const calculateAgentMetrics = (agentName) => {
    const agentInteractions = periodInteractions.filter(i => i.agent_name === agentName);
    const agentAppointments = periodAppointments.filter(a => a.agent === agentName);
    
    const sales = agentInteractions.filter(i => i.interaction_type === 'venda_fechada' || i.tabulation === 'venda_feita');
    const totalSalesValue = sales.reduce((sum, s) => sum + (s.sale_value || 0), 0);
    const avgDealSize = sales.length > 0 ? totalSalesValue / sales.length : 0;
    
    const proposals = agentInteractions.filter(i => i.interaction_type === 'proposta_feita');
    const conversionRate = proposals.length > 0 ? (sales.length / proposals.length) * 100 : 0;

    const completedAppointments = agentAppointments.filter(a => a.status === 'concluida');
    const appointmentRate = agentAppointments.length > 0 
      ? (completedAppointments.length / agentAppointments.length) * 100 : 0;

    // Goal progress
    const currentMonth = format(new Date(), 'yyyy-MM');
    const agentGoal = goals.find(g => g.agent === agentName && g.month === currentMonth);
    const goalProgress = agentGoal ? (totalSalesValue / agentGoal.goal_value) * 100 : 0;

    return {
      name: agentName,
      totalInteractions: agentInteractions.length,
      sales: sales.length,
      totalSalesValue,
      avgDealSize,
      proposals: proposals.length,
      conversionRate,
      appointments: agentAppointments.length,
      completedAppointments: completedAppointments.length,
      appointmentRate,
      goalProgress,
      goal: agentGoal?.goal_value || 0,
    };
  };

  const agentMetrics = AGENT_LIST.map(agent => calculateAgentMetrics(agent));

  // Sort by sales value for ranking
  const rankedAgents = [...agentMetrics].sort((a, b) => b.totalSalesValue - a.totalSalesValue);

  // Top performer
  const topPerformer = rankedAgents[0];

  // Chart data
  const chartData = agentMetrics.map(agent => ({
    name: agent.name.split(' ')[0],
    Vendas: agent.totalSalesValue,
    Interações: agent.totalInteractions * 100, // Scale for visibility
    Conversão: agent.conversionRate,
  }));

  // Trend data (last 7 days)
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayInteractions = interactions.filter(int => {
      if (!int.created_date) return false;
      return format(parseISO(int.created_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    });
    return {
      day: format(date, 'EEE', { locale: ptBR }),
      Interações: dayInteractions.length,
      Vendas: dayInteractions.filter(i => i.interaction_type === 'venda_fechada').length,
    };
  });

  const getRankIcon = (index) => {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-slate-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="text-slate-500 font-bold">{index + 1}º</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Performance dos Agentes</h1>
          <p className="text-slate-500">Acompanhe os KPIs e resultados da equipe</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Definir Metas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Definir Metas do Agente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Agente</Label>
                    <Select value={targetForm.agent} onValueChange={(v) => setTargetForm({...targetForm, agent: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENT_LIST.map(agent => (
                          <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Meta de Vendas (R$)</Label>
                    <Input
                      type="number"
                      value={targetForm.sales_target}
                      onChange={(e) => setTargetForm({...targetForm, sales_target: e.target.value})}
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <Label>Meta de Interações</Label>
                    <Input
                      type="number"
                      value={targetForm.interaction_target}
                      onChange={(e) => setTargetForm({...targetForm, interaction_target: e.target.value})}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label>Meta de Reuniões</Label>
                    <Input
                      type="number"
                      value={targetForm.appointment_target}
                      onChange={(e) => setTargetForm({...targetForm, appointment_target: e.target.value})}
                      placeholder="20"
                    />
                  </div>
                  <Button className="w-full bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Metas
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70">Total Vendas</p>
                <p className="text-3xl font-bold">
                  R$ {agentMetrics.reduce((s, a) => s + a.totalSalesValue, 0).toLocaleString('pt-BR')}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-white/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500">Interações</p>
                <p className="text-3xl font-bold text-slate-800">
                  {periodInteractions.length}
                </p>
              </div>
              <Phone className="w-10 h-10 text-slate-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500">Reuniões</p>
                <p className="text-3xl font-bold text-slate-800">
                  {periodAppointments.length}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-slate-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500">Taxa Conversão</p>
                <p className="text-3xl font-bold text-slate-800">
                  {(agentMetrics.reduce((s, a) => s + a.conversionRate, 0) / (AGENT_LIST.length || 1)).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-slate-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Comparativo de Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Vendas" fill="#6B2D8B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Conversão" fill="#C71585" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Tendência (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Interações" stroke="#6B2D8B" strokeWidth={2} />
                <Line type="monotone" dataKey="Vendas" stroke="#C71585" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Ranking de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead className="text-right">Vendas (R$)</TableHead>
                <TableHead className="text-right">Qtd Vendas</TableHead>
                <TableHead className="text-right">Ticket Médio</TableHead>
                <TableHead className="text-right">Interações</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
                <TableHead className="text-right">Meta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedAgents.map((agent, index) => (
                <TableRow key={agent.name} className={index === 0 ? 'bg-amber-50' : ''}>
                  <TableCell>{getRankIcon(index)}</TableCell>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    R$ {agent.totalSalesValue.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">{agent.sales}</TableCell>
                  <TableCell className="text-right">
                    R$ {agent.avgDealSize.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">{agent.totalInteractions}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={agent.conversionRate >= 30 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                      {agent.conversionRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {agent.goal > 0 ? (
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={Math.min(agent.goalProgress, 100)} className="w-20 h-2" />
                        <span className="text-xs text-slate-500">{agent.goalProgress.toFixed(0)}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Individual Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {agentMetrics.map((agent, index) => (
          <Card key={agent.name} className={`border-0 shadow-lg ${index === 0 ? 'ring-2 ring-amber-400' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold">
                  {agent.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{agent.name}</p>
                  <p className="text-xs text-slate-500">
                    {index === 0 ? '🏆 Top Performer' : `#${index + 1} no ranking`}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Vendas</span>
                  <span className="font-semibold text-green-600">
                    R$ {agent.totalSalesValue.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Interações</span>
                  <span className="font-medium text-slate-800">{agent.totalInteractions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Conversão</span>
                  <Badge className={agent.conversionRate >= 30 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {agent.conversionRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Reuniões</span>
                  <span className="font-medium text-slate-800">
                    {agent.completedAppointments}/{agent.appointments}
                  </span>
                </div>

                {agent.goal > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Meta</span>
                      <span className="text-slate-700">{agent.goalProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(agent.goalProgress, 100)} className="h-2" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}