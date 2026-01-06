import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, RefreshCw, Copy, MessageSquare, 
  CheckCircle, Loader2, Zap, BookOpen, Brain,
  Target, Flame, Heart, Shield, Clock, Gift,
  ChevronDown, ChevronUp, Settings2, Lightbulb
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

// Contextos de mensagem
const MESSAGE_CONTEXTS = [
  { value: 'primeiro_contato', label: 'Primeiro Contato', description: 'Abordagem inicial', icon: '👋' },
  { value: 'followup', label: 'Follow-up', description: 'Retorno após contato', icon: '🔄' },
  { value: 'apresentacao', label: 'Apresentação', description: 'Apresentar produto/serviço', icon: '📊' },
  { value: 'proposta', label: 'Proposta', description: 'Enviar proposta comercial', icon: '📋' },
  { value: 'negociacao', label: 'Negociação', description: 'Negociação de valores', icon: '🤝' },
  { value: 'fechamento', label: 'Fechamento', description: 'Fechar a venda', icon: '🎯' },
  { value: 'reativacao', label: 'Reativação', description: 'Reativar cliente inativo', icon: '🔥' },
  { value: 'pos_venda', label: 'Pós-Venda', description: 'Acompanhamento após venda', icon: '⭐' },
  { value: 'objecao', label: 'Quebra de Objeção', description: 'Contornar objeções', icon: '💪' },
  { value: 'urgencia', label: 'Criar Urgência', description: 'Gerar senso de urgência', icon: '⏰' },
];

// Tons de comunicação
const TONES = [
  { value: 'profissional', label: 'Profissional', description: 'Formal e corporativo' },
  { value: 'amigavel', label: 'Amigável', description: 'Próximo e acolhedor' },
  { value: 'urgente', label: 'Urgente', description: 'Senso de escassez' },
  { value: 'consultivo', label: 'Consultivo', description: 'Especialista orientando' },
  { value: 'empolgado', label: 'Empolgado', description: 'Entusiasmo e energia' },
  { value: 'exclusivo', label: 'Exclusivo', description: 'VIP e personalizado' },
];

// Técnicas de persuasão
const TECHNIQUES = [
  { id: 'spin', label: 'SPIN Selling', description: 'Situação, Problema, Implicação, Necessidade', icon: Target },
  { id: 'aida', label: 'AIDA', description: 'Atenção, Interesse, Desejo, Ação', icon: Flame },
  { id: 'pnl', label: 'PNL (Rapport)', description: 'Espelhamento e linguagem hipnótica', icon: Brain },
  { id: 'storytelling', label: 'Storytelling', description: 'Narrativas envolventes', icon: BookOpen },
  { id: 'copywriting', label: 'Copywriting', description: 'Escrita persuasiva de alta conversão', icon: Sparkles },
  { id: 'gatilhos', label: 'Gatilhos Mentais', description: 'Escassez, autoridade, prova social', icon: Lightbulb },
];

// Gatilhos mentais específicos
const MENTAL_TRIGGERS = [
  { id: 'escassez', label: 'Escassez', description: 'Quantidade limitada', icon: '🔒' },
  { id: 'urgencia', label: 'Urgência', description: 'Tempo limitado', icon: '⏰' },
  { id: 'prova_social', label: 'Prova Social', description: 'Outros já compraram', icon: '👥' },
  { id: 'autoridade', label: 'Autoridade', description: 'Especialista no assunto', icon: '🏆' },
  { id: 'reciprocidade', label: 'Reciprocidade', description: 'Dar algo primeiro', icon: '🎁' },
  { id: 'compromisso', label: 'Compromisso', description: 'Pequenos sim primeiro', icon: '✅' },
  { id: 'afinidade', label: 'Afinidade', description: 'Conexão pessoal', icon: '❤️' },
  { id: 'novidade', label: 'Novidade', description: 'Algo novo e exclusivo', icon: '✨' },
];

export default function WhatsAppAIAssistant({ 
  client, 
  interactions = [], 
  campaign,
  onSelectMessage 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedContext, setSelectedContext] = useState('primeiro_contato');
  const [selectedTone, setSelectedTone] = useState('profissional');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedTechniques, setSelectedTechniques] = useState(['aida', 'gatilhos']);
  const [selectedTriggers, setSelectedTriggers] = useState(['escassez', 'urgencia']);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [savedInstructions, setSavedInstructions] = useState('');

  // Carregar instruções salvas do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('whatsapp_ai_instructions');
    if (saved) {
      setSavedInstructions(saved);
      setCustomInstructions(saved);
    }
  }, []);

  // Salvar instruções personalizadas
  const saveInstructions = () => {
    localStorage.setItem('whatsapp_ai_instructions', customInstructions);
    setSavedInstructions(customInstructions);
  };

  // Buscar produtos disponíveis
  const { data: products = [] } = useQuery({
    queryKey: ['products-active'],
    queryFn: () => base44.entities.Product.filter({ active: true }),
  });

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const toggleTechnique = (techId) => {
    setSelectedTechniques(prev => 
      prev.includes(techId) 
        ? prev.filter(t => t !== techId)
        : [...prev, techId]
    );
  };

  const toggleTrigger = (triggerId) => {
    setSelectedTriggers(prev => 
      prev.includes(triggerId) 
        ? prev.filter(t => t !== triggerId)
        : [...prev, triggerId]
    );
  };

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
        Origem: ${client?.lead_source || 'Não informada'}
      `;

      // Contexto do produto selecionado
      const productContext = selectedProductData ? `
        PRODUTO SELECIONADO:
        - Nome: ${selectedProductData.name}
        - Categoria: ${selectedProductData.category}
        - Preço: R$ ${selectedProductData.price?.toLocaleString('pt-BR') || 'Sob consulta'}
        - Código: ${selectedProductData.code || 'N/A'}
      ` : 'Produto: Certificado Digital / Soluções Empresariais (genérico)';

      // Histórico de interações
      const interactionHistory = interactions.slice(0, 5).map(i => 
        `- ${i.interaction_type}: ${i.notes || 'Sem observações'} (${i.tabulation || 'sem tabulação'})`
      ).join('\n');

      // Técnicas selecionadas
      const techniquesText = selectedTechniques.map(techId => {
        const tech = TECHNIQUES.find(t => t.id === techId);
        return tech ? `- ${tech.label}: ${tech.description}` : '';
      }).filter(Boolean).join('\n');

      // Gatilhos selecionados
      const triggersText = selectedTriggers.map(triggerId => {
        const trigger = MENTAL_TRIGGERS.find(t => t.id === triggerId);
        return trigger ? `- ${trigger.label}: ${trigger.description}` : '';
      }).filter(Boolean).join('\n');

      const todayDate = new Date().toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const prompt = `# ROLE: SALES COPYWRITER & NEGOTIATION SPECIALIST (A Sua ID)

## IDENTIDADE
Você é o assistente de inteligência comercial da "A Sua ID" (Especialista em Certificação Digital, CRM e Tecnologia).
Sua função: redigir mensagens WhatsApp altamente persuasivas para CONVERTER, NEGOCIAR e AGENDAR.

## VARIÁVEIS DE CONTEXTO
CLIENTE: ${client?.client_name || 'Cliente'}
EMPRESA: ${client?.company_name || 'N/A'}
SETOR: ${client?.business_area || 'N/A'}
FASE FUNIL: ${client?.lead_status || 'novo'}
ORIGEM: ${client?.lead_source || 'N/A'}
DATA ATUAL: ${todayDate}

${productContext}

HISTÓRICO DE INTERAÇÕES:
${interactionHistory || 'Primeiro contato - Lead Frio'}

CAMPANHA: ${campaign?.name || 'Prospecção Geral'}

OBJETIVO: ${MESSAGE_CONTEXTS.find(c => c.value === selectedContext)?.description}
TOM: ${selectedTone}

## DIRETRIZES DE COMPORTAMENTO (TONE OF VOICE)
- Estilo: "Consultor Estratégico" - Profissional, mas direto
- Formato: Parágrafos curtos, emojis estratégicos (🚀, 🔒, 📅), sem excesso
- Sempre terminar com pergunta/CTA
- Use Autoridade e Prova Social

## LÓGICA DE DATAS (CRUCIAL)
Use a DATA ATUAL para calcular referências de tempo no texto.
NUNCA deixe datas vagas.
❌ Errado: "Vamos falar semana que vem?"
✅ Certo: "Podemos agendar terça-feira (dia 14) às 10h?"

=== TÉCNICAS QUE VOCÊ DEVE USAR ===
${techniquesText}

=== GATILHOS MENTAIS PARA APLICAR ===
${triggersText}

=== INSTRUÇÕES ESPECÍFICAS DE COPYWRITING ===
${selectedTechniques.includes('copywriting') ? `
- Use headlines impactantes logo no início (primeira frase PRECISA prender atenção)
- Aplique a fórmula PAS (Problema, Agitação, Solução)
- Use "palavras de poder": exclusivo, secreto, descobrir, transformar, garantido
- Crie curiosidade que obrigue a pessoa a responder
- Use perguntas retóricas estratégicas
- Aplique o "open loop" (deixe algo no ar para gerar resposta)
` : ''}

=== INSTRUÇÕES DE PNL ===
${selectedTechniques.includes('pnl') ? `
- Crie rapport usando linguagem similar ao público-alvo
- Use pressuposições positivas ("Quando você experimentar...")
- Aplique comandos embutidos de forma sutil
- Use palavras sensoriais (imagine, sinta, visualize)
- Espelhe possíveis valores e crenças do cliente
- Use "nós" para criar conexão
` : ''}

=== INSTRUÇÕES DE STORYTELLING ===
${selectedTechniques.includes('storytelling') ? `
- Comece com um gancho narrativo irresistível
- Conte uma mini-história de transformação (antes/depois)
- Use casos de sucesso de clientes similares
- Crie jornada do herói simplificada
- Inclua elementos emocionais e identificação
- Use "Era uma vez um empresário como você..." ou "Deixa eu te contar o que aconteceu com..."
` : ''}

${savedInstructions ? `
=== INSTRUÇÕES PERSONALIZADAS DO USUÁRIO ===
${savedInstructions}
` : ''}

GERE 4 MENSAGENS DIFERENTES usando combinações criativas das técnicas.
Cada mensagem deve ser ÚNICA em abordagem e estilo.

As mensagens devem ser:
- IMPACTANTES nos primeiros 3 segundos (primeira frase é crucial!)
- Altamente personalizadas para o contexto
- Com call-to-action claro e irresistível
- Humanizadas (não parecer robô/spam)
- Máximo 400 caracteres cada (WhatsApp)
- Usar emojis de forma estratégica (não exagerada)

Retorne em JSON:
{
  "suggestions": [
    {
      "message": "texto da mensagem completa",
      "technique": "técnica principal utilizada",
      "triggers_used": "gatilhos mentais aplicados",
      "tip": "dica de quando e como usar",
      "opening_power": "por que a abertura é poderosa"
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
                  triggers_used: { type: "string" },
                  tip: { type: "string" },
                  opening_power: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      // Fallback
      setSuggestions([
        {
          message: `${client?.client_name?.split(' ')[0] || 'Olá'}! 🔥 Descobri algo que vai mudar seu jogo completamente. Um cliente do mesmo segmento que o seu economizou R$15.000 em 6 meses. Quer que eu te conte como? Leva 2 min.`,
          technique: "Storytelling + Prova Social",
          triggers_used: "Curiosidade, Prova Social",
          tip: "Use para primeiro contato com leads frios",
          opening_power: "Promessa de transformação gera curiosidade"
        },
        {
          message: `Ei ${client?.client_name?.split(' ')[0] || ''}! ⏰ Preciso te falar uma coisa antes que expire. Tenho 3 vagas para uma condição especial que fecha hoje. Você quer ser um dos 3? Me responde SIM que te explico.`,
          technique: "AIDA + Gatilhos",
          triggers_used: "Escassez, Urgência, Compromisso",
          tip: "Ideal para criar urgência em leads qualificados",
          opening_power: "Escassez numérica específica aumenta conversão"
        },
        {
          message: `${client?.client_name?.split(' ')[0] || ''}, imagina poder resolver [problema do cliente] em menos de 1 semana. Parece bom? Pois é exatamente isso que nossos clientes estão conseguindo. Posso te mostrar como em uma ligação rápida de 10min?`,
          technique: "PNL + SPIN",
          triggers_used: "Visualização, Prova Social",
          tip: "Perfeito para fase de qualificação",
          opening_power: "Comando 'imagina' ativa visualização positiva"
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
            <Sparkles className="w-3 h-3 mr-1" /> IA Avançada
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configurações Básicas */}
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
                    <span className="flex items-center gap-2">
                      <span>{ctx.icon}</span> {ctx.label}
                    </span>
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

        {/* Seleção de Produto */}
        <div>
          <label className="text-xs text-slate-600 mb-1 block">Produto</label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione um produto..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Nenhum (genérico)</SelectItem>
              {products.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} {product.price ? `- R$ ${product.price.toLocaleString('pt-BR')}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Accordion para Configurações Avançadas */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="techniques" className="border rounded-lg bg-white">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-emerald-600" />
                Técnicas de Persuasão
                <Badge variant="secondary" className="ml-2">{selectedTechniques.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {TECHNIQUES.map(tech => (
                  <label
                    key={tech.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedTechniques.includes(tech.id) 
                        ? 'bg-emerald-50 border-emerald-300' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedTechniques.includes(tech.id)}
                      onCheckedChange={() => toggleTechnique(tech.id)}
                    />
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <tech.icon className="w-3 h-3" /> {tech.label}
                      </p>
                      <p className="text-xs text-slate-500">{tech.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="triggers" className="border rounded-lg bg-white mt-2">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="flex items-center gap-2 text-sm">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                Gatilhos Mentais
                <Badge variant="secondary" className="ml-2">{selectedTriggers.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                {MENTAL_TRIGGERS.map(trigger => (
                  <label
                    key={trigger.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedTriggers.includes(trigger.id) 
                        ? 'bg-amber-50 border-amber-300' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedTriggers.includes(trigger.id)}
                      onCheckedChange={() => toggleTrigger(trigger.id)}
                    />
                    <span className="text-sm">
                      {trigger.icon} {trigger.label}
                    </span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="custom" className="border rounded-lg bg-white mt-2">
            <AccordionTrigger className="px-3 py-2 hover:no-underline">
              <span className="flex items-center gap-2 text-sm">
                <Settings2 className="w-4 h-4 text-purple-600" />
                Ensinar a IA (Instruções Personalizadas)
                {savedInstructions && <Badge className="bg-purple-100 text-purple-700 ml-2">Configurado</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-3">
              <p className="text-xs text-slate-500">
                Ensine a IA como você gostaria que ela se comunique. Suas instruções serão lembradas para próximas gerações.
              </p>
              <Textarea
                placeholder="Ex: Use sempre o nome do cliente no início. Mencione que somos parceiros oficiais. Sempre ofereça uma demonstração gratuita. Evite mensagens muito longas..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-[100px] text-sm"
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={saveInstructions}
                  className="flex-1"
                >
                  💾 Salvar Instruções
                </Button>
                {savedInstructions && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setCustomInstructions('');
                      setSavedInstructions('');
                      localStorage.removeItem('whatsapp_ai_instructions');
                    }}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Botão de Gerar */}
        <Button 
          onClick={generateSuggestions}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando mensagens persuasivas...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Gerar Mensagens Avançadas
            </>
          )}
        </Button>

        {/* Sugestões */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Mensagens Geradas:</p>
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className="p-3 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                    {suggestion.technique}
                  </Badge>
                  {suggestion.triggers_used && (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                      {suggestion.triggers_used}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700 mb-2 whitespace-pre-wrap">
                  {suggestion.message}
                </p>
                {suggestion.opening_power && (
                  <p className="text-xs text-purple-600 mb-2 italic">
                    ✨ {suggestion.opening_power}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">💡 {suggestion.tip}</p>
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
            Gerar Novas Variações
          </Button>
        )}
      </CardContent>
    </Card>
  );
}