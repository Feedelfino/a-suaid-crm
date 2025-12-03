import React from 'react';
import { format, parseISO, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#6B2D8B', '#C71585', '#8B4DAB', '#FF6B9D', '#FFD700', '#00CED1', '#4CAF50', '#FF5722'];

export default function SalesCharts({ salesData, startDate, endDate, interactions }) {
  // Dados de vendas por dia
  const salesByDay = React.useMemo(() => {
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate)
    });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const daySales = salesData.filter(s => s.created_date?.startsWith(dayStr));
      return {
        date: format(day, 'dd/MM'),
        vendas: daySales.length,
        valor: daySales.reduce((sum, s) => sum + (s.sale_value || 0), 0),
      };
    });
  }, [salesData, startDate, endDate]);

  // Dados de vendas por produto
  const salesByProduct = React.useMemo(() => {
    const products = {};
    salesData.forEach(s => {
      const product = s.product_offered || 'Outros';
      if (!products[product]) products[product] = { name: product, value: 0, count: 0 };
      products[product].value += s.sale_value || 0;
      products[product].count++;
    });
    return Object.values(products).sort((a, b) => b.value - a.value);
  }, [salesData]);

  // Análise de funil de conversão
  const funnelData = React.useMemo(() => {
    const tentativas = interactions.filter(i => i.interaction_type?.startsWith('tentativa_')).length;
    const contatos = interactions.filter(i => i.interaction_type === 'contato_sucesso').length;
    const propostas = interactions.filter(i => i.interaction_type === 'proposta_feita').length;
    const vendas = salesData.length;
    
    return [
      { name: 'Tentativas', value: tentativas, fill: '#6B2D8B' },
      { name: 'Contatos', value: contatos, fill: '#8B4DAB' },
      { name: 'Propostas', value: propostas, fill: '#C71585' },
      { name: 'Vendas', value: vendas, fill: '#4CAF50' },
    ];
  }, [interactions, salesData]);

  // Cálculo de tendência
  const trend = React.useMemo(() => {
    const halfPoint = Math.floor(salesByDay.length / 2);
    const firstHalf = salesByDay.slice(0, halfPoint).reduce((sum, d) => sum + d.valor, 0);
    const secondHalf = salesByDay.slice(halfPoint).reduce((sum, d) => sum + d.valor, 0);
    
    if (firstHalf === 0) return { direction: 'up', percent: 100 };
    const change = ((secondHalf - firstHalf) / firstHalf) * 100;
    return { direction: change >= 0 ? 'up' : 'down', percent: Math.abs(change).toFixed(1) };
  }, [salesByDay]);

  const totalValue = salesData.reduce((sum, s) => sum + (s.sale_value || 0), 0);
  const avgTicket = salesData.length > 0 ? totalValue / salesData.length : 0;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Vendido</p>
                <p className="text-2xl font-bold">R$ {totalValue.toLocaleString('pt-BR')}</p>
              </div>
              <DollarSign className="w-8 h-8 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Vendas</p>
                <p className="text-2xl font-bold text-slate-800">{salesData.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-[#C71585]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Ticket Médio</p>
                <p className="text-2xl font-bold text-slate-800">R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Tendência</p>
                <p className={`text-2xl font-bold ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.percent}%
                </p>
              </div>
              {trend.direction === 'up' ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Vendas ao Longo do Tempo */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByDay}>
                  <defs>
                    <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B2D8B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6B2D8B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'valor' ? `R$ ${value.toLocaleString('pt-BR')}` : value,
                      name === 'valor' ? 'Valor' : 'Vendas'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#6B2D8B" 
                    fillOpacity={1} 
                    fill="url(#colorVendas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Vendas por Produto */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Vendas por Produto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByProduct}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name.replace(/_/g, ' ')} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {salesByProduct.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Funil de Conversão */}
        <Card className="border-0 shadow-lg lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Funil de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-8 mt-4">
              {funnelData.map((stage, index) => {
                const nextStage = funnelData[index + 1];
                if (!nextStage || stage.value === 0) return null;
                const conversionRate = ((nextStage.value / stage.value) * 100).toFixed(1);
                return (
                  <div key={stage.name} className="text-center">
                    <p className="text-xs text-slate-500">{stage.name} → {nextStage.name}</p>
                    <p className="text-lg font-bold text-[#6B2D8B]">{conversionRate}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}