import React, { useState } from 'react';
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
  CheckCircle, Loader2, Zap, BookOpen, Send
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

const EMAIL_CONTEXTS = [
  { value: 'primeiro_contato', label: 'Primeiro Contato', description: 'E-mail de apresentação inicial' },
  { value: 'followup', label: 'Follow-up', description: 'Acompanhamento após contato' },
  { value: 'proposta', label: 'Proposta Comercial', description: 'Envio de proposta formal' },
  { value: 'nurturing', label: 'Nutrição', description: 'Conteúdo de valor para engajar' },
  { value: 'reativacao', label: 'Reativação', description: 'Reengajar lead inativo' },
  { value: 'agradecimento', label: 'Agradecimento', description: 'Pós-venda ou pós-reunião' },
  { value: 'lembrete', label: 'Lembrete', description: 'Lembrar de reunião ou prazo' },
];

const TONES = [
  { value: 'profissional', label: 'Profissional' },
  { value: 'amigavel', label: 'Amigável' },
  { value: 'formal', label: 'Formal' },
  { value: 'consultivo', label: 'Consultivo' },
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
  const [useStorytelling, setUseStorytelling] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [previewEmail, setPreviewEmail] = useState(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');

  // Buscar produtos disponíveis
  const { data: products = [] } = useQuery({
    queryKey: ['products-active'],
    queryFn: () => base44.entities.Product.filter({ active: true }),
  });

  const selectedProductData = products.find(p => p.id === selectedProduct);

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

      const storytellingInstruction = useStorytelling ? `
IMPORTANTE - USE STORYTELLING:
- Comece o e-mail com uma história envolvente ou caso de sucesso real
- Crie conexão emocional antes de apresentar a solução
- Use narrativas que prendam a atenção desde a primeira linha
- Conte histórias de transformação de clientes similares
- Use frases como "Imagine...", "Há pouco tempo, um cliente como você...", "Deixe-me contar uma história..."
- O storytelling deve fluir naturalmente no texto
` : '';

      const prompt = `Você é um especialista em copywriting para e-mails de vendas B2B.

CONTEXTO DO CLIENTE:
${clientContext}

${productContext}

HISTÓRICO DE INTERAÇÕES:
${interactionHistory || 'Primeiro contato com este cliente'}

CAMPANHA: ${campaign?.name || 'Prospecção Geral'}

OBJETIVO DO E-MAIL: ${EMAIL_CONTEXTS.find(c => c.value === selectedContext)?.description}
TOM DESEJADO: ${selectedTone}
${storytellingInstruction}

Gere 3 sugestões de e-mails completos usando técnicas de:
- SPIN Selling (Situação, Problema, Implicação, Necessidade)
- AIDA (Atenção, Interesse, Desejo, Ação)
- Gatilhos mentais (escassez, urgência, prova social, autoridade, reciprocidade)
- PNL (rapport, linguagem persuasiva)
${useStorytelling ? '- STORYTELLING (narrativas que capturam atenção e criam conexão emocional)' : ''}

Os e-mails devem ter:
- ASSUNTO IMPACTANTE que gere curiosidade e aumente taxa de abertura
- Primeira linha que PRENDA A ATENÇÃO imediatamente
- Corpo bem estruturado com parágrafos curtos
- Benefícios claros do produto/serviço
- Call-to-action claro e específico
- Tom ${selectedTone} e profissional
- Assinatura padrão: "Atenciosamente, [Nome do Agente] - A SUA.ID"

Retorne em JSON com formato:
{
  "suggestions": [
    {
      "subject": "assunto do e-mail (máx 60 caracteres)",
      "body": "corpo completo do e-mail",
      "technique": "técnica principal utilizada",
      "tip": "dica de quando usar este modelo"
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
      setSuggestions([
        {
          subject: `${client?.client_name?.split(' ')[0] || ''}, uma oportunidade especial para você`,
          body: `Olá ${client?.client_name?.split(' ')[0] || ''}!\n\nEspero que esteja bem.\n\nEntro em contato porque acredito que podemos ajudar sua empresa a alcançar novos patamares.\n\nA A SUA.ID é especializada em soluções digitais que transformam a rotina empresarial, trazendo mais segurança, praticidade e economia de tempo.\n\nGostaria de agendar uma conversa rápida de 15 minutos para entender melhor suas necessidades?\n\nAguardo seu retorno!\n\nAtenciosamente,\n[Nome] - A SUA.ID`,
          technique: "Abordagem consultiva",
          tip: "Ideal para primeiro contato"
        },
        {
          subject: `Não deixe essa oportunidade passar - válido até sexta`,
          body: `Olá ${client?.client_name?.split(' ')[0] || ''}!\n\nHá alguns dias conversamos sobre como podemos ajudar sua empresa.\n\nQuero te lembrar que temos uma condição especial válida até o final desta semana.\n\nMuitos empresários como você já estão aproveitando nossas soluções para:\n✅ Economizar tempo\n✅ Aumentar a segurança\n✅ Reduzir custos operacionais\n\nPosso te enviar uma proposta personalizada?\n\nAguardo seu retorno!\n\nAtenciosamente,\n[Nome] - A SUA.ID`,
          technique: "Gatilho de escassez",
          tip: "Bom para follow-up com urgência"
        },
        {
          subject: `Como a [Empresa Similar] economizou 40% com nossa solução`,
          body: `Olá ${client?.client_name?.split(' ')[0] || ''}!\n\nRecentemente, ajudamos uma empresa do mesmo segmento que o seu a transformar completamente sua operação.\n\nEm apenas 3 meses, eles conseguiram:\n📈 Reduzir 40% dos custos operacionais\n⏱️ Economizar 15 horas semanais em processos\n🔒 Aumentar a segurança dos dados\n\nAcredito que podemos fazer o mesmo pela sua empresa.\n\nQue tal agendarmos uma conversa para eu mostrar como isso funcionaria para você?\n\nAtenciosamente,\n[Nome] - A SUA.ID`,
          technique: "Prova social + Storytelling",
          tip: "Excelente para leads qualificados"
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
              <Sparkles className="w-3 h-3 mr-1" /> IA
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Configurações */}
          <div className="space-y-3">
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

            {/* Seleção de Produto */}
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Produto (para contextualizar)</label>
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

            {/* Toggle Storytelling */}
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <div>
                  <Label className="text-sm font-medium">Usar Storytelling</Label>
                  <p className="text-xs text-slate-500">Histórias envolventes que criam conexão</p>
                </div>
              </div>
              <Switch
                checked={useStorytelling}
                onCheckedChange={setUseStorytelling}
              />
            </div>
          </div>

          {/* Botão de Gerar */}
          <Button 
            onClick={generateSuggestions}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando sugestões...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Gerar Sugestões de E-mail
              </>
            )}
          </Button>

          {/* Sugestões */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">E-mails Sugeridos:</p>
              {suggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="p-4 bg-white rounded-xl border border-blue-100 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 shrink-0">
                      {suggestion.technique}
                    </Badge>
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
                  </div>

                  {/* Preview do corpo */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1">Prévia:</p>
                    <p className="text-sm text-slate-600 line-clamp-3 whitespace-pre-wrap">
                      {suggestion.body.slice(0, 200)}...
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 italic">💡 {suggestion.tip}</p>
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
              Gerar Novas Sugestões
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