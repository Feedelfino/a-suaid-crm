import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { 
  Bell, Target, Calendar, Clock, Users, AlertTriangle, 
  CheckCircle, TrendingUp, Mail, Zap, Phone, Star, ArrowRight,
  MessageSquare, Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const ALERT_CONFIG = {
  leadInactiveDays: 7,
  goalWarningThreshold: 80,
  highScoreThreshold: 80,
  appointmentReminderHours: 24,
};

export default function SmartAlerts({ userEmail }) {
  const [alerts, setAlerts] = useState([]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['alerts-tasks', userEmail],
    queryFn: () => base44.entities.Task.filter({ status: 'pendente' }),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['alerts-appointments-today'],
    queryFn: () => base44.entities.Appointment.filter({ 
      date: format(new Date(), 'yyyy-MM-dd'),
      status: { $nin: ['cancelada', 'concluida'] }
    }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['alerts-clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['alerts-interactions'],
    queryFn: () => base44.entities.Interaction.list('-created_date', 500),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['alerts-goals'],
    queryFn: () => base44.entities.Goal.filter({ month: format(new Date(), 'yyyy-MM') }),
  });

  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts = [];

      // 1. Tarefas atrasadas (ALTA PRIORIDADE)
      const myTasks = tasks.filter(t => t.agent_email === userEmail || t.created_by === userEmail);
      const overdueTasks = myTasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date();
      });
      
      if (overdueTasks.length > 0) {
        newAlerts.push({
          id: 'overdue_tasks',
          type: 'overdue_task',
          priority: 'high',
          icon: Clock,
          title: `${overdueTasks.length} tarefa(s) atrasada(s)`,
          description: `Ação urgente necessária: ${overdueTasks[0]?.title}`,
          action: 'Tasks',
          actionLabel: 'Ver Tarefas',
          color: 'red',
        });
      }

      // 2. Reuniões do dia
      const myAppointments = appointments.filter(a => 
        a.agent_email === userEmail || a.scheduled_by_email === userEmail
      );
      
      if (myAppointments.length > 0) {
        const nextAppt = myAppointments.sort((a, b) => a.time.localeCompare(b.time))[0];
        newAlerts.push({
          id: 'today_appointments',
          type: 'today_appointments',
          priority: 'medium',
          icon: Calendar,
          title: `${myAppointments.length} reunião(ões) hoje`,
          description: `Próxima: ${nextAppt.time} - ${nextAppt.client_name || nextAppt.title}`,
          action: 'Schedule',
          actionLabel: 'Ver Agenda',
          color: 'blue',
        });
      }

      // 3. Leads sem interação (OPORTUNIDADE)
      const inactiveLeads = clients.filter(client => {
        const clientInteractions = interactions.filter(i => i.client_id === client.id);
        if (clientInteractions.length === 0) return true;
        
        const lastInteraction = clientInteractions[0];
        if (!lastInteraction.created_date) return true;
        
        const daysSinceContact = differenceInDays(new Date(), parseISO(lastInteraction.created_date));
        return daysSinceContact >= ALERT_CONFIG.leadInactiveDays;
      });

      if (inactiveLeads.length > 0) {
        newAlerts.push({
          id: 'inactive_leads',
          type: 'inactive_leads',
          priority: 'medium',
          icon: Users,
          title: `${inactiveLeads.length} lead(s) precisam de atenção`,
          description: `Sem contato há mais de ${ALERT_CONFIG.leadInactiveDays} dias. Oportunidade de reativação!`,
          action: 'Clients',
          actionLabel: 'Ver Leads',
          color: 'orange',
          clients: inactiveLeads.slice(0, 3).map(c => c.client_name),
        });
      }

      // 4. Leads com alta pontuação (OPORTUNIDADE QUENTE)
      const highScoreLeads = clients.filter(c => {
        const clientInteractions = interactions.filter(i => i.client_id === c.id);
        // Score simplificado baseado em interações recentes
        const recentInteractions = clientInteractions.filter(i => {
          if (!i.created_date) return false;
          return differenceInDays(new Date(), parseISO(i.created_date)) <= 30;
        });
        return recentInteractions.length >= 3 && c.funnel_stage !== 'fechamento';
      });

      if (highScoreLeads.length > 0) {
        newAlerts.push({
          id: 'high_score_leads',
          type: 'high_score',
          priority: 'high',
          icon: Star,
          title: `${highScoreLeads.length} lead(s) quente(s)!`,
          description: 'Alta probabilidade de conversão. Priorize o contato!',
          action: 'SalesPipeline',
          actionLabel: 'Ver Funil',
          color: 'purple',
          clients: highScoreLeads.slice(0, 3).map(c => c.client_name),
        });
      }

      // 5. Progresso de metas
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const monthSales = interactions.filter(i => {
        if (!i.created_date) return false;
        const date = parseISO(i.created_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd }) &&
               (i.tabulation === 'venda_feita' || i.interaction_type === 'venda_fechada');
      });
      
      const totalSales = monthSales.reduce((sum, s) => sum + (s.sale_value || 0), 0);
      
      // Meta da empresa
      const companyGoal = goals.find(g => !g.agent && !g.agent_email);
      // Meta individual
      const myGoal = goals.find(g => g.agent_email === userEmail);

      // Alerta de meta da empresa
      if (companyGoal) {
        const progress = (totalSales / companyGoal.goal_value) * 100;
        
        if (progress >= 100) {
          newAlerts.push({
            id: 'goal_achieved',
            type: 'goal_achieved',
            priority: 'low',
            icon: Trophy,
            title: 'Meta da empresa atingida! 🎉',
            description: `Parabéns! ${progress.toFixed(1)}% da meta foi alcançada.`,
            action: 'Dashboard',
            actionLabel: 'Ver Dashboard',
            color: 'green',
            progress: Math.min(progress, 100),
          });
        } else if (progress >= ALERT_CONFIG.goalWarningThreshold) {
          newAlerts.push({
            id: 'goal_near',
            type: 'goal_near',
            priority: 'medium',
            icon: Target,
            title: 'Meta quase lá!',
            description: `${progress.toFixed(1)}% da meta. Faltam R$ ${(companyGoal.goal_value - totalSales).toLocaleString('pt-BR')}`,
            action: 'Dashboard',
            actionLabel: 'Ver Progresso',
            color: 'amber',
            progress: progress,
          });
        }
      }

      // Alerta de meta individual
      if (myGoal) {
        // Calcular vendas do usuário
        const myMonthSales = monthSales.filter(s => s.created_by === userEmail || s.agent_email === userEmail);
        const myTotalSales = myMonthSales.reduce((sum, s) => sum + (s.sale_value || 0), 0);
        const myProgress = (myTotalSales / myGoal.goal_value) * 100;

        if (myProgress >= 100) {
          newAlerts.push({
            id: 'my_goal_achieved',
            type: 'goal_achieved',
            priority: 'low',
            icon: Trophy,
            title: 'Sua meta individual foi atingida! 🌟',
            description: `Excelente trabalho! ${myProgress.toFixed(1)}% alcançado.`,
            color: 'green',
            progress: Math.min(myProgress, 100),
          });
        } else if (myProgress >= 70) {
          newAlerts.push({
            id: 'my_goal_near',
            type: 'goal_near',
            priority: 'medium',
            icon: Target,
            title: 'Sua meta está próxima!',
            description: `${myProgress.toFixed(1)}% da sua meta. Faltam R$ ${(myGoal.goal_value - myTotalSales).toLocaleString('pt-BR')}`,
            color: 'amber',
            progress: myProgress,
          });
        }
      }

      // 6. Follow-ups pendentes
      const pendingFollowups = interactions.filter(i => {
        if (i.interaction_type !== 'followup_agendado') return false;
        if (!i.followup_date) return false;
        return new Date(i.followup_date) <= new Date();
      });

      if (pendingFollowups.length > 0) {
        newAlerts.push({
          id: 'pending_followups',
          type: 'followup',
          priority: 'high',
          icon: Phone,
          title: `${pendingFollowups.length} follow-up(s) pendente(s)`,
          description: 'Retornos agendados que precisam ser realizados',
          action: 'Tasks',
          actionLabel: 'Ver Follow-ups',
          color: 'cyan',
        });
      }

      setAlerts(newAlerts.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }));
    };

    generateAlerts();
  }, [tasks, appointments, clients, interactions, goals, userEmail]);

  const priorityStyles = {
    high: 'border-l-4 border-l-red-500 bg-red-50',
    medium: 'border-l-4 border-l-amber-500 bg-amber-50',
    low: 'border-l-4 border-l-green-500 bg-green-50',
  };

  const iconColors = {
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  if (alerts.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B2D8B] to-[#C71585] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          Alertas Inteligentes
          <Badge className="ml-auto bg-[#6B2D8B]">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div 
              key={alert.id}
              className={`p-4 rounded-xl ${priorityStyles[alert.priority]} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${iconColors[alert.color]} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-800">{alert.title}</p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        alert.priority === 'high' ? 'bg-red-200 text-red-700' :
                        alert.priority === 'medium' ? 'bg-amber-200 text-amber-700' :
                        'bg-green-200 text-green-700'
                      }`}
                    >
                      {alert.priority === 'high' ? 'Urgente' : alert.priority === 'medium' ? 'Atenção' : 'Info'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{alert.description}</p>
                  
                  {alert.clients && (
                    <div className="flex gap-1 mt-2">
                      {alert.clients.map((name, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                      ))}
                    </div>
                  )}

                  {alert.progress !== undefined && (
                    <div className="mt-2">
                      <Progress value={alert.progress} className="h-2" />
                    </div>
                  )}
                </div>
                
                {alert.action && (
                  <Link to={createPageUrl(alert.action)}>
                    <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-[#6B2D8B] hover:bg-[#6B2D8B]/10">
                      {alert.actionLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}