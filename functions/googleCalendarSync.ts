import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar autenticação
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { appointmentId, action } = await req.json();

    // Buscar dados do compromisso
    const appointments = await base44.entities.Appointment.filter({ id: appointmentId });
    if (appointments.length === 0) {
      return Response.json({ error: 'Compromisso não encontrado' }, { status: 404 });
    }

    const appointment = appointments[0];

    // Obter token do Google Calendar
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    if (action === 'create') {
      // Preparar data/hora no formato ISO
      const startDateTime = `${appointment.date}T${appointment.time}:00`;
      const endDate = new Date(startDateTime);
      endDate.setMinutes(endDate.getMinutes() + (appointment.duration || 30));
      const endDateTime = endDate.toISOString().slice(0, 16);

      // Preparar participantes
      const attendees = [];
      if (appointment.email) {
        attendees.push({ email: appointment.email });
      }
      if (appointment.participants && Array.isArray(appointment.participants)) {
        appointment.participants.forEach(email => {
          attendees.push({ email });
        });
      }

      // Criar evento no Google Calendar
      const eventData = {
        summary: appointment.title,
        description: appointment.description || '',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        attendees: attendees.length > 0 ? attendees : undefined,
        conferenceData: appointment.appointment_type === 'videoconferencia' ? {
          createRequest: {
            requestId: `meet-${appointmentId}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        } : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const calendarResponse = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!calendarResponse.ok) {
        const error = await calendarResponse.text();
        return Response.json({ 
          error: 'Erro ao criar evento no Google Calendar', 
          details: error 
        }, { status: 500 });
      }

      const calendarEvent = await calendarResponse.json();

      // Extrair link do Google Meet se foi criado
      const meetLink = calendarEvent.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      )?.uri;

      // Atualizar compromisso com IDs do Google
      await base44.asServiceRole.entities.Appointment.update(appointmentId, {
        google_event_id: calendarEvent.id,
        google_meet_link: meetLink || appointment.meeting_link,
        meeting_link: meetLink || appointment.meeting_link,
      });

      return Response.json({
        success: true,
        google_event_id: calendarEvent.id,
        google_meet_link: meetLink,
        calendar_link: calendarEvent.htmlLink,
      });

    } else if (action === 'delete') {
      if (!appointment.google_event_id) {
        return Response.json({ error: 'Evento não está sincronizado com Google Calendar' }, { status: 400 });
      }

      // Deletar evento do Google Calendar
      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const error = await deleteResponse.text();
        return Response.json({ 
          error: 'Erro ao deletar evento do Google Calendar', 
          details: error 
        }, { status: 500 });
      }

      // Limpar IDs do Google
      await base44.asServiceRole.entities.Appointment.update(appointmentId, {
        google_event_id: null,
        google_meet_link: null,
      });

      return Response.json({ success: true });

    } else if (action === 'update') {
      if (!appointment.google_event_id) {
        return Response.json({ error: 'Evento não está sincronizado com Google Calendar' }, { status: 400 });
      }

      // Preparar data/hora
      const startDateTime = `${appointment.date}T${appointment.time}:00`;
      const endDate = new Date(startDateTime);
      endDate.setMinutes(endDate.getMinutes() + (appointment.duration || 30));
      const endDateTime = endDate.toISOString().slice(0, 16);

      // Preparar participantes
      const attendees = [];
      if (appointment.email) {
        attendees.push({ email: appointment.email });
      }
      if (appointment.participants && Array.isArray(appointment.participants)) {
        appointment.participants.forEach(email => {
          attendees.push({ email });
        });
      }

      const updateData = {
        summary: appointment.title,
        description: appointment.description || '',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Sao_Paulo',
        },
        attendees: attendees.length > 0 ? attendees : undefined,
      };

      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        return Response.json({ 
          error: 'Erro ao atualizar evento no Google Calendar', 
          details: error 
        }, { status: 500 });
      }

      const updatedEvent = await updateResponse.json();

      return Response.json({
        success: true,
        calendar_link: updatedEvent.htmlLink,
      });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return Response.json({ 
      error: 'Erro interno', 
      details: error.message 
    }, { status: 500 });
  }
});