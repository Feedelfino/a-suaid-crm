import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AppointmentNotesDialog({ appointment, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [noteType, setNoteType] = useState('followup');
  const [content, setContent] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    const loadUser = async () => {
      const userData = await base44.auth.me();
      setUser(userData);
    };
    loadUser();
  }, []);

  const { data: notes = [] } = useQuery({
    queryKey: ['appointment-notes', appointment?.id],
    queryFn: () => base44.entities.AppointmentNote.filter({ appointment_id: appointment.id }),
    enabled: !!appointment?.id
  });

  const createNote = useMutation({
    mutationFn: (data) => base44.entities.AppointmentNote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appointment-notes', appointment.id]);
      setContent('');
    }
  });

  const deleteNote = useMutation({
    mutationFn: (id) => base44.entities.AppointmentNote.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['appointment-notes', appointment.id])
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    createNote.mutate({
      appointment_id: appointment.id,
      note_type: noteType,
      content,
      created_by_email: user?.email,
      reminder_minutes: noteType === 'reminder' ? reminderMinutes : null
    });
  };

  const reminders = notes.filter(n => n.note_type === 'reminder');
  const followups = notes.filter(n => n.note_type === 'followup');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lembretes e Notas - {appointment?.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={noteType} onValueChange={setNoteType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reminder">Lembrete (antes da reunião)</SelectItem>
                <SelectItem value="followup">Nota de Follow-up (depois)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {noteType === 'reminder' && (
            <div className="space-y-2">
              <Label>Notificar com antecedência</Label>
              <Select value={reminderMinutes.toString()} onValueChange={(v) => setReminderMinutes(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutos antes</SelectItem>
                  <SelectItem value="15">15 minutos antes</SelectItem>
                  <SelectItem value="30">30 minutos antes</SelectItem>
                  <SelectItem value="60">1 hora antes</SelectItem>
                  <SelectItem value="1440">1 dia antes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={noteType === 'reminder' ? 'Ex: Confirmar link do Meet e enviar pauta' : 'Ex: Cliente demonstrou interesse em...'}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={createNote.isPending}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar {noteType === 'reminder' ? 'Lembrete' : 'Nota'}
          </Button>
        </form>

        {/* Lembretes */}
        {reminders.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              Lembretes
            </h4>
            <div className="space-y-2">
              {reminders.map(note => (
                <div key={note.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {note.reminder_minutes} min antes
                        </Badge>
                        {note.reminder_sent && (
                          <Badge className="text-xs bg-green-100 text-green-800">Enviado</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{note.content}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-600"
                      onClick={() => deleteNote.mutate(note.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-ups */}
        {followups.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-green-600" />
              Notas de Follow-up
            </h4>
            <div className="space-y-2">
              {followups.map(note => (
                <div key={note.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{note.content}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(note.created_date).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-600"
                      onClick={() => deleteNote.mutate(note.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}