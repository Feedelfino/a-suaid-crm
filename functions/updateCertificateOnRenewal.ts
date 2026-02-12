import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data } = await req.json();

    // Verificar se é uma interação de renovação
    if (event?.type !== 'create' || event?.entity_name !== 'Interaction') {
      return Response.json({ success: true, message: 'Not a renewal interaction' });
    }

    // Verificar se a interação é do tipo renovação
    if (!data?.type?.includes('renovacao') && !data?.notes?.toLowerCase().includes('renov')) {
      return Response.json({ success: true, message: 'Not a renewal interaction' });
    }

    const clientId = data.client_id;
    if (!clientId) {
      return Response.json({ success: false, error: 'No client_id in interaction' });
    }

    // Buscar certificados do cliente
    const certificates = await base44.asServiceRole.entities.Certificate.filter({ 
      client_id: clientId 
    });

    if (certificates.length === 0) {
      return Response.json({ success: true, message: 'No certificates found for client' });
    }

    // Buscar o cliente para obter tipo de certificado
    const client = await base44.asServiceRole.entities.Client.get(clientId);

    // Calcular nova data de vencimento (1 ano a partir de hoje)
    const today = new Date();
    const newExpiryDate = new Date(today);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
    const expiryDateStr = newExpiryDate.toISOString().split('T')[0];

    const updated = [];

    for (const cert of certificates) {
      // Atualizar certificado com nova data de vencimento
      await base44.asServiceRole.entities.Certificate.update(cert.id, {
        expiry_date: expiryDateStr,
        renewal_status: 'renovado',
        last_contact_date: today.toISOString().split('T')[0]
      });

      updated.push(cert.id);
    }

    // Atualizar também o cadastro do cliente
    if (client.has_certificate) {
      await base44.asServiceRole.entities.Client.update(clientId, {
        certificate_expiry_date: expiryDateStr,
        renewal_status: 'renovado'
      });
    }

    return Response.json({
      success: true,
      certificates_updated: updated.length,
      new_expiry_date: expiryDateStr,
      updated_ids: updated
    });

  } catch (error) {
    console.error('Update certificate error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});