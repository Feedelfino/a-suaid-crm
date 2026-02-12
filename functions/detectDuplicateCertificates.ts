import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar todos os certificados da entidade Certificate
    const certificates = await base44.asServiceRole.entities.Certificate.list('-created_date', 5000);
    
    // Buscar todos os clientes
    const clients = await base44.asServiceRole.entities.Client.list('-created_date', 5000);

    // Criar lista unificada de certificados
    const allCerts = [];
    
    // Adicionar certificados da entidade Certificate
    certificates.forEach(cert => {
      if (cert.client_id && cert.certificate_type) {
        allCerts.push({
          id: cert.id,
          client_id: cert.client_id,
          client_name: cert.client_name,
          certificate_type: cert.certificate_type,
          expiry_date: cert.expiry_date,
          renewal_status: cert.renewal_status,
          created_date: cert.created_date,
          assigned_agent: cert.assigned_agent,
          source: 'certificate_entity'
        });
      }
    });
    
    // Adicionar certificados do cadastro de clientes
    clients.forEach(client => {
      if (client.has_certificate && client.certificate_type && client.certificate_expiry_date) {
        // Verificar se já não existe na entidade Certificate
        const hasInCertificates = certificates.some(cert => cert.client_id === client.id);
        if (!hasInCertificates) {
          allCerts.push({
            id: `client_cert_${client.id}`,
            client_id: client.id,
            client_name: client.client_name,
            certificate_type: client.certificate_type,
            expiry_date: client.certificate_expiry_date,
            renewal_status: client.renewal_status || 'pendente',
            created_date: client.created_date,
            assigned_agent: client.assigned_agent,
            source: 'client_profile'
          });
        }
      }
    });

    // Detectar duplicatas: mesmo client_id + mesmo certificate_type
    const duplicateGroups = new Map();

    allCerts.forEach(cert => {
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
            assigned_agent: c.assigned_agent,
            source: c.source
          }))
        });
      }
    });

    return Response.json({
      success: true,
      total_certificates: allCerts.length,
      from_certificate_entity: certificates.length,
      from_client_profiles: allCerts.length - certificates.length,
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