import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Settings, Users, Package, Target, Plus, Edit, Trash2, 
  Shield, CheckCircle, XCircle, UserCog, Save, AtSign
} from 'lucide-react';
import NicknameEditor from '@/components/admin/NicknameEditor';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export default function Admin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('access');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Access Requests
  const { data: accessRequests = [] } = useQuery({
    queryKey: ['access-requests'],
    queryFn: () => base44.entities.UserAccess.list('-created_date'),
  });

  const updateAccess = useMutation({
    mutationFn: ({ id, status }) => base44.entities.UserAccess.update(id, { 
      status,
      approved_by: user?.email,
      approved_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries(['access-requests']),
  });

  // Users
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Products
  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list(),
  });

  // Goals
  const { data: goals = [] } = useQuery({
    queryKey: ['admin-goals'],
    queryFn: () => base44.entities.Goal.list('-month'),
  });

  // Agent Configs
  const { data: agentConfigs = [] } = useQuery({
    queryKey: ['agent-configs'],
    queryFn: () => base44.entities.AgentConfig.list(),
  });

  const [agentNames, setAgentNames] = useState({
    agent_1: 'Agente 1',
    agent_2: 'Agente 2',
    agent_3: 'Agente 3',
    agent_4: 'Agente 4',
  });

  useEffect(() => {
    if (agentConfigs.length > 0) {
      const names = { ...agentNames };
      agentConfigs.forEach(config => {
        if (config.agent_key && config.display_name) {
          names[config.agent_key] = config.display_name;
        }
      });
      setAgentNames(names);
    }
  }, [agentConfigs]);

  const saveAgentConfig = useMutation({
    mutationFn: async ({ key, name }) => {
      const existing = agentConfigs.find(c => c.agent_key === key);
      if (existing) {
        return base44.entities.AgentConfig.update(existing.id, { display_name: name });
      } else {
        return base44.entities.AgentConfig.create({ agent_key: key, display_name: name, active: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['agent-configs']);
    },
  });

  const [savingAgent, setSavingAgent] = useState(null);
  const [approvingUser, setApprovingUser] = useState(null);
  const [editingUserRoles, setEditingUserRoles] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);

  const AVAILABLE_ROLES = [
    { value: 'administrador', label: 'Administrador', description: 'Acesso total ao sistema' },
    { value: 'gerente', label: 'Gerente', description: 'Gerencia equipes e relatórios' },
    { value: 'agente_registro', label: 'Agente de Registro', description: 'Emissão e renovação de certificados' },
    { value: 'agente_comercial', label: 'Agente Comercial', description: 'Vendas e relacionamento com clientes' },
  ];

  const updateUserRoles = useMutation({
    mutationFn: ({ id, roles }) => base44.entities.UserAccess.update(id, { roles }),
    onSuccess: () => {
      queryClient.invalidateQueries(['access-requests']);
      queryClient.invalidateQueries(['user-access-all']);
      setEditingUserRoles(null);
      setSelectedRoles([]);
    },
  });

  const [savingNickname, setSavingNickname] = useState(null);

  const updateNickname = useMutation({
    mutationFn: ({ id, nickname }) => base44.entities.UserAccess.update(id, { nickname }),
    onSuccess: () => {
      queryClient.invalidateQueries(['access-requests']);
      queryClient.invalidateQueries(['user-access-all']);
      setSavingNickname(null);
    },
  });

  const approveWithRoles = useMutation({
    mutationFn: ({ id, roles }) => base44.entities.UserAccess.update(id, { 
      status: 'approved',
      roles,
      approved_by: user?.email,
      approved_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['access-requests']);
      setApprovingUser(null);
      setSelectedRoles([]);
    },
  });

  // Product Form
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    code: '',
    category: 'certificado_digital',
    price: '',
    active: true,
  });

  const createProduct = useMutation({
    mutationFn: (data) => base44.entities.Product.create({
      ...data,
      price: parseFloat(data.price) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      setProductDialog(false);
      resetProductForm();
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, {
      ...data,
      price: parseFloat(data.price) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      setProductDialog(false);
      resetProductForm();
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-products']),
  });

  const resetProductForm = () => {
    setProductForm({
      name: '',
      code: '',
      category: 'certificado_digital',
      price: '',
      active: true,
    });
    setEditingProduct(null);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      code: product.code || '',
      category: product.category,
      price: product.price?.toString() || '',
      active: product.active !== false,
    });
    setProductDialog(true);
  };

  // Goal Form
  const [goalDialog, setGoalDialog] = useState(false);
  const [goalForm, setGoalForm] = useState({
    month: format(new Date(), 'yyyy-MM'),
    agent: '',
    goal_value: '',
    goal_quantity: '',
  });

  const createGoal = useMutation({
    mutationFn: (data) => base44.entities.Goal.create({
      ...data,
      goal_value: parseFloat(data.goal_value) || 0,
      goal_quantity: parseInt(data.goal_quantity) || 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-goals']);
      setGoalDialog(false);
      setGoalForm({
        month: format(new Date(), 'yyyy-MM'),
        agent: '',
        goal_value: '',
        goal_quantity: '',
      });
    },
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-goals']),
  });

  const categoryLabels = {
    certificado_digital: 'Certificado Digital',
    site: 'Site',
    crm: 'CRM',
    marketing: 'Marketing',
    outro: 'Outro',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administração</h1>
        <p className="text-slate-500">Configurações do sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white shadow-sm border flex-wrap">
          <TabsTrigger value="access" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Acessos e Funções
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Metas
          </TabsTrigger>
        </TabsList>

        {/* Access Tab */}
        <TabsContent value="access" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#6B2D8B]" />
                Gerenciar Acessos ao CRM
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="text-center py-8">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">Apenas administradores podem gerenciar acessos.</p>
                </div>
              ) : (
                <>
                  {/* Pending Requests */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                      Solicitações Pendentes ({accessRequests.filter(r => r.status === 'pending').length})
                    </h3>
                    {accessRequests.filter(r => r.status === 'pending').length === 0 ? (
                      <p className="text-slate-500 text-sm py-4">Nenhuma solicitação pendente.</p>
                    ) : (
                      <div className="space-y-3">
                        {accessRequests.filter(r => r.status === 'pending').map((request) => (
                          <div key={request.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Users className="w-6 h-6 text-amber-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{request.user_name || 'Usuário'}</p>
                                <p className="text-sm text-slate-500">{request.user_email}</p>
                                <p className="text-xs text-slate-400">Solicitado em: {request.created_date ? format(new Date(request.created_date), 'dd/MM/yyyy HH:mm') : '-'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => setApprovingUser(request)}
                                  className="bg-green-600 hover:bg-green-700"
                                  size="sm"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Aprovar
                                </Button>
                                <Button
                                  onClick={() => updateAccess.mutate({ id: request.id, status: 'rejected' })}
                                  variant="destructive"
                                  size="sm"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Rejeitar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Role Assignment Dialog */}
                  <Dialog open={!!approvingUser} onOpenChange={(open) => { if (!open) { setApprovingUser(null); setSelectedRoles([]); } }}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Definir Funções do Usuário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-medium">{approvingUser?.user_name}</p>
                          <p className="text-sm text-slate-500">{approvingUser?.user_email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium mb-3 block">Selecione pelo menos uma função:</Label>
                          <div className="space-y-3">
                            {AVAILABLE_ROLES.map(role => (
                              <label
                                key={role.value}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedRoles.includes(role.value) 
                                    ? 'bg-[#6B2D8B]/5 border-[#6B2D8B]' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <Checkbox
                                  checked={selectedRoles.includes(role.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRoles([...selectedRoles, role.value]);
                                    } else {
                                      setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                                    }
                                  }}
                                />
                                <div>
                                  <p className="font-medium text-slate-800">{role.label}</p>
                                  <p className="text-xs text-slate-500">{role.description}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => { setApprovingUser(null); setSelectedRoles([]); }}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => approveWithRoles.mutate({ id: approvingUser.id, roles: selectedRoles })}
                            disabled={selectedRoles.length === 0}
                            className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                          >
                            Aprovar com Funções
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Approved Users */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Usuários Aprovados ({accessRequests.filter(r => r.status === 'approved').length})
                    </h3>
                    <div className="space-y-4">
                      {accessRequests.filter(r => r.status === 'approved').map((request) => (
                        <div key={request.id} className="p-4 bg-slate-50 rounded-xl border">
                          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                            {/* Info do usuário */}
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold">
                                {request.user_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{request.user_name || 'Usuário'}</p>
                                <p className="text-xs text-slate-500">{request.user_email}</p>
                                {request.nickname && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    <AtSign className="w-3 h-3 mr-1" />
                                    {request.nickname}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Nickname Editor */}
                            <div className="flex-1 min-w-[250px]">
                              <NicknameEditor
                                userAccess={request}
                                onSave={(id, nickname) => {
                                  setSavingNickname(id);
                                  updateNickname.mutate({ id, nickname });
                                }}
                                isSaving={savingNickname === request.id}
                              />
                            </div>

                            {/* Funções */}
                            <div className="min-w-[150px]">
                              <Label className="text-xs text-slate-500">Funções</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(request.roles || []).map(role => (
                                  <Badge key={role} variant="outline" className="text-xs">
                                    {AVAILABLE_ROLES.find(r => r.value === role)?.label || role}
                                  </Badge>
                                ))}
                                {(!request.roles || request.roles.length === 0) && (
                                  <span className="text-slate-400 text-xs">Sem função</span>
                                )}
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setEditingUserRoles(request);
                                  setSelectedRoles(request.roles || []);
                                }}
                                variant="outline"
                                size="sm"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Funções
                              </Button>
                              <Button
                                onClick={() => updateAccess.mutate({ id: request.id, status: 'rejected' })}
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                              >
                                Revogar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Edit Roles Dialog */}
                  <Dialog open={!!editingUserRoles} onOpenChange={(open) => { if (!open) { setEditingUserRoles(null); setSelectedRoles([]); } }}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Funções do Usuário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="font-medium">{editingUserRoles?.user_name}</p>
                          <p className="text-sm text-slate-500">{editingUserRoles?.user_email}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium mb-3 block">Funções do usuário:</Label>
                          <div className="space-y-3">
                            {AVAILABLE_ROLES.map(role => (
                              <label
                                key={role.value}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedRoles.includes(role.value) 
                                    ? 'bg-[#6B2D8B]/5 border-[#6B2D8B]' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <Checkbox
                                  checked={selectedRoles.includes(role.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedRoles([...selectedRoles, role.value]);
                                    } else {
                                      setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                                    }
                                  }}
                                />
                                <div>
                                  <p className="font-medium text-slate-800">{role.label}</p>
                                  <p className="text-xs text-slate-500">{role.description}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                          <Button variant="outline" onClick={() => { setEditingUserRoles(null); setSelectedRoles([]); }}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => updateUserRoles.mutate({ id: editingUserRoles.id, roles: selectedRoles })}
                            disabled={selectedRoles.length === 0}
                            className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                          >
                            Salvar Funções
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Rejected Users */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Acessos Negados ({accessRequests.filter(r => r.status === 'rejected').length})
                    </h3>
                    {accessRequests.filter(r => r.status === 'rejected').length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accessRequests.filter(r => r.status === 'rejected').map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">{request.user_name || '-'}</TableCell>
                              <TableCell>{request.user_email}</TableCell>
                              <TableCell>
                                <Button
                                  onClick={() => updateAccess.mutate({ id: request.id, status: 'approved' })}
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600"
                                >
                                  Aprovar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>



        {/* Products Tab */}
        <TabsContent value="products" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#6B2D8B]" />
                Produtos
              </CardTitle>
              <Dialog open={productDialog} onOpenChange={(open) => { setProductDialog(open); if (!open) resetProductForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome do Produto *</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input
                        value={productForm.code}
                        onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select 
                        value={productForm.category} 
                        onValueChange={(v) => setProductForm({ ...productForm, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="certificado_digital">Certificado Digital</SelectItem>
                          <SelectItem value="site">Site</SelectItem>
                          <SelectItem value="crm">CRM</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={productForm.active}
                        onCheckedChange={(v) => setProductForm({ ...productForm, active: v })}
                      />
                      <Label>Produto Ativo</Label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setProductDialog(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => {
                          if (editingProduct) {
                            updateProduct.mutate({ id: editingProduct.id, data: productForm });
                          } else {
                            createProduct.mutate(productForm);
                          }
                        }}
                        className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.code || '-'}</TableCell>
                      <TableCell>{categoryLabels[product.category] || product.category}</TableCell>
                      <TableCell>R$ {(product.price || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        {product.active !== false ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" /> Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" /> Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteProduct.mutate(product.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {products.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhum produto cadastrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#6B2D8B]" />
                Metas
              </CardTitle>
              <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Meta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Meta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mês *</Label>
                      <Input
                        type="month"
                        value={goalForm.month}
                        onChange={(e) => setGoalForm({ ...goalForm, month: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agente (deixe vazio para meta da empresa)</Label>
                      <Select 
                        value={goalForm.agent} 
                        onValueChange={(v) => setGoalForm({ ...goalForm, agent: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Meta da Empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Meta da Empresa</SelectItem>
                          {['agent_1', 'agent_2', 'agent_3', 'agent_4'].map((key) => (
                            <SelectItem key={key} value={agentNames[key]}>{agentNames[key]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Meta em Valor (R$) *</Label>
                      <Input
                        type="number"
                        value={goalForm.goal_value}
                        onChange={(e) => setGoalForm({ ...goalForm, goal_value: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta em Quantidade</Label>
                      <Input
                        type="number"
                        value={goalForm.goal_quantity}
                        onChange={(e) => setGoalForm({ ...goalForm, goal_quantity: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setGoalDialog(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={() => createGoal.mutate(goalForm)}
                        className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                      >
                        Criar Meta
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Meta (R$)</TableHead>
                    <TableHead>Meta (Qtd)</TableHead>
                    <TableHead>Alcançado</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">{goal.month}</TableCell>
                      <TableCell>{goal.agent || 'Empresa'}</TableCell>
                      <TableCell>R$ {(goal.goal_value || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{goal.goal_quantity || '-'}</TableCell>
                      <TableCell>R$ {(goal.achieved_value || 0).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => deleteGoal.mutate(goal.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {goals.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhuma meta cadastrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}