import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { 
  FileText, Download, BarChart3, TrendingUp, Sparkles, Phone, Users, DollarSign
} from 'lucide-react';
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

export default function Reports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Fetch overview data
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

  // Fetch detailed sales
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

  // Fetch agent performance
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

  // Fetch product performance
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
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {overviewLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
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
      </Tabs>
    </div>
  );
}