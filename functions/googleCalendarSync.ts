import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ============================================================================
// GOOGLE CALENDAR & MEET INTEGRATION - PRODUCTION ARCHITECTURE
// ============================================================================

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const TIMEZONE = 'America/Sao_Paulo';

// ============================================================================
// HELPERS
// ============================================================================

function buildDateTime(date, time, duration = 30) {
  const startDateTime = `${date}T${time}:00`;
  const endDate = new Date(startDateTime);
  endDate.setMinutes(endDate.getMinutes() + duration);
  return {
    start: startDateTime,
    end: endDate.toISOString().slice(0, 19)
  };
}

function buildAttendees(appointment) {
  const attendees = [];
  if (appointment.email) attendees.push({ email: appointment.email });
  if (appointment.participants?.length) {
    appointment.participants.forEach(email => attendees.push({ email }));
  }
  return attendees;
}

function buildEventPayload(appointment) {
  const { start, end } = buildDateTime(
    appointment.date, 
    appointment.time, 
    appointment.duration || 30
  );

  const payload = {
    summary: appointment.title,
    description: appointment.description || '',
    start: { dateTime: start, timeZone: TIMEZONE },
    end: { dateTime: end, timeZone: TIMEZONE },
    attendees: buildAttendees(appointment),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 10 }
      ]
    }
  };

  // Add Google Meet if videoconference
  if (appointment.appointment_type === 'videoconferencia') {
    payload.conferenceData = {
      createRequest: {
        requestId: `meet-${appointment.id || Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    };
  }

  return payload;
}

function extractMeetLink(calendarEvent) {
  return calendarEvent.conferenceData?.entryPoints?.find(
    ep => ep.entryPointType === 'video'
  )?.uri || null;
}

// ============================================================================
// GOOGLE CALENDAR API OPERATIONS
// ============================================================================

async function createGoogleEvent(accessToken, appointment) {
  const payload = buildEventPayload(appointment);
  
  const response = await fetch(
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API Error: ${error}`);
  }

  return await response.json();
}

async function updateGoogleEvent(accessToken, eventId, appointment) {
  const payload = buildEventPayload(appointment);
  
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API Error: ${error}`);
  }

  return await response.json();
}

async function deleteGoogleEvent(accessToken, eventId) {
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Google Calendar API Error: ${error}`);
  }

  return true;
}

// ============================================================================
// CRM OPERATIONS
// ============================================================================

async function getAppointment(base44, appointmentId) {
  const appointments = await base44.entities.Appointment.filter({ id: appointmentId });
  if (!appointments.length) {
    throw new Error('Appointment not found');
  }
  return appointments[0];
}

async function updateAppointmentSync(base44, appointmentId, syncData) {
  await base44.asServiceRole.entities.Appointment.update(appointmentId, syncData);
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleCreate(base44, accessToken, appointmentId) {
  const appointment = await getAppointment(base44, appointmentId);
  
  // Create in Google Calendar
  const calendarEvent = await createGoogleEvent(accessToken, appointment);
  const meetLink = extractMeetLink(calendarEvent);

  // Update CRM
  const syncData = {
    google_event_id: calendarEvent.id,
    google_meet_link: meetLink,
    meeting_link: meetLink || appointment.meeting_link
  };
  await updateAppointmentSync(base44, appointmentId, syncData);

  return {
    success: true,
    google_event_id: calendarEvent.id,
    google_meet_link: meetLink,
    calendar_link: calendarEvent.htmlLink
  };
}

async function handleUpdate(base44, accessToken, appointmentId) {
  const appointment = await getAppointment(base44, appointmentId);
  
  if (!appointment.google_event_id) {
    throw new Error('Appointment not synced with Google Calendar');
  }

  // Update in Google Calendar
  const calendarEvent = await updateGoogleEvent(
    accessToken, 
    appointment.google_event_id, 
    appointment
  );

  return {
    success: true,
    calendar_link: calendarEvent.htmlLink
  };
}

async function handleDelete(base44, accessToken, appointmentId) {
  const appointment = await getAppointment(base44, appointmentId);
  
  if (!appointment.google_event_id) {
    throw new Error('Appointment not synced with Google Calendar');
  }

  // Delete from Google Calendar
  await deleteGoogleEvent(accessToken, appointment.google_event_id);

  // Clear sync data in CRM
  await updateAppointmentSync(base44, appointmentId, {
    google_event_id: null,
    google_meet_link: null
  });

  return { success: true };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Auth check
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const { appointmentId, action } = await req.json();
    
    if (!appointmentId || !action) {
      return Response.json({ 
        error: 'Missing required fields: appointmentId, action' 
      }, { status: 400 });
    }

    // Get Google Calendar access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Route to action handler
    let result;
    switch (action) {
      case 'create':
        result = await handleCreate(base44, accessToken, appointmentId);
        break;
      case 'update':
        result = await handleUpdate(base44, accessToken, appointmentId);
        break;
      case 'delete':
        result = await handleDelete(base44, accessToken, appointmentId);
        break;
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json(result);

  } catch (error) {
    console.error('Error in googleCalendarSync:', error);
    
    // Structured error response
    return Response.json({ 
      error: error.message || 'Internal server error',
      action: req.method,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});