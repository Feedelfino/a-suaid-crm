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

    // Buscar informações dos certificados para identificar a origem
    const allCertificates = await base44.asServiceRole.entities.Certificate.list('-created_date', 5000);
    const certMap = new Map(allCertificates.map(c => [c.id, c]));

    // Remover certificados duplicados
    for (const certId of certificateIdsToRemove) {
      try {
        // Verificar se é um certificado do perfil do cliente
        if (certId.startsWith('client_cert_')) {
          const clientId = certId.replace('client_cert_', '');
          await base44.asServiceRole.entities.Client.update(clientId, {
            has_certificate: false,
            certificate_type: null,
            certificate_expiry_date: null,
            renewal_status: null
          });
          removed.push(certId);
        } else {
          // Certificado da entidade Certificate
          await base44.asServiceRole.entities.Certificate.delete(certId);
          removed.push(certId);
        }
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