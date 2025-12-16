import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ============================================================================
// FETCH GOOGLE CALENDAR EVENTS FOR WEEKLY VIEW
// ============================================================================

const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate } = await req.json();
    
    if (!startDate || !endDate) {
      return Response.json({ 
        error: 'Missing required fields: startDate, endDate' 
      }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');

    // Fetch events from Google Calendar
    const timeMin = new Date(startDate).toISOString();
    const timeMax = new Date(endDate).toISOString();
    
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API Error: ${error}`);
    }

    const data = await response.json();
    
    // Transform events to match CRM format
    const events = data.items?.map(event => ({
      id: event.id,
      title: event.summary || 'Sem título',
      description: event.description || '',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      attendees: event.attendees?.map(a => a.email) || [],
      meet_link: event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri,
      html_link: event.htmlLink,
      source: 'google',
      status: event.status
    })) || [];

    return Response.json({ 
      success: true,
      events,
      count: events.length
    });

  } catch (error) {
    console.error('Error fetching Google Calendar:', error);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});