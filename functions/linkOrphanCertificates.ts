import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Buscar certificados sem client_id
    const allCertificates = await base44.asServiceRole.entities.Certificate.list('-created_date', 5000);
    const orphanCerts = allCertificates.filter(cert => !cert.client_id);

    if (orphanCerts.length === 0) {
      return Response.json({
        success: true,
        message: 'Nenhum certificado órfão encontrado',
        orphans: 0,
        linked: 0,
        created: 0
      });
    }

    // Buscar todos os clientes
    const allClients = await base44.asServiceRole.entities.Client.list('-created_date', 5000);

    const linked = [];
    const created = [];
    const errors = [];

    for (const cert of orphanCerts) {
      try {
        // Tentar encontrar cliente por email, CPF ou nome
        let matchedClient = null;

        if (cert.client_email) {
          matchedClient = allClients.find(c => c.email?.toLowerCase() === cert.client_email.toLowerCase());
        }

        if (!matchedClient && cert.client_name) {
          matchedClient = allClients.find(c => 
            c.client_name?.toLowerCase() === cert.client_name.toLowerCase()
          );
        }

        if (matchedClient) {
          // Vincular ao cliente existente
          await base44.asServiceRole.entities.Certificate.update(cert.id, {
            client_id: matchedClient.id
          });
          linked.push({
            cert_id: cert.id,
            client_id: matchedClient.id,
            client_name: matchedClient.client_name
          });
        } else if (cert.client_name) {
          // Criar novo cliente
          const newClient = await base44.asServiceRole.entities.Client.create({
            client_name: cert.client_name,
            email: cert.client_email || undefined,
            phone: cert.client_phone || undefined,
            lead_status: 'novo',
            lead_source: 'renovacao',
            has_certificate: true,
            certificate_type: cert.certificate_type,
            certificate_expiry_date: cert.expiry_date,
            renewal_status: cert.renewal_status || 'pendente',
            assigned_agent: cert.assigned_agent || undefined
          });

          // Vincular certificado ao novo cliente
          await base44.asServiceRole.entities.Certificate.update(cert.id, {
            client_id: newClient.id
          });

          created.push({
            cert_id: cert.id,
            client_id: newClient.id,
            client_name: newClient.client_name
          });
        }
      } catch (error) {
        errors.push({
          cert_id: cert.id,
          cert_name: cert.client_name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      orphans: orphanCerts.length,
      linked: linked.length,
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
      details: { linked, created }
    });

  } catch (error) {
    console.error('Link orphans error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});