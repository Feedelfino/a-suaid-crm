import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { ArrowLeft, Save, User, Building2, Phone, Mail, MapPin, FileText, RefreshCw } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
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

export default function ClientForm() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');

  const [formData, setFormData] = useState({
    client_code: '',
    client_name: '',
    company_name: '',
    cpf: '',
    cnpj: '',
    phone: '',
    whatsapp: '',
    email: '',
    business_area: '',
    lead_status: 'novo',
    lead_source: '',
    notes: '',
    has_certificate: false,
    certificate_type: '',
    certificate_expiry_date: '',
    has_service: false,
    service_type: '',
    service_expiry_date: '',
    renewal_status: '',
    instagram: '',
    linkedin: '',
    website: '',
  });

  // Gerar código único se for novo cliente
  React.useEffect(() => {
    if (!clientId && !formData.client_code) {
      const generateCode = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `CL${timestamp}${random}`;
      };
      setFormData(prev => ({ ...prev, client_code: generateCode() }));
    }
  }, [clientId]);

  // Buscar cliente se estiver editando
  const { data: client, isLoading } = useQuery({
    queryKey: ['client-edit', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const allClients = await base44.entities.Client.list();
      return allClients.find(c => c.id === clientId) || null;
    },
    enabled: !!clientId,
  });

  // Preencher formulário quando o cliente for carregado
  useEffect(() => {
    if (client) {
      setFormData({
        client_code: client.client_code || '',
        client_name: client.client_name || '',
        company_name: client.company_name || '',
        cpf: client.cpf || '',
        cnpj: client.cnpj || '',
        phone: client.phone || '',
        whatsapp: client.whatsapp || '',
        email: client.email || '',
        business_area: client.business_area || '',
        lead_status: client.lead_status || 'novo',
        lead_source: client.lead_source || '',
        notes: client.notes || '',
        has_certificate: client.has_certificate || false,
        certificate_type: client.certificate_type || '',
        certificate_expiry_date: client.certificate_expiry_date || '',
        has_service: client.has_service || false,
        service_type: client.service_type || '',
        service_expiry_date: client.service_expiry_date || '',
        renewal_status: client.renewal_status || '',
        instagram: client.instagram || '',
        linkedin: client.linkedin || '',
        website: client.website || '',
      });
    }
  }, [client]);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-form'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (clientId) {
        // Detectar campos alterados para registrar no histórico
        const changedFields = [];
        const fieldLabels = {
          client_name: 'Nome', company_name: 'Empresa', cpf: 'CPF', cnpj: 'CNPJ',
          phone: 'Telefone', whatsapp: 'WhatsApp', email: 'E-mail',
          business_area: 'Área de Atuação', lead_status: 'Status do Lead',
          lead_source: 'Origem', notes: 'Observações',
          has_certificate: 'Possui Certificado', certificate_type: 'Tipo de Certificado',
          certificate_expiry_date: 'Validade do Certificado',
          has_service: 'Possui Serviço', service_type: 'Tipo de Serviço',
          service_expiry_date: 'Vencimento do Serviço', renewal_status: 'Status de Renovação',
          instagram: 'Instagram', linkedin: 'LinkedIn', website: 'Site',
        };

        if (client) {
          Object.keys(fieldLabels).forEach(field => {
            const oldVal = client[field] ?? '';
            const newVal = data[field] ?? '';
            if (String(oldVal) !== String(newVal)) {
              const oldDisplay = oldVal === '' || oldVal === false || oldVal === null ? '(vazio)' : String(oldVal);
              const newDisplay = newVal === '' || newVal === false || newVal === null ? '(vazio)' : String(newVal);
              changedFields.push(`${fieldLabels[field]}: "${oldDisplay}" → "${newDisplay}"`);;
            }
          });
        }

        const result = await base44.entities.Client.update(clientId, data);

        // Registrar interação de alteração cadastral se houve mudanças
        if (changedFields.length > 0 && currentUser) {
          const nowSP = formatInTimeZone(new Date(), 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm");
          await base44.entities.Interaction.create({
            client_id: clientId,
            client_name: data.client_name,
            type: 'alteracao_cadastral',
            channel: 'sistema',
            outcome: 'cadastro_atualizado',
            notes: `Alteração cadastral em ${nowSP} (horário de Brasília)\n\nCampos alterados:\n• ${changedFields.join('\n• ')}`,
            agent_email: currentUser.email,
          });
        }

        return result;
      } else {
        return base44.entities.Client.create(data);
      }
    },
    onSuccess: () => {
      navigate(createPageUrl('Clients'));
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
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
          onClick={() => navigate(createPageUrl('Clients'))}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {clientId ? 'Editar Cliente' : 'Novo Cliente'}
          </h1>
          <p className="text-slate-500">Preencha os dados do cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Personal Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-[#6B2D8B]" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_code">Código do Cliente</Label>
                <Input
                  id="client_code"
                  value={formData.client_code}
                  onChange={(e) => handleChange('client_code', e.target.value)}
                  placeholder="Gerado automaticamente"
                  disabled={!!clientId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_name">Nome do Cliente *</Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#6B2D8B]" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Nome da Empresa</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  placeholder="Razão social"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="business_area">Área de Atuação</Label>
                <Input
                  id="business_area"
                  value={formData.business_area}
                  onChange={(e) => handleChange('business_area', e.target.value)}
                  placeholder="Ex: Tecnologia, Comércio, Serviços..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#6B2D8B]" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  placeholder="@seuperfil ou link completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={formData.linkedin}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  placeholder="URL do perfil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Site</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.seusite.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Status & Source */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#6B2D8B]" />
                Classificação
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status do Lead</Label>
                <Select 
                  value={formData.lead_status} 
                  onValueChange={(v) => handleChange('lead_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="em_contato">Em Contato</SelectItem>
                    <SelectItem value="qualificado">Qualificado</SelectItem>
                    <SelectItem value="negociando">Negociando</SelectItem>
                    <SelectItem value="fechado">Fechado</SelectItem>
                    <SelectItem value="perdido">Perdido</SelectItem>
                    <SelectItem value="indeciso">Indeciso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="organico">Orgânico</SelectItem>
                    <SelectItem value="renovacao">Renovação</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Anotações sobre o cliente..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Renovação - Certificado */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#6B2D8B]" />
                Certificado Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label htmlFor="has_certificate" className="text-base font-medium">
                    Cliente possui certificado digital?
                  </Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Ative se o cliente tiver certificado A1 ou A3
                  </p>
                </div>
                <Switch
                  id="has_certificate"
                  checked={formData.has_certificate}
                  onCheckedChange={(checked) => handleChange('has_certificate', checked)}
                />
              </div>

              {formData.has_certificate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Tipo de Certificado</Label>
                    <Select 
                      value={formData.certificate_type || ''} 
                      onValueChange={(v) => handleChange('certificate_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="e_cpf_a1">e-CPF A1</SelectItem>
                        <SelectItem value="e_cpf_a3">e-CPF A3</SelectItem>
                        <SelectItem value="e_cnpj_a1">e-CNPJ A1</SelectItem>
                        <SelectItem value="e_cnpj_a3">e-CNPJ A3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certificate_expiry_date">Data de Validade</Label>
                    <Input
                      id="certificate_expiry_date"
                      type="date"
                      value={formData.certificate_expiry_date}
                      onChange={(e) => handleChange('certificate_expiry_date', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Renovação - Serviço */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#6B2D8B]" />
                Serviços Contratados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label htmlFor="has_service" className="text-base font-medium">
                    Cliente possui serviço ativo?
                  </Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Ative se o cliente tiver algum serviço recorrente
                  </p>
                </div>
                <Switch
                  id="has_service"
                  checked={formData.has_service}
                  onCheckedChange={(checked) => handleChange('has_service', checked)}
                />
              </div>

              {formData.has_service && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="service_type">Tipo de Serviço</Label>
                    <Input
                      id="service_type"
                      value={formData.service_type}
                      onChange={(e) => handleChange('service_type', e.target.value)}
                      placeholder="Ex: Site, CRM, Marketing..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_expiry_date">Data de Vencimento</Label>
                    <Input
                      id="service_expiry_date"
                      type="date"
                      value={formData.service_expiry_date}
                      onChange={(e) => handleChange('service_expiry_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Status de Renovação</Label>
                    <Select 
                      value={formData.renewal_status || ''} 
                      onValueChange={(v) => handleChange('renewal_status', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="vencido">Vencido</SelectItem>
                        <SelectItem value="proximo_vencimento">Próximo do Vencimento</SelectItem>
                        <SelectItem value="renovado">Renovado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate(createPageUrl('Clients'))}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Cliente
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}