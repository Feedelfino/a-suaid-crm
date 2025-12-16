import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ============================================================================
// MIGRAÇÃO EM MASSA: RENOVAÇÃO → CADASTRO CENTRAL DE CLIENTES
// ============================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Buscar ou criar campanha de renovação
    let renovationCampaign;
    const campaigns = await base44.asServiceRole.entities.Campaign.filter({ 
      name: 'Renovação de Certificados' 
    });
    
    if (campaigns.length === 0) {
      renovationCampaign = await base44.asServiceRole.entities.Campaign.create({
        name: 'Renovação de Certificados',
        description: 'Campanha automática para renovação de certificados digitais',
        status: 'ativa',
        start_date: new Date().toISOString().split('T')[0],
      });
    } else {
      renovationCampaign = campaigns[0];
    }

    // Buscar todos os certificados
    const certificates = await base44.asServiceRole.entities.Certificate.list('-created_date', 5000);
    
    // Buscar todos os clientes existentes
    const existingClients = await base44.asServiceRole.entities.Client.list('-created_date', 5000);

    let created = 0;
    let updated = 0;
    let linked = 0;
    const errors = [];

    for (const cert of certificates) {
      try {
        const cpf = String(cert.client_cpf || '').replace(/\D/g, '');
        const cnpj = String(cert.client_cnpj || '').replace(/\D/g, '');
        
        if (!cpf && !cnpj) continue;

        // Verificar se cliente já existe
        let client = existingClients.find(c => {
          const cCpf = String(c.cpf || '').replace(/\D/g, '');
          const cCnpj = String(c.cnpj || '').replace(/\D/g, '');
          if (cpf && cCpf && cpf === cCpf) return true;
          if (cnpj && cCnpj && cnpj === cCnpj) return true;
          return false;
        });

        const clientData = {
          client_name: cert.client_name || 'Cliente de Renovação',
          cpf: cpf || '',
          cnpj: cnpj || '',
          email: cert.client_email || '',
          phone: cert.client_phone || '',
          whatsapp: cert.client_phone || '',
          business_area: cert.certificate_type || '',
          lead_status: 'qualificado',
          lead_source: 'renovacao',
          funnel_stage: 'contato',
          campaign_id: renovationCampaign.id,
          notes: `Migrado de renovação - Tipo: ${cert.certificate_type}, Vencimento: ${cert.expiry_date || 'N/A'}`,
        };

        if (client) {
          // Atualizar cliente existente (apenas se campos estiverem vazios)
          const updateData = {};
          if (!client.email && clientData.email) updateData.email = clientData.email;
          if (!client.phone && clientData.phone) updateData.phone = clientData.phone;
          if (!client.campaign_id) updateData.campaign_id = clientData.campaign_id;
          if (!client.lead_source) updateData.lead_source = 'renovacao';
          
          if (Object.keys(updateData).length > 0) {
            await base44.asServiceRole.entities.Client.update(client.id, updateData);
            updated++;
          }
        } else {
          // Criar novo cliente
          client = await base44.asServiceRole.entities.Client.create(clientData);
          created++;
        }

        // Vincular certificado ao cliente
        if (!cert.client_id || cert.client_id !== client.id) {
          await base44.asServiceRole.entities.Certificate.update(cert.id, {
            client_id: client.id
          });
          linked++;
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
      total_certificates: certificates.length,
      clients_created: created,
      clients_updated: updated,
      certificates_linked: linked,
      errors: errors.length,
      error_details: errors
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});