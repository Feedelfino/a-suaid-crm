import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { certificateIdsToKeep, certificateIdsToRemove } = await req.json();

    if (!certificateIdsToKeep || !certificateIdsToRemove) {
      return Response.json({ 
        error: 'Missing required fields: certificateIdsToKeep and certificateIdsToRemove' 
      }, { status: 400 });
    }

    const removed = [];
    const errors = [];

    // Remover certificados duplicados
    for (const certId of certificateIdsToRemove) {
      try {
        await base44.asServiceRole.entities.Certificate.delete(certId);
        removed.push(certId);
      } catch (error) {
        errors.push({ certId, error: error.message });
      }
    }

    return Response.json({
      success: true,
      kept: certificateIdsToKeep.length,
      removed: removed.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Consolidation error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});