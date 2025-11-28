import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  Plus, StickyNote, Pin, Trash2, Edit, X, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NOTE_COLORS = {
  yellow: 'bg-amber-100 border-amber-300',
  blue: 'bg-blue-100 border-blue-300',
  green: 'bg-emerald-100 border-emerald-300',
  pink: 'bg-pink-100 border-pink-300',
  purple: 'bg-purple-100 border-purple-300',
};

export default function Notes() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    color: 'yellow',
    pinned: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {}
    };
    loadUser();
  }, []);

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', user?.email],
    queryFn: () => base44.entities.Note.filter({ user_email: user?.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const createNote = useMutation({
    mutationFn: (data) => base44.entities.Note.create({ ...data, user_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      resetForm();
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      resetForm();
    },
  });

  const deleteNote = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['notes']),
  });

  const resetForm = () => {
    setFormData({ title: '', content: '', color: 'yellow', pinned: false });
    setEditingNote(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      color: note.color || 'yellow',
      pinned: note.pinned || false,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, data: formData });
    } else {
      createNote.mutate(formData);
    }
  };

  const togglePin = (note) => {
    updateNote.mutate({ id: note.id, data: { pinned: !note.pinned } });
  };

  // Ordenar notas: fixadas primeiro
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bloco de Notas</h1>
          <p className="text-slate-500">Suas anotações pessoais e privadas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
              <Plus className="w-4 h-4 mr-2" />
              Nova Nota
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingNote ? 'Editar Nota' : 'Nova Nota'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Título (opcional)"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Textarea
                  placeholder="Escreva sua nota..."
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  rows={5}
                  required
                />
              </div>
              <div className="flex gap-2">
                {Object.entries(NOTE_COLORS).map(([color, className]) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 ${className} ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-[#6B2D8B]' : ''
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#6B2D8B] to-[#C71585]">
                  {editingNote ? 'Salvar' : 'Criar Nota'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Notes Grid */}
      {sortedNotes.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="p-16 text-center">
            <StickyNote className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 mb-4">Você ainda não tem notas</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeira nota
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedNotes.map((note) => (
            <Card 
              key={note.id} 
              className={`border-2 shadow-lg hover:shadow-xl transition-all ${NOTE_COLORS[note.color] || NOTE_COLORS.yellow}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  {note.title ? (
                    <h3 className="font-semibold text-slate-800">{note.title}</h3>
                  ) : (
                    <span className="text-slate-400 text-sm">Sem título</span>
                  )}
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => togglePin(note)}
                    >
                      <Pin className={`w-4 h-4 ${note.pinned ? 'text-[#6B2D8B] fill-current' : 'text-slate-400'}`} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => handleEdit(note)}
                    >
                      <Edit className="w-4 h-4 text-slate-400" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-500"
                      onClick={() => deleteNote.mutate(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap text-sm">
                  {note.content}
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  {note.created_date && format(parseISO(note.created_date), 'dd/MM/yyyy HH:mm')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}