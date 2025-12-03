import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, Download, Filter, Calendar, Users, 
  DollarSign, BarChart3, TrendingUp, Sparkles
} from 'lucide-react';
import { useUserDisplayName } from '@/components/hooks/useUserDisplayName';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SalesCharts from '@/components/reports/SalesCharts';
import AIInsights from '@/components/reports/AIInsights';

export default function Reports() {
  const [reportType, setReportType] = useState('overview');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [agentFilter, setAgentFilter] = useState('all');
  const { getDisplayName, accessRecords } = useUserDisplayName();
  
  const approvedUsers = accessRecords.filter(r => r.status === 'approved');

  const { data: interactions = [] } = useQuery({
    queryKey: ['report-interactions'],
    queryFn: () => base44.entities.Interaction.list('-created_date', 1000),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['report-clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['report-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 500),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['report-campaigns'],
    queryFn: () => base44.entities.Campaign.list(),
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['report-goals'],
    queryFn: () => base44.entities.Goal.list(),
  });

  const filterByDate = (items, dateField) => {
    return items.filter(item => {
      if (!item[dateField]) return false;
      const date = parseISO(item[dateField]);
      return isWithinInterval(date, { 
        start: parseISO(startDate), 
        end: parseISO(endDate) 
      });
    });
  };

  const filteredInteractions = filterByDate(interactions, 'created_date');
  const filteredAppointments = filterByDate(appointments, 'date');

  const salesData = filteredInteractions.filter(i => 
    i.tabulation === 'venda_feita' || i.interaction_type === 'venda_fechada'
  );

  const agentData = approvedUsers.map(userAccess => {
    const agentName = userAccess.nickname || userAccess.user_name;
    const agentEmail = userAccess.user_email;
    const agentInteractions = filteredInteractions.filter(i => 
      i.agent_email === agentEmail || i.agent_name === agentName || i.created_by === agentEmail
    );
    const agentSales = agentInteractions.filter(i => i.tabulation === 'venda_feita');
    const agentAppointments = filteredAppointments.filter(a => 
      a.agent_email === agentEmail || a.agent === agentName
    );
    
    return {
      agent: agentName,
      email: agentEmail,
      totalInteractions: agentInteractions.length,
      sales: agentSales.length,
      salesValue: agentSales.reduce((sum, s) => sum + (s.sale_value || 0), 0),
      appointments: agentAppointments.length,
      completedAppointments: agentAppointments.filter(a => a.status === 'concluida').length,
      conversionRate: agentInteractions.length > 0 ? 
        ((agentSales.length / agentInteractions.length) * 100).toFixed(1) : 0,
    };
  });

  const productData = Object.entries(
    filteredInteractions.reduce((acc, i) => {
      if (i.product_offered) {
        if (!acc[i.product_offered]) {
          acc[i.product_offered] = { offered: 0, sold: 0, value: 0 };
        }
        acc[i.product_offered].offered++;
        if (i.tabulation === 'venda_feita') {
          acc[i.product_offered].sold++;
          acc[i.product_offered].value += i.sale_value || 0;
        }
      }
      return acc;
    }, {})
  ).map(([product, data]) => ({
    product: product.replace(/_/g, ' '),
    ...data,
    conversionRate: data.offered > 0 ? ((data.sold / data.offered) * 100).toFixed(1) : 0,
  }));

  const exportToCSV = (data, filename) => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const totalSales = salesData.reduce((sum, s) => sum + (s.sale_value || 0), 0);
  const periodLabel = `${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`;

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
            <div className="flex-1 space-y-2">
              <Label>Agente</Label>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Agentes</SelectItem>
                  {approvedUsers.map(u => (
                    <SelectItem key={u.user_email} value={u.user_email}>
                      {u.nickname || u.user_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList className="bg-white shadow-sm border flex-wrap">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Insights IA
          </TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="agents">Por Agente</TabsTrigger>
          <TabsTrigger value="products">Por Produto</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <SalesCharts 
            salesData={salesData}
            startDate={startDate}
            endDate={endDate}
            interactions={filteredInteractions}
          />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <AIInsights
            salesData={salesData}
            interactions={filteredInteractions}
            clients={clients}
            campaigns={campaigns}
            goals={goals}
            period={periodLabel}
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Relatório de Vendas</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(salesData.map(s => ({
                  Cliente: s.client_name,
                  Produto: s.product_offered,
                  Valor: s.sale_value,
                  Data: s.created_date,
                  Agente: s.agent_name,
                })), 'vendas')}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Agente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.client_name}</TableCell>
                      <TableCell className="capitalize">{sale.product_offered?.replace(/_/g, ' ')}</TableCell>
                      <TableCell>R$ {(sale.sale_value || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        {sale.created_date && format(parseISO(sale.created_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{getDisplayName(sale.agent_email, sale.agent_name)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {salesData.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhuma venda no período</p>
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
                onClick={() => exportToCSV(agentData, 'desempenho_agentes')}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agente</TableHead>
                    <TableHead>Interações</TableHead>
                    <TableHead>Vendas</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Agendamentos</TableHead>
                    <TableHead>Taxa Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentData.map((agent) => (
                    <TableRow key={agent.email}>
                      <TableCell className="font-medium">{agent.agent}</TableCell>
                      <TableCell>{agent.totalInteractions}</TableCell>
                      <TableCell>{agent.sales}</TableCell>
                      <TableCell>R$ {agent.salesValue.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{agent.completedAppointments}/{agent.appointments}</TableCell>
                      <TableCell>{agent.conversionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                onClick={() => exportToCSV(productData, 'desempenho_produtos')}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Oferecido</TableHead>
                    <TableHead>Vendido</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Taxa Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productData.map((product) => (
                    <TableRow key={product.product}>
                      <TableCell className="font-medium capitalize">{product.product}</TableCell>
                      <TableCell>{product.offered}</TableCell>
                      <TableCell>{product.sold}</TableCell>
                      <TableCell>R$ {product.value.toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{product.conversionRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {productData.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhum dado de produto no período</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Relatório de Campanhas</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportToCSV(campaigns.map(c => ({
                  Nome: c.name,
                  Status: c.status,
                  Meta: c.goal,
                  Alcancado: c.achieved_value,
                  Inicio: c.start_date,
                  Fim: c.end_date,
                })), 'campanhas')}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Meta</TableHead>
                    <TableHead>Alcançado</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Período</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell className="capitalize">{campaign.status}</TableCell>
                      <TableCell>R$ {(campaign.goal || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>R$ {(campaign.achieved_value || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        {campaign.goal ? ((campaign.achieved_value / campaign.goal) * 100).toFixed(1) : 0}%
                      </TableCell>
                      <TableCell>
                        {campaign.start_date && format(parseISO(campaign.start_date), 'dd/MM/yyyy')}
                        {campaign.end_date && ` - ${format(parseISO(campaign.end_date), 'dd/MM/yyyy')}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {campaigns.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhuma campanha cadastrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}