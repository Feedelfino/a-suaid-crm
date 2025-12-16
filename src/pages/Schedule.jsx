import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, parseISO, isToday, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Phone, Video, MapPin,
  User, Clock, Calendar as CalendarIcon, MoreVertical, Edit, Trash2,
  Users, Building2, Briefcase, BarChart3, RefreshCw
} from 'lucide-react';
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppointmentCard from '@/components/schedule/AppointmentCard';
import ScheduleFilters from '@/components/schedule/ScheduleFilters';
import ScheduleStats from '@/components/schedule/ScheduleStats';

const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export default function Schedule() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [selectedAgent, setSelectedAgent] = useState('mine');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { getDisplayName, accessRecords } = useUserDisplayName();
  
  const approvedUsers = accessRecords.filter(r => r.status === 'approved');
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Auto-sync on mount and date change
  useEffect(() => {
    handleSync();
  }, [weekStart]);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 500),
  });

  const deleteAppointment = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['appointments']),
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await base44.functions.invoke('syncGoogleCalendar', {
        action: 'syncFromGoogle',
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(addDays(weekStart, 7), 'yyyy-MM-dd')
      });
      queryClient.invalidateQueries(['appointments']);
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const navigateDate = (direction) => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, direction));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, direction * 7));
    } else {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + direction);
      setCurrentDate(newDate);
    }
  };

  // Apply filters
  const filteredAppointments = appointments.filter(apt => {
    if (selectedAgent === 'mine') {
      if (apt.agent_email !== user?.email && apt.scheduled_by_email !== user?.email && 
          !apt.participants?.includes(user?.email)) {
        return false;
      }
    } else if (selectedAgent !== 'all') {
      if (apt.agent_email !== selectedAgent && !apt.participants?.includes(selectedAgent)) {
        return false;
      }
    }
    
    if (selectedCategory !== 'all' && (apt.category || 'comercial') !== selectedCategory) return false;
    if (selectedEventType !== 'all' && apt.event_type !== selectedEventType) return false;
    
    return true;
  });

  const getAppointmentsForSlot = (date, hour) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(apt => {
      const matchesDate = apt.date === dateStr;
      const matchesHour = apt.time?.startsWith(hour.split(':')[0]);
      return matchesDate && matchesHour;
    });
  };

  const getAppointmentsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(apt => apt.date === dateStr);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthAppointments = appointments.filter(apt => {
    if (!apt.date) return false;
    const date = parseISO(apt.date);
    return date >= monthStart && date <= monthEnd;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Agenda Comercial
            {isSyncing && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
          </h1>
          <p className="text-slate-500">Sincronizado com Google Calendar</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
          <Link to={createPageUrl('AppointmentForm')}>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Compromisso
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <ScheduleStats appointments={monthAppointments} />

      {/* Filters & Navigation */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <ScheduleFilters
              selectedAgent={selectedAgent}
              setSelectedAgent={setSelectedAgent}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedEventType={selectedEventType}
              setSelectedEventType={setSelectedEventType}
              approvedUsers={approvedUsers}
              user={user}
            />
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h3 className="font-semibold text-slate-800">
                  {viewMode === 'day' && format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {viewMode === 'week' && `${format(weekStart, 'dd/MM')} - ${format(addDays(weekStart, 6), 'dd/MM/yyyy')}`}
                  {viewMode === 'month' && format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </h3>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
                Hoje
              </Button>
            </div>

            <Tabs value={viewMode} onValueChange={setViewMode}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Weekly View */}
      {viewMode === 'week' && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-8 bg-slate-50 border-b">
                <div className="p-3 text-center font-medium text-slate-500 text-sm">Horário</div>
                {weekDays.map((day) => (
                  <div key={day.toString()} className={`p-3 text-center border-l ${isToday(day) ? 'bg-[#6B2D8B]/5' : ''}`}>
                    <p className="text-xs text-slate-500 uppercase">{format(day, 'EEE', { locale: ptBR })}</p>
                    <p className={`text-lg font-semibold ${isToday(day) ? 'text-[#6B2D8B]' : 'text-slate-800'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                ))}
              </div>

              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b">
                  <div className="p-2 text-center text-sm text-slate-500 bg-slate-50">{hour}</div>
                  {weekDays.map((day) => {
                    const dayAppointments = getAppointmentsForSlot(day, hour);
                    const dateStr = format(day, 'yyyy-MM-dd');
                    return (
                      <div key={`${day}-${hour}`} className={`p-1 border-l min-h-[80px] relative group ${isToday(day) ? 'bg-[#6B2D8B]/5' : ''}`}>
                        <Link to={createPageUrl(`AppointmentForm?date=${dateStr}&time=${hour}`)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-6 w-6 bg-white shadow-sm hover:bg-slate-100">
                            <Plus className="w-3 h-3 text-[#6B2D8B]" />
                          </Button>
                        </Link>
                        <div className="space-y-1">
                          {dayAppointments.map(apt => (
                            <AppointmentCard 
                              key={apt.id} 
                              apt={apt} 
                              compact 
                              onDelete={(id) => deleteAppointment.mutate(id)}
                              getDisplayName={getDisplayName}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">
              Compromissos de {format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {HOURS.map(hour => {
                const hourAppointments = getAppointmentsForSlot(currentDate, hour);
                if (hourAppointments.length === 0) return null;
                
                return (
                  <div key={hour} className="flex gap-4">
                    <div className="w-16 text-sm text-slate-500 font-medium py-2">{hour}</div>
                    <div className="flex-1 space-y-2">
                      {hourAppointments.map(apt => (
                        <AppointmentCard 
                          key={apt.id} 
                          apt={apt}
                          onDelete={(id) => deleteAppointment.mutate(id)}
                          getDisplayName={getDisplayName}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {getAppointmentsForDay(currentDate).length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhum compromisso para este dia</p>
                  <Link to={createPageUrl(`AppointmentForm?date=${format(currentDate, 'yyyy-MM-dd')}`)}>
                    <Button className="mt-4" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Compromisso
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-slate-500">{day}</div>
              ))}
              {Array.from({ length: 42 }, (_, i) => {
                const date = addDays(startOfWeek(startOfMonth(currentDate)), i);
                const dayAppointments = getAppointmentsForDay(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                
                return (
                  <div 
                    key={i} 
                    className={`min-h-[100px] p-2 border rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${
                      isToday(date) ? 'bg-[#6B2D8B]/10 border-[#6B2D8B]' : 
                      isCurrentMonth ? 'bg-white' : 'bg-slate-50'
                    }`}
                    onClick={() => {
                      setCurrentDate(date);
                      setViewMode('day');
                    }}
                  >
                    <p className={`text-sm font-medium mb-1 ${
                      isToday(date) ? 'text-[#6B2D8B]' : 
                      isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {format(date, 'd')}
                    </p>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map(apt => (
                        <div 
                          key={apt.id}
                          className="text-xs p-1 rounded bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB] text-white truncate"
                        >
                          {apt.time} - {apt.client_name || apt.title}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <p className="text-xs text-slate-500">+{dayAppointments.length - 3} mais</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}