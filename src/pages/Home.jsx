// ============================================================
// FRONTEND — Página inicial (Dashboard do Usuário)
// Esta página exibe um resumo das atividades do dia:
// tarefas pendentes, reuniões agendadas e alertas inteligentes.
// Toda a lógica de busca de dados usa o SDK base44 que se
// comunica com o BACKEND (entidades e funções) automaticamente.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Navegação entre páginas (frontend)
import { createPageUrl } from '@/utils'; // Utilitário para gerar URLs de páginas
import { base44 } from '@/api/base44Client'; // SDK de conexão com o backend (base44)
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName'; // Hook para exibir nome/apelido do usuário
import { useQuery } from '@tanstack/react-query'; // Hook para buscar dados do backend com cache
import { format, isToday, parseISO, startOfDay } from 'date-fns'; // Utilitários de formatação de datas
import { ptBR } from 'date-fns/locale'; // Localização em português para exibição de datas
import { 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Video,
  MapPin,
  ArrowRight,
  TrendingUp,
  Users,
  Target,
  Zap,
  GitBranch
} from 'lucide-react';
import { checkAndCreateNotifications } from '@/components/notifications/NotificationGenerator';
import SmartAlerts from '@/components/notifications/SmartAlerts';
import GoalsSummary from '@/components/home/GoalsSummary';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { getDisplayName } = useUserDisplayName();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        // Generate notifications for the user
        checkAndCreateNotifications(userData.email);
      } catch (e) {
        console.log('Not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks-today'],
    queryFn: () => base44.entities.Task.filter({ status: 'pendente' }, '-due_date', 20),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: () => base44.entities.Appointment.filter({ 
      date: format(new Date(), 'yyyy-MM-dd'),
      status: { $nin: ['cancelada', 'concluida'] }
    }, 'time', 10),
  });

  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false;
    return isToday(parseISO(t.due_date));
  });

  const taskTypeIcons = {
    reuniao_presencial: MapPin,
    ligacao: Phone,
    videochamada: Video,
    followup: Clock,
    retorno_45: AlertCircle,
    retorno_90: AlertCircle,
    atendimento: Users,
    manual: CheckCircle2
  };

  const taskTypeColors = {
    reuniao_presencial: 'bg-blue-100 text-blue-700',
    ligacao: 'bg-green-100 text-green-700',
    videochamada: 'bg-purple-100 text-purple-700',
    followup: 'bg-orange-100 text-orange-700',
    retorno_45: 'bg-amber-100 text-amber-700',
    retorno_90: 'bg-red-100 text-red-700',
    atendimento: 'bg-cyan-100 text-cyan-700',
    manual: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#6B2D8B] via-[#8B4DAB] to-[#C71585] rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            Olá, {getDisplayName(user?.email, user?.full_name?.split(' ')[0]) || 'Usuário'}! 👋
          </h1>
          <p className="text-white/80 mb-6">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to={createPageUrl('Interactions')}>
              <Button className="bg-white text-[#6B2D8B] hover:bg-white/90 shadow-lg">
                <Phone className="w-4 h-4 mr-2" />
                Nova Interação
              </Button>
            </Link>
            <Link to={createPageUrl('Schedule')}>
              <Button className="bg-amber-400 text-slate-900 hover:bg-amber-500 shadow-lg font-semibold">
                <Calendar className="w-4 h-4 mr-2" />
                Ver Agenda
              </Button>
            </Link>
            <Button 
              onClick={() => navigate(createPageUrl('SalesPipeline'))}
              className="bg-emerald-400 text-slate-900 hover:bg-emerald-500 shadow-lg font-semibold"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Funil de Vendas
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Clicáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to={createPageUrl('Tasks')}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Tarefas Hoje</p>
                  <p className="text-3xl font-bold text-slate-800">{todayTasks.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Schedule')}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Reuniões Hoje</p>
                  <p className="text-3xl font-bold text-slate-800">{appointments.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C71585] to-[#FF6B9D] flex items-center justify-center shadow-lg">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Dashboard')}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Metas</p>
                  <p className="text-xl font-bold text-slate-800">Ver Progresso</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Target className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('Tasks')}>
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 hover:shadow-xl transition-all cursor-pointer hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Pendentes</p>
                  <p className="text-3xl font-bold text-slate-800">{tasks.length}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
                  <Zap className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Goals Summary */}
      <GoalsSummary userEmail={user?.email} />

      {/* Smart Alerts */}
      <SmartAlerts userEmail={user?.email} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Tasks */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#6B2D8B]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#6B2D8B]" />
                </div>
                Tarefas do Dia
              </CardTitle>
              <Link to={createPageUrl('Tasks')} className="text-sm text-[#6B2D8B] hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhuma tarefa para hoje!</p>
              </div>
            ) : (
              todayTasks.slice(0, 5).map((task) => {
                const Icon = taskTypeIcons[task.task_type] || CheckCircle2;
                const colorClass = taskTypeColors[task.task_type] || 'bg-slate-100 text-slate-700';
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{task.title}</p>
                      <p className="text-sm text-slate-500">{task.client_name || 'Sem cliente'}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {task.due_date ? format(parseISO(task.due_date), 'HH:mm') : '--:--'}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#C71585]/10 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#C71585]" />
                </div>
                Reuniões de Hoje
              </CardTitle>
              <Link to={createPageUrl('Schedule')} className="text-sm text-[#6B2D8B] hover:underline flex items-center gap-1">
                Ver agenda <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhuma reunião agendada para hoje!</p>
              </div>
            ) : (
              appointments.slice(0, 5).map((apt) => {
                const typeIcon = apt.appointment_type === 'presencial' ? MapPin : 
                                 apt.appointment_type === 'videoconferencia' ? Video : Phone;
                const TypeIcon = typeIcon;
                return (
                  <div 
                    key={apt.id} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C71585] to-[#FF6B9D] flex items-center justify-center text-white">
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{apt.client_name}</p>
                      <p className="text-sm text-slate-500 capitalize">{apt.meeting_reason?.replace('_', ' ') || apt.appointment_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#6B2D8B]">{apt.time}</p>
                      <p className="text-xs text-slate-500">{apt.duration || 30} min</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}