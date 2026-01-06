import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem executar migrações' }, { status: 403 });
    }

    // Buscar todos os certificados
    const certificates = await base44.asServiceRole.entities.Certificate.list();
    
    // Buscar todos os clientes existentes
    const existingClients = await base44.asServiceRole.entities.Client.list();
    
    let migrated = 0;
    let updated = 0;
    let skipped = 0;

    for (const cert of certificates) {
      try {
        // Tentar encontrar cliente existente por CPF/CNPJ/Email
        const cpf = String(cert.client_id || '').replace(/\D/g, '');
        const email = cert.client_email?.toLowerCase().trim();
        
        let existingClient = existingClients.find(c => {
          if (c.id === cert.client_id) return true;
          if (email && c.email?.toLowerCase().trim() === email) return true;
          return false;
        });

        if (existingClient) {
          // Atualizar cliente existente com dados do certificado
          await base44.asServiceRole.entities.Client.update(existingClient.id, {
            has_certificate: true,
            certificate_type: cert.certificate_type,
            certificate_expiry_date: cert.expiry_date,
            renewal_status: cert.status === 'vencido' ? 'vencido' : 
                           cert.renewal_status === 'renovado' ? 'renovado' : 'ativo',
            lead_source: existingClient.lead_source || 'renovacao',
          });
          updated++;
        } else {
          // Criar novo cliente baseado no certificado
          const newClient = await base44.asServiceRole.entities.Client.create({
            client_name: cert.client_name || 'Cliente sem nome',
            email: cert.client_email || '',
            phone: cert.client_phone || '',
            whatsapp: cert.client_phone || '',
            has_certificate: true,
            certificate_type: cert.certificate_type,
            certificate_expiry_date: cert.expiry_date,
            renewal_status: cert.status === 'vencido' ? 'vencido' : 
                           cert.renewal_status === 'renovado' ? 'renovado' : 'ativo',
            lead_status: 'qualificado',
            lead_source: 'renovacao',
            funnel_stage: 'contato',
            notes: `Migrado do módulo de renovação - ${cert.notes || ''}`,
          });
          
          // Atualizar certificado com o ID do novo cliente
          await base44.asServiceRole.entities.Certificate.update(cert.id, {
            client_id: newClient.id,
          });
          
          migrated++;
        }
      } catch (error) {
        console.error(`Erro ao processar certificado ${cert.id}:`, error);
        skipped++;
      }
    }

    return Response.json({
      success: true,
      migrated,
      updated,
      skipped,
      total: certificates.length,
      message: `Migração concluída: ${migrated} novos, ${updated} atualizados, ${skipped} ignorados`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});