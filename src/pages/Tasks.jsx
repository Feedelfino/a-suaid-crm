import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CheckCircle2, Clock, Phone, Video, MapPin, Calendar,
  AlertCircle, Filter, MoreVertical, Edit, Trash2, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InteractionForm from '@/components/crm/InteractionForm';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [completingTask, setCompletingTask] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-due_date'),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });

  const deleteTask = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['tasks']),
  });

  const createInteraction = useMutation({
    mutationFn: (data) => base44.entities.Interaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setCompletingTask(null);
    },
  });

  const handleCompleteTask = async (interactionData) => {
    // Create interaction
    await createInteraction.mutateAsync({
      ...interactionData,
      client_id: completingTask.client_id,
      client_name: completingTask.client_name,
      agent_name: user?.full_name,
    });
    
    // Mark task as completed
    await updateTask.mutateAsync({
      id: completingTask.id,
      data: { status: 'concluida', interaction_registered: true }
    });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesType = typeFilter === 'all' || task.task_type === typeFilter;
    return matchesStatus && matchesType;
  });

  const tasksByStatus = {
    pendente: filteredTasks.filter(t => t.status === 'pendente'),
    em_andamento: filteredTasks.filter(t => t.status === 'em_andamento'),
    concluida: filteredTasks.filter(t => t.status === 'concluida'),
  };

  const taskTypeIcons = {
    reuniao_presencial: MapPin,
    ligacao: Phone,
    videochamada: Video,
    followup: Clock,
    retorno_45: AlertCircle,
    retorno_90: AlertCircle,
    atendimento: Calendar,
    manual: CheckCircle2,
  };

  const taskTypeLabels = {
    reuniao_presencial: 'Reunião Presencial',
    ligacao: 'Ligação',
    videochamada: 'Videochamada',
    followup: 'Follow-up',
    retorno_45: 'Retorno 45 dias',
    retorno_90: 'Retorno 90 dias',
    atendimento: 'Atendimento',
    manual: 'Tarefa Manual',
  };

  const statusColors = {
    pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    em_andamento: 'bg-blue-100 text-blue-700 border-blue-200',
    concluida: 'bg-green-100 text-green-700 border-green-200',
    reagendada: 'bg-purple-100 text-purple-700 border-purple-200',
    cancelada: 'bg-red-100 text-red-700 border-red-200',
    nao_compareceu: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const getDateBadge = (dueDate) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    
    if (isToday(date)) {
      return <Badge className="bg-blue-100 text-blue-700">Hoje</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-purple-100 text-purple-700">Amanhã</Badge>;
    }
    if (isPast(date)) {
      return <Badge className="bg-red-100 text-red-700">Atrasada</Badge>;
    }
    return null;
  };

  const TaskCard = ({ task }) => {
    const Icon = taskTypeIcons[task.task_type] || CheckCircle2;
    const isPending = task.status === 'pendente';
    
    return (
      <div className={`p-4 rounded-xl border ${
        isPending && task.due_date && isPast(parseISO(task.due_date)) 
          ? 'border-red-200 bg-red-50' 
          : 'border-slate-200 bg-white'
      } hover:shadow-md transition-all`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            task.status === 'concluida' 
              ? 'bg-green-100' 
              : 'bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB]'
          }`}>
            <Icon className={`w-5 h-5 ${task.status === 'concluida' ? 'text-green-600' : 'text-white'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`font-medium ${task.status === 'concluida' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {task.title}
                </p>
                {task.client_name && (
                  <Link 
                    to={createPageUrl(`ClientDetails?id=${task.client_id}`)}
                    className="text-sm text-[#6B2D8B] hover:underline"
                  >
                    {task.client_name}
                  </Link>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {task.status === 'pendente' && (
                    <>
                      <DropdownMenuItem onClick={() => setCompletingTask(task)}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Concluir (Registrar Interação)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateTask.mutate({ 
                        id: task.id, 
                        data: { status: 'em_andamento' } 
                      })}>
                        <Clock className="w-4 h-4 mr-2" />
                        Em Andamento
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => deleteTask.mutate(task.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {taskTypeLabels[task.task_type] || task.task_type}
              </Badge>
              <Badge className={statusColors[task.status]}>
                {task.status?.replace('_', ' ')}
              </Badge>
              {getDateBadge(task.due_date)}
            </div>
            {task.due_date && (
              <p className="text-xs text-slate-400 mt-2">
                {format(parseISO(task.due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tarefas</h1>
          <p className="text-slate-500">Gerencie suas tarefas e compromissos</p>
        </div>
        <div className="flex gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="reuniao_presencial">Reunião Presencial</SelectItem>
              <SelectItem value="ligacao">Ligação</SelectItem>
              <SelectItem value="videochamada">Videochamada</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="retorno_45">Retorno 45 dias</SelectItem>
              <SelectItem value="retorno_90">Retorno 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pendentes</p>
                <p className="text-2xl font-bold text-slate-800">{tasksByStatus.pendente.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Em Andamento</p>
                <p className="text-2xl font-bold text-slate-800">{tasksByStatus.em_andamento.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Concluídas</p>
                <p className="text-2xl font-bold text-slate-800">{tasksByStatus.concluida.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">
                  {tasksByStatus.pendente.filter(t => t.due_date && isPast(parseISO(t.due_date))).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-yellow-50 border-b border-yellow-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Pendentes
              <Badge className="ml-auto bg-yellow-100 text-yellow-700">
                {tasksByStatus.pendente.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {tasksByStatus.pendente.length === 0 ? (
              <p className="text-center py-8 text-slate-500">Nenhuma tarefa pendente</p>
            ) : (
              tasksByStatus.pendente.map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Em Andamento
              <Badge className="ml-auto bg-blue-100 text-blue-700">
                {tasksByStatus.em_andamento.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {tasksByStatus.em_andamento.length === 0 ? (
              <p className="text-center py-8 text-slate-500">Nenhuma tarefa em andamento</p>
            ) : (
              tasksByStatus.em_andamento.map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-green-50 border-b border-green-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Concluídas
              <Badge className="ml-auto bg-green-100 text-green-700">
                {tasksByStatus.concluida.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
            {tasksByStatus.concluida.length === 0 ? (
              <p className="text-center py-8 text-slate-500">Nenhuma tarefa concluída</p>
            ) : (
              tasksByStatus.concluida.slice(0, 10).map(task => (
                <TaskCard key={task.id} task={task} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Complete Task Dialog */}
      <Dialog open={!!completingTask} onOpenChange={(open) => !open && setCompletingTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Interação para Concluir Tarefa</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-4 bg-amber-50 rounded-xl mb-4">
              <p className="text-sm text-amber-800">
                <strong>Atenção:</strong> Para concluir esta tarefa, você precisa registrar uma interação com o cliente.
              </p>
            </div>
            <InteractionForm
              onSubmit={handleCompleteTask}
              onCancel={() => setCompletingTask(null)}
              isLoading={createInteraction.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}