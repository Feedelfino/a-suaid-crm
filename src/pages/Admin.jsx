import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  Settings, Users, Package, Target, Plus, Edit, Trash2, 
  Shield, CheckCircle, XCircle, UserCog, Save
} from 'lucide-react';
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

export default function Admin() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');
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
        <TabsList className="bg-white shadow-sm border">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Agentes
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

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#6B2D8B]" />
                Usuários do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={user.role === 'admin' ? 
                          'bg-purple-100 text-purple-700' : 
                          'bg-blue-100 text-blue-700'
                        }>
                          {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">
                          Ativo
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users.length === 0 && (
                <p className="text-center py-8 text-slate-500">Nenhum usuário cadastrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-[#6B2D8B]" />
                Configurar Nomes dos Agentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isAdmin ? (
                <div className="text-center py-8">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-500">Apenas administradores podem alterar os nomes dos agentes.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {['agent_1', 'agent_2', 'agent_3', 'agent_4'].map((key, index) => (
                    <div key={key} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B2D8B] to-[#8B4DAB] flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-slate-500 uppercase">Agente {index + 1}</Label>
                        <Input
                          value={agentNames[key]}
                          onChange={(e) => setAgentNames({ ...agentNames, [key]: e.target.value })}
                          placeholder={`Nome do Agente ${index + 1}`}
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={async () => {
                          setSavingAgent(key);
                          await saveAgentConfig.mutateAsync({ key, name: agentNames[key] });
                          setSavingAgent(null);
                        }}
                        disabled={savingAgent === key}
                        className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
                      >
                        {savingAgent === key ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                  <p className="text-sm text-slate-500 mt-4">
                    Os nomes configurados aqui serão usados em toda a aplicação (agenda, tarefas, relatórios, etc).
                  </p>
                </div>
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