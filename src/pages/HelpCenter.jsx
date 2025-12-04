import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { 
  BookOpen, Search, ChevronRight, HelpCircle, FileText,
  MessageSquare, Home, Users, GitBranch, BarChart3, Target,
  Phone, Calendar, StickyNote, Settings, ArrowLeft, Pencil, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HelpArticleEditor from '@/components/help/HelpArticleEditor';

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
    { id: 'importacao', name: 'Importação de Dados', icon: FileText },
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
    { id: 'importacao', name: 'Importação' },
  ],
};

const DEFAULT_ARTICLES = [
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
Métricas e gráficos para análise de desempenho.`,
    order: 1,
    tags: ['inicio', 'introducao', 'objetivo']
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
- **Filtros**: Use filtros por campanha

## Personalização

Administradores podem:
- Renomear etapas
- Ativar/desativar etapas
- Criar etapas personalizadas por campanha`,
    order: 2,
    tags: ['funil', 'pipeline', 'vendas', 'etapas']
  },
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
  {
    category: 'modulos',
    subcategory: 'importacao',
    title: 'Importação de Dados - Formatos e Requisitos',
    content: `# Importação de Dados

O módulo de Banco de Dados permite importar planilhas de clientes e certificados digitais.

## Formatos Suportados

| Formato | Extensão | Tamanho Máx. | Observações |
|---------|----------|--------------|-------------|
| Excel | .xlsx | 10MB | Versões modernas (2007+) |
| Excel Antigo | .xls | 10MB | Excel 97-2003 |
| CSV | .csv | 5MB | Separador: vírgula (,) ou ponto-e-vírgula (;) |
| PDF | .pdf | 15MB | Tabelas bem formatadas |

## Estrutura do Arquivo

A **primeira linha** deve conter os cabeçalhos das colunas. As colunas aceitas são:

### Colunas Obrigatórias
- **NOME** - Nome completo do titular

### Colunas Opcionais
- **PRODUTO** - Tipo de certificado (ex: e-CPF A3 36 MESES)
- **CNPJ** - CNPJ da empresa (apenas números ou formatado)
- **CPF** - CPF do titular (apenas números ou formatado)
- **TELEFONE** - Número de contato
- **EMAIL** - E-mail do cliente
- **DT_EMIS** - Data de emissão (para renovações)
- **DT_FIM** - Data de vencimento (para renovações)

> ⚠️ As colunas podem estar em **qualquer ordem**.

## Exemplo de Arquivo CSV

\`\`\`
PRODUTO;CNPJ;CPF;NOME;TELEFONE;EMAIL;DT_EMIS;DT_FIM
e-CPF A3 36 MESES;;12345678901;MARIA DA SILVA;11999998888;maria@email.com;01/01/2024;01/01/2027
e-CNPJ A3 36 MESES;12345678000199;98765432100;JOAO SANTOS;11988887777;joao@empresa.com;15/06/2024;15/06/2027
\`\`\`

## Baixar Modelo

Na tela de importação, clique em **"Baixar Modelo CSV"** para obter um arquivo de exemplo pronto para preencher.

## Detecção de Duplicados

O sistema verifica automaticamente:
1. **Duplicados na planilha** - Linhas repetidas no mesmo arquivo
2. **Duplicados no sistema** - Dados que já existem no CRM

A verificação é feita por:
- CPF
- CNPJ
- E-mail
- Telefone

## Formatos de Data Aceitos

- DD/MM/AAAA (ex: 01/01/2024)
- AAAA-MM-DD (ex: 2024-01-01)

## Dicas Importantes

✅ Certifique-se que a primeira linha contém os cabeçalhos
✅ Use UTF-8 como codificação para caracteres especiais
✅ Para CSV, o separador pode ser vírgula ou ponto-e-vírgula
✅ Remova linhas em branco antes de importar
✅ Verifique os alertas de duplicados antes de confirmar`,
    order: 5,
    tags: ['importacao', 'planilha', 'excel', 'csv', 'pdf', 'upload', 'dados', 'certificados']
  },
  {
    category: 'faq',
    subcategory: 'importacao',
    title: 'Erros comuns na importação de dados',
    content: `# Erros Comuns na Importação

## Arquivo muito grande
**Erro:** "Arquivo muito grande"
**Solução:** O tamanho máximo é 15MB. Divida o arquivo em partes menores.

## Formato não suportado
**Erro:** "Formato não suportado"
**Solução:** Use apenas: .xlsx, .xls, .csv ou .pdf

## Colunas não reconhecidas
**Erro:** Dados não são mapeados corretamente
**Solução:** Verifique se a primeira linha contém os nomes das colunas exatamente como esperado (PRODUTO, CNPJ, CPF, NOME, TELEFONE, EMAIL, DT_EMIS, DT_FIM).

## Codificação de caracteres
**Erro:** Caracteres estranhos no nome (ex: Ã©)
**Solução:** Salve o CSV com codificação UTF-8.

## Duplicados detectados
**Aviso:** "X registros já existem no sistema"
**Solução:** Revise os registros marcados em laranja e remova-os antes de importar, ou prossiga se quiser criar duplicados.

## PDF não reconhecido
**Erro:** Dados não extraídos do PDF
**Solução:** O PDF deve ter uma tabela clara e bem formatada. PDFs escaneados ou com layout complexo podem não funcionar. Prefira Excel ou CSV.`,
    order: 10,
    tags: ['erro', 'importacao', 'problema', 'solucao', 'faq']
  },
];

export default function HelpCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('introducao');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [editingArticle, setEditingArticle] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === 'admin');
      } catch (e) {}
    };
    checkAdmin();
  }, []);

  const { data: articles = [] } = useQuery({
    queryKey: ['help-articles'],
    queryFn: () => base44.entities.HelpArticle.filter({ published: true }, 'order'),
  });

  const { data: allArticles = [] } = useQuery({
    queryKey: ['help-articles-admin'],
    queryFn: () => base44.entities.HelpArticle.list('order'),
    enabled: isAdmin,
  });

  // Combinar artigos do banco com os padrão
  const displayArticles = isAdmin ? [...DEFAULT_ARTICLES, ...allArticles] : [...DEFAULT_ARTICLES, ...articles];

  // Filtrar artigos
  const filteredArticles = displayArticles.filter(article => {
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

  const handleEdit = (article) => {
    setEditingArticle(article);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6B2D8B] via-[#8B4DAB] to-[#C71585] rounded-3xl p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Central de Ajuda</h1>
              <p className="text-white/80">Manual do Usuário e Tutoriais</p>
            </div>
          </div>
          {isAdmin && (
            <HelpArticleEditor onSaved={() => setEditingArticle(null)} />
          )}
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

      {/* Editing Modal */}
      {editingArticle && (
        <HelpArticleEditor 
          article={editingArticle} 
          onClose={() => setEditingArticle(null)}
          onSaved={() => setEditingArticle(null)}
        />
      )}

      {selectedArticle ? (
        /* Article View */
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-[#6B2D8B]/10 text-[#6B2D8B]">
                      {CATEGORIES.find(c => c.id === selectedArticle.category)?.name}
                    </Badge>
                    {!selectedArticle.published && (
                      <Badge variant="secondary">Rascunho</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{selectedArticle.title}</CardTitle>
                </div>
              </div>
              {isAdmin && selectedArticle.id && (
                <Button variant="outline" size="sm" onClick={() => handleEdit(selectedArticle)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                components={{
                  img: ({ node, ...props }) => (
                    <img {...props} className="rounded-lg max-w-full shadow-md" />
                  ),
                  video: ({ node, ...props }) => (
                    <video {...props} controls className="rounded-lg max-w-full shadow-md" />
                  ),
                }}
              >
                {selectedArticle.content}
              </ReactMarkdown>
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
                    {isAdmin && (
                      <HelpArticleEditor onSaved={() => {}} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredArticles.map((article, index) => (
                      <div
                        key={article.id || index}
                        className="w-full text-left p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <button
                            onClick={() => handleArticleClick(article)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-slate-800 group-hover:text-[#6B2D8B] transition-colors">
                                {article.title}
                              </h3>
                              {!article.published && (
                                <Badge variant="secondary" className="text-xs">Rascunho</Badge>
                              )}
                            </div>
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
                          </button>
                          <div className="flex items-center gap-2 ml-4">
                            {isAdmin && article.id && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => handleEdit(article)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#6B2D8B]" />
                          </div>
                        </div>
                      </div>
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