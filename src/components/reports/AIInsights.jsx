import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, TrendingUp, AlertTriangle, Target, Lightbulb, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AIInsights({ salesData, interactions, clients, campaigns, goals, period }) {
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateInsights = async () => {
    setIsLoading(true);
    
    try {
      // Preparar dados para análise
      const totalSales = salesData.reduce((sum, s) => sum + (s.sale_value || 0), 0);
      const salesCount = salesData.length;
      const avgTicket = salesCount > 0 ? totalSales / salesCount : 0;
      
      const tentativas = interactions.filter(i => i.interaction_type?.startsWith('tentativa_')).length;
      const contatos = interactions.filter(i => i.interaction_type === 'contato_sucesso').length;
      const propostas = interactions.filter(i => i.interaction_type === 'proposta_feita').length;
      
      const conversionRate = tentativas > 0 ? ((salesCount / tentativas) * 100).toFixed(1) : 0;
      
      // Produtos mais vendidos
      const productSales = {};
      salesData.forEach(s => {
        const p = s.product_offered || 'outros';
        productSales[p] = (productSales[p] || 0) + (s.sale_value || 0);
      });
      const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, value]) => `${name.replace(/_/g, ' ')}: R$ ${value.toLocaleString('pt-BR')}`);

      // Leads inativos
      const inactiveLeads = clients.filter(c => {
        const clientInteractions = interactions.filter(i => i.client_id === c.id);
        return clientInteractions.length === 0 || 
          (clientInteractions[0]?.created_date && 
           new Date() - new Date(clientInteractions[0].created_date) > 7 * 24 * 60 * 60 * 1000);
      }).length;

      // Meta atual
      const currentGoal = goals.find(g => !g.agent);
      const goalProgress = currentGoal ? (totalSales / currentGoal.goal_value * 100).toFixed(1) : null;

      const prompt = `Analise os dados de vendas de um CRM e gere insights acionáveis em português brasileiro:

DADOS DO PERÍODO (${period}):
- Total vendido: R$ ${totalSales.toLocaleString('pt-BR')}
- Quantidade de vendas: ${salesCount}
- Ticket médio: R$ ${avgTicket.toFixed(2)}
- Taxa de conversão: ${conversionRate}%
- Tentativas de contato: ${tentativas}
- Contatos com sucesso: ${contatos}
- Propostas enviadas: ${propostas}
- Leads sem interação recente: ${inactiveLeads}
${currentGoal ? `- Meta do mês: R$ ${currentGoal.goal_value.toLocaleString('pt-BR')} (${goalProgress}% atingido)` : ''}
- Top produtos: ${topProducts.join(', ')}

Gere exatamente 4 insights no formato JSON:
1. Um insight sobre desempenho de vendas
2. Um insight sobre oportunidades de melhoria
3. Uma previsão ou tendência
4. Uma recomendação de ação imediata

Cada insight deve ter: title, description, type (success/warning/info/action), priority (high/medium/low)`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            summary: { type: "string" },
            forecast: { type: "string" }
          }
        }
      });

      setInsights(response);
    } catch (error) {
      console.error('Erro ao gerar insights:', error);
      setInsights({
        insights: [
          { title: 'Análise indisponível', description: 'Não foi possível gerar insights neste momento.', type: 'warning', priority: 'low' }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const typeIcons = {
    success: TrendingUp,
    warning: AlertTriangle,
    info: Lightbulb,
    action: Target,
  };

  const typeColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    action: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-700',
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#6B2D8B]" />
          Insights com IA
        </CardTitle>
        <Button 
          onClick={generateInsights} 
          disabled={isLoading}
          className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Insights
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!insights ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">Clique em "Gerar Insights" para uma análise inteligente dos seus dados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.summary && (
              <div className="p-4 bg-gradient-to-r from-[#6B2D8B]/10 to-[#C71585]/10 rounded-xl border border-[#6B2D8B]/20">
                <p className="font-medium text-slate-800">{insights.summary}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.insights?.map((insight, index) => {
                const Icon = typeIcons[insight.type] || Lightbulb;
                return (
                  <div 
                    key={index} 
                    className={`p-4 rounded-xl border ${typeColors[insight.type] || typeColors.info}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{insight.title}</h4>
                          <Badge className={`text-xs ${priorityColors[insight.priority]}`}>
                            {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Média' : 'Baixa'}
                          </Badge>
                        </div>
                        <p className="text-sm opacity-90">{insight.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {insights.forecast && (
              <div className="p-4 bg-slate-50 rounded-xl border">
                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#6B2D8B]" />
                  Previsão
                </h4>
                <p className="text-sm text-slate-600">{insights.forecast}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}