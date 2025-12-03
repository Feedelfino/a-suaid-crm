import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import { Plus, Save, Trash2, Image, Video, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

const CATEGORIES = [
  { id: 'introducao', name: 'Introdução' },
  { id: 'modulos', name: 'Módulos' },
  { id: 'faq', name: 'FAQ' },
  { id: 'tutoriais', name: 'Tutoriais' },
];

const SUBCATEGORIES = {
  modulos: ['dashboard', 'interacoes', 'clientes', 'funil', 'agenda', 'campanhas', 'notas', 'admin'],
  faq: ['financeiro', 'cadastro', 'funil', 'relatorios', 'campanhas', 'interacoes', 'metas'],
};

export default function HelpArticleEditor({ article, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState(article || {
    title: '',
    category: 'tutoriais',
    subcategory: '',
    content: '',
    order: 0,
    tags: [],
    published: true,
  });
  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (article?.id) {
        return base44.entities.HelpArticle.update(article.id, data);
      }
      return base44.entities.HelpArticle.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['help-articles']);
      queryClient.invalidateQueries(['help-articles-admin']);
      setIsOpen(false);
      if (onSaved) onSaved();
      if (onClose) onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.HelpArticle.delete(article.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['help-articles']);
      queryClient.invalidateQueries(['help-articles-admin']);
      setIsOpen(false);
      if (onClose) onClose();
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim().toLowerCase()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Inserir no conteúdo baseado no tipo
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      let insertion = '';
      if (isImage) {
        insertion = `\n\n![${file.name}](${file_url})\n\n`;
      } else if (isVideo) {
        insertion = `\n\n<video controls src="${file_url}" style="max-width: 100%;"></video>\n\n`;
      } else {
        insertion = `\n\n[📎 ${file.name}](${file_url})\n\n`;
      }
      
      setFormData(prev => ({
        ...prev,
        content: prev.content + insertion
      }));
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  return (
    <Dialog open={isOpen || !!article} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open && onClose) onClose();
    }}>
      <DialogTrigger asChild>
        {!article && (
          <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
            <Plus className="w-4 h-4 mr-2" />
            Novo Artigo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {article ? 'Editar Artigo' : 'Novo Artigo de Ajuda'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Título do artigo"
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                value={formData.order}
                onChange={(e) => handleChange('order', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => handleChange('category', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select 
                value={formData.subcategory || ''} 
                onValueChange={(v) => handleChange('subcategory', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {SUBCATEGORIES[formData.category]?.map(sub => (
                    <SelectItem key={sub} value={sub} className="capitalize">{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Upload de Mídia */}
          <div className="space-y-2">
            <Label>Adicionar Mídia</Label>
            <div className="flex gap-2">
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
                  <span>
                    <Image className="w-4 h-4 mr-2" />
                    Imagem
                  </span>
                </Button>
              </label>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
                  <span>
                    <Video className="w-4 h-4 mr-2" />
                    Vídeo
                  </span>
                </Button>
              </label>
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <Button type="button" variant="outline" size="sm" disabled={isUploading} asChild>
                  <span>
                    <FileText className="w-4 h-4 mr-2" />
                    Arquivo
                  </span>
                </Button>
              </label>
              {isUploading && <span className="text-sm text-slate-500">Enviando...</span>}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-2">
            <Label>Conteúdo (Markdown) *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="# Título

Escreva o conteúdo do artigo em Markdown...

## Subtítulo

- Item 1
- Item 2

**Texto em negrito** e *texto em itálico*

> Citação

```
Código
```

![Imagem](url)

[Link](url)"
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              Use Markdown para formatar o conteúdo. Imagens e vídeos enviados serão adicionados automaticamente.
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (para busca)</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Digite uma tag..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Publicado */}
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.published}
              onCheckedChange={(v) => handleChange('published', v)}
            />
            <Label>Artigo publicado (visível na Central de Ajuda)</Label>
          </div>

          {/* Botões */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {article && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('Excluir este artigo?')) deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => {
                setIsOpen(false);
                if (onClose) onClose();
              }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending || !formData.title || !formData.content}
                className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}