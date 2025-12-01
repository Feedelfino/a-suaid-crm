import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, RefreshCw, Copy, MessageSquare, 
  CheckCircle, Loader2, Zap
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MESSAGE_CONTEXTS = [
  { value: 'primeiro_contato', label: 'Primeiro Contato', description: 'Abordagem inicial' },
  { value: 'followup', label: 'Follow-up', description: 'Retorno após contato' },
  { value: 'apresentacao', label: 'Apresentação', description: 'Apresentar produto/serviço' },
  { value: 'proposta', label: 'Proposta', description: 'Enviar proposta comercial' },
  { value: 'negociacao', label: 'Negociação', description: 'Negociação de valores' },
  { value: 'fechamento', label: 'Fechamento', description: 'Fechar a venda' },
  { value: 'reativacao', label: 'Reativação', description: 'Reativar cliente inativo' },
  { value: 'pos_venda', label: 'Pós-Venda', description: 'Acompanhamento após venda' },
];

const TONES = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'amigavel', label: 'Amigável' },
  { value: 'urgente', label: 'Urgente' },
  { value: 'consultivo', label: 'Consultivo' },
];

export default function WhatsAppAIAssistant({ 
  client, 
  interactions = [], 
  product,
  campaign,
  onSelectMessage 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedContext, setSelectedContext] = useState('primeiro_contato');
  const [selectedTone, setSelectedTone] = useState('profissional');
  const [copiedIndex, setCopiedIndex] = useState(null);

  const generateSuggestions = async () => {
    setIsGenerating(true);
    setSuggestions([]);

    try {
      // Preparar contexto do cliente
      const clientContext = `
        Nome do cliente: ${client?.client_name || 'Cliente'}
        Empresa: ${client?.company_name || 'Não informada'}
        Status atual: ${client?.lead_status || 'novo'}
        Etapa do funil: ${client?.funnel_stage || 'lead'}
        Área de atuação: ${client?.business_area || 'Não informada'}
      `;

      // Histórico de interações
      const interactionHistory = interactions.slice(0, 5).map(i => 
        `- ${i.interaction_type}: ${i.notes || 'Sem observações'} (${i.tabulation || 'sem tabulação'})`
      ).join('\n');

      const prompt = `Você é um especialista em vendas e copywriting persuasivo para WhatsApp.

CONTEXTO DO CLIENTE:
${clientContext}

HISTÓRICO DE INTERAÇÕES:
${interactionHistory || 'Primeiro contato com este cliente'}

PRODUTO/SERVIÇO: ${product || 'Certificado Digital / Soluções Empresariais'}
CAMPANHA: ${campaign?.name || 'Prospecção Geral'}

OBJETIVO DA MENSAGEM: ${MESSAGE_CONTEXTS.find(c => c.value === selectedContext)?.description}
TOM DESEJADO: ${selectedTone}

Gere 3 sugestões de mensagens para WhatsApp usando técnicas de:
- SPIN Selling (Situação, Problema, Implicação, Necessidade)
- AIDA (Atenção, Interesse, Desejo, Ação)
- Gatilhos mentais (escassez, urgência, prova social, autoridade)
- PNL (rapport, linguagem hipnótica leve)

As mensagens devem ser:
- Diretas e objetivas (máximo 300 caracteres cada)
- Personalizadas para o contexto
- Com call-to-action claro
- Profissionais mas humanizadas

Retorne em JSON com formato:
{
  "suggestions": [
    {
      "message": "texto da mensagem",
      "technique": "técnica utilizada",
      "tip": "dica de quando usar"
    }
  ]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  technique: { type: "string" },
                  tip: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      // Fallback com mensagens genéricas
      setSuggestions([
        {
          message: `Olá ${client?.client_name?.split(' ')[0] || ''}! Tudo bem? Sou da A SUA.ID e gostaria de apresentar uma solução que pode transformar sua rotina empresarial. Posso te contar mais?`,
          technique: "Abordagem consultiva",
          tip: "Use para primeiro contato"
        },
        {
          message: `${client?.client_name?.split(' ')[0] || 'Olá'}! Vi que você demonstrou interesse em nossos serviços. Que tal agendarmos uma conversa rápida de 10 minutos? Tenho certeza que posso te ajudar!`,
          technique: "Call-to-action direto",
          tip: "Bom para leads qualificados"
        },
        {
          message: `Olá! Passando para lembrar da nossa conversa. Tenho uma condição especial que expira em breve. Posso te enviar os detalhes?`,
          technique: "Gatilho de escassez",
          tip: "Use em follow-ups"
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (message, index) => {
    navigator.clipboard.writeText(message);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSelect = (suggestion) => {
    if (onSelectMessage) {
      onSelectMessage(suggestion.message);
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          Assistente IA - WhatsApp
          <Badge className="bg-emerald-100 text-emerald-700 ml-auto">
            <Sparkles className="w-3 h-3 mr-1" /> IA
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configurações */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Contexto</label>
            <Select value={selectedContext} onValueChange={setSelectedContext}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_CONTEXTS.map(ctx => (
                  <SelectItem key={ctx.value} value={ctx.value}>
                    {ctx.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-600 mb-1 block">Tom</label>
            <Select value={selectedTone} onValueChange={setSelectedTone}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map(tone => (
                  <SelectItem key={tone.value} value={tone.value}>
                    {tone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão de Gerar */}
        <Button 
          onClick={generateSuggestions}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando sugestões...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Gerar Sugestões de Mensagem
            </>
          )}
        </Button>

        {/* Sugestões */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Sugestões Geradas:</p>
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="p-3 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start gap-2 mb-2">
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 shrink-0">
                    {suggestion.technique}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">
                  {suggestion.message}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 italic">💡 {suggestion.tip}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(suggestion.message, index)}
                      className="h-7 text-xs"
                    >
                      {copiedIndex === index ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSelect(suggestion)}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                    >
                      Usar Esta
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gerar Nova */}
        {suggestions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={generateSuggestions}
            disabled={isGenerating}
            className="w-full"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Gerar Novas Sugestões
          </Button>
        )}
      </CardContent>
    </Card>
  );
}