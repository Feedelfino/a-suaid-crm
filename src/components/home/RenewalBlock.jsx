import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { differenceInDays, parseISO } from 'date-fns';
import { 
  RefreshCw, AlertTriangle, Clock, CheckCircle, 
  TrendingUp, ArrowRight, BarChart3 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RenewalBlock() {
  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates-home'],
    queryFn: () => base44.entities.Certificate.list('-expiry_date', 1000),
  });

  const today = new Date();

  const expiringToday = certificates.filter(c => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(parseISO(c.expiry_date), today);
    return days === 0;
  });

  const expiringIn7Days = certificates.filter(c => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(parseISO(c.expiry_date), today);
    return days >= 0 && days <= 7;
  });

  const expiringIn15Days = certificates.filter(c => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(parseISO(c.expiry_date), today);
    return days >= 0 && days <= 15;
  });

  const expiringIn30Days = certificates.filter(c => {
    if (!c.expiry_date) return false;
    const days = differenceInDays(parseISO(c.expiry_date), today);
    return days >= 0 && days <= 30;
  });

  const inProgress = certificates.filter(c => c.renewal_status === 'em_contato');
  const completedThisMonth = certificates.filter(c => {
    if (c.renewal_status !== 'renovado' || !c.updated_date) return false;
    const updated = new Date(c.updated_date);
    return updated.getMonth() === today.getMonth() && 
           updated.getFullYear() === today.getFullYear();
  });

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#6B2D8B]" />
            Renovação de Certificados
          </CardTitle>
          <Link to={createPageUrl('RenewalsDashboard')}>
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard Completo
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cards de Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-red-100 border border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <p className="text-xs font-medium text-red-700">Hoje</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{expiringToday.length}</p>
          </div>

          <div className="p-3 rounded-lg bg-orange-100 border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <p className="text-xs font-medium text-orange-700">7 dias</p>
            </div>
            <p className="text-2xl font-bold text-orange-600">{expiringIn7Days.length}</p>
          </div>

          <div className="p-3 rounded-lg bg-amber-100 border border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-medium text-amber-700">15 dias</p>
            </div>
            <p className="text-2xl font-bold text-amber-600">{expiringIn15Days.length}</p>
          </div>

          <div className="p-3 rounded-lg bg-yellow-100 border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <p className="text-xs font-medium text-yellow-700">30 dias</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{expiringIn30Days.length}</p>
          </div>
        </div>

        {/* Performance */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-sm text-blue-700 mb-1">Em Andamento</p>
            <p className="text-xl font-bold text-blue-600">{inProgress.length}</p>
          </div>

          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-700 mb-1">Concluídas (Mês)</p>
            <p className="text-xl font-bold text-green-600">{completedThisMonth.length}</p>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Link to={createPageUrl('Renewals')}>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Ver Renovações
            </Button>
          </Link>
          
          <Link to={createPageUrl('SalesPipeline?campaign=Renovação de Certificados')}>
            <Button variant="outline" size="sm" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Funil de Renovação
            </Button>
          </Link>
        </div>

        {/* Alerta de Urgência */}
        {(expiringToday.length > 0 || expiringIn7Days.length > 5) && (
          <div className="p-3 rounded-lg bg-red-50 border-2 border-red-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800 text-sm">Ação Urgente Necessária</p>
                <p className="text-xs text-red-600">
                  {expiringToday.length > 0 && `${expiringToday.length} vencendo hoje. `}
                  {expiringIn7Days.length > 5 && `${expiringIn7Days.length} nos próximos 7 dias.`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}