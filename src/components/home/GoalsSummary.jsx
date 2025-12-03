import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns';
import { 
  Target, TrendingUp, Calendar, Users, Phone, Handshake, 
  CheckCircle2, ArrowRight, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GOAL_TYPE_CONFIG = {
  vendas: { label: 'Vendas', icon: TrendingUp, color: 'text-green-600', bgColor: 'bg-green-100' },
  tarefas: { label: 'Tarefas', icon: CheckCircle2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  parcerias: { label: 'Parcerias', icon: Handshake, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  reunioes: { label: 'Reuniões', icon: Users, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  ligacoes: { label: 'Ligações', icon: Phone, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  leads: { label: 'Leads', icon: Target, color: 'text-pink-600', bgColor: 'bg-pink-100' },
};

const PERIOD_LABELS = {
  semanal: 'Semana',
  mensal: 'Mês',
  trimestral: 'Trimestre',
  semestral: 'Semestre',
  anual: 'Ano',
};

export default function GoalsSummary({ userEmail }) {
  const [periodFilter, setPeriodFilter] = useState('mensal');
  
  const now = new Date();
  const currentWeek = `${getYear(now)}-W${String(getWeek(now)).padStart(2, '0')}`;
  const currentMonth = format(now, 'yyyy-MM');
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const currentSemester = now.getMonth() < 6 ? 1 : 2;
  const currentYear = now.getFullYear();

  const { data: goals = [] } = useQuery({
    queryKey: ['home-goals', periodFilter],
    queryFn: () => base44.entities.Goal.filter({ period_type: periodFilter }),
  });

  // Filtrar metas do período atual
  const currentPeriodGoals = goals.filter(g => {
    switch (periodFilter) {
      case 'semanal':
        return g.week === currentWeek;
      case 'mensal':
        return g.month === currentMonth;
      case 'trimestral':
        return g.quarter === currentQuarter && g.year === currentYear;
      case 'semestral':
        return g.semester === currentSemester && g.year === currentYear;
      case 'anual':
        return g.year === currentYear;
      default:
        return true;
    }
  });

  // Separar metas da empresa e individuais
  const companyGoals = currentPeriodGoals.filter(g => !g.agent_email);
  const myGoals = currentPeriodGoals.filter(g => g.agent_email === userEmail);

  const renderGoalCard = (goal) => {
    const config = GOAL_TYPE_CONFIG[goal.goal_type] || GOAL_TYPE_CONFIG.vendas;
    const Icon = config.icon;
    
    const hasValue = goal.goal_value > 0;
    const hasQuantity = goal.goal_quantity > 0;
    
    const valueProgress = hasValue ? Math.min((goal.achieved_value || 0) / goal.goal_value * 100, 100) : 0;
    const quantityProgress = hasQuantity ? Math.min((goal.achieved_quantity || 0) / goal.goal_quantity * 100, 100) : 0;
    
    const mainProgress = hasValue ? valueProgress : quantityProgress;

    return (
      <div key={goal.id} className="p-4 rounded-xl bg-white border shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800">{config.label}</span>
              {goal.agent && (
                <Badge variant="outline" className="text-xs">{goal.agent}</Badge>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {goal.agent ? 'Individual' : 'Empresa'}
            </span>
          </div>
          <span className={`text-lg font-bold ${config.color}`}>
            {mainProgress.toFixed(0)}%
          </span>
        </div>

        <Progress value={mainProgress} className="h-2 mb-2" />

        <div className="flex justify-between text-xs text-slate-500">
          {hasValue && (
            <span>
              R$ {(goal.achieved_value || 0).toLocaleString('pt-BR')} / R$ {goal.goal_value.toLocaleString('pt-BR')}
            </span>
          )}
          {hasQuantity && (
            <span>
              {goal.achieved_quantity || 0} / {goal.goal_quantity} unid.
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-amber-600" />
            </div>
            Metas
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <Filter className="w-3 h-3 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semanal">Semana</SelectItem>
                <SelectItem value="mensal">Mês</SelectItem>
                <SelectItem value="trimestral">Trimestre</SelectItem>
                <SelectItem value="semestral">Semestre</SelectItem>
                <SelectItem value="anual">Ano</SelectItem>
              </SelectContent>
            </Select>
            <Link to={createPageUrl('Dashboard')} className="text-sm text-[#6B2D8B] hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentPeriodGoals.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Target className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Nenhuma meta para {PERIOD_LABELS[periodFilter].toLowerCase()}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Metas da Empresa */}
            {companyGoals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Empresa</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {companyGoals.map(renderGoalCard)}
                </div>
              </div>
            )}

            {/* Minhas Metas */}
            {myGoals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">Minhas Metas</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {myGoals.map(renderGoalCard)}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}