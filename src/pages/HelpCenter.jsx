import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen, Search, ChevronRight, HelpCircle, FileText,
  MessageSquare, Home, Users, GitBranch, BarChart3, Target,
  Phone, Calendar, StickyNote, Settings, ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const CATEGORIES = [
  { id: 'introducao', name: 'Introdução', icon: Home, color: 'from-blue-500 to-blue-600' },
  { id: 'modulos', name: 'Módulos', icon: FileText, color: 'from-purple-500 to-purple-600' },
  { id: 'faq', name: 'FAQ', icon: HelpCircle, color: 'from-amber-500 to-amber-600' },
  { id: 'tutoriais', name: 'Tutoriais', icon: BookOpen, color: 'from-green-500 to-green-600' },
];

const SUBCATEGORIES = {
  modulos: [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'interacoes', name: 'Interações', icon: Phone },
    { id: 'clientes', name: 'Clientes', icon: Users },
    { id: 'funil', name: 'Funil de Vendas', icon: GitBranch },
    { id: 'agenda', name: 'Agenda', icon: Calendar },
    { id: 'campanhas', name: 'Campanhas', icon: Target },
    { id: 'notas', name: 'Notas', icon: StickyNote },
    { id: 'admin', name: 'Administração', icon: Settings },
  ],
  faq: [
    { id: 'financeiro', name: 'Financeiro' },
    { id: 'cadastro', name: 'Cadastro' },
    { id: 'funil', name: 'Funil' },
    { id: 'relatorios', name: 'Relatórios' },
    { id: 'campanhas', name: 'Campanhas' },
    { id: 'interacoes', name: 'Interações' },
    { id: 'metas', name: 'Metas' },
  ],
};

const DEFAULT_ARTICLES = [
  // Introdução
  {
    category: 'introducao',
    title: 'Bem-vindo ao CRM A SUA.ID',
    content: `# Bem-vindo ao CRM A SUA.ID

O CRM A SUA.ID foi desenvolvido para otimizar sua gestão comercial e de relacionamento com clientes.

## Objetivo do Sistema

- Centralizar informações de clientes e leads
- Automatizar processos de vendas
- Acompanhar metas e desempenho
- Facilitar a comunicação entre equipes

## Painéis Principais

### 🏠 Home
Visão geral das suas atividades do dia, incluindo tarefas pendentes, reuniões agendadas e progresso de metas.

### 📞 Interações
Registre e acompanhe todas as interações com clientes - ligações, e-mails, WhatsApp, reuniões.

### 👥 Clientes
Base completa de clientes e leads com todas as informações relevantes.

### 📊 Dashboard
Métricas e gráficos para análise de desempenho.

## Filosofia Operacional

Nosso CRM é baseado em três pilares:
1. **Simplicidade** - Interface intuitiva e fácil de usar
2. **Produtividade** - Automatização de tarefas repetitivas
3. **Colaboração** - Comunicação integrada entre equipes`,
    order: 1,
    tags: ['inicio', 'introducao', 'objetivo']
  },
  // FAQ
  {
    category: 'faq',
    subcategory: 'financeiro',
    title: 'Como registrar despesas?',
    content: `# Como registrar despesas?

Atualmente o CRM foca em gestão comercial. Para registro de despesas, recomendamos:

1. Utilizar a área de **Campanhas** para vincular custos de marketing
2. Registrar observações financeiras nas notas do cliente
3. Usar a integração com sistemas financeiros externos

> 💡 **Dica**: Você pode adicionar campos personalizados para controle financeiro básico.`,
    order: 1,
    tags: ['despesa', 'financeiro', 'custo']
  },
  {
    category: 'faq',
    subcategory: 'funil',
    title: 'Como funciona o Funil de Vendas?',
    content: `# Funil de Vendas

O Funil de Vendas permite visualizar e gerenciar a jornada de cada cliente.

## Etapas do Funil

1. **Lead** - Primeiro contato registrado
2. **Contato** - Comunicação estabelecida
3. **Qualificação** - Necessidades identificadas
4. **Proposta** - Oferta enviada
5. **Negociação** - Discussão de termos
6. **Fechamento** - Venda concluída

## Como usar

- **Arrastar e soltar**: Mova clientes entre etapas
- **Lead Score IA**: Ative para ver pontuação automática
- **Filtros**: Use filtros por campanha ou agente

## Dicas

- Mantenha o funil atualizado
- Use interações para registrar cada avanço
- Acompanhe o Lead Score para priorizar`,
    order: 2,
    tags: ['funil', 'pipeline', 'vendas', 'etapas']
  },
  {
    category: 'faq',
    subcategory: 'interacoes',
    title: 'Tipos de interações disponíveis',
    content: `# Tipos de Interações

## Tentativas
- **Tentativa por E-mail** - E-mail sem resposta
- **Tentativa por Telefone** - Ligação não atendida
- **Tentativa por WhatsApp** - Mensagem enviada

## Contatos
- **Contato com Sucesso** - Comunicação efetiva
- **Follow-up Agendado** - Retorno marcado
- **Cliente Indeciso** - Aguardando decisão

## Resultados
- **Venda Fechada** - Negócio concluído
- **Parceria** - Acordo de parceria
- **Sem Interesse** - Cliente recusou`,
    order: 1,
    tags: ['interacao', 'contato', 'ligacao', 'email', 'whatsapp']
  },
  {
    category: 'faq',
    subcategory: 'metas',
    title: 'Como funcionam as metas?',
    content: `# Sistema de Metas

O CRM suporta metas em três níveis:

## Metas Anuais
- Definida para todo o ano
- Valor total a ser alcançado

## Metas Trimestrais
- Dividida em 4 trimestres
- Soma deve compor a meta anual

## Metas Mensais
- Metas específicas por mês
- Acompanhamento mais detalhado

## Tipos de Meta
- **Empresa**: Meta geral da organização
- **Agente**: Meta individual por vendedor

## Acompanhamento
O Dashboard mostra:
- Progresso em tempo real
- Comparativo com período anterior
- Projeção de atingimento`,
    order: 1,
    tags: ['meta', 'objetivo', 'vendas', 'desempenho']
  },
  // Tutoriais
  {
    category: 'tutoriais',
    title: 'Registrando sua primeira interação',
    content: `# Registrando sua Primeira Interação

## Passo a Passo

### 1. Acesse Interações
Clique em **Interações** no menu lateral.

### 2. Busque o Cliente
Use a barra de busca para encontrar o cliente por:
- Nome
- CPF/CNPJ
- Telefone
- E-mail

### 3. Selecione o Cliente
Clique no cliente desejado para abrir os detalhes.

### 4. Nova Interação
Clique em **+ Nova Interação** e preencha:
- Tipo de interação
- Forma de contato
- Produto oferecido
- Tabulação
- Observações

### 5. Salve
Clique em **Registrar** para salvar.

> 💡 A interação movimentará automaticamente o cliente no funil!`,
    order: 1,
    tags: ['tutorial', 'interacao', 'primeiro', 'basico']
  },
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('introducao');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  const { data: articles = [] } = useQuery({
    queryKey: ['help-articles'],
    queryFn: () => base44.entities.HelpArticle.filter({ published: true }, 'order'),
  });

  // Combinar artigos do banco com os padrão
  const allArticles = [...DEFAULT_ARTICLES, ...articles];

  // Filtrar artigos
  const filteredArticles = allArticles.filter(article => {
    const matchesSearch = !searchTerm || 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = article.category === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || article.subcategory === selectedSubcategory;
    
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const handleArticleClick = (article) => {
    setSelectedArticle(article);
  };

  const handleBack = () => {
    setSelectedArticle(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B2D8B] via-[#8B4DAB] to-[#C71585] rounded-3xl p-8 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Central de Ajuda</h1>
            <p className="text-white/80">Manual do Usuário CRM</p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-white border-0 text-slate-800 rounded-xl"
          />
        </div>
      </div>

      {selectedArticle ? (
        /* Article View */
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <Badge className="mb-2 bg-[#6B2D8B]/10 text-[#6B2D8B]">
                  {CATEGORIES.find(c => c.id === selectedArticle.category)?.name}
                </Badge>
                <CardTitle className="text-xl">{selectedArticle.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
            </div>
            
            {selectedArticle.tags && (
              <div className="flex flex-wrap gap-2 mt-8 pt-4 border-t">
                {selectedArticle.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Categorias</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="space-y-1">
                  {CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => { setSelectedCategory(category.id); setSelectedSubcategory(null); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                        selectedCategory === category.id
                          ? 'bg-gradient-to-r from-[#6B2D8B]/10 to-[#C71585]/10 text-[#6B2D8B]'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                        <category.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-medium text-sm">{category.name}</span>
                    </button>
                  ))}
                </div>

                {/* Subcategories */}
                {SUBCATEGORIES[selectedCategory] && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-slate-500 mb-2 px-3">Subcategorias</p>
                    <div className="space-y-1">
                      {SUBCATEGORIES[selectedCategory].map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubcategory(selectedSubcategory === sub.id ? null : sub.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedSubcategory === sub.id
                              ? 'bg-[#6B2D8B]/10 text-[#6B2D8B]'
                              : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {sub.icon && <sub.icon className="w-4 h-4" />}
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Articles */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {CATEGORIES.find(c => c.id === selectedCategory)?.name}
                  {selectedSubcategory && (
                    <>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">
                        {SUBCATEGORIES[selectedCategory]?.find(s => s.id === selectedSubcategory)?.name}
                      </span>
                    </>
                  )}
                  <Badge variant="secondary" className="ml-auto">
                    {filteredArticles.length} artigo(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredArticles.length === 0 ? (
                  <div className="text-center py-12">
                    <HelpCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500">Nenhum artigo encontrado</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Tente buscar por outras palavras-chave
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredArticles.map((article, index) => (
                      <button
                        key={index}
                        onClick={() => handleArticleClick(article)}
                        className="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-slate-800 group-hover:text-[#6B2D8B] transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                              {article.content.replace(/[#*`]/g, '').slice(0, 150)}...
                            </p>
                            {article.tags && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {article.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#6B2D8B] shrink-0 ml-4" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}