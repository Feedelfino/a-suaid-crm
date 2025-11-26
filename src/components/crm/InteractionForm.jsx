import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function InteractionForm({ onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState({
    interaction_type: '',
    contact_method: '',
    product_offered: '',
    tabulation: '',
    sale_value: '',
    had_discount: false,
    discount_percent: '',
    followup_date: '',
    followup_method: '',
    partnership_type: '',
    notes: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      sale_value: formData.sale_value ? parseFloat(formData.sale_value) : null,
      discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent) : null,
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Interação *</Label>
          <Select 
            value={formData.interaction_type} 
            onValueChange={(v) => handleChange('interaction_type', v)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tentativa_email">Tentativa - E-mail</SelectItem>
              <SelectItem value="tentativa_telefone">Tentativa - Telefone</SelectItem>
              <SelectItem value="tentativa_whatsapp">Tentativa - WhatsApp</SelectItem>
              <SelectItem value="contato_sucesso">Contato com sucesso</SelectItem>
              <SelectItem value="followup_agendado">Follow-up agendado</SelectItem>
              <SelectItem value="cliente_indeciso">Cliente indeciso</SelectItem>
              <SelectItem value="venda_fechada">Venda fechada</SelectItem>
              <SelectItem value="parceria">Parceria</SelectItem>
              <SelectItem value="sem_interesse">Sem interesse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Forma de Contato</Label>
          <Select 
            value={formData.contact_method} 
            onValueChange={(v) => handleChange('contact_method', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="telefone">Telefone</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Produto Oferecido</Label>
          <Select 
            value={formData.product_offered} 
            onValueChange={(v) => handleChange('product_offered', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="e_cpf_a1">e-CPF A1</SelectItem>
              <SelectItem value="e_cpf_a3">e-CPF A3</SelectItem>
              <SelectItem value="e_cnpj_a1">e-CNPJ A1</SelectItem>
              <SelectItem value="e_cnpj_a3">e-CNPJ A3</SelectItem>
              <SelectItem value="sites">Sites</SelectItem>
              <SelectItem value="crm">CRM</SelectItem>
              <SelectItem value="assinatura_digital">Assinatura Digital</SelectItem>
              <SelectItem value="emissor_nf">Emissor de NF</SelectItem>
              <SelectItem value="gestao_instagram">Gestão de Instagram</SelectItem>
              <SelectItem value="gestao_linkedin">Gestão de LinkedIn</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tabulação</Label>
          <Select 
            value={formData.tabulation} 
            onValueChange={(v) => handleChange('tabulation', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tentativa_sem_sucesso">Tentativa sem sucesso</SelectItem>
              <SelectItem value="tentativa_feita">Tentativa feita</SelectItem>
              <SelectItem value="indeciso_agendado">Indeciso (com agendamento)</SelectItem>
              <SelectItem value="sem_interesse">Sem interesse</SelectItem>
              <SelectItem value="retornar_90_dias">Retornar em 90 dias</SelectItem>
              <SelectItem value="venda_feita">Venda feita</SelectItem>
              <SelectItem value="parceria_firmada">Parceria firmada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(formData.interaction_type === 'venda_fechada' || formData.tabulation === 'venda_feita') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-emerald-50 rounded-xl">
          <div className="space-y-2">
            <Label>Valor da Venda (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.sale_value}
              onChange={(e) => handleChange('sale_value', e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Switch
                checked={formData.had_discount}
                onCheckedChange={(v) => handleChange('had_discount', v)}
              />
              Houve desconto?
            </Label>
          </div>
          {formData.had_discount && (
            <div className="space-y-2">
              <Label>% Desconto</Label>
              <Input
                type="number"
                value={formData.discount_percent}
                onChange={(e) => handleChange('discount_percent', e.target.value)}
                placeholder="0"
              />
            </div>
          )}
        </div>
      )}

      {(formData.interaction_type === 'followup_agendado' || formData.tabulation === 'indeciso_agendado') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl">
          <div className="space-y-2">
            <Label>Data do Follow-up</Label>
            <Input
              type="datetime-local"
              value={formData.followup_date}
              onChange={(e) => handleChange('followup_date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Meio do Follow-up</Label>
            <Select 
              value={formData.followup_method} 
              onValueChange={(v) => handleChange('followup_method', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {formData.interaction_type === 'parceria' && (
        <div className="space-y-2 p-4 bg-purple-50 rounded-xl">
          <Label>Tipo de Parceria</Label>
          <Input
            value={formData.partnership_type}
            onChange={(e) => handleChange('partnership_type', e.target.value)}
            placeholder="Descreva o tipo de parceria..."
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Anotações sobre esta interação..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading || !formData.interaction_type}
          className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
        >
          {isLoading ? 'Salvando...' : 'Registrar Interação'}
        </Button>
      </div>
    </form>
  );
}