import React from 'react';
import { Calendar, Users, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

export default function ScheduleStats({ appointments, period = 'month' }) {
  const total = appointments.length;
  const concluidas = appointments.filter(a => a.status === 'concluida').length;
  const naoCompareceu = appointments.filter(a => a.status === 'nao_compareceu').length;
  const aguardando = appointments.filter(a => a.status === 'aguardando').length;
  const comerciais = appointments.filter(a => a.category === 'comercial' || !a.category).length;
  const internos = appointments.filter(a => a.category === 'interno').length;
  
  const taxaComparecimento = concluidas + naoCompareceu > 0 
    ? ((concluidas / (concluidas + naoCompareceu)) * 100).toFixed(0) 
    : 0;

  const stats = [
    { label: 'Total', value: total, icon: Calendar, color: 'text-purple-600 bg-purple-100' },
    { label: 'Comerciais', value: comerciais, icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
    { label: 'Internos', value: internos, icon: Users, color: 'text-blue-600 bg-blue-100' },
    { label: 'Concluídas', value: concluidas, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { label: 'No-show', value: naoCompareceu, icon: XCircle, color: 'text-red-600 bg-red-100' },
    { label: 'Taxa Comparec.', value: `${taxaComparecimento}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-100' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}