import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ============================================================================
// GOOGLE CALENDAR WEBHOOK HANDLER - BIDIRECTIONAL SYNC
// ============================================================================
// This handles notifications from Google Calendar when events are modified
// enabling bidirectional synchronization (Google → CRM)
// ============================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify webhook authenticity
    const channelToken = req.headers.get('X-Goog-Channel-Token');
    const resourceState = req.headers.get('X-Goog-Resource-State');
    
    if (!channelToken) {
      return Response.json({ error: 'Invalid webhook' }, { status: 401 });
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial webhook verification
        return Response.json({ success: true });
        
      case 'exists':
        // Event was modified in Google Calendar
        const { google_event_id } = await req.json();
        
        if (google_event_id) {
          // Find appointment in CRM
          const appointments = await base44.asServiceRole.entities.Appointment.filter({ 
            google_event_id 
          });
          
          if (appointments.length > 0) {
            // Fetch updated event from Google Calendar
            const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
            
            const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events/${google_event_id}`,
              {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              }
            );
            
            if (response.ok) {
              const event = await response.json();
              
              // Update CRM appointment with Google Calendar changes
              await base44.asServiceRole.entities.Appointment.update(appointments[0].id, {
                title: event.summary,
                description: event.description,
                date: event.start.dateTime.split('T')[0],
                time: event.start.dateTime.split('T')[1].slice(0, 5),
                status: event.status === 'cancelled' ? 'cancelada' : appointments[0].status
              });
            }
          }
        }
        
        return Response.json({ success: true });
        
      case 'not_exists':
        // Event was deleted in Google Calendar
        const { event_id } = await req.json();
        
        if (event_id) {
          const appointments = await base44.asServiceRole.entities.Appointment.filter({ 
            google_event_id: event_id 
          });
          
          if (appointments.length > 0) {
            // Mark as cancelled in CRM
            await base44.asServiceRole.entities.Appointment.update(appointments[0].id, {
              status: 'cancelada',
              google_event_id: null,
              google_meet_link: null
            });
          }
        }
        
        return Response.json({ success: true });
        
      default:
        return Response.json({ success: true });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});