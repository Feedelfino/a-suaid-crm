import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função para normalizar texto (remover acentos, espaços extras, converter para minúsculas)
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Função para normalizar telefone (apenas números)
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Buscar todos os clientes
    const allClients = await base44.asServiceRole.entities.Client.list('-created_date', 10000);
    
    // Buscar todos os certificados
    const allCertificates = await base44.asServiceRole.entities.Certificate.list('-created_date', 10000);

    console.log(`📊 Total de clientes: ${allClients.length}`);
    console.log(`📊 Total de certificados: ${allCertificates.length}`);

    // Analisar duplicatas de clientes por nome + telefone
    const clientsByNamePhone = new Map();
    const duplicateClientGroups = [];

    allClients.forEach(client => {
      const normalizedName = normalizeText(client.client_name);
      
      // Pegar telefone ou whatsapp
      const phone = client.phone || client.whatsapp;
      const normalizedPhone = normalizePhone(phone);

      // Precisamos de nome E telefone para considerar duplicata
      if (!normalizedName || !normalizedPhone) return;

      const key = `${normalizedName}_${normalizedPhone}`;

      if (!clientsByNamePhone.has(key)) {
        clientsByNamePhone.set(key, []);
      }

      clientsByNamePhone.get(key).push(client);
    });

    // Filtrar apenas grupos com duplicatas
    clientsByNamePhone.forEach((clients, key) => {
      if (clients.length > 1) {
        // Ordenar por data de criação (mais antigo primeiro = principal)
        clients.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        const [name, phone] = key.split('_');
        
        duplicateClientGroups.push({
          key,
          name,
          phone,
          count: clients.length,
          clients: clients.map(c => ({
            id: c.id,
            client_name: c.client_name,
            email: c.email,
            phone: c.phone,
            whatsapp: c.whatsapp,
            cpf: c.cpf,
            cnpj: c.cnpj,
            created_date: c.created_date,
            lead_status: c.lead_status,
            has_certificate: c.has_certificate,
            certificate_type: c.certificate_type
          }))
        });
      }
    });

    // Analisar certificados duplicados por client_id
    const certsByClient = new Map();
    const duplicateCertGroups = [];

    allCertificates.forEach(cert => {
      if (!cert.client_id || !cert.certificate_type) return;

      const key = `${cert.client_id}_${cert.certificate_type}`;

      if (!certsByClient.has(key)) {
        certsByClient.set(key, []);
      }

      certsByClient.get(key).push(cert);
    });

    certsByClient.forEach((certs, key) => {
      if (certs.length > 1) {
        duplicateCertGroups.push({
          key,
          client_id: certs[0].client_id,
          client_name: certs[0].client_name,
          certificate_type: certs[0].certificate_type,
          count: certs.length,
          certificates: certs.map(c => ({
            id: c.id,
            expiry_date: c.expiry_date,
            renewal_status: c.renewal_status,
            created_date: c.created_date
          }))
        });
      }
    });

    // Certificados órfãos (sem client_id)
    const orphanCertificates = allCertificates.filter(cert => !cert.client_id);

    return Response.json({
      success: true,
      summary: {
        total_clients: allClients.length,
        total_certificates: allCertificates.length,
        duplicate_client_groups: duplicateClientGroups.length,
        total_duplicate_clients: duplicateClientGroups.reduce((sum, g) => sum + (g.count - 1), 0),
        duplicate_cert_groups: duplicateCertGroups.length,
        total_duplicate_certs: duplicateCertGroups.reduce((sum, g) => sum + (g.count - 1), 0),
        orphan_certificates: orphanCertificates.length
      },
      duplicate_clients: duplicateClientGroups,
      duplicate_certificates: duplicateCertGroups,
      orphan_certificates: orphanCertificates.map(c => ({
        id: c.id,
        client_name: c.client_name,
        client_email: c.client_email,
        client_phone: c.client_phone,
        certificate_type: c.certificate_type,
        expiry_date: c.expiry_date
      }))
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});