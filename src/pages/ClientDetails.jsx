import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, Edit, Phone, Mail, Building2, Calendar,
  MessageSquare, CheckCircle, Clock, AlertTriangle,
  Video, MapPin, DollarSign, Plus, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InteractionForm from '@/components/crm/InteractionForm';

export default function ClientDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => base44.entities.Client.filter({ id: clientId }),
    enabled: !!clientId,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['interactions', clientId],
    queryFn: () => base44.entities.Interaction.filter({ client_id: clientId }, '-created_date'),
    enabled: !!clientId,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', clientId],
    queryFn: () => base44.entities.Appointment.filter({ client_id: clientId }, '-date'),
    enabled: !!clientId,
  });

  const client = clients[0];

  const createInteractionMutation = useMutation({
    mutationFn: (data) => base44.entities.Interaction.create({
      ...data,
      client_id: clientId,
      client_name: client?.client_name,
      agent_name: user?.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['interactions', clientId]);
      setShowInteractionForm(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#6B2D8B] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">Cliente não encontrado</p>
        <Link to={createPageUrl('Clients')}>
          <Button className="mt-4">Voltar</Button>
        </Link>
      </div>
    );
  }

  const statusColors = {
    novo: 'bg-blue-100 text-blue-700',
    em_contato: 'bg-yellow-100 text-yellow-700',
    qualificado: 'bg-green-100 text-green-700',
    negociando: 'bg-purple-100 text-purple-700',
    fechado: 'bg-emerald-100 text-emerald-700',
    perdido: 'bg-red-100 text-red-700',
    indeciso: 'bg-orange-100 text-orange-700',
  };

  const interactionIcons = {
    tentativa_email: Mail,
    tentativa_telefone: Phone,
    tentativa_whatsapp: MessageSquare,
    contato_sucesso: CheckCircle,
    followup_agendado: Calendar,
    cliente_indeciso: Clock,
    venda_fechada: DollarSign,
    parceria: Building2,
    sem_interesse: AlertTriangle,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6B2D8B] to-[#C71585] flex items-center justify-center text-white text-2xl font-bold">
              {client.client_name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{client.client_name}</h1>
              {client.company_name && (
                <p className="text-slate-500 flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> {client.company_name}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowInteractionForm(true)}
            className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Interação
          </Button>
          <Link to={createPageUrl(`ClientForm?id=${clientId}`)}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Interactions History */}
        <div className="lg:col-span-2 space-y-6">
          {showInteractionForm && (
            <Card className="border-0 shadow-lg border-l-4 border-l-[#6B2D8B]">
              <CardHeader>
                <CardTitle className="text-lg">Registrar Interação</CardTitle>
              </CardHeader>
              <CardContent>
                <InteractionForm
                  onSubmit={(data) => createInteractionMutation.mutate(data)}
                  onCancel={() => setShowInteractionForm(false)}
                  isLoading={createInteractionMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Interações</CardTitle>
            </CardHeader>
            <CardContent>
              {interactions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nenhuma interação registrada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interactions.map((interaction) => {
                    const Icon = interactionIcons[interaction.interaction_type] || MessageSquare;
                    return (
                      <div 
                        key={interaction.id} 
                        className="flex gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#6B2D8B]/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-[#6B2D8B]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-slate-800 capitalize">
                                {interaction.interaction_type?.replace('_', ' ')}
                              </p>
                              {interaction.product_offered && (
                                <p className="text-sm text-slate-500">
                                  Produto: {interaction.product_offered.replace('_', ' ')}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {interaction.created_date && format(parseISO(interaction.created_date), "dd/MM/yyyy HH:mm")}
                            </span>
                          </div>
                          {interaction.notes && (
                            <p className="text-sm text-slate-600 mt-2">{interaction.notes}</p>
                          )}
                          {interaction.sale_value && (
                            <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                              R$ {interaction.sale_value.toFixed(2)}
                            </Badge>
                          )}
                          <p className="text-xs text-slate-400 mt-2">por {interaction.agent_name || 'Agente'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Client Info */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Dados do Cliente
                <Badge className={statusColors[client.lead_status] || 'bg-slate-100'}>
                  {client.lead_status?.replace('_', ' ') || 'novo'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.cpf && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">CPF</p>
                  <p className="font-medium text-slate-800">{client.cpf}</p>
                </div>
              )}
              {client.cnpj && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">CNPJ</p>
                  <p className="font-medium text-slate-800">{client.cnpj}</p>
                </div>
              )}
              {client.phone && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Telefone</p>
                  <p className="font-medium text-slate-800 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#6B2D8B]" />
                    {client.phone}
                  </p>
                </div>
              )}
              {client.whatsapp && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">WhatsApp</p>
                  <p className="font-medium text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    {client.whatsapp}
                  </p>
                </div>
              )}
              {client.email && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">E-mail</p>
                  <p className="font-medium text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#6B2D8B]" />
                    {client.email}
                  </p>
                </div>
              )}
              {client.business_area && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Área de Atuação</p>
                  <p className="font-medium text-slate-800">{client.business_area}</p>
                </div>
              )}
              {client.lead_source && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Origem</p>
                  <p className="font-medium text-slate-800 capitalize">{client.lead_source.replace('_', ' ')}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Observações</p>
                  <p className="text-slate-600 text-sm">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Agendamentos
                <Link to={createPageUrl(`AppointmentForm?client_id=${clientId}`)}>
                  <Button size="sm" variant="ghost" className="text-[#6B2D8B]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-center py-4 text-slate-500 text-sm">Nenhum agendamento</p>
              ) : (
                <div className="space-y-3">
                  {appointments.slice(0, 5).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <div className="w-8 h-8 rounded-lg bg-[#C71585]/10 flex items-center justify-center">
                        {apt.appointment_type === 'presencial' ? (
                          <MapPin className="w-4 h-4 text-[#C71585]" />
                        ) : apt.appointment_type === 'videoconferencia' ? (
                          <Video className="w-4 h-4 text-[#C71585]" />
                        ) : (
                          <Phone className="w-4 h-4 text-[#C71585]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {apt.date && format(parseISO(apt.date), "dd/MM/yyyy")} às {apt.time}
                        </p>
                        <p className="text-xs text-slate-500 capitalize">{apt.status?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}