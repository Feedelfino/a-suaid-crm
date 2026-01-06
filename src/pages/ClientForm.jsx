import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, User, Building2, Phone, Mail, MapPin } from 'lucide-react';
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
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
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
    products: [],
    dt_fim: '',
    validade: '',
  });

  useEffect(() => {
    if (clientId) {
      loadClient();
    }
  }, [clientId]);

  const loadClient = async () => {
    setIsLoading(true);
    try {
      const clients = await base44.entities.Client.filter({ id: clientId });
      if (clients.length > 0) {
        setFormData(clients[0]);
      }
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      if (clientId) {
        await base44.entities.Client.update(clientId, formData);
        // Invalidar queries para atualizar todas as views
        queryClient.invalidateQueries(['clients']);
        queryClient.invalidateQueries(['clients-renovation']);
        queryClient.invalidateQueries(['certificates-dashboard']);
        queryClient.invalidateQueries(['client', clientId]);
      } else {
        const newClient = await base44.entities.Client.create(formData);
        
        // Auto-verificar duplicatas após criar cliente manualmente
        try {
          await base44.functions.invoke('autoMergeDuplicates', {
            newClientIds: [newClient.id],
          });
        } catch (err) {
          console.log('Auto-merge não executado:', err);
        }
        
        // Invalidar queries
        queryClient.invalidateQueries(['clients']);
        queryClient.invalidateQueries(['clients-renovation']);
      }
      navigate(createPageUrl('Clients'));
    } catch (error) {
      console.error('Error saving client:', error);
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
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

              {/* Products Multi-Select */}
              <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#6B2D8B]" />
                Produtos Vinculados
              </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Produtos (Múltipla Seleção)</Label>
                <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto bg-slate-50">
                  {[
                    { value: 'e_cpf_a1', label: 'e-CPF A1' },
                    { value: 'e_cpf_a3', label: 'e-CPF A3' },
                    { value: 'e_cnpj_a1', label: 'e-CNPJ A1' },
                    { value: 'e_cnpj_a3', label: 'e-CNPJ A3' },
                    { value: 'sites', label: 'Sites' },
                    { value: 'crm', label: 'CRM' },
                    { value: 'assinatura_digital', label: 'Assinatura Digital' },
                    { value: 'emissor_nf', label: 'Emissor NF' },
                    { value: 'gestao_instagram', label: 'Gestão Instagram' },
                    { value: 'gestao_linkedin', label: 'Gestão LinkedIn' },
                    { value: 'outro', label: 'Outro' },
                  ].map(product => (
                    <label 
                      key={product.value}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                        formData.products?.includes(product.value)
                          ? 'bg-[#6B2D8B]/10 border border-[#6B2D8B]/20' 
                          : 'bg-white hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.products?.includes(product.value)}
                        onChange={(e) => {
                          const newProducts = e.target.checked
                            ? [...(formData.products || []), product.value]
                            : (formData.products || []).filter(p => p !== product.value);
                          handleChange('products', newProducts);
                        }}
                        className="w-4 h-4 text-[#6B2D8B] rounded"
                      />
                      <span className="text-sm">{product.label}</span>
                    </label>
                  ))}
                </div>
                {formData.products?.length > 0 && (
                  <p className="text-xs text-[#6B2D8B] font-medium">
                    {formData.products.length} produto(s) selecionado(s)
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dt_fim">Data de Fim/Vencimento</Label>
                  <Input
                    id="dt_fim"
                    type="date"
                    value={formData.dt_fim}
                    onChange={(e) => handleChange('dt_fim', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validade">Data de Validade</Label>
                  <Input
                    id="validade"
                    type="date"
                    value={formData.validade}
                    onChange={(e) => handleChange('validade', e.target.value)}
                  />
                </div>
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