import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os certificados
    const certificates = await base44.asServiceRole.entities.Certificate.list('-created_date', 5000);

    // Detectar duplicatas: mesmo client_id + mesmo certificate_type
    const duplicateGroups = new Map();

    certificates.forEach(cert => {
      if (!cert.client_id || !cert.certificate_type) return;
      
      const key = `${cert.client_id}_${cert.certificate_type}`;
      
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      
      duplicateGroups.get(key).push(cert);
    });

    // Filtrar apenas grupos com mais de 1 certificado
    const duplicates = [];
    duplicateGroups.forEach((certs, key) => {
      if (certs.length > 1) {
        // Ordenar por data de vencimento (mais recente primeiro)
        certs.sort((a, b) => {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return new Date(b.expiry_date) - new Date(a.expiry_date);
        });

        duplicates.push({
          key,
          client_id: certs[0].client_id,
          client_name: certs[0].client_name,
          certificate_type: certs[0].certificate_type,
          count: certs.length,
          certificates: certs.map(c => ({
            id: c.id,
            expiry_date: c.expiry_date,
            renewal_status: c.renewal_status,
            created_date: c.created_date,
            assigned_agent: c.assigned_agent
          }))
        });
      }
    });

    return Response.json({
      success: true,
      total_certificates: certificates.length,
      duplicate_groups: duplicates.length,
      total_duplicates: duplicates.reduce((sum, d) => sum + (d.count - 1), 0),
      duplicates
    });

  } catch (error) {
    console.error('Detection error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});