// ============================================================
// FRONTEND — Componente: Formulário de Interação
// Permite registrar uma interação com um cliente.
// Funcionalidades automáticas ao submeter:
//   - Gera um número de protocolo único
//   - Cria agendamento e tarefa de follow-up se necessário
//   - Atualiza automaticamente a etapa do funil do cliente
// Usado dentro da página ClientDetails.
// ============================================================

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatInTimeZone } from 'date-fns-tz';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRODUCTS = [
  { value: 'e_cpf_a1', label: 'e-CPF A1' },
  { value: 'e_cpf_a3', label: 'e-CPF A3' },
  { value: 'e_cnpj_a1', label: 'e-CNPJ A1' },
  { value: 'e_cnpj_a3', label: 'e-CNPJ A3' },
  { value: 'sites', label: 'Sites' },
  { value: 'crm', label: 'CRM' },
  { value: 'assinatura_digital', label: 'Assinatura Digital' },
  { value: 'emissor_nf', label: 'Emissor de NF' },
  { value: 'gestao_instagram', label: 'Gestão de Instagram' },
  { value: 'gestao_linkedin', label: 'Gestão de LinkedIn' },
  { value: 'outro', label: 'Outro' },
];

// FRONTEND: gera um número de protocolo único no formato ATDyyyyMMDDxxxx
const generateProtocolNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ATD${year}${month}${day}${random}`;
};

// FRONTEND: determina a etapa do funil de vendas com base no tipo de interação e tabulação
const getFunnelStageFromInteraction = (interactionType, tabulation) => {
  if (tabulation === 'venda_feita' || interactionType === 'venda_fechada') {
    return 'fechamento';
  }
  if (interactionType === 'proposta_feita' || tabulation === 'proposta_enviada') {
    return 'proposta';
  }
  if (interactionType === 'cliente_indeciso' || tabulation === 'indeciso_agendado') {
    return 'negociacao';
  }
  if (interactionType === 'contato_sucesso' || interactionType === 'followup_agendado') {
    return 'qualificacao';
  }
  if (interactionType === 'sem_interesse' || tabulation === 'sem_interesse') {
    return 'perdido';
  }
  if (interactionType.startsWith('tentativa_')) {
    return 'contato';
  }
  return null;
};

export default function InteractionForm({ onSubmit, onCancel, isLoading, clientId, clientName }) {
  const [user, setUser] = useState(null);
  const { getDisplayName } = useUserDisplayName();
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
    no_interest_reason: '',
    products_client_has: [],
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleProductClientHas = (product) => {
    setFormData(prev => ({
      ...prev,
      products_client_has: prev.products_client_has.includes(product)
        ? prev.products_client_has.filter(p => p !== product)
        : [...prev.products_client_has, product]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Gera o protocolo único para esta interação
    const protocolNumber = generateProtocolNumber();
    
    // Prepara os dados finais da interação para enviar ao backend
    const data = {
      ...formData,
      protocol_number: protocolNumber,
      sale_value: formData.sale_value ? parseFloat(formData.sale_value) : null,
      discount_percent: formData.discount_percent ? parseFloat(formData.discount_percent) : null,
      agent_email: user?.email,
    };

    // BACKEND: se a interação gerou um follow-up, cria automaticamente agendamento e tarefa
    if ((formData.interaction_type === 'followup_agendado' || formData.tabulation === 'indeciso_agendado') && formData.followup_date) {
      try {
        const followupDate = new Date(formData.followup_date);
        // Obtém a data/hora atual no fuso de Brasília para consistência
        const saoPauloTime = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
        
        // BACKEND: cria o agendamento na entidade Appointment
        await base44.entities.Appointment.create({
          client_id: clientId,
          client_name: clientName,
          agent: getDisplayName(user?.email, user?.full_name),
          agent_email: user?.email,
          appointment_type: formData.followup_method === 'telefone' ? 'telefone' : 
                           formData.followup_method === 'whatsapp' ? 'telefone' : 'videoconferencia',
          date: formData.followup_date.split('T')[0],
          time: followupDate.toTimeString().slice(0, 5),
          duration: 30,
          meeting_reason: 'followup',
          status: 'aguardando',
          scheduled_by: user?.full_name,
          created_date: saoPauloTime,
        });

        // Criar tarefa de follow-up
        await base44.entities.Task.create({
          title: `Follow-up: ${clientName}`,
          task_type: 'followup',
          client_id: clientId,
          client_name: clientName,
          agent: getDisplayName(user?.email, user?.full_name),
          agent_email: user?.email,
          due_date: formData.followup_date,
          status: 'pendente',
          created_date: saoPauloTime,
        });
      } catch (err) {
        console.error('Erro ao criar agendamento:', err);
      }
    }

    // Atualizar funil do cliente automaticamente
    const newFunnelStage = getFunnelStageFromInteraction(formData.interaction_type, formData.tabulation);
    if (newFunnelStage && clientId) {
      try {
        const saoPauloTime = formatInTimeZone(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
        
        await base44.entities.Client.update(clientId, {
          funnel_stage: newFunnelStage,
          funnel_updated_at: saoPauloTime,
        });
      } catch (err) {
        console.error('Erro ao atualizar funil:', err);
      }
    }

    onSubmit(data);
  };

  const showNoInterestReason = formData.interaction_type === 'sem_interesse' || formData.tabulation === 'sem_interesse';
  const showProductsClientHas = formData.no_interest_reason === 'ja_possui_produto';

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
              <SelectItem value="tentativa_instagram">Tentativa - Instagram</SelectItem>
              <SelectItem value="tentativa_linkedin">Tentativa - LinkedIn</SelectItem>
              <SelectItem value="contato_sucesso">Contato com sucesso</SelectItem>
              <SelectItem value="followup_agendado">Follow-up agendado</SelectItem>
              <SelectItem value="cliente_indeciso">Cliente indeciso</SelectItem>
              <SelectItem value="proposta_feita">Proposta feita</SelectItem>
              <SelectItem value="venda_fechada">Venda fechada</SelectItem>
              <SelectItem value="parceria">Parceria</SelectItem>
              <SelectItem value="sem_interesse">Sem interesse</SelectItem>
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
              {PRODUCTS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
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
              <SelectItem value="proposta_enviada">Proposta enviada</SelectItem>
              <SelectItem value="venda_feita">Venda feita</SelectItem>
              <SelectItem value="parceria_firmada">Parceria firmada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seção de Sem Interesse - Motivo */}
      {showNoInterestReason && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-100 space-y-4">
          <Label className="text-red-700 font-medium">Motivo de sem interesse</Label>
          <Select 
            value={formData.no_interest_reason} 
            onValueChange={(v) => handleChange('no_interest_reason', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o motivo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="financeiro">Financeiro</SelectItem>
              <SelectItem value="preco_concorrencia">Melhor preço da concorrência</SelectItem>
              <SelectItem value="ja_possui_produto">Já possui este produto</SelectItem>
            </SelectContent>
          </Select>

          {/* Se já possui produto, mostrar lista de produtos */}
          {showProductsClientHas && (
            <div className="space-y-3 pt-2">
              <Label className="text-red-700">Quais produtos o cliente já possui?</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PRODUCTS.map(product => (
                  <label 
                    key={product.value}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      formData.products_client_has.includes(product.value) 
                        ? 'bg-red-100 border-red-300' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox 
                      checked={formData.products_client_has.includes(product.value)}
                      onCheckedChange={() => toggleProductClientHas(product.value)}
                    />
                    <span className="text-sm">{product.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seção de Venda */}
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

      {/* Seção de Follow-up */}
      {(formData.interaction_type === 'followup_agendado' || formData.tabulation === 'indeciso_agendado') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl">
          <div className="space-y-2">
            <Label>Data do Follow-up</Label>
            <Input
              type="datetime-local"
              value={formData.followup_date}
              onChange={(e) => handleChange('followup_date', e.target.value)}
            />
            <p className="text-xs text-amber-600">* Será criado agendamento automático na agenda</p>
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

      {/* Seção de Proposta */}
      {(formData.interaction_type === 'proposta_feita' || formData.tabulation === 'proposta_enviada') && (
        <div className="p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-700">
            ✓ O cliente será movido para a etapa "Proposta" no funil de vendas
          </p>
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