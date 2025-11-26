import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, Calendar, User, Video, Phone, MapPin } from 'lucide-react';
import { useAgentNames } from '@/components/hooks/useAgentNames';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AppointmentForm() {
  const { agentList } = useAgentNames();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const appointmentId = urlParams.get('id');
  const clientIdParam = urlParams.get('client_id');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    client_name: '',
    company_name: '',
    phone: '',
    email: '',
    agent: '',
    appointment_type: 'telefone',
    date: '',
    time: '',
    duration: 30,
    location: '',
    meeting_link: '',
    scheduled_by: '',
    lead_source: '',
    meeting_reason: '',
    product: '',
    status: 'aguardando',
    notes: '',
    client_id: clientIdParam || '',
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => base44.entities.Client.list('-created_date', 100),
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData(prev => ({ ...prev, scheduled_by: userData.full_name }));
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
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (appointmentId) {
        await base44.entities.Appointment.update(appointmentId, formData);
      } else {
        const appointment = await base44.entities.Appointment.create(formData);
        // Create task for this appointment
        await base44.entities.Task.create({
          title: `${formData.appointment_type === 'presencial' ? 'Reunião presencial' : 
                   formData.appointment_type === 'videoconferencia' ? 'Videochamada' : 'Ligação'} - ${formData.client_name}`,
          task_type: formData.appointment_type === 'presencial' ? 'reuniao_presencial' : 
                     formData.appointment_type === 'videoconferencia' ? 'videochamada' : 'ligacao',
          client_id: formData.client_id,
          client_name: formData.client_name,
          agent: formData.agent,
          due_date: `${formData.date}T${formData.time}`,
          appointment_id: appointment.id,
          status: 'pendente',
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
            {appointmentId ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h1>
          <p className="text-slate-500">Preencha os dados do agendamento</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Client Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-[#6B2D8B]" />
                Cliente
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
                    required
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
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#6B2D8B]" />
                Detalhes do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agente Responsável *</Label>
                <Select 
                  value={formData.agent} 
                  onValueChange={(v) => handleChange('agent', v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agentList.map(agent => (
                      <SelectItem key={agent.key} value={agent.name}>{agent.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Reunião *</Label>
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
                <Label>Duração (minutos)</Label>
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
                    <SelectItem value="aguardando">Aguardando confirmação</SelectItem>
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
                  <Label>Link da Videochamada</Label>
                  <Input
                    value={formData.meeting_link}
                    onChange={(e) => handleChange('meeting_link', e.target.value)}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origem do Lead</Label>
                <Select 
                  value={formData.lead_source || ''} 
                  onValueChange={(v) => handleChange('lead_source', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="organico">Orgânico</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motivo da Reunião</Label>
                <Select 
                  value={formData.meeting_reason || ''} 
                  onValueChange={(v) => handleChange('meeting_reason', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apresentacao_comercial">Apresentação Comercial</SelectItem>
                    <SelectItem value="fechamento">Fechamento</SelectItem>
                    <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto Relacionado</Label>
                <Input
                  value={formData.product}
                  onChange={(e) => handleChange('product', e.target.value)}
                  placeholder="Ex: Certificado A3, Site..."
                />
              </div>

              <div className="space-y-2">
                <Label>Quem Agendou</Label>
                <Input
                  value={formData.scheduled_by}
                  onChange={(e) => handleChange('scheduled_by', e.target.value)}
                  placeholder="Nome do colaborador"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

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
                  Salvar Agendamento
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}