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
  Users, Building2, Briefcase, BarChart3
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
  const [showGoogleEvents, setShowGoogleEvents] = useState(true);
  const { getDisplayName, accessRecords } = useUserDisplayName();
  
  // Usuários aprovados como agentes
  const approvedUsers = accessRecords.filter(r => 
    r.roles?.includes('agente_comercial') || 
    r.roles?.includes('gerente') || 
    r.roles?.includes('administrador') ||
    r.status === 'approved'
  );

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 500),
  });

  // Fetch Google Calendar events for the week
  const { data: googleEventsData } = useQuery({
    queryKey: ['google-events', format(weekStart, 'yyyy-MM-dd'), format(addDays(weekStart, 6), 'yyyy-MM-dd')],
    queryFn: async () => {
      try {
        const response = await base44.functions.invoke('googleCalendarFetch', {
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(addDays(weekStart, 7), 'yyyy-MM-dd')
        });
        return response.data;
      } catch (e) {
        console.error('Error fetching Google events:', e);
        return { events: [] };
      }
    },
    enabled: showGoogleEvents
  });

  const googleEvents = googleEventsData?.events || [];

  const deleteAppointment = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['appointments']),
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Aplicar filtros
  const filteredAppointments = appointments.filter(apt => {
    // Filtro por agente
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
    
    // Filtro por categoria
    if (selectedCategory !== 'all') {
      if ((apt.category || 'comercial') !== selectedCategory) return false;
    }
    
    // Filtro por tipo de evento
    if (selectedEventType !== 'all') {
      if (apt.event_type !== selectedEventType) return false;
    }
    
    return true;
  });

  const getAppointmentsForSlot = (date, hour) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const crmAppts = filteredAppointments.filter(apt => {
      const matchesDate = apt.date === dateStr;
      const matchesHour = apt.time?.startsWith(hour.split(':')[0]);
      return matchesDate && matchesHour;
    });

    // Add Google Calendar events if enabled
    const googleAppts = showGoogleEvents ? googleEvents.filter(event => {
      if (event.status === 'cancelled') return false;
      const eventDate = new Date(event.start);
      const eventDateStr = format(eventDate, 'yyyy-MM-dd');
      const eventHour = format(eventDate, 'HH');
      return eventDateStr === dateStr && eventHour === hour.split(':')[0];
    }).map(e => ({
      id: `google-${e.id}`,
      title: e.title,
      time: format(new Date(e.start), 'HH:mm'),
      meeting_link: e.meet_link,
      google_meet_link: e.meet_link,
      source: 'google',
      category: 'google',
      appointment_type: e.meet_link ? 'videoconferencia' : 'telefone',
      status: 'confirmada'
    })) : [];

    return [...crmAppts, ...googleAppts];
  };

  const getAppointmentsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(apt => apt.date === dateStr);
  };

  // Compromissos do mês para estatísticas
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthAppointments = appointments.filter(apt => {
    if (!apt.date) return false;
    const date = parseISO(apt.date);
    return date >= monthStart && date <= monthEnd;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda Comercial e Corporativa</h1>
          <p className="text-slate-500">Gerencie reuniões comerciais e compromissos internos</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showGoogleEvents ? "default" : "outline"}
            size="sm"
            onClick={() => setShowGoogleEvents(!showGoogleEvents)}
            className={showGoogleEvents ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            <CalendarIcon className="w-4 h-4 mr-2" />
            Google Calendar
          </Button>
          <Link to={createPageUrl('AppointmentForm')}>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Compromisso
            </Button>
          </Link>
        </div>
      </div>

      {/* Estatísticas */}
      <ScheduleStats appointments={monthAppointments} />

      {/* Filtros */}
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

      {/* Calendário Semanal */}
      {viewMode === 'week' && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Header */}
              <div className="grid grid-cols-8 bg-slate-50 border-b">
                <div className="p-3 text-center font-medium text-slate-500 text-sm">
                  Horário
                </div>
                {weekDays.map((day) => (
                  <div 
                    key={day.toString()} 
                    className={`p-3 text-center border-l ${isToday(day) ? 'bg-[#6B2D8B]/5' : ''}`}
                  >
                    <p className="text-xs text-slate-500 uppercase">
                      {format(day, 'EEE', { locale: ptBR })}
                    </p>
                    <p className={`text-lg font-semibold ${isToday(day) ? 'text-[#6B2D8B]' : 'text-slate-800'}`}>
                      {format(day, 'd')}
                    </p>
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b">
                  <div className="p-2 text-center text-sm text-slate-500 bg-slate-50">
                    {hour}
                  </div>
                  {weekDays.map((day) => {
                    const dayAppointments = getAppointmentsForSlot(day, hour);
                    const dateStr = format(day, 'yyyy-MM-dd');
                    return (
                      <div 
                        key={`${day}-${hour}`} 
                        className={`p-1 border-l min-h-[80px] relative group ${isToday(day) ? 'bg-[#6B2D8B]/5' : ''}`}
                      >
                        <Link 
                          to={createPageUrl(`AppointmentForm?date=${dateStr}&time=${hour}`)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
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
                              onDelete={apt.source !== 'google' ? (id) => deleteAppointment.mutate(id) : null}
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

      {/* Visão do Dia - Por Agente */}
      {viewMode === 'day' && (
        <div className="space-y-6">
          {/* Lista por hora */}
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
                      <div className="w-16 text-sm text-slate-500 font-medium py-2">
                        {hour}
                      </div>
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

          {/* Cards por Agente */}
          {selectedAgent === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedUsers.map(agentUser => {
                const agentAppointments = appointments.filter(apt => 
                  apt.date === format(currentDate, 'yyyy-MM-dd') && 
                  (apt.agent_email === agentUser.user_email || apt.participants?.includes(agentUser.user_email))
                );
                
                return (
                  <Card key={agentUser.user_email} className="border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white text-xs font-bold">
                          {(agentUser.nickname || agentUser.user_name || '?').charAt(0).toUpperCase()}
                        </div>
                        {agentUser.nickname || agentUser.user_name}
                        <Badge variant="secondary" className="ml-auto">{agentAppointments.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {agentAppointments.length === 0 ? (
                        <p className="text-center py-4 text-sm text-slate-500">
                          Sem compromissos
                        </p>
                      ) : (
                        agentAppointments.map(apt => (
                          <AppointmentCard 
                            key={apt.id} 
                            apt={apt}
                            onDelete={(id) => deleteAppointment.mutate(id)}
                            getDisplayName={getDisplayName}
                          />
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Visão Mensal */}
      {viewMode === 'month' && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-slate-500">
                  {day}
                </div>
              ))}
              {Array.from({ length: 42 }, (_, i) => {
                const date = addDays(startOfWeek(startOfMonth(currentDate)), i);
                const dayAppointments = getAppointmentsForDay(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                const comerciais = dayAppointments.filter(a => a.category !== 'interno');
                const internos = dayAppointments.filter(a => a.category === 'interno');
                
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
                      {comerciais.slice(0, 2).map(apt => (
                        <div 
                          key={apt.id}
                          className="text-xs p-1 rounded bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB] text-white truncate"
                        >
                          {apt.time} - {apt.client_name || apt.title}
                        </div>
                      ))}
                      {internos.slice(0, 1).map(apt => (
                        <div 
                          key={apt.id}
                          className="text-xs p-1 rounded bg-gradient-to-r from-blue-600 to-blue-700 text-white truncate"
                        >
                          {apt.time} - {apt.title}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <p className="text-xs text-slate-500">
                          +{dayAppointments.length - 3} mais
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap gap-6 justify-center">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 font-medium">Status:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-slate-600">Confirmada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-sm text-slate-600">Aguardando</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-600">Concluída</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-slate-600">No-show</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 font-medium">Tipo:</span>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-600" />
            <span className="text-sm text-slate-600">Comercial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-sm text-slate-600">Interno</span>
          </div>
        </div>
      </div>
    </div>
  );
}