import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek, parseISO, isToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Phone, Video, MapPin,
  User, Clock, Calendar as CalendarIcon, MoreVertical, Edit, Trash2
} from 'lucide-react';
import { useAgentNames } from '@/components/hooks/useAgentNames';
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export default function Schedule() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [selectedAgent, setSelectedAgent] = useState('mine'); // Default: minha agenda
  const [user, setUser] = useState(null);
  const { agentNamesArray: AGENTS } = useAgentNames();
  const { getDisplayName, accessRecords } = useUserDisplayName();
  
  // Usar usuários aprovados como agentes
  const approvedUsers = accessRecords.filter(r => 
    r.roles?.includes('agente_comercial') || 
    r.roles?.includes('gerente') || 
    r.roles?.includes('administrador')
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
    queryFn: () => base44.entities.Appointment.list('-date', 200),
  });

  const deleteAppointment = useMutation({
    mutationFn: (id) => base44.entities.Appointment.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['appointments']),
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const filteredAppointments = appointments.filter(apt => {
    if (selectedAgent === 'all') return true;
    if (selectedAgent === 'mine') return apt.agent === user?.full_name;
    return apt.agent === selectedAgent;
  });

  const getAppointmentsForSlot = (date, hour, agent) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(apt => {
      const matchesDate = apt.date === dateStr;
      const matchesHour = apt.time?.startsWith(hour.split(':')[0]);
      const matchesAgent = agent === 'all' || apt.agent === agent;
      return matchesDate && matchesHour && matchesAgent;
    });
  };

  const getAppointmentsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.filter(apt => apt.date === dateStr);
  };

  const statusColors = {
    confirmada: 'bg-green-500',
    aguardando: 'bg-yellow-500',
    reagendada: 'bg-blue-500',
    cancelada: 'bg-red-500',
    nao_compareceu: 'bg-orange-500',
    concluida: 'bg-emerald-500',
  };

  const typeIcons = {
    presencial: MapPin,
    videoconferencia: Video,
    telefone: Phone,
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

  const AppointmentCard = ({ apt, compact = false }) => {
    const Icon = typeIcons[apt.appointment_type] || Phone;
    return (
      <div 
        className={`group rounded-lg p-2 ${compact ? 'text-xs' : 'p-3'} bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB] text-white relative overflow-hidden`}
      >
        <div className={`absolute top-0 left-0 w-1 h-full ${statusColors[apt.status] || 'bg-gray-400'}`} />
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 pl-2">
            <p className="font-medium truncate">{apt.client_name}</p>
            <div className="flex items-center gap-1 text-white/80 mt-1">
              <Icon className="w-3 h-3" />
              <span>{apt.time}</span>
              {!compact && <span>• {apt.duration || 30} min</span>}
            </div>
            {!compact && apt.meeting_reason && (
              <p className="text-white/70 text-xs mt-1 capitalize">
                {apt.meeting_reason?.replace('_', ' ')}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 h-6 w-6 text-white hover:bg-white/20"
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link to={createPageUrl(`AppointmentForm?id=${apt.id}`)}>
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => deleteAppointment.mutate(apt.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {!compact && (
          <p className="text-white/60 text-xs mt-2">Agente: {getDisplayName(apt.agent_email, apt.agent)}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Agenda Comercial</h1>
          <p className="text-slate-500">Gerencie reuniões e compromissos</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine">Minha Agenda</SelectItem>
              <SelectItem value="all">Agenda Geral</SelectItem>
              {AGENTS.map(agent => (
                <SelectItem key={agent} value={agent}>{agent}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link to={createPageUrl('AppointmentForm')}>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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

      {/* Calendar Grid */}
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
                    const dayAppointments = getAppointmentsForSlot(day, hour, selectedAgent);
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
                            <AppointmentCard key={apt.id} apt={apt} compact />
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

      {viewMode === 'day' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {AGENTS.map(agent => {
            const agentAppointments = filteredAppointments.filter(apt => 
              apt.date === format(currentDate, 'yyyy-MM-dd') && 
              (selectedAgent === 'all' || apt.agent === agent)
            );
            
            if (selectedAgent !== 'all' && selectedAgent !== agent) return null;
            
            return (
              <Card key={agent} className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white text-xs font-bold">
                      {agent.split(' ')[1]}
                    </div>
                    {agent}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agentAppointments.length === 0 ? (
                    <p className="text-center py-8 text-sm text-slate-500">
                      Sem agendamentos
                    </p>
                  ) : (
                    agentAppointments.map(apt => (
                      <AppointmentCard key={apt.id} apt={apt} />
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === 'month' && (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-slate-500">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const date = addDays(startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)), i);
                const dayAppointments = getAppointmentsForDay(date);
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                
                return (
                  <div 
                    key={i} 
                    className={`min-h-[100px] p-2 border rounded-lg ${
                      isToday(date) ? 'bg-[#6B2D8B]/10 border-[#6B2D8B]' : 
                      isCurrentMonth ? 'bg-white' : 'bg-slate-50'
                    }`}
                  >
                    <p className={`text-sm font-medium mb-1 ${
                      isToday(date) ? 'text-[#6B2D8B]' : 
                      isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {format(date, 'd')}
                    </p>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map(apt => (
                        <div 
                          key={apt.id}
                          className="text-xs p-1 rounded bg-gradient-to-r from-[#6B2D8B] to-[#8B4DAB] text-white truncate"
                        >
                          {apt.time} - {apt.client_name}
                        </div>
                      ))}
                      {dayAppointments.length > 2 && (
                        <p className="text-xs text-slate-500">
                          +{dayAppointments.length - 2} mais
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <span className="text-sm text-slate-600 capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}