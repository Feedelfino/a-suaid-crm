import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, parseISO } from 'date-fns';
import { 
  Users, Phone, Mail, Building2, ArrowRight, 
  MoreVertical, Eye, DollarSign, TrendingUp, Sparkles, Zap, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LeadScoreCard, { calculateLeadScore, getNextBestAction } from '@/components/pipeline/LeadScoreCard';

const FUNNEL_STAGES = [
  { id: 'lead', name: 'Lead', color: 'from-slate-400 to-slate-500' },
  { id: 'contato', name: 'Contato', color: 'from-blue-400 to-blue-500' },
  { id: 'qualificacao', name: 'Qualificação', color: 'from-cyan-400 to-cyan-500' },
  { id: 'proposta', name: 'Proposta', color: 'from-purple-400 to-purple-500' },
  { id: 'negociacao', name: 'Negociação', color: 'from-amber-400 to-amber-500' },
  { id: 'fechamento', name: 'Fechamento', color: 'from-green-400 to-green-500' },
  { id: 'perdido', name: 'Perdido', color: 'from-red-400 to-red-500' },
];

export default function SalesPipeline() {
  const queryClient = useQueryClient();
  const [showScores, setShowScores] = useState(true);
  const [user, setUser] = useState(null);
  const [userAccess, setUserAccess] = useState(null);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        // Buscar funções do usuário
        const accessRecords = await base44.entities.UserAccess.filter({ user_email: userData.email });
        if (accessRecords.length > 0) {
          setUserAccess(accessRecords[0]);
        }
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Verificar se pode editar o funil
  const canEditFunnel = user?.role === 'admin' || 
    userAccess?.roles?.includes('administrador') ||
    userAccess?.roles?.includes('gerente') ||
    userAccess?.roles?.includes('agente_comercial');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['pipeline-clients'],
    queryFn: () => base44.entities.Client.list('-updated_date'),
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ['pipeline-interactions'],
    queryFn: () => base44.entities.Interaction.list('-created_date', 500),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['pipeline-appointments'],
    queryFn: () => base44.entities.Appointment.list('-date', 200),
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['pipeline-campaigns'],
    queryFn: () => base44.entities.Campaign.filter({ status: 'ativa' }),
  });

  const updateClient = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['pipeline-clients']),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (!canEditFunnel) return; // Bloquear se não tiver permissão
    
    const clientId = result.draggableId;
    const newStage = result.destination.droppableId;
    
    updateClient.mutate({
      id: clientId,
      data: { 
        funnel_stage: newStage,
        funnel_updated_at: new Date().toISOString(),
      }
    });
  };

  const getClientsByStage = (stageId) => {
    return clients.filter(c => {
      const matchesStage = (c.funnel_stage || 'lead') === stageId;
      const matchesCampaign = selectedCampaigns.length === 0 || selectedCampaigns.includes(c.campaign_id);
      return matchesStage && matchesCampaign;
    });
  };

  const toggleCampaign = (campaignId) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const stageStats = FUNNEL_STAGES.map(stage => ({
    ...stage,
    count: getClientsByStage(stage.id).length,
  }));

  const totalValue = clients.reduce((sum, c) => {
    // Estimate value based on stage
    const stageMultipliers = {
      lead: 0.1,
      contato: 0.2,
      qualificacao: 0.3,
      proposta: 0.5,
      negociacao: 0.7,
      fechamento: 1,
      perdido: 0,
    };
    return sum + (1000 * (stageMultipliers[c.funnel_stage || 'lead'] || 0.1));
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#6B2D8B] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Funil de Vendas</h1>
          <p className="text-slate-500">
            {canEditFunnel 
              ? 'Arraste os clientes entre as etapas' 
              : 'Visualização do funil (sem permissão para editar)'}
          </p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          {/* Filtro por Campanha */}
          {campaigns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Campanhas
                  {selectedCampaigns.length > 0 && (
                    <Badge className="ml-1 bg-[#6B2D8B] text-white">{selectedCampaigns.length}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {campaigns.map(campaign => (
                  <DropdownMenuItem
                    key={campaign.id}
                    onClick={() => toggleCampaign(campaign.id)}
                    className="gap-2"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedCampaigns.includes(campaign.id) 
                        ? 'bg-[#6B2D8B] border-[#6B2D8B] text-white' 
                        : 'border-slate-300'
                    }`}>
                      {selectedCampaigns.includes(campaign.id) && '✓'}
                    </div>
                    {campaign.name}
                  </DropdownMenuItem>
                ))}
                {selectedCampaigns.length > 0 && (
                  <DropdownMenuItem onClick={() => setSelectedCampaigns([])} className="text-red-600">
                    Limpar filtros
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant={showScores ? "default" : "outline"}
            size="sm"
            onClick={() => setShowScores(!showScores)}
            className={showScores ? "bg-gradient-to-r from-[#6B2D8B] to-[#C71585]" : ""}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Lead Score AI
          </Button>
          <Card className="border-0 shadow-md px-4 py-2">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#6B2D8B]" />
              <div>
                <p className="text-xs text-slate-500">Total Clientes</p>
                <p className="font-bold text-slate-800">{clients.length}</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-md px-4 py-2">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-slate-500">Valor Potencial</p>
                <p className="font-bold text-slate-800">R$ {totalValue.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Funnel Stats */}
      <div className="grid grid-cols-7 gap-2">
        {stageStats.map((stage, index) => (
          <div key={stage.id} className="text-center">
            <div className={`h-2 rounded-full bg-gradient-to-r ${stage.color}`} />
            <p className="text-xs text-slate-500 mt-2">{stage.name}</p>
            <p className="text-lg font-bold text-slate-800">{stage.count}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {FUNNEL_STAGES.map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className={`h-1 rounded-t-xl bg-gradient-to-r ${stage.color}`} />
              <Card className="border-0 shadow-lg rounded-t-none min-h-[500px]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    {stage.name}
                    <Badge variant="secondary" className="ml-2">
                      {getClientsByStage(stage.id).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[400px] rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? 'bg-slate-100' : ''
                        }`}
                      >
                        {getClientsByStage(stage.id).map((client, index) => (
                          <Draggable key={client.id} draggableId={client.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-2 p-3 bg-white rounded-xl border shadow-sm hover:shadow-md transition-all ${
                                  snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white text-xs font-bold">
                                      {client.client_name?.charAt(0) || 'C'}
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm text-slate-800 line-clamp-1">
                                        {client.client_name}
                                      </p>
                                      {client.company_name && (
                                        <p className="text-xs text-slate-500 line-clamp-1">
                                          {client.company_name}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6">
                                        <MoreVertical className="w-3 h-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <Link to={createPageUrl(`ClientDetails?id=${client.id}`)}>
                                        <DropdownMenuItem>
                                          <Eye className="w-4 h-4 mr-2" />
                                          Ver Detalhes
                                        </DropdownMenuItem>
                                      </Link>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {client.phone && (
                                    <Badge variant="outline" className="text-xs py-0">
                                      <Phone className="w-2 h-2 mr-1" />
                                      {client.phone.slice(-4)}
                                    </Badge>
                                  )}
                                  {client.lead_source && (
                                    <Badge variant="secondary" className="text-xs py-0 capitalize">
                                      {client.lead_source.replace('_', ' ')}
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* AI Lead Score */}
                                {showScores && (() => {
                                  const scoreData = calculateLeadScore(client, interactions, appointments);
                                  const nextAction = getNextBestAction(client, interactions, appointments);
                                  return (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                      <LeadScoreCard 
                                        score={scoreData.score} 
                                        trend={scoreData.trend}
                                        nextAction={nextAction}
                                      />
                                    </div>
                                  );
                                })()}
                                
                                {client.funnel_updated_at && (
                                  <p className="text-xs text-slate-400 mt-2">
                                    Atualizado: {format(parseISO(client.funnel_updated_at), 'dd/MM HH:mm')}
                                  </p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}