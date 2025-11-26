import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, Users, DollarSign, Target, Calendar, Phone,
  CheckCircle, XCircle, Clock, BarChart3, PieChart
} from 'lucide-react';
import { useAgentNames } from '@/components/hooks/useAgentNames';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend, Funnel, FunnelChart, LabelList
} from 'recharts';

const COLORS = ['#6B2D8B', '#C71585', '#8B4DAB', '#FF6B9D', '#FFD700', '#00CED1'];

const FUNNEL_STAGES = [
  { id: 'lead', name: 'Lead' },
  { id: 'contato', name: 'Contato' },
  { id: 'qualificacao', name: 'Qualificação' },
  { id: 'proposta', name: 'Proposta' },
  { id: 'negociacao', name: 'Negociação' },
  { id: 'fechamento', name: 'Fechamento' },
];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('company');
  const { agentList } = useAgentNames();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: clients = [] } = useQuery({
    queryKey: ['dashboard-clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['dashboard-interactions'],
    queryFn: () => base44.entities.Interaction.list('-created_date', 500),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['dashboard-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 500),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['dashboard-goals'],
    queryFn: () => base44.entities.Goal.filter({ month: format(new Date(), 'yyyy-MM') }),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => base44.entities.Task.list(),
  });

  // Funnel data
  const funnelData = FUNNEL_STAGES.map((stage, index) => {
    const count = clients.filter(c => (c.funnel_stage || 'lead') === stage.id).length;
    return {
      name: stage.name,
      value: count,
      fill: COLORS[index % COLORS.length],
    };
  });

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  // Filter current month data
  const monthInteractions = interactions.filter(i => {
    if (!i.created_date) return false;
    const date = parseISO(i.created_date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  const monthAppointments = appointments.filter(a => {
    if (!a.date) return false;
    const date = parseISO(a.date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  // Calculate metrics
  const sales = monthInteractions.filter(i => i.tabulation === 'venda_feita' || i.interaction_type === 'venda_fechada');
  const totalSalesValue = sales.reduce((sum, s) => sum + (s.sale_value || 0), 0);
  
  const companyGoal = goals.find(g => !g.agent);
  const myGoal = goals.find(g => g.agent === user?.email);
  
  const goalProgress = companyGoal ? (totalSalesValue / companyGoal.goal_value) * 100 : 0;

  // Data for charts
  const leadSourceData = Object.entries(
    clients.reduce((acc, c) => {
      const source = c.lead_source || 'outro';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  const productData = Object.entries(
    monthInteractions.reduce((acc, i) => {
      if (i.product_offered) {
        acc[i.product_offered] = (acc[i.product_offered] || 0) + 1;
      }
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));

  const statusData = Object.entries(
    monthAppointments.reduce((acc, a) => {
      acc[a.status || 'aguardando'] = (acc[a.status || 'aguardando'] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  // Agent stats
  const agentStats = agentList.map(({ name: agent }) => {
    const agentInteractions = monthInteractions.filter(i => i.agent_name === agent);
    const agentAppointments = monthAppointments.filter(a => a.agent === agent);
    const agentSales = agentInteractions.filter(i => i.tabulation === 'venda_feita');
    
    return {
      agent,
      interactions: agentInteractions.length,
      appointments: agentAppointments.length,
      sales: agentSales.length,
      salesValue: agentSales.reduce((sum, s) => sum + (s.sale_value || 0), 0),
    };
  });

  const StatCard = ({ title, value, icon: Icon, trend, color }) => (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">{trend}</span>
              </div>
            )}
          </div>
          <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500">{format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
        <Tabs value={viewMode} onValueChange={setViewMode}>
          <TabsList>
            <TabsTrigger value="company">Empresa</TabsTrigger>
            <TabsTrigger value="agent">Meu Dashboard</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'company' ? (
        <>
          {/* Company Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total de Clientes" 
              value={clients.length}
              icon={Users}
              color="bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB]"
            />
            <StatCard 
              title="Vendas do Mês" 
              value={sales.length}
              icon={DollarSign}
              color="bg-gradient-to-br from-[#C71585] to-[#FF6B9D]"
            />
            <StatCard 
              title="Valor Total" 
              value={`R$ ${totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              icon={TrendingUp}
              color="bg-gradient-to-br from-amber-400 to-orange-500"
            />
            <StatCard 
              title="Agendamentos" 
              value={monthAppointments.length}
              icon={Calendar}
              color="bg-gradient-to-br from-cyan-400 to-blue-500"
            />
          </div>

          {/* Goal Progress */}
          {companyGoal && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">Meta Mensal</h3>
                    <p className="text-sm text-slate-500">
                      R$ {totalSalesValue.toLocaleString('pt-BR')} de R$ {companyGoal.goal_value.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-[#6B2D8B]">{Math.min(goalProgress, 100).toFixed(1)}%</span>
                  </div>
                </div>
                <Progress value={Math.min(goalProgress, 100)} className="h-4" />
                <p className="text-sm text-slate-500 mt-2">
                  Faltam R$ {Math.max(companyGoal.goal_value - totalSalesValue, 0).toLocaleString('pt-BR')} para atingir a meta
                </p>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Source */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#6B2D8B]" />
                  Origem dos Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={leadSourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {leadSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Funnel Chart */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#6B2D8B]" />
                  Funil de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Agent Performance */}
            <Card className="border-0 shadow-lg lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#6B2D8B]" />
                  Desempenho por Agente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agent" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="interactions" name="Interações" fill="#6B2D8B" />
                      <Bar dataKey="appointments" name="Agendamentos" fill="#C71585" />
                      <Bar dataKey="sales" name="Vendas" fill="#FFD700" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Appointments Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Status das Reuniões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {statusData.map((status, index) => (
                  <div key={status.name} className="text-center p-4 rounded-xl bg-slate-50">
                    <p className="text-3xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                      {status.value}
                    </p>
                    <p className="text-sm text-slate-500 capitalize mt-1">{status.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Agent Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Minhas Interações" 
              value={monthInteractions.filter(i => i.created_by === user?.email).length}
              icon={Phone}
              color="bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB]"
            />
            <StatCard 
              title="Meus Agendamentos" 
              value={monthAppointments.filter(a => a.scheduled_by === user?.full_name).length}
              icon={Calendar}
              color="bg-gradient-to-br from-[#C71585] to-[#FF6B9D]"
            />
            <StatCard 
              title="Minhas Vendas" 
              value={sales.filter(s => s.created_by === user?.email).length}
              icon={DollarSign}
              color="bg-gradient-to-br from-amber-400 to-orange-500"
            />
            <StatCard 
              title="Tarefas Pendentes" 
              value={tasks.filter(t => t.status === 'pendente').length}
              icon={CheckCircle}
              color="bg-gradient-to-br from-cyan-400 to-blue-500"
            />
          </div>

          {/* My Goal Progress */}
          {myGoal && (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">Minha Meta</h3>
                    <p className="text-sm text-slate-500">
                      R$ {(myGoal.achieved_value || 0).toLocaleString('pt-BR')} de R$ {myGoal.goal_value.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-[#6B2D8B]">
                      {((myGoal.achieved_value || 0) / myGoal.goal_value * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Progress value={Math.min((myGoal.achieved_value || 0) / myGoal.goal_value * 100, 100)} className="h-4" />
              </CardContent>
            </Card>
          )}

          {/* My Tasks */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Minhas Tarefas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.filter(t => t.status === 'pendente').slice(0, 10).map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                    <Clock className="w-5 h-5 text-[#6B2D8B]" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{task.title}</p>
                      <p className="text-sm text-slate-500">{task.client_name}</p>
                    </div>
                    <span className="text-sm text-slate-400">
                      {task.due_date && format(parseISO(task.due_date), 'dd/MM HH:mm')}
                    </span>
                  </div>
                ))}
                {tasks.filter(t => t.status === 'pendente').length === 0 && (
                  <p className="text-center py-8 text-slate-500">
                    Nenhuma tarefa pendente!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}