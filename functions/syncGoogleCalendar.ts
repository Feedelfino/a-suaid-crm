import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ============================================================================
// GOOGLE CALENDAR PRIMARY SYNC - CRM AS SECONDARY
// ============================================================================

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TIMEZONE = 'America/Sao_Paulo';

async function syncGoogleToCRM(base44, accessToken, startDate, endDate) {
  // Fetch from Google Calendar
  const timeMin = new Date(startDate).toISOString();
  const timeMax = new Date(endDate).toISOString();
  
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  if (!response.ok) throw new Error('Google Calendar API failed');

  const data = await response.json();
  const googleEvents = data.items || [];

  // Get existing CRM appointments
  const crmAppointments = await base44.asServiceRole.entities.Appointment.list('-date', 500);

  for (const event of googleEvents) {
    if (event.status === 'cancelled') continue;
    
    const eventStart = new Date(event.start.dateTime || event.start.date);
    const eventEnd = new Date(event.end.dateTime || event.end.date);
    const duration = Math.round((eventEnd - eventStart) / 60000);

    const meetLink = event.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri;

    // Check if exists in CRM
    const existing = crmAppointments.find(apt => apt.google_event_id === event.id);

    const appointmentData = {
      title: event.summary || 'Reunião',
      description: event.description || '',
      date: event.start.dateTime ? event.start.dateTime.split('T')[0] : event.start.date,
      time: event.start.dateTime ? event.start.dateTime.split('T')[1].slice(0, 5) : '09:00',
      duration,
      google_event_id: event.id,
      google_meet_link: meetLink,
      meeting_link: meetLink || event.hangoutLink,
      status: 'confirmada',
      appointment_type: meetLink ? 'videoconferencia' : 'telefone',
      category: 'comercial',
      event_type: 'reuniao_venda',
      participants: event.attendees?.map(a => a.email) || []
    };

    if (existing) {
      // Update if changed
      await base44.asServiceRole.entities.Appointment.update(existing.id, appointmentData);
    } else {
      // Create new
      await base44.asServiceRole.entities.Appointment.create(appointmentData);
    }
  }

  // Remove CRM appointments for deleted Google events
  const googleEventIds = googleEvents.map(e => e.id);
  for (const apt of crmAppointments) {
    if (apt.google_event_id && !googleEventIds.includes(apt.google_event_id)) {
      await base44.asServiceRole.entities.Appointment.update(apt.id, {
        status: 'cancelada',
        google_event_id: null
      });
    }
  }

  return { success: true, synced: googleEvents.length };
}

async function syncCRMToGoogle(base44, accessToken, appointmentId) {
  const appointments = await base44.entities.Appointment.filter({ id: appointmentId });
  if (!appointments.length) throw new Error('Appointment not found');
  
  const apt = appointments[0];
  const startDateTime = `${apt.date}T${apt.time}:00`;
  const endDate = new Date(startDateTime);
  endDate.setMinutes(endDate.getMinutes() + (apt.duration || 30));

  const payload = {
    summary: apt.title,
    description: apt.description || '',
    start: { dateTime: startDateTime, timeZone: TIMEZONE },
    end: { dateTime: endDate.toISOString().slice(0, 19), timeZone: TIMEZONE },
    attendees: apt.participants?.map(email => ({ email })) || [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  if (apt.appointment_type === 'videoconferencia') {
    payload.conferenceData = {
      createRequest: {
        requestId: `meet-${apt.id}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
  }

  let calendarEvent;
  if (apt.google_event_id) {
    // Update existing
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${apt.google_event_id}?conferenceDataVersion=1`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) throw new Error('Failed to update Google Calendar event');
    calendarEvent = await res.json();
  } else {
    // Create new
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) throw new Error('Failed to create Google Calendar event');
    calendarEvent = await res.json();
  }

  const meetLink = calendarEvent.conferenceData?.entryPoints?.find(
    ep => ep.entryPointType === 'video'
  )?.uri;

  await base44.asServiceRole.entities.Appointment.update(appointmentId, {
    google_event_id: calendarEvent.id,
    google_meet_link: meetLink,
    meeting_link: meetLink || apt.meeting_link
  });

  return { success: true, google_event_id: calendarEvent.id, google_meet_link: meetLink };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, startDate, endDate, appointmentId } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    let result;
    if (action === 'syncFromGoogle') {
      result = await syncGoogleToCRM(base44, accessToken, startDate, endDate);
    } else if (action === 'syncToGoogle') {
      result = await syncCRMToGoogle(base44, accessToken, appointmentId);
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});