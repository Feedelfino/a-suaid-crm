import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format, parseISO } from 'date-fns';
import { 
  Users, Phone, Mail, Building2, ArrowRight, 
  MoreVertical, Eye, DollarSign, TrendingUp, Sparkles, Zap, Filter, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LeadScoreCard, { calculateLeadScore, getNextBestAction } from '@/components/pipeline/LeadScoreCard';
import FunnelConfigEditor from '@/components/pipeline/FunnelConfigEditor';

const DEFAULT_STAGES = [
  { id: 'lead', name: 'Lead', color: 'from-slate-400 to-slate-500', active: true },
  { id: 'contato', name: 'Contato', color: 'from-blue-400 to-blue-500', active: true },
  { id: 'qualificacao', name: 'Qualificação', color: 'from-cyan-400 to-cyan-500', active: true },
  { id: 'proposta', name: 'Proposta', color: 'from-purple-400 to-purple-500', active: true },
  { id: 'negociacao', name: 'Negociação', color: 'from-amber-400 to-amber-500', active: true },
  { id: 'fechamento', name: 'Fechamento', color: 'from-green-400 to-green-500', active: true },
  { id: 'perdido', name: 'Perdido', color: 'from-red-400 to-red-500', active: true },
];

export default function SalesPipeline() {
  const queryClient = useQueryClient();
  const [showScores, setShowScores] = useState(true);
  const [user, setUser] = useState(null);
  const [userAccess, setUserAccess] = useState(null);
  
  // Persistir seleção de campanha na sessão
  const [selectedCampaign, setSelectedCampaign] = useState(() => {
    return sessionStorage.getItem('selectedCampaign') || 'all';
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        const accessRecords = await base44.entities.UserAccess.filter({ user_email: userData.email });
        if (accessRecords.length > 0) {
          setUserAccess(accessRecords[0]);
        }
      } catch (e) {}
    };
    loadUser();
  }, []);

  const canEditFunnel = user?.role === 'admin' || 
      userAccess?.roles?.includes('administrador') ||
      userAccess?.roles?.includes('gerente') ||
      userAccess?.roles?.includes('agente_comercial');

    // Verificar se pode editar funil (via CampaignAccess ou permissão de role)
    const canEditFunnelViaAccess = React.useMemo(() => {
      if (!selectedCampaign || selectedCampaign === 'all') return canEditFunnel;
      const access = campaignAccesses.find(ca => 
        ca.campaign_id === selectedCampaign && 
        ca.user_email === user?.email
      );
      return access?.can_edit_funnel || canEditFunnel;
    }, [campaignAccesses, selectedCampaign, user, canEditFunnel]);

  const isAdmin = user?.role === 'admin' || userAccess?.roles?.includes('administrador');

  // Notificar e persistir mudança de campanha
  React.useEffect(() => {
    sessionStorage.setItem('selectedCampaign', selectedCampaign);
    
    // Notificar mudança de campanha (exceto no carregamento inicial)
    if (selectedCampaign && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      const leadCount = selectedCampaign === 'all' 
        ? clients.filter(c => !c.campaign_id || campaigns.map(camp => camp.id).includes(c.campaign_id)).length
        : clients.filter(c => c.campaign_id === selectedCampaign).length;
      
      if (selectedCampaign === 'all') {
        toast.success(
          `Visualizando todas as campanhas - ${leadCount} leads no funil`,
          { 
            icon: '🔍',
            duration: 3000,
            style: { background: '#6B2D8B', color: 'white' }
          }
        );
      } else if (campaign) {
        toast.success(
          `Campanha "${campaign.name}" selecionada - ${leadCount} leads`,
          { 
            icon: '🎯',
            duration: 3000,
            style: { background: '#6B2D8B', color: 'white' }
          }
        );
      }
    }
  }, [selectedCampaign]);

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

  // Buscar campanhas (RLS já filtra por permissão do usuário)
    const { data: allCampaigns = [] } = useQuery({
      queryKey: ['pipeline-campaigns'],
      queryFn: () => base44.entities.Campaign.list('-created_date'),
    });

    // Buscar acessos de campanha (visível para todos)
    const { data: campaignAccesses = [] } = useQuery({
      queryKey: ['campaign-accesses'],
      queryFn: () => base44.entities.CampaignAccess.list(),
    });

    // Verificar se o usuário tem acesso via CampaignAccess ou é admin
    const userCampaignIds = React.useMemo(() => {
      if (!user) return [];
      if (isAdmin) return allCampaigns.map(c => c.id);
      return campaignAccesses
        .filter(ca => ca.user_email === user.email)
        .map(ca => ca.campaign_id);
    }, [campaignAccesses, user, isAdmin, allCampaigns]);

    // Filtrar apenas campanhas ativas onde o usuário está atribuído
    const campaigns = React.useMemo(() => {
      if (!user) return [];

      const activeCampaigns = allCampaigns.filter(c => c.status === 'ativa');

      // Admin vê todas
      if (isAdmin) return activeCampaigns;

      // Outros usuários veem via CampaignAccess, assigned ou manager
      return activeCampaigns.filter(c => 
        userCampaignIds.includes(c.id) ||
        c.assigned_agents?.includes(user.email) || 
        c.campaign_manager === user.email
      );
    }, [allCampaigns, user, isAdmin, userCampaignIds]);

  const { data: funnelConfigs = [] } = useQuery({
    queryKey: ['funnel-configs'],
    queryFn: () => base44.entities.FunnelConfig.list(),
  });

  // Obter etapas do funil baseado na campanha selecionada
  const getFunnelStages = () => {
    if (selectedCampaign === 'all') {
      const defaultConfig = funnelConfigs.find(c => !c.campaign_id);
      return (defaultConfig?.stages || DEFAULT_STAGES).filter(s => s.active);
    }
    const campaignConfig = funnelConfigs.find(c => c.campaign_id === selectedCampaign);
    if (campaignConfig) {
      return campaignConfig.stages.filter(s => s.active);
    }
    const defaultConfig = funnelConfigs.find(c => !c.campaign_id);
    return (defaultConfig?.stages || DEFAULT_STAGES).filter(s => s.active);
  };

  const FUNNEL_STAGES = getFunnelStages();

  const updateClient = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['pipeline-clients']),
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (!canEditFunnelViaAccess) return;
    
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
      
      // Se "Todas as Campanhas"
      if (selectedCampaign === 'all') {
        // Mostrar clientes sem campanha OU de campanhas que o usuário tem acesso
        if (!c.campaign_id) return matchesStage;
        
        const campaignIds = campaigns.map(camp => camp.id);
        return matchesStage && campaignIds.includes(c.campaign_id);
      }
      
      // Se campanha específica selecionada
      const matchesCampaign = c.campaign_id === selectedCampaign;
      return matchesStage && matchesCampaign;
    });
  };

  const stageStats = FUNNEL_STAGES.map(stage => ({
    ...stage,
    count: getClientsByStage(stage.id).length,
  }));

  const filteredClients = React.useMemo(() => {
    if (selectedCampaign === 'all') {
      // Mostrar clientes sem campanha OU de campanhas acessíveis
      const campaignIds = campaigns.map(c => c.id);
      return clients.filter(c => !c.campaign_id || campaignIds.includes(c.campaign_id));
    }
    return clients.filter(c => c.campaign_id === selectedCampaign);
  }, [clients, selectedCampaign, campaigns]);

  const totalValue = filteredClients.reduce((sum, c) => {
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
            {canEditFunnelViaAccess 
              ? 'Arraste os clientes entre as etapas' 
              : 'Visualização do funil (sem permissão para editar)'}
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          {/* Filtro por Campanha */}
          <div className="relative">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-56 bg-white border-2 border-slate-200 hover:border-[#6B2D8B] transition-colors">
                <SelectValue placeholder="Selecione uma campanha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="font-medium">Todas as Campanhas</span>
                  </div>
                </SelectItem>
                {campaigns.length > 0 && <DropdownMenuSeparator />}
                {campaigns.map(campaign => {
                  const campaignLeads = clients.filter(c => c.campaign_id === campaign.id).length;
                  return (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex items-center justify-between gap-3 w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{campaign.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {campaignLeads}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
                {campaigns.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-slate-500">
                    Nenhuma campanha ativa disponível
                    <p className="text-xs text-slate-400 mt-1">Peça ao admin para atribuí-lo</p>
                  </div>
                )}
              </SelectContent>
            </Select>
            {campaigns.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                {campaigns.length}
              </div>
            )}
          </div>

          {/* Configuração de Etapas (apenas admin) */}
          {isAdmin && (
            <FunnelConfigEditor
              campaigns={campaigns}
              funnelConfigs={funnelConfigs}
              selectedCampaign={selectedCampaign}
              onConfigChange={() => queryClient.invalidateQueries(['funnel-configs'])}
            />
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
        </div>
      </div>

      {/* Debug Info - Campanhas Disponíveis */}
      {campaigns.length === 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                ⚠️
              </div>
              <div>
                <p className="font-semibold text-amber-900 mb-1">Nenhuma campanha ativa disponível</p>
                <p className="text-sm text-amber-800">
                  Para ver leads no funil, você precisa estar atribuído a uma campanha ativa. 
                  Peça ao administrador para designar você a uma campanha.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="flex gap-4 flex-wrap">
        <Card className="border-0 shadow-md px-4 py-2">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-[#6B2D8B]" />
            <div>
              <p className="text-xs text-slate-500">Clientes no Funil</p>
              <p className="font-bold text-slate-800">{filteredClients.length}</p>
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
        {selectedCampaign !== 'all' && campaigns.find(c => c.id === selectedCampaign) && (
          <Card className="border-0 shadow-md px-4 py-2 bg-[#6B2D8B]/5">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-[#6B2D8B]" />
              <div>
                <p className="text-xs text-slate-500">Campanha Filtrada</p>
                <p className="font-bold text-[#6B2D8B]">
                  {campaigns.find(c => c.id === selectedCampaign)?.name}
                </p>
              </div>
            </div>
          </Card>
        )}
        <Card className="border-0 shadow-md px-4 py-2">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-slate-500">Campanhas Ativas</p>
              <p className="font-bold text-slate-800">{campaigns.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Funnel Stats */}
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${FUNNEL_STAGES.length}, 1fr)` }}>
        {stageStats.map((stage) => (
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