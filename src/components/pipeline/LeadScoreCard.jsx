import React from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, Phone, Calendar, MessageSquare } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Calcula score do lead baseado em dados e histórico
export function calculateLeadScore(client, interactions = [], appointments = []) {
  let score = 0;
  const factors = [];

  // Dados do cliente (0-25 pontos)
  if (client.email) { score += 5; factors.push({ name: 'E-mail', points: 5 }); }
  if (client.phone) { score += 5; factors.push({ name: 'Telefone', points: 5 }); }
  if (client.whatsapp) { score += 5; factors.push({ name: 'WhatsApp', points: 5 }); }
  if (client.company_name) { score += 5; factors.push({ name: 'Empresa', points: 5 }); }
  if (client.cnpj) { score += 5; factors.push({ name: 'CNPJ', points: 5 }); }

  // Interações (0-35 pontos)
  const clientInteractions = interactions.filter(i => i.client_id === client.id);
  const recentInteractions = clientInteractions.filter(i => {
    const date = new Date(i.created_date);
    const daysAgo = (new Date() - date) / (1000 * 60 * 60 * 24);
    return daysAgo <= 30;
  });

  if (recentInteractions.length > 0) {
    const interactionPoints = Math.min(recentInteractions.length * 5, 20);
    score += interactionPoints;
    factors.push({ name: `${recentInteractions.length} interações recentes`, points: interactionPoints });
  }

  // Contato com sucesso
  const successfulContacts = clientInteractions.filter(i => i.interaction_type === 'contato_sucesso');
  if (successfulContacts.length > 0) {
    score += 10;
    factors.push({ name: 'Contato realizado', points: 10 });
  }

  // Proposta feita
  const proposals = clientInteractions.filter(i => i.interaction_type === 'proposta_feita');
  if (proposals.length > 0) {
    score += 15;
    factors.push({ name: 'Proposta enviada', points: 15 });
  }

  // Reuniões agendadas (0-20 pontos)
  const clientAppointments = appointments.filter(a => a.client_id === client.id);
  const futureAppointments = clientAppointments.filter(a => new Date(a.date) >= new Date());
  if (futureAppointments.length > 0) {
    score += 15;
    factors.push({ name: 'Reunião agendada', points: 15 });
  }

  // Penalizações
  const noInterestInteractions = clientInteractions.filter(i => i.interaction_type === 'sem_interesse');
  if (noInterestInteractions.length > 0) {
    score -= 20;
    factors.push({ name: 'Sem interesse', points: -20 });
  }

  // Estágio do funil (0-20 pontos)
  const stagePoints = {
    lead: 0,
    contato: 5,
    qualificacao: 10,
    proposta: 15,
    negociacao: 18,
    fechamento: 20,
    perdido: -10,
  };
  const funnelPoints = stagePoints[client.funnel_stage || 'lead'] || 0;
  if (funnelPoints !== 0) {
    score += funnelPoints;
    factors.push({ name: `Etapa: ${client.funnel_stage}`, points: funnelPoints });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    factors,
    trend: recentInteractions.length > 2 ? 'up' : recentInteractions.length === 0 ? 'down' : 'stable',
  };
}

// Sugere próxima ação baseada no contexto
export function getNextBestAction(client, interactions = [], appointments = []) {
  const clientInteractions = interactions.filter(i => i.client_id === client.id);
  const clientAppointments = appointments.filter(a => a.client_id === client.id);
  const lastInteraction = clientInteractions[0]; // Assumindo ordenação por data

  // Sem interações
  if (clientInteractions.length === 0) {
    return {
      action: 'Fazer primeiro contato',
      icon: Phone,
      priority: 'high',
      description: 'Cliente ainda não foi contactado. Inicie o relacionamento.',
    };
  }

  // Última interação foi sem interesse
  if (lastInteraction?.interaction_type === 'sem_interesse') {
    return {
      action: 'Agendar follow-up em 90 dias',
      icon: Calendar,
      priority: 'low',
      description: 'Cliente demonstrou sem interesse. Retorne após período de espera.',
    };
  }

  // Proposta enviada sem resposta
  if (lastInteraction?.interaction_type === 'proposta_feita') {
    const daysSinceProposal = (new Date() - new Date(lastInteraction.created_date)) / (1000 * 60 * 60 * 24);
    if (daysSinceProposal > 3) {
      return {
        action: 'Follow-up da proposta',
        icon: MessageSquare,
        priority: 'high',
        description: `Proposta enviada há ${Math.floor(daysSinceProposal)} dias. Verificar interesse.`,
      };
    }
  }

  // Cliente indeciso
  if (lastInteraction?.interaction_type === 'cliente_indeciso') {
    return {
      action: 'Oferecer condição especial',
      icon: Zap,
      priority: 'medium',
      description: 'Cliente está em dúvida. Tente uma oferta diferenciada.',
    };
  }

  // Contato com sucesso mas sem próximos passos
  if (lastInteraction?.interaction_type === 'contato_sucesso') {
    const hasAppointment = clientAppointments.some(a => new Date(a.date) >= new Date());
    if (!hasAppointment) {
      return {
        action: 'Agendar reunião',
        icon: Calendar,
        priority: 'high',
        description: 'Contato realizado. Próximo passo: agendar apresentação.',
      };
    }
  }

  // Default
  const daysSinceLastContact = lastInteraction 
    ? (new Date() - new Date(lastInteraction.created_date)) / (1000 * 60 * 60 * 24)
    : 999;

  if (daysSinceLastContact > 7) {
    return {
      action: 'Retomar contato',
      icon: Phone,
      priority: 'medium',
      description: `Sem contato há ${Math.floor(daysSinceLastContact)} dias. Hora de reativar.`,
    };
  }

  return {
    action: 'Manter acompanhamento',
    icon: MessageSquare,
    priority: 'low',
    description: 'Lead em andamento. Continue monitorando.',
  };
}

export default function LeadScoreCard({ score, trend, nextAction }) {
  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className={`px-2 py-1 rounded-lg font-bold text-sm ${getScoreColor(score)}`}>
                {score}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Score do Lead</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TrendIcon className={`w-4 h-4 ${trendColor}`} />
      </div>
      <Progress value={score} className="h-1" />
      {nextAction && (
        <div className="flex items-center gap-1 mt-1">
          <nextAction.icon className={`w-3 h-3 ${
            nextAction.priority === 'high' ? 'text-red-500' :
            nextAction.priority === 'medium' ? 'text-amber-500' : 'text-slate-400'
          }`} />
          <span className="text-xs text-slate-600 truncate">{nextAction.action}</span>
        </div>
      )}
    </div>
  );
}