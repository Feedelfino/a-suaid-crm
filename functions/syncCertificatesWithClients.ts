import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os certificados e clientes
    const [certificates, clients] = await Promise.all([
      base44.asServiceRole.entities.Certificate.list('-created_date', 5000),
      base44.asServiceRole.entities.Client.list('-created_date', 5000)
    ]);

    // Criar um mapa de clientes por ID para busca rápida
    const clientMap = new Map(clients.map(c => [c.id, c]));

    const updates = [];
    const issues = {
      certificatesWithoutClient: [],
      certificatesUpdated: [],
      certificatesWithMismatch: []
    };

    // Processar cada certificado
    for (const cert of certificates) {
      if (!cert.client_id) {
        issues.certificatesWithoutClient.push({
          cert_id: cert.id,
          cert_name: cert.client_name
        });
        continue;
      }

      const client = clientMap.get(cert.client_id);
      
      if (!client) {
        issues.certificatesWithoutClient.push({
          cert_id: cert.id,
          cert_name: cert.client_name,
          client_id: cert.client_id
        });
        continue;
      }

      // Verificar se há diferenças
      const needsUpdate = 
        cert.client_name !== client.client_name ||
        cert.client_email !== client.email ||
        cert.client_phone !== (client.phone || client.whatsapp);

      if (needsUpdate) {
        issues.certificatesWithMismatch.push({
          cert_id: cert.id,
          old_name: cert.client_name,
          new_name: client.client_name,
          old_email: cert.client_email,
          new_email: client.email
        });

        // Atualizar o certificado
        await base44.asServiceRole.entities.Certificate.update(cert.id, {
          client_name: client.client_name,
          client_email: client.email || cert.client_email,
          client_phone: client.phone || client.whatsapp || cert.client_phone
        });

        issues.certificatesUpdated.push(cert.id);
        updates.push({
          cert_id: cert.id,
          client_id: client.id,
          updated_fields: {
            client_name: client.client_name,
            client_email: client.email,
            client_phone: client.phone || client.whatsapp
          }
        });
      }
    }

    return Response.json({
      success: true,
      summary: {
        total_certificates: certificates.length,
        total_clients: clients.length,
        certificates_updated: issues.certificatesUpdated.length,
        certificates_without_client: issues.certificatesWithoutClient.length,
        certificates_with_mismatch: issues.certificatesWithMismatch.length
      },
      details: issues,
      updates
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});