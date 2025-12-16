import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ============================================================================
// CHECK DOUBLE BOOKING BEFORE CREATING APPOINTMENT
// ============================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, time, duration, agentEmail, excludeAppointmentId } = await req.json();
    
    if (!date || !time || !agentEmail) {
      return Response.json({ 
        error: 'Missing required fields: date, time, agentEmail' 
      }, { status: 400 });
    }

    // Calculate time range
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + (duration || 30));

    // Check CRM appointments
    const allAppointments = await base44.entities.Appointment.filter({ 
      date,
      agent_email: agentEmail
    });

    const conflicts = allAppointments.filter(apt => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;
      if (apt.status === 'cancelada') return false;
      
      const aptStart = new Date(`${apt.date}T${apt.time}`);
      const aptEnd = new Date(aptStart);
      aptEnd.setMinutes(aptEnd.getMinutes() + (apt.duration || 30));

      return (startDateTime < aptEnd && endDateTime > aptStart);
    });

    // Check Google Calendar
    let googleConflicts = [];
    try {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
      
      const timeMin = startDateTime.toISOString();
      const timeMax = endDateTime.toISOString();
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        googleConflicts = data.items?.filter(event => {
          if (event.status === 'cancelled') return false;
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);
          return (startDateTime < eventEnd && endDateTime > eventStart);
        }) || [];
      }
    } catch (e) {
      console.log('Could not check Google Calendar:', e);
    }

    const hasConflict = conflicts.length > 0 || googleConflicts.length > 0;

    return Response.json({ 
      hasConflict,
      conflicts: conflicts.map(c => ({
        id: c.id,
        title: c.title,
        time: c.time,
        client_name: c.client_name
      })),
      googleConflicts: googleConflicts.map(e => ({
        id: e.id,
        title: e.summary,
        start: e.start.dateTime || e.start.date
      }))
    });

  } catch (error) {
    console.error('Error checking double booking:', error);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});