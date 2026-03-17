// ============================================================
// FRONTEND — Página de Relatórios
// Exibe relatórios de vendas, interações, desempenho por agente
// e por produto, com filtro por período e exportação para Sheets.
// Os dados são buscados no BACKEND via funções e entidades base44.
// ============================================================

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client'; // SDK de conexão com o backend (base44)
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { 
  FileText, Download, BarChart3, TrendingUp, Sparkles, Phone, Users, DollarSign, PieChart, LineChart as LineChartIcon, PhoneMissed
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart as RePieChart, Pie, Cell
} from 'recharts';

export default function Reports() {
  // Estados de filtro por período (início e fim do mês atual por padrão)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [attemptsAgent, setAttemptsAgent] = useState('all'); // Filtro de agente para o relatório de tentativas

  // BACKEND: busca interações brutas da entidade Interaction (para uso nos gráficos)
  const { data: rawInteractions = [] } = useQuery({
    queryKey: ['reports-raw-interactions', startDate, endDate],
    queryFn: async () => {
      const allInteractions = await base44.entities.Interaction.list('-created_date', 5000);
      // FRONTEND: filtra pelo intervalo de datas selecionado
      return allInteractions.filter(item => {
        if (!item.created_date) return false;
        const date = parseISO(item.created_date);
        return isWithinInterval(date, { start: parseISO(startDate), end: parseISO(endDate) });
      });
    },
  });

  // BACKEND: busca todas as ofertas brutas (para gráfico de evolução diária)
  const { data: rawOffers = [] } = useQuery({
    queryKey: ['reports-raw-offers', startDate, endDate],
    queryFn: async () => {
      const allOffers = await base44.entities.Offer.list('-created_date', 5000);
      return allOffers.filter(item => {
        if (!item.created_date) return false;
        const date = parseISO(item.created_date);
        return isWithinInterval(date, { start: parseISO(startDate), end: parseISO(endDate) });
      });
    },
  });

  // BACKEND: busca todos os negócios fechados (para gráfico ganhos/perdidos)
  const { data: rawDeals = [] } = useQuery({
    queryKey: ['reports-raw-deals', startDate, endDate],
    queryFn: async () => {
      const allDeals = await base44.entities.Deal.list('-closed_at', 5000);
      return allDeals.filter(item => {
        if (!item.closed_at) return false;
        const date = parseISO(item.closed_at);
        return isWithinInterval(date, { start: parseISO(startDate), end: parseISO(endDate) });
      });
    },
  });

  // BACKEND: chama a função backend 'getOverviewReport' para obter resumo geral do período
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['overview-report', startDate, endDate],
    queryFn: async () => {
      const response = await base44.functions.invoke('getOverviewReport', {
        startDate,
        endDate
      });
      return response.data;
    },
  });

  // BACKEND: chama a função backend 'getDetailedSalesReport' para vendas detalhadas
  const { data: salesReport = [], isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', startDate, endDate],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDetailedSalesReport', {
        startDate,
        endDate
      });
      return response.data;
    },
  });

  // BACKEND: chama a função backend 'getAgentPerformanceReport' para desempenho por agente
  const { data: agentReport = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agent-report', startDate, endDate],
    queryFn: async () => {
      const response = await base44.functions.invoke('getAgentPerformanceReport', {
        startDate,
        endDate
      });
      return response.data;
    },
  });

  // BACKEND: chama a função backend 'getProductPerformanceReport' para desempenho por produto
  const { data: productReport = [], isLoading: productsLoading } = useQuery({
    queryKey: ['product-report', startDate, endDate],
    queryFn: async () => {
      const response = await base44.functions.invoke('getProductPerformanceReport', {
        startDate,
        endDate
      });
      return response.data;
    },
  });

  // BACKEND: busca todas as interações para o relatório de tentativas de contato
  const { data: allInteractions = [], isLoading: attemptsLoading } = useQuery({
    queryKey: ['reports-all-interactions', startDate, endDate],
    queryFn: async () => {
      const all = await base44.entities.Interaction.list('-created_date', 5000);
      return all.filter(item => {
        if (!item.created_date) return false;
        const date = parseISO(item.created_date);
        return isWithinInterval(date, { start: parseISO(startDate), end: parseISO(endDate) });
      });
    },
  });

  // BACKEND: busca lista de usuários aprovados para montar o filtro de agentes
  const { data: userAccessList = [] } = useQuery({
    queryKey: ['user-access-list'],
    queryFn: () => base44.entities.UserAccess.filter({ status: 'approved' }),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos (dado pouco volátil)
  });

  const attemptTypes = [
    'tentativa_email',
    'tentativa_telefone',
    'tentativa_whatsapp',
    'call',
    'whatsapp',
    'email',
    'followup',
    'contato_sucesso',
    'followup_agendado',
    'cliente_indeciso',
    'sem_interesse',
    'parceria',
    'alteracao_cadastral',
    'meeting',
    'proposal_sent',
  ];

  const typeLabels = {
    tentativa_email: 'Tentativa E-mail',
    tentativa_telefone: 'Tentativa Telefone',
    tentativa_whatsapp: 'Tentativa WhatsApp',
    call: 'Ligação',
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    followup: 'Follow-up',
    contato_sucesso: 'Contato com Sucesso',
    followup_agendado: 'Follow-up Agendado',
    cliente_indeciso: 'Cliente Indeciso',
    sem_interesse: 'Sem Interesse',
    parceria: 'Parceria',
    alteracao_cadastral: 'Alteração Cadastral',
    meeting: 'Reunião',
    proposal_sent: 'Proposta Enviada',
  };

  const channelLabels = {
    whatsapp: 'WhatsApp',
    phone: 'Telefone',
    instagram: 'Instagram',
    email: 'E-mail',
    presencial: 'Presencial',
    sistema: 'Sistema',
  };

  const outcomeLabels = {
    success: 'Sucesso',
    no_answer: 'Sem Resposta',
    scheduled: 'Agendado',
    lost: 'Perdido',
    tentativa_sem_sucesso: 'Tentativa Sem Sucesso',
    tentativa_feita: 'Tentativa Feita',
    indeciso_agendado: 'Indeciso Agendado',
    sem_interesse: 'Sem Interesse',
    retornar_90_dias: 'Retornar em 90 dias',
    cadastro_atualizado: 'Cadastro Atualizado',
  };

  const filteredAttempts = attemptsAgent === 'all'
    ? allInteractions
    : allInteractions.filter(i => i.agent_email === attemptsAgent);

  const attemptsSummary = attemptTypes.map(type => ({
    type,
    label: typeLabels[type] || type,
    count: filteredAttempts.filter(i => i.type === type).length,
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count);

  const agentOptions = userAccessList.map(u => ({
    email: u.user_email,
    name: u.nickname || u.user_name || u.user_email,
  }));

  const [exporting, setExporting] = useState(false);

  const exportToSheets = async (data, title) => {
    if (data.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    setExporting(true);
    try {
      const headers = Object.keys(data[0]);
      
      const response = await base44.functions.invoke('exportReportToSheets', {
        data,
        headers,
        title: `${title} - ${format(new Date(), 'dd/MM/yyyy')}`,
      });

      if (response.data.success) {
        window.open(response.data.url, '_blank');
      } else {
        alert('Erro ao exportar: ' + (response.data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      alert('Erro ao exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
          <p className="text-slate-500">Análise de desempenho e resultados</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="bg-white shadow-sm border flex-wrap">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="sales">Vendas Detalhadas</TabsTrigger>
          <TabsTrigger value="agents">Por Agente</TabsTrigger>
          <TabsTrigger value="products">Por Produto</TabsTrigger>
          <TabsTrigger value="attempts" className="gap-2">
            <PhoneMissed className="w-4 h-4" />
            Tentativas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {overviewLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total de Interações</p>
                      <p className="text-3xl font-bold text-blue-900">{overview?.total_interactions || 0}</p>
                    </div>
                    <Phone className="w-12 h-12 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Total de Ofertas</p>
                      <p className="text-3xl font-bold text-purple-900">{overview?.total_offers || 0}</p>
                    </div>
                    <FileText className="w-12 h-12 text-purple-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Vendas Ganhas</p>
                      <p className="text-3xl font-bold text-green-900">{overview?.total_deals_won || 0}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-green-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Vendas Perdidas</p>
                      <p className="text-3xl font-bold text-red-900">{overview?.total_deals_lost || 0}</p>
                    </div>
                    <TrendingUp className="w-12 h-12 text-red-500 opacity-50 rotate-180" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Valor Total de Vendas</p>
                      <p className="text-3xl font-bold text-yellow-900">
                        R$ {(overview?.total_sales_value || 0).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <DollarSign className="w-12 h-12 text-yellow-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-600 font-medium">Taxa de Conversão</p>
                      <p className="text-3xl font-bold text-indigo-900">
                        {overview?.offer_to_deal_conversion_rate || '0%'}
                      </p>
                    </div>
                    <Sparkles className="w-12 h-12 text-indigo-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Deals Won vs Lost Pie Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-[#6B2D8B]" />
                    Vendas Ganhas vs Perdidas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={[
                            { name: 'Ganhas', value: overview?.total_deals_won || 0, fill: '#22C55E' },
                            { name: 'Perdidas', value: overview?.total_deals_lost || 0, fill: '#EF4444' },
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          <Cell key={`cell-0`} fill={'#22C55E'} />
                          <Cell key={`cell-1`} fill={'#EF4444'} />
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Sales Trend Line Chart */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LineChartIcon className="w-5 h-5 text-[#6B2D8B]" />
                    Evolução Diária
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={(() => {
                          const dailyData = {};
                          const currentStart = parseISO(startDate);
                          const currentEnd = parseISO(endDate);
                          
                          let currentDate = new Date(currentStart);
                          while (currentDate <= currentEnd) {
                            const dateKey = format(currentDate, 'yyyy-MM-dd');
                            dailyData[dateKey] = {
                              date: format(currentDate, 'dd/MM'),
                              interactions: 0,
                              offers: 0,
                              dealsWon: 0,
                            };
                            currentDate.setDate(currentDate.getDate() + 1);
                          }

                          rawInteractions.forEach(i => {
                            const dateKey = format(parseISO(i.created_date), 'yyyy-MM-dd');
                            if (dailyData[dateKey]) {
                              dailyData[dateKey].interactions++;
                            }
                          });

                          rawOffers.forEach(o => {
                            const dateKey = format(parseISO(o.created_date), 'yyyy-MM-dd');
                            if (dailyData[dateKey]) {
                              dailyData[dateKey].offers++;
                            }
                          });

                          rawDeals.filter(d => d.status === 'won').forEach(d => {
                            const dateKey = format(parseISO(d.closed_at), 'yyyy-MM-dd');
                            if (dailyData[dateKey]) {
                              dailyData[dateKey].dealsWon++;
                            }
                          });

                          return Object.values(dailyData);
                        })()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="interactions" stroke="#6B2D8B" name="Interações" />
                        <Line type="monotone" dataKey="offers" stroke="#C71585" name="Ofertas" />
                        <Line type="monotone" dataKey="dealsWon" stroke="#22C55E" name="Vendas Ganhas" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vendas Detalhadas</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToSheets(salesReport, 'Vendas Detalhadas')}
                disabled={exporting || salesLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Agente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesReport.map((sale) => (
                        <TableRow key={sale.deal_id}>
                          <TableCell className="font-medium">{sale.client_name}</TableCell>
                          <TableCell>{sale.product_name}</TableCell>
                          <TableCell>{sale.agent_name}</TableCell>
                          <TableCell>R$ {(sale.value || 0).toLocaleString('pt-BR')}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              sale.status === 'won' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {sale.status === 'won' ? 'Ganho' : 'Perdido'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {sale.closed_at && format(parseISO(sale.closed_at), 'dd/MM/yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {salesReport.length === 0 && (
                    <p className="text-center py-8 text-slate-500">Nenhuma venda no período</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Desempenho por Agente</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToSheets(agentReport, 'Desempenho por Agente')}
                disabled={exporting || agentsLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </CardHeader>
            <CardContent>
              {agentsLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agente</TableHead>
                        <TableHead>Interações</TableHead>
                        <TableHead>Ofertas</TableHead>
                        <TableHead>Vendas Ganhas</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Taxa de Conversão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentReport.map((agent) => (
                        <TableRow key={agent.agent_email}>
                          <TableCell className="font-medium">{agent.agent_name}</TableCell>
                          <TableCell>{agent.total_interactions}</TableCell>
                          <TableCell>{agent.total_offers}</TableCell>
                          <TableCell>{agent.total_deals_won}</TableCell>
                          <TableCell>R$ {agent.total_sales_value.toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{agent.offer_to_deal_conversion_rate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {agentReport.length === 0 && (
                    <p className="text-center py-8 text-slate-500">Nenhum dado de agente no período</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Desempenho por Produto</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToSheets(productReport, 'Desempenho por Produto')}
                disabled={exporting || productsLoading}
              >
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Exportando...' : 'Exportar'}
              </Button>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Ofertas</TableHead>
                        <TableHead>Vendas Ganhas</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Taxa de Conversão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productReport.map((product) => (
                        <TableRow key={product.product_id}>
                          <TableCell className="font-medium">{product.product_name}</TableCell>
                          <TableCell>{product.total_offers}</TableCell>
                          <TableCell>{product.total_deals_won}</TableCell>
                          <TableCell>R$ {product.total_sales_value.toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{product.offer_to_deal_conversion_rate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {productReport.length === 0 && (
                    <p className="text-center py-8 text-slate-500">Nenhum dado de produto no período</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attempts" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <PhoneMissed className="w-5 h-5 text-[#6B2D8B]" />
                Relatório de Tentativas de Interação
              </CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={attemptsAgent} onValueChange={setAttemptsAgent}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Filtrar por agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Agentes</SelectItem>
                    {agentOptions.map(a => (
                      <SelectItem key={a.email} value={a.email}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToSheets(
                    filteredAttempts.map(i => ({
                      'Cliente': i.client_name || '-',
                      'Tipo': typeLabels[i.type] || i.type,
                      'Canal': channelLabels[i.channel] || i.channel,
                      'Resultado': outcomeLabels[i.outcome] || i.outcome,
                      'Agente': i.agent_email,
                      'Data': i.created_date ? format(parseISO(i.created_date), 'dd/MM/yyyy HH:mm') : '-',
                      'Observações': i.notes || '',
                    })),
                    'Tentativas de Interação'
                  )}
                  disabled={exporting || attemptsLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {attemptsLoading ? (
                <div className="text-center py-8">Carregando...</div>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4">
                        <p className="text-xs text-purple-600 font-medium">Total de Interações</p>
                        <p className="text-2xl font-bold text-purple-900">{filteredAttempts.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4">
                        <p className="text-xs text-blue-600 font-medium">Tentativas sem Sucesso</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {filteredAttempts.filter(i => ['tentativa_sem_sucesso','tentativa_feita','no_answer'].includes(i.outcome)).length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4">
                        <p className="text-xs text-green-600 font-medium">Contatos com Sucesso</p>
                        <p className="text-2xl font-bold text-green-900">
                          {filteredAttempts.filter(i => i.outcome === 'success').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                      <CardContent className="p-4">
                        <p className="text-xs text-orange-600 font-medium">Agendamentos</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {filteredAttempts.filter(i => i.outcome === 'scheduled' || i.outcome === 'indeciso_agendado' || i.outcome === 'followup_agendado').length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary by type */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Resumo por Tipo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {attemptsSummary.map(s => (
                        <div key={s.type} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-slate-600">{s.label}</span>
                          <span className="text-sm font-bold text-[#6B2D8B]">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detail table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Resultado</TableHead>
                          <TableHead>Agente</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAttempts.map((i) => (
                          <TableRow key={i.id}>
                            <TableCell className="font-medium">{i.client_name || '-'}</TableCell>
                            <TableCell>{typeLabels[i.type] || i.type}</TableCell>
                            <TableCell>{channelLabels[i.channel] || i.channel}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                i.outcome === 'success' ? 'bg-green-100 text-green-700' :
                                i.outcome === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                i.outcome === 'lost' || i.outcome === 'sem_interesse' ? 'bg-red-100 text-red-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {outcomeLabels[i.outcome] || i.outcome}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-500">{i.agent_email}</TableCell>
                            <TableCell className="text-sm text-slate-500">
                              {i.created_date ? format(parseISO(i.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredAttempts.length === 0 && (
                      <p className="text-center py-8 text-slate-500">Nenhuma interação no período</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}