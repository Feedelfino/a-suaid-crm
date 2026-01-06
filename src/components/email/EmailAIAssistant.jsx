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
  Sparkles, RefreshCw, Copy, Mail, 
  CheckCircle, Loader2, Zap, BookOpen, Send,
  Brain, Target, Lightbulb, Settings2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

// Contextos de e-mail
const EMAIL_CONTEXTS = [
  { value: 'primeiro_contato', label: 'Primeiro Contato', description: 'E-mail de apresentação inicial', icon: '👋' },
  { value: 'followup', label: 'Follow-up', description: 'Acompanhamento após contato', icon: '🔄' },
  { value: 'proposta', label: 'Proposta Comercial', description: 'Envio de proposta formal', icon: '📋' },
  { value: 'nurturing', label: 'Nutrição', description: 'Conteúdo de valor para engajar', icon: '🌱' },
  { value: 'reativacao', label: 'Reativação', description: 'Reengajar lead inativo', icon: '🔥' },
  { value: 'agradecimento', label: 'Agradecimento', description: 'Pós-venda ou pós-reunião', icon: '🙏' },
  { value: 'lembrete', label: 'Lembrete', description: 'Lembrar de reunião ou prazo', icon: '⏰' },
  { value: 'objecao', label: 'Quebra de Objeção', description: 'Responder objeções por e-mail', icon: '💪' },
  { value: 'case_sucesso', label: 'Case de Sucesso', description: 'Compartilhar história de cliente', icon: '🏆' },
];

// Tons de comunicação
const TONES = [
  { value: 'profissional', label: 'Profissional', description: 'Formal e corporativo' },
  { value: 'amigavel', label: 'Amigável', description: 'Próximo e acolhedor' },
  { value: 'formal', label: 'Formal', description: 'Muito formal e técnico' },
  { value: 'consultivo', label: 'Consultivo', description: 'Especialista orientando' },
  { value: 'empolgado', label: 'Empolgado', description: 'Entusiasmo controlado' },
  { value: 'exclusivo', label: 'Exclusivo', description: 'VIP e personalizado' },
];

// Técnicas de persuasão
const TECHNIQUES = [
  { id: 'spin', label: 'SPIN Selling', description: 'Situação, Problema, Implicação, Necessidade', icon: Target },
  { id: 'aida', label: 'AIDA', description: 'Atenção, Interesse, Desejo, Ação', icon: Target },
  { id: 'pas', label: 'PAS', description: 'Problema, Agitação, Solução', icon: Target },
  { id: 'pnl', label: 'PNL (Rapport)', description: 'Espelhamento e linguagem hipnótica', icon: Brain },
  { id: 'storytelling', label: 'Storytelling', description: 'Narrativas envolventes', icon: BookOpen },
  { id: 'copywriting', label: 'Copywriting Avançado', description: 'Headlines, hooks, CTAs irresistíveis', icon: Sparkles },
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
  { id: 'curiosidade', label: 'Curiosidade', description: 'Criar mistério', icon: '🔍' },
];

export default function EmailAIAssistant({ 
  client, 
  interactions = [], 
  campaign,
  onSelectEmail,
  onSendEmail
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedContext, setSelectedContext] = useState('primeiro_contato');
  const [selectedTone, setSelectedTone] = useState('profissional');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedTechniques, setSelectedTechniques] = useState(['aida', 'copywriting']);
  const [selectedTriggers, setSelectedTriggers] = useState(['prova_social', 'autoridade']);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [previewEmail, setPreviewEmail] = useState(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [savedInstructions, setSavedInstructions] = useState('');

  // Carregar instruções salvas do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('email_ai_instructions');
    if (saved) {
      setSavedInstructions(saved);
      setCustomInstructions(saved);
    }
  }, []);

  // Salvar instruções personalizadas
  const saveInstructions = () => {
    localStorage.setItem('email_ai_instructions', customInstructions);
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
      const clientContext = `
        Nome do cliente: ${client?.client_name || 'Cliente'}
        Empresa: ${client?.company_name || 'Não informada'}
        E-mail: ${client?.email || 'Não informado'}
        Status atual: ${client?.lead_status || 'novo'}
        Etapa do funil: ${client?.funnel_stage || 'lead'}
        Área de atuação: ${client?.business_area || 'Não informada'}
        Origem: ${client?.lead_source || 'Não informada'}
      `;

      const productContext = selectedProductData ? `
        PRODUTO SELECIONADO:
        - Nome: ${selectedProductData.name}
        - Categoria: ${selectedProductData.category}
        - Preço: R$ ${selectedProductData.price?.toLocaleString('pt-BR') || 'Sob consulta'}
        - Benefícios principais do produto para destacar
      ` : 'Produto: Certificado Digital / Soluções Empresariais (genérico)';

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
Sua função: redigir e-mails comerciais altamente persuasivos para CONVERTER, NEGOCIAR e AGENDAR.

## VARIÁVEIS DE CONTEXTO
CLIENTE: ${client?.client_name || 'Cliente'}
EMPRESA: ${client?.company_name || 'N/A'}
EMAIL: ${client?.email || 'N/A'}
SETOR: ${client?.business_area || 'N/A'}
FASE FUNIL: ${client?.lead_status || 'novo'}
ORIGEM: ${client?.lead_source || 'N/A'}
DATA ATUAL: ${todayDate}

${productContext}

HISTÓRICO DE INTERAÇÕES:
${interactionHistory || 'Primeiro contato - Lead Frio'}

CAMPANHA: ${campaign?.name || 'Prospecção Geral'}

OBJETIVO: ${EMAIL_CONTEXTS.find(c => c.value === selectedContext)?.description}
TOM: ${selectedTone}

## DIRETRIZES DE COMPORTAMENTO (TONE OF VOICE)
- Estilo: "Consultor Estratégico" - Profissional e direto
- Formato: Bem estruturado, objetivo, sem firulas
- Use Autoridade e Prova Social
- CTA claro com agendamento ou resposta

## LÓGICA DE DATAS (CRUCIAL)
Use a DATA ATUAL para calcular referências de tempo.
NUNCA deixe datas vagas.
Se mencionar agendamento, sugira dia e horário específico.

=== TÉCNICAS QUE VOCÊ DEVE USAR ===
${techniquesText}

=== GATILHOS MENTAIS PARA APLICAR ===
${triggersText}

=== INSTRUÇÕES ESPECÍFICAS DE COPYWRITING ===
${selectedTechniques.includes('copywriting') ? `
ASSUNTO DO E-MAIL (CRUCIAL - Taxa de abertura depende disso):
- Use números específicos ("Como economizei R$15.000 em 30 dias")
- Crie curiosidade ("O segredo que 97% dos empresários não conhecem")
- Personalização com nome quando possível
- Evite palavras spam (grátis, promoção, clique)
- Use brackets [URGENTE] ou emojis com moderação
- Máximo 50-60 caracteres
- Teste variações: pergunta, declaração, número, curiosidade

PRIMEIRA LINHA (Preview text):
- Complementa o assunto
- Gera ainda mais curiosidade
- Faz a pessoa PRECISAR abrir

CORPO DO E-MAIL:
- Parágrafos curtos (2-3 linhas máx)
- Use bullet points para benefícios
- Destaque palavras importantes
- CTA claro e específico
- P.S. estratégico (muito lido!)
` : ''}

=== INSTRUÇÕES DE PNL ===
${selectedTechniques.includes('pnl') ? `
- Crie rapport usando linguagem do público-alvo
- Use pressuposições positivas ("Quando você experimentar...")
- Aplique comandos embutidos sutis
- Palavras sensoriais (imagine, sinta, visualize)
- Use "nós" para criar conexão
- Espelhe valores e crenças do leitor
` : ''}

=== INSTRUÇÕES DE STORYTELLING ===
${selectedTechniques.includes('storytelling') ? `
- Comece com um gancho narrativo
- Conte história de transformação (antes/depois)
- Use casos de sucesso reais
- Crie jornada do herói simplificada
- Elementos emocionais e identificação
- "Deixa eu te contar o que aconteceu com um cliente..."
` : ''}

=== ESTRUTURA PAS ===
${selectedTechniques.includes('pas') ? `
1. PROBLEMA: Identifique a dor do cliente
2. AGITAÇÃO: Amplifique as consequências de não resolver
3. SOLUÇÃO: Apresente sua solução como o caminho
` : ''}

${savedInstructions ? `
=== INSTRUÇÕES PERSONALIZADAS DO USUÁRIO ===
${savedInstructions}
` : ''}

GERE 3 E-MAILS DIFERENTES usando combinações criativas das técnicas.
Cada e-mail deve ter abordagem e estilo ÚNICOS.

Os e-mails devem ter:
- ASSUNTO que gere ALTA taxa de abertura (máx 60 caracteres)
- Primeira linha que PRENDA A ATENÇÃO
- Corpo bem estruturado com parágrafos curtos
- Benefícios claros com bullet points
- Call-to-action específico e irresistível
- P.S. estratégico quando apropriado
- Assinatura: "Atenciosamente, [Nome do Agente] - A SUA.ID"

Retorne em JSON:
{
  "suggestions": [
    {
      "subject": "assunto do e-mail (máx 60 caracteres)",
      "body": "corpo completo do e-mail formatado",
      "technique": "técnica principal utilizada",
      "triggers_used": "gatilhos mentais aplicados",
      "tip": "dica de quando usar",
      "subject_analysis": "por que este assunto funciona"
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
                  subject: { type: "string" },
                  body: { type: "string" },
                  technique: { type: "string" },
                  triggers_used: { type: "string" },
                  tip: { type: "string" },
                  subject_analysis: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      setSuggestions([
        {
          subject: `${client?.client_name?.split(' ')[0] || ''}, descobri algo que vai te interessar`,
          body: `Olá ${client?.client_name?.split(' ')[0] || ''}!\n\nEspero que esteja bem.\n\nHá pouco tempo, ajudamos uma empresa do mesmo segmento que o seu a transformar completamente sua operação.\n\nEm apenas 3 meses, eles conseguiram:\n\n✅ Reduzir 40% dos custos operacionais\n✅ Economizar 15 horas semanais em processos\n✅ Aumentar a segurança dos dados\n\nAcredito que podemos fazer o mesmo pela sua empresa.\n\nQue tal agendarmos uma conversa de 15 minutos para eu mostrar como isso funcionaria para você?\n\nAtenciosamente,\n[Nome] - A SUA.ID\n\nP.S.: Temos apenas 3 vagas para novos clientes este mês.`,
          technique: "Storytelling + Prova Social",
          triggers_used: "Prova Social, Escassez",
          tip: "Excelente para leads qualificados",
          subject_analysis: "Personalização + Curiosidade"
        },
        {
          subject: `⏰ [Último dia] Condição especial expira hoje`,
          body: `${client?.client_name?.split(' ')[0] || 'Olá'}!\n\nPreciso ser direto: a condição especial que te ofereci expira HOJE às 23h59.\n\nSei que você está ocupado, mas deixar passar essa oportunidade pode significar:\n\n❌ Continuar perdendo tempo com processos manuais\n❌ Manter custos operacionais elevados\n❌ Correr riscos desnecessários de segurança\n\nNão quero que isso aconteça com você.\n\nMe responde esse e-mail com "QUERO" e eu te ligo em 5 minutos para fecharmos juntos.\n\nAtenciosamente,\n[Nome] - A SUA.ID`,
          technique: "PAS + Gatilho de Urgência",
          triggers_used: "Urgência, Compromisso",
          tip: "Ideal para follow-up com prazo",
          subject_analysis: "Emoji + Urgência + Especificidade"
        },
        {
          subject: `Como a [Empresa X] economizou R$15.000 em 6 meses`,
          body: `Olá ${client?.client_name?.split(' ')[0] || ''}!\n\nQuero compartilhar uma história rápida com você.\n\nHá 6 meses, conheci o João, dono de uma empresa parecida com a sua. Ele estava frustrado com:\n\n• Processos burocráticos lentos\n• Custos operacionais altos\n• Medo de problemas de segurança\n\nHoje, a empresa dele:\n\n✨ Economiza R$15.000/ano em processos\n✨ Reduziu 70% do tempo em burocracia\n✨ Opera com total segurança digital\n\nA diferença? Uma única decisão: implementar nossas soluções.\n\nPosso te mostrar exatamente como replicar esse resultado?\n\nAtenciosamente,\n[Nome] - A SUA.ID`,
          technique: "Storytelling + SPIN",
          triggers_used: "Prova Social, Autoridade",
          tip: "Perfeito para nutrição de leads",
          subject_analysis: "Número específico + Resultado tangível"
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (suggestion, index, type) => {
    const text = type === 'subject' ? suggestion.subject : suggestion.body;
    navigator.clipboard.writeText(text);
    setCopiedIndex(`${index}-${type}`);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handlePreview = (suggestion) => {
    setPreviewEmail(suggestion);
    setEditedSubject(suggestion.subject);
    setEditedBody(suggestion.body);
  };

  const handleSendEmail = async () => {
    if (onSendEmail && client?.email) {
      await onSendEmail({
        to: client.email,
        subject: editedSubject,
        body: editedBody
      });
      setPreviewEmail(null);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            Assistente IA - E-mail
            <Badge className="bg-blue-100 text-blue-700 ml-auto">
              <Sparkles className="w-3 h-3 mr-1" /> IA Avançada
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configurações Básicas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Tipo de E-mail</label>
              <Select value={selectedContext} onValueChange={setSelectedContext}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_CONTEXTS.map(ctx => (
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
                  <Brain className="w-4 h-4 text-blue-600" />
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
                          ? 'bg-blue-50 border-blue-300' 
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
                  Ensine a IA como você gostaria que ela escreva e-mails. Suas instruções serão lembradas.
                </p>
                <Textarea
                  placeholder="Ex: Sempre mencione que somos parceiros oficiais. Use tom mais informal com startups. Inclua sempre um link para agendar reunião. Evite e-mails muito longos..."
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
                        localStorage.removeItem('email_ai_instructions');
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
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando e-mails persuasivos...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Gerar E-mails Avançados
              </>
            )}
          </Button>

          {/* Sugestões */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">E-mails Gerados:</p>
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="p-4 bg-white rounded-xl border border-blue-100 hover:border-blue-300 transition-all"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      {suggestion.technique}
                    </Badge>
                    {suggestion.triggers_used && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                        {suggestion.triggers_used}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Assunto */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Assunto:</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 flex-1">{suggestion.subject}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(suggestion, index, 'subject')}
                        className="h-6 text-xs shrink-0"
                      >
                        {copiedIndex === `${index}-subject` ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    {suggestion.subject_analysis && (
                      <p className="text-xs text-purple-600 mt-1 italic">
                        ✨ {suggestion.subject_analysis}
                      </p>
                    )}
                  </div>

                  {/* Preview do corpo */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Prévia:</p>
                    <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">
                      {suggestion.body.slice(0, 200)}...
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">💡 {suggestion.tip}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(suggestion, index, 'body')}
                        className="h-7 text-xs"
                      >
                        {copiedIndex === `${index}-body` ? (
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
                        onClick={() => handlePreview(suggestion)}
                        className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                      >
                        Usar Este
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

      {/* Dialog de Preview/Edição */}
      <Dialog open={!!previewEmail} onOpenChange={(open) => !open && setPreviewEmail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Editar e Enviar E-mail
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Para:</label>
              <p className="text-slate-600 bg-slate-50 p-2 rounded">{client?.email || 'E-mail não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Assunto:</label>
              <input
                type="text"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Corpo do E-mail:</label>
              <Textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewEmail(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={!client?.email}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar E-mail
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}