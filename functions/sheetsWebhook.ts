import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Verificar token de segurança
        const providedToken = req.headers.get('Authorization')?.replace('Bearer ', '') || new URL(req.url).searchParams.get('token');
        const expectedToken = Deno.env.get("SYNC_TOKEN");

        if (!providedToken || providedToken !== expectedToken) {
            return Response.json({ error: 'Unauthorized: Invalid or missing token' }, { status: 401 });
        }

        const payload = await req.json();

        // Validar payload do Google Apps Script
        if (!payload || !payload.action || !payload.client) {
            return Response.json({ error: 'Invalid payload: Missing action or client data' }, { status: 400 });
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
            assigned_agent
        } = client;

        if (!client_name) {
            return Response.json({ error: 'Invalid client data: client_name is required' }, { status: 400 });
        }

        if (action === 'add') {
            // Verificar se já existe pelo nome ou CPF/CNPJ para evitar duplicatas
            const existingClients = await base44.asServiceRole.entities.Client.filter({
                client_name
            });

            if (existingClients.length === 0) {
                await base44.asServiceRole.entities.Client.create({
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
                });
            }
        } else if (action === 'edit' && id) {
            // Atualizar cliente existente
            try {
                await base44.asServiceRole.entities.Client.update(id, {
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
                });
            } catch (error) {
                console.error(`Cliente ${id} não encontrado para atualizar`);
            }
        } else if (action === 'delete' && id) {
            // Deletar cliente
            try {
                await base44.asServiceRole.entities.Client.delete(id);
            } catch (error) {
                console.error(`Cliente ${id} não encontrado para deletar`);
            }
        }

        return Response.json({ success: true, message: `Processed client ${action}` });

    } catch (error) {
        console.error('Erro no webhook:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});