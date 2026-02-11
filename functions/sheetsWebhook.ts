import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ========= Segurança (Token) =========
    const providedToken =
      req.headers.get('Authorization')?.replace('Bearer ', '') ||
      new URL(req.url).searchParams.get('token');

    const expectedToken = Deno.env.get("SYNC_TOKEN");

    if (!providedToken || !expectedToken || providedToken !== expectedToken) {
      return Response.json(
        { error: 'Unauthorized: Invalid or missing token' },
        { status: 401 }
      );
    }

    // ========= Payload =========
    const payload = await req.json();

    if (!payload || !payload.action || !payload.client) {
      return Response.json(
        { error: 'Invalid payload: Missing action or client data' },
        { status: 400 }
      );
    }

    const { action, client } = payload;

    const {
      id,
      client_code,
      client_name,
      company_name,
      cpf,
      cnpj,
      email,
      phone,
      whatsapp,
      address,
      business_area,
      lead_status,
      lead_source,
      assigned_agent,
    } = client;

    if (!client_name) {
      return Response.json(
        { error: 'Invalid client data: client_name is required' },
        { status: 400 }
      );
    }

    // ========= Dados para create/update =========
    const data = {
      client_code: client_code || undefined,
      client_name: client_name,
      company_name: company_name || '',
      cpf: cpf || '',
      cnpj: cnpj || '',
      email: email || '',
      phone: phone || '',
      whatsapp: whatsapp || '',
      address: address || '',
      business_area: business_area || '',
      lead_status: lead_status || 'novo',
      lead_source: lead_source || 'outro',
      assigned_agent: assigned_agent || '',
    };

    // ========= Ações =========
    if (action === 'add') {
      // Upsert por client_name (melhorar depois para CPF/CNPJ/phone/email)
      const existingClients = await base44.asServiceRole.entities.Client.filter({
        client_name,
      });

      if (existingClients.length > 0) {
        const existingId = existingClients[0].id;

        await base44.asServiceRole.entities.Client.update(existingId, data);

        return Response.json({
          success: true,
          action: 'upsert',
          id: existingId,
        });
      }

      const created = await base44.asServiceRole.entities.Client.create(data);

      return Response.json({
        success: true,
        action: 'add',
        id: created.id,
      });
    }

    if (action === 'edit') {
      if (!id) {
        return Response.json(
          { error: 'Invalid payload: id is required for edit' },
          { status: 400 }
        );
      }

      try {
        await base44.asServiceRole.entities.Client.update(id, data);

        return Response.json({
          success: true,
          action: 'edit',
          id,
        });
      } catch (error) {
        console.error(`Cliente ${id} não encontrado para atualizar`);
        return Response.json(
          { success: false, action: 'edit', id, error: 'Client not found' },
          { status: 404 }
        );
      }
    }

    if (action === 'delete') {
      if (!id) {
        return Response.json(
          { error: 'Invalid payload: id is required for delete' },
          { status: 400 }
        );
      }

      try {
        await base44.asServiceRole.entities.Client.delete(id);

        return Response.json({
          success: true,
          action: 'delete',
          id,
        });
      } catch (error) {
        console.error(`Cliente ${id} não encontrado para deletar`);
        return Response.json(
          { success: false, action: 'delete', id, error: 'Client not found' },
          { status: 404 }
        );
      }
    }

    return Response.json(
      { error: `Invalid action: ${action}` },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
    return Response.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
});
