import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { 
  Phone, Video, MapPin, MoreVertical, Edit, Trash2,
  Users, Building2, Briefcase, Mail, ExternalLink, StickyNote
} from 'lucide-react';
import AppointmentNotesDialog from './AppointmentNotesDialog';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const statusColors = {
  confirmada: 'bg-green-500',
  aguardando: 'bg-yellow-500',
  reagendada: 'bg-blue-500',
  cancelada: 'bg-red-500',
  nao_compareceu: 'bg-orange-500',
  concluida: 'bg-emerald-500',
};

const typeIcons = {
  presencial: MapPin,
  videoconferencia: Video,
  telefone: Phone,
};

const categoryColors = {
  comercial: 'from-[#6B2D8B] to-[#8B4DAB]',
  interno: 'from-blue-600 to-blue-700',
};

export default function AppointmentCard({ apt, compact = false, onDelete, getDisplayName }) {
  const Icon = typeIcons[apt.appointment_type] || Phone;
  const isInternal = apt.category === 'interno';
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const recipients = [];
      if (apt.email) recipients.push(apt.email);
      if (apt.participants?.length) recipients.push(...apt.participants);
      if (apt.agent_email) recipients.push(apt.agent_email);

      const uniqueRecipients = [...new Set(recipients)];

      for (const recipient of uniqueRecipients) {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: `Reunião: ${apt.title}`,
          body: `
            <h2>Detalhes da Reunião</h2>
            <p><strong>Título:</strong> ${apt.title}</p>
            <p><strong>Data:</strong> ${new Date(apt.date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${apt.time}</p>
            <p><strong>Duração:</strong> ${apt.duration || 30} minutos</p>
            ${apt.description ? `<p><strong>Descrição:</strong> ${apt.description}</p>` : ''}
            ${apt.google_meet_link ? `<p><strong>Link Google Meet:</strong> <a href="${apt.google_meet_link}">${apt.google_meet_link}</a></p>` : ''}
            ${apt.location ? `<p><strong>Local:</strong> ${apt.location}</p>` : ''}
          `
        });
      }
      alert('E-mails enviados com sucesso!');
    } catch (error) {
      alert('Erro ao enviar e-mails: ' + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOpenMeet = () => {
    if (apt.google_meet_link) {
      window.open(apt.google_meet_link, '_blank');
    } else if (apt.meeting_link) {
      window.open(apt.meeting_link, '_blank');
    }
  };
  
  return (
    <div 
      className={`group rounded-lg p-2 ${compact ? 'text-xs' : 'p-3'} bg-gradient-to-r ${categoryColors[apt.category] || categoryColors.comercial} text-white relative overflow-hidden`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${statusColors[apt.status] || 'bg-gray-400'}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 pl-2">
          {isInternal ? (
            <>
              <p className="font-medium truncate">{apt.title}</p>
              <div className="flex items-center gap-1 text-white/80 mt-1">
                <Users className="w-3 h-3" />
                <span>{apt.time}</span>
                {!compact && <span>• {apt.duration || 30} min</span>}
              </div>
              {!compact && apt.internal_area && (
                <Badge className="mt-1 bg-white/20 text-white text-xs capitalize">
                  {apt.internal_area}
                </Badge>
              )}
            </>
          ) : (
            <>
              <p className="font-medium truncate">{apt.client_name || apt.title}</p>
              <div className="flex items-center gap-1 text-white/80 mt-1">
                <Icon className="w-3 h-3" />
                <span>{apt.time}</span>
                {!compact && <span>• {apt.duration || 30} min</span>}
              </div>
              {!compact && apt.meeting_reason && (
                <p className="text-white/70 text-xs mt-1 capitalize">
                  {apt.meeting_reason?.replace('_', ' ')}
                </p>
              )}
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="opacity-0 group-hover:opacity-100 h-6 w-6 text-white hover:bg-white/20"
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link to={createPageUrl(`AppointmentForm?id=${apt.id}`)}>
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setNotesDialogOpen(true)}>
              <StickyNote className="w-4 h-4 mr-2 text-purple-600" />
              Lembretes e Notas
            </DropdownMenuItem>
            {(apt.google_meet_link || apt.meeting_link) && (
              <DropdownMenuItem onClick={handleOpenMeet}>
                <ExternalLink className="w-4 h-4 mr-2 text-blue-600" />
                Abrir Google Meet
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleSendEmail} disabled={isSendingEmail}>
              <Mail className="w-4 h-4 mr-2 text-green-600" />
              {isSendingEmail ? 'Enviando...' : 'Enviar E-mail aos Participantes'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600"
              onClick={() => onDelete && onDelete(apt.id)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!compact && (
        <p className="text-white/60 text-xs mt-2">
          {isInternal ? 'Interno' : `Agente: ${getDisplayName ? getDisplayName(apt.agent_email, apt.agent) : apt.agent}`}
        </p>
      )}
      <AppointmentNotesDialog 
        appointment={apt}
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
      />
    </div>
  );
}