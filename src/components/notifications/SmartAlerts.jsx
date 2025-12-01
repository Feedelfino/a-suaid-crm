import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { 
  Bell, Target, Calendar, Clock, Users, AlertTriangle, 
  CheckCircle, TrendingUp, Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// Configurações de alertas
const ALERT_CONFIG = {
  leadInactiveDays: 7, // Dias sem interação para alertar
  goalWarningThreshold: 80, // % para alerta de meta próxima
  appointmentReminderHours: 24, // Horas antes para lembrete
};

export default function SmartAlerts({ userEmail }) {
  const [alerts, setAlerts] = useState([]);

  // Buscar dados
  const { data: tasks = [] } = useQuery({
    queryKey: ['alerts-tasks', userEmail],
    queryFn: () => base44.entities.Task.filter({ agent: userEmail, status: 'pendente' }),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['alerts-appointments'],
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
    queryFn: () => base44.entities.Goal.filter({ 
      month: format(new Date(), 'yyyy-MM')
    }),
  });

  useEffect(() => {
    const generateAlerts = () => {
      const newAlerts = [];

      // 1. Tarefas atrasadas
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date();
      });
      if (overdueTasks.length > 0) {
        newAlerts.push({
          type: 'overdue_task',
          priority: 'high',
          icon: Clock,
          title: `${overdueTasks.length} tarefa(s) atrasada(s)`,
          description: 'Você tem tarefas que já passaram do prazo',
          action: '/Tasks',
          color: 'red',
        });
      }

      // 2. Reuniões do dia
      if (appointments.length > 0) {
        newAlerts.push({
          type: 'today_appointments',
          priority: 'medium',
          icon: Calendar,
          title: `${appointments.length} reunião(ões) hoje`,
          description: appointments.map(a => `${a.time} - ${a.client_name}`).slice(0, 3).join(', '),
          action: '/Schedule',
          color: 'blue',
        });
      }

      // 3. Leads sem interação
      const inactiveLeads = clients.filter(client => {
        const clientInteractions = interactions.filter(i => i.client_id === client.id);
        if (clientInteractions.length === 0) return true;
        
        const lastInteraction = clientInteractions[0];
        if (!lastInteraction.created_date) return true;
        
        const daysSinceContact = differenceInDays(
          new Date(), 
          parseISO(lastInteraction.created_date)
        );
        return daysSinceContact >= ALERT_CONFIG.leadInactiveDays;
      });

      if (inactiveLeads.length > 0) {
        newAlerts.push({
          type: 'inactive_leads',
          priority: 'medium',
          icon: Users,
          title: `${inactiveLeads.length} lead(s) sem contato`,
          description: `Leads há mais de ${ALERT_CONFIG.leadInactiveDays} dias sem interação`,
          action: '/Clients',
          color: 'orange',
        });
      }

      // 4. Progresso de metas
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
      const companyGoal = goals.find(g => !g.agent);

      if (companyGoal) {
        const progress = (totalSales / companyGoal.goal_value) * 100;
        
        if (progress >= 100) {
          newAlerts.push({
            type: 'goal_achieved',
            priority: 'low',
            icon: CheckCircle,
            title: 'Meta mensal atingida! 🎉',
            description: `Parabéns! A meta foi alcançada com ${progress.toFixed(1)}%`,
            color: 'green',
          });
        } else if (progress >= ALERT_CONFIG.goalWarningThreshold) {
          newAlerts.push({
            type: 'goal_near',
            priority: 'medium',
            icon: TrendingUp,
            title: 'Meta quase atingida!',
            description: `${progress.toFixed(1)}% da meta mensal alcançada`,
            action: '/Dashboard',
            color: 'amber',
          });
        }
      }

      setAlerts(newAlerts);
    };

    generateAlerts();
  }, [tasks, appointments, clients, interactions, goals]);

  const priorityColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-green-500 bg-green-50',
  };

  const iconColors = {
    red: 'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
  };

  if (alerts.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5 text-[#6B2D8B]" />
          Alertas Inteligentes
          <Badge variant="secondary" className="ml-auto">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          return (
            <div 
              key={index}
              className={`p-4 rounded-xl border-l-4 ${priorityColors[alert.priority]} flex items-start gap-4`}
            >
              <div className={`w-10 h-10 rounded-xl ${iconColors[alert.color]} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800">{alert.title}</p>
                <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
              </div>
              {alert.action && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={alert.action}>Ver</a>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}