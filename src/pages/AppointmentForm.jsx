import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Calendar, User, Video, Phone, MapPin, Building2, Users, Briefcase, Link2, RefreshCw, ExternalLink } from 'lucide-react';
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EVENT_TYPES_COMERCIAL = [
  { value: 'reuniao_venda', label: 'Reunião de Venda' },
  { value: 'visita_comercial', label: 'Visita Comercial' },
  { value: 'demonstracao', label: 'Demonstração de Produto' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'tentativa_contato', label: 'Tentativa de Contato' },
  { value: 'proposta', label: 'Prazo de Proposta' },
];

const EVENT_TYPES_INTERNO = [
  { value: 'reuniao_equipe', label: 'Reunião de Equipe' },
  { value: 'reuniao_administrativa', label: 'Reunião Administrativa' },
  { value: 'reuniao_planejamento', label: 'Reunião de Planejamento' },
  { value: 'reuniao_alinhamento', label: 'Reunião de Alinhamento' },
  { value: 'sessao_feedback', label: 'Sessão de Feedback' },
  { value: 'reuniao_1_1', label: 'Reunião 1:1' },
  { value: 'treinamento', label: 'Treinamento Interno' },
  { value: 'atividade_interna', label: 'Atividade Interna' },
];

const INTERNAL_AREAS = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'operacional', label: 'Operacional' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'ti', label: 'TI' },
];

export default function AppointmentForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const appointmentId = urlParams.get('id');
  const clientIdParam = urlParams.get('client_id');
  const dateParam = urlParams.get('date');
  const timeParam = urlParams.get('time');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user, setUser] = useState(null);
  const { getDisplayName, accessRecords } = useUserDisplayName();

  const approvedUsers = accessRecords.filter(r => r.status === 'approved');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'comercial',
    event_type: 'reuniao_venda',
    client_id: clientIdParam || '',
    client_name: '',
    company_name: '',
    phone: '',
    email: '',
    agent: '',
    agent_email: '',
    participants: [],
    appointment_type: 'telefone',
    date: dateParam || '',
    time: timeParam || '',
    duration: 30,
    location: '',
    meeting_link: '',
    scheduled_by: '',
    scheduled_by_email: '',
    lead_source: '',
    meeting_reason: '',
    product: '',
    campaign_id: '',
    funnel_stage: '',
    internal_area: '',
    status: 'aguardando',
    notes: '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => base44.entities.Client.list('-created_date', 200),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns-active'],
    queryFn: () => base44.entities.Campaign.filter({ status: 'ativa' }),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products-active'],
    queryFn: () => base44.entities.Product.filter({ active: true }),
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData(prev => ({ 
          ...prev, 
          scheduled_by: userData.full_name,
          scheduled_by_email: userData.email,
          agent: getDisplayName(userData.email, userData.full_name),
          agent_email: userData.email,
        }));
      } catch (e) {}
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (appointmentId) {
      loadAppointment();
    }
  }, [appointmentId]);

  useEffect(() => {
    if (clientIdParam && clients.length > 0) {
      const client = clients.find(c => c.id === clientIdParam);
      if (client) {
        setFormData(prev => ({
          ...prev,
          client_name: client.client_name,
          company_name: client.company_name || '',
          phone: client.phone || '',
          email: client.email || '',
          client_id: client.id,
          title: `Reunião - ${client.client_name}`,
          funnel_stage: client.funnel_stage || 'lead',
          campaign_id: client.campaign_id || '',
        }));
      }
    }
  }, [clientIdParam, clients]);

  const loadAppointment = async () => {
    setIsLoading(true);
    try {
      const appointments = await base44.entities.Appointment.filter({ id: appointmentId });
      if (appointments.length > 0) {
        setFormData(appointments[0]);
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAgentSelect = (email) => {
    const agentUser = approvedUsers.find(u => u.user_email === email);
    if (agentUser) {
      setFormData(prev => ({
        ...prev,
        agent: agentUser.nickname || agentUser.user_name,
        agent_email: email,
      }));
    }
  };

  const handleClientSelect = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_name: client.client_name,
        company_name: client.company_name || '',
        phone: client.phone || '',
        email: client.email || '',
        client_id: client.id,
        title: prev.title || `Reunião - ${client.client_name}`,
        funnel_stage: client.funnel_stage || prev.funnel_stage,
        campaign_id: client.campaign_id || prev.campaign_id,
      }));
    }
  };

  const handleParticipantToggle = (email) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants?.includes(email)
        ? prev.participants.filter(e => e !== email)
        : [...(prev.participants || []), email]
    }));
  };

  const handleGoogleCalendarSync = async () => {
    if (!appointmentId) {
      alert('Salve o compromisso primeiro antes de sincronizar com Google Calendar');
      return;
    }

    setIsSyncing(true);
    try {
      const response = await base44.functions.invoke('googleCalendarSync', {
        appointmentId,
        action: formData.google_event_id ? 'update' : 'create',
      });

      if (response.data.success) {
        // Atualizar dados locais
        setFormData(prev => ({
          ...prev,
          google_event_id: response.data.google_event_id || prev.google_event_id,
          google_meet_link: response.data.google_meet_link || prev.google_meet_link,
          meeting_link: response.data.google_meet_link || prev.meeting_link,
        }));
        alert(formData.google_event_id ? 'Evento atualizado no Google Calendar!' : 'Evento criado no Google Calendar com sucesso!');
        // Recarregar dados
        await loadAppointment();
      } else {
        alert('Erro: ' + (response.data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      alert('Erro ao sincronizar com Google Calendar. Verifique se você autorizou o acesso.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Gerar título automático se não preenchido
      let finalData = { ...formData };
      if (!finalData.title) {
        if (finalData.category === 'comercial') {
          finalData.title = `${finalData.client_name} - ${EVENT_TYPES_COMERCIAL.find(t => t.value === finalData.event_type)?.label || 'Reunião'}`;
        } else {
          finalData.title = EVENT_TYPES_INTERNO.find(t => t.value === finalData.event_type)?.label || 'Reunião Interna';
        }
      }

      if (appointmentId) {
        await base44.entities.Appointment.update(appointmentId, finalData);
      } else {
        const appointment = await base44.entities.Appointment.create(finalData);
        
        // Criar tarefa vinculada
        await base44.entities.Task.create({
          title: finalData.title,
          task_type: finalData.appointment_type === 'presencial' ? 'reuniao_presencial' : 
                     finalData.appointment_type === 'videoconferencia' ? 'videochamada' : 'ligacao',
          client_id: finalData.client_id,
          client_name: finalData.client_name,
          agent: finalData.agent,
          agent_email: finalData.agent_email,
          due_date: `${finalData.date}T${finalData.time}`,
          appointment_id: appointment.id,
          status: 'pendente',
          notes: finalData.description,
        });
      }
      navigate(createPageUrl('Schedule'));
    } catch (error) {
      console.error('Error saving appointment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#6B2D8B] border-t-transparent rounded-full" />
      </div>
    );
  }

  const isComercial = formData.category === 'comercial';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {appointmentId ? 'Editar Compromisso' : 'Novo Compromisso'}
          </h1>
          <p className="text-slate-500">Preencha os dados do compromisso</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Tipo de Compromisso */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Tipo de Compromisso</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={formData.category} onValueChange={(v) => handleChange('category', v)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comercial" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    Comercial
                  </TabsTrigger>
                  <TabsTrigger value="interno" className="gap-2">
                    <Building2 className="w-4 h-4" />
                    Interno
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder={isComercial ? "Ex: Apresentação comercial - Empresa X" : "Ex: Reunião de equipe semanal"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Evento *</Label>
                  <Select 
                    value={formData.event_type} 
                    onValueChange={(v) => handleChange('event_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(isComercial ? EVENT_TYPES_COMERCIAL : EVENT_TYPES_INTERNO).map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Detalhes do compromisso..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cliente (apenas para comercial) */}
          {isComercial && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-[#6B2D8B]" />
                  Cliente / Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Selecionar Cliente Existente</Label>
                  <Select 
                    value={formData.client_id} 
                    onValueChange={handleClientSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente ou preencha manualmente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.client_name} {client.company_name ? `- ${client.company_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Cliente *</Label>
                    <Input
                      value={formData.client_name}
                      onChange={(e) => handleChange('client_name', e.target.value)}
                      required={isComercial}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => handleChange('company_name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Campanha</Label>
                    <Select 
                      value={formData.campaign_id || ''} 
                      onValueChange={(v) => handleChange('campaign_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Nenhuma</SelectItem>
                        {campaigns.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Etapa do Funil</Label>
                    <Select 
                      value={formData.funnel_stage || ''} 
                      onValueChange={(v) => handleChange('funnel_stage', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="contato">Contato</SelectItem>
                        <SelectItem value="qualificacao">Qualificação</SelectItem>
                        <SelectItem value="proposta">Proposta</SelectItem>
                        <SelectItem value="negociacao">Negociação</SelectItem>
                        <SelectItem value="fechamento">Fechamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Produto</Label>
                    <Select 
                      value={formData.product || ''} 
                      onValueChange={(v) => handleChange('product', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Nenhum</SelectItem>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Área Interna (apenas para interno) */}
          {!isComercial && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Detalhes Internos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Área Relacionada</Label>
                  <Select 
                    value={formData.internal_area || ''} 
                    onValueChange={(v) => handleChange('internal_area', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a área..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERNAL_AREAS.map(area => (
                        <SelectItem key={area.value} value={area.value}>
                          {area.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data, Hora e Responsável */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#6B2D8B]" />
                Data e Responsável
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Select 
                  value={formData.agent_email} 
                  onValueChange={handleAgentSelect}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedUsers.map(u => (
                      <SelectItem key={u.user_email} value={u.user_email}>
                        {u.nickname || u.user_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Canal *</Label>
                <Select 
                  value={formData.appointment_type} 
                  onValueChange={(v) => handleChange('appointment_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="telefone">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Telefone
                      </div>
                    </SelectItem>
                    <SelectItem value="videoconferencia">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4" /> Videoconferência
                      </div>
                    </SelectItem>
                    <SelectItem value="presencial">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Presencial
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleChange('time', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Duração</Label>
                <Select 
                  value={formData.duration?.toString()} 
                  onValueChange={(v) => handleChange('duration', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => handleChange('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="reagendada">Reagendada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="nao_compareceu">Não compareceu</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.appointment_type === 'presencial' && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="Endereço do local"
                  />
                </div>
              )}

              {formData.appointment_type === 'videoconferencia' && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Link da Videochamada
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.google_meet_link || formData.meeting_link}
                      onChange={(e) => handleChange('meeting_link', e.target.value)}
                      placeholder="https://meet.google.com/..."
                      readOnly={!!formData.google_meet_link}
                      className={formData.google_meet_link ? 'bg-green-50 border-green-300' : ''}
                    />
                    {formData.google_meet_link && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => window.open(formData.google_meet_link, '_blank')}
                        className="shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {formData.google_meet_link ? (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      ✅ Link do Google Meet gerado automaticamente
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Sincronize com Google Calendar para gerar automaticamente
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participantes */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#6B2D8B]" />
                Participantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500 mb-3">
                Selecione outros participantes além do responsável:
              </p>
              <div className="flex flex-wrap gap-2">
                {approvedUsers.filter(u => u.user_email !== formData.agent_email).map(u => (
                  <Badge
                    key={u.user_email}
                    variant={formData.participants?.includes(u.user_email) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      formData.participants?.includes(u.user_email) 
                        ? 'bg-[#6B2D8B] hover:bg-[#5a2575]' 
                        : 'hover:bg-slate-100'
                    }`}
                    onClick={() => handleParticipantToggle(u.user_email)}
                  >
                    {u.nickname || u.user_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={3}
                placeholder="Informações adicionais sobre o compromisso..."
              />
            </CardContent>
          </Card>

          {/* Google Calendar Sync */}
          {appointmentId && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                  <Calendar className="w-5 h-5" />
                  Integração Google Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 mb-1">
                      {formData.google_event_id ? (
                        <span className="flex items-center gap-2 text-green-600">
                          ✅ Sincronizado com Google Calendar
                        </span>
                      ) : (
                        'Sincronize este compromisso com seu Google Calendar'
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formData.google_event_id ? 
                        'O evento está no seu calendário. Clique para atualizar.' : 
                        'Cria automaticamente o evento e gera link do Google Meet (se videoconferência)'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleGoogleCalendarSync}
                    disabled={isSyncing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sincronizando...
                      </>
                    ) : formData.google_event_id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Atualizar
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 mr-2" />
                        Sincronizar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Compromisso
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}