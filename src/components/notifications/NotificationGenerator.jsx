// Utility functions to generate notifications
import { base44 } from '@/api/base44Client';
import { format, isToday, isTomorrow, addDays, parseISO, differenceInDays } from 'date-fns';

export async function checkAndCreateNotifications(userEmail) {
  try {
    // Get today's tasks
    const tasks = await base44.entities.Task.filter({ 
      agent: userEmail,
      status: 'pendente' 
    });

    // Get today's appointments
    const appointments = await base44.entities.Appointment.filter({
      date: format(new Date(), 'yyyy-MM-dd')
    });

    // Get goals
    const goals = await base44.entities.Goal.filter({
      month: format(new Date(), 'yyyy-MM')
    });

    const notifications = [];

    // Check for tasks due today
    const todayTasks = tasks.filter(t => t.due_date && isToday(parseISO(t.due_date)));
    if (todayTasks.length > 0) {
      notifications.push({
        user_email: userEmail,
        title: `${todayTasks.length} tarefa(s) para hoje`,
        message: `Você tem tarefas pendentes para hoje.`,
        type: 'task',
        priority: 'high',
      });
    }

    // Check for appointments today
    if (appointments.length > 0) {
      notifications.push({
        user_email: userEmail,
        title: `${appointments.length} reunião(ões) hoje`,
        message: `Confira sua agenda para os compromissos de hoje.`,
        type: 'appointment',
        priority: 'high',
      });
    }

    // Check for follow-ups
    const followups = tasks.filter(t => t.task_type === 'followup');
    if (followups.length > 0) {
      notifications.push({
        user_email: userEmail,
        title: `${followups.length} follow-up(s) pendente(s)`,
        message: `Acompanhe seus clientes.`,
        type: 'followup',
        priority: 'medium',
      });
    }

    // Check goal progress
    const userGoal = goals.find(g => g.agent === userEmail);
    if (userGoal) {
      const progress = (userGoal.achieved_value / userGoal.goal_value) * 100;
      if (progress >= 90 && progress < 100) {
        notifications.push({
          user_email: userEmail,
          title: 'Meta quase atingida!',
          message: `Você está a ${(100 - progress).toFixed(1)}% de atingir sua meta.`,
          type: 'goal',
          priority: 'medium',
        });
      } else if (progress >= 100) {
        notifications.push({
          user_email: userEmail,
          title: '🎉 Meta atingida!',
          message: `Parabéns! Você atingiu sua meta do mês.`,
          type: 'goal',
          priority: 'low',
        });
      }
    }

    // Create notifications (avoid duplicates by checking existing)
    const existingNotifications = await base44.entities.Notification.filter({
      user_email: userEmail,
    }, '-created_date', 20);

    const today = format(new Date(), 'yyyy-MM-dd');
    
    for (const notif of notifications) {
      // Check if similar notification was already created today
      const exists = existingNotifications.some(
        n => n.title === notif.title && n.created_date?.startsWith(today)
      );
      
      if (!exists) {
        await base44.entities.Notification.create(notif);
      }
    }

    return notifications;
  } catch (error) {
    console.error('Error generating notifications:', error);
    return [];
  }
}

export async function createNotification(userEmail, title, message, type, priority = 'medium', referenceId = null, referenceType = null) {
  try {
    await base44.entities.Notification.create({
      user_email: userEmail,
      title,
      message,
      type,
      priority,
      reference_id: referenceId,
      reference_type: referenceType,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}