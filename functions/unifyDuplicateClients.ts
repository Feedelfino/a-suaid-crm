import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { mainClientId, duplicateClientIds } = await req.json();

    if (!mainClientId || !duplicateClientIds || duplicateClientIds.length === 0) {
      return Response.json({ 
        error: 'Missing required fields: mainClientId and duplicateClientIds' 
      }, { status: 400 });
    }

    const unified = [];
    const errors = [];

    for (const duplicateId of duplicateClientIds) {
      try {
        // 1. Transferir certificados
        const certificates = await base44.asServiceRole.entities.Certificate.filter({ 
          client_id: duplicateId 
        });
        
        for (const cert of certificates) {
          await base44.asServiceRole.entities.Certificate.update(cert.id, {
            client_id: mainClientId
          });
        }

        // 2. Transferir interações
        const interactions = await base44.asServiceRole.entities.Interaction.filter({ 
          client_id: duplicateId 
        });
        
        for (const interaction of interactions) {
          await base44.asServiceRole.entities.Interaction.update(interaction.id, {
            client_id: mainClientId
          });
        }

        // 3. Transferir ofertas
        const offers = await base44.asServiceRole.entities.Offer.filter({ 
          client_id: duplicateId 
        });
        
        for (const offer of offers) {
          await base44.asServiceRole.entities.Offer.update(offer.id, {
            client_id: mainClientId
          });
        }

        // 4. Transferir negócios
        const deals = await base44.asServiceRole.entities.Deal.filter({ 
          client_id: duplicateId 
        });
        
        for (const deal of deals) {
          await base44.asServiceRole.entities.Deal.update(deal.id, {
            client_id: mainClientId
          });
        }

        // 5. Transferir agendamentos
        const appointments = await base44.asServiceRole.entities.Appointment.filter({ 
          client_id: duplicateId 
        });
        
        for (const appointment of appointments) {
          await base44.asServiceRole.entities.Appointment.update(appointment.id, {
            client_id: mainClientId
          });
        }

        // 6. Transferir tarefas
        const tasks = await base44.asServiceRole.entities.Task.filter({ 
          client_id: duplicateId 
        });
        
        for (const task of tasks) {
          await base44.asServiceRole.entities.Task.update(task.id, {
            client_id: mainClientId
          });
        }

        // 7. Deletar o cliente duplicado
        await base44.asServiceRole.entities.Client.delete(duplicateId);

        unified.push({
          duplicate_id: duplicateId,
          transferred: {
            certificates: certificates.length,
            interactions: interactions.length,
            offers: offers.length,
            deals: deals.length,
            appointments: appointments.length,
            tasks: tasks.length
          }
        });

      } catch (error) {
        errors.push({ 
          duplicate_id: duplicateId, 
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      main_client_id: mainClientId,
      unified_count: unified.length,
      errors: errors.length > 0 ? errors : undefined,
      details: unified
    });

  } catch (error) {
    console.error('Unification error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});