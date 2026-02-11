import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const payload = await req.json();

        // Validar payload do Google Apps Script
        if (!payload || !payload.spreadsheetId || !payload.changes) {
            return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const { changes } = payload;

        for (const change of changes) {
            const { action, rowData } = change;

            if (!rowData || rowData.length < 3) continue; // Precisa ter pelo menos ID, código e nome

            const [id, client_code, client_name, company_name, cpf, cnpj, email, phone, whatsapp, address, business_area, lead_status, lead_source, assigned_agent] = rowData;

            if (action === 'add') {
                // Verificar se já existe pelo nome ou CPF/CNPJ para evitar duplicatas
                const existingClients = await base44.asServiceRole.entities.Client.filter({
                    client_name
                });

                if (existingClients.length === 0) {
                    await base44.asServiceRole.entities.Client.create({
                        client_code: client_code || undefined,
                        client_name: client_name || 'Novo Cliente',
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
                        client_name: client_name || 'Novo Cliente',
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
        }

        return Response.json({ success: true, processed: changes.length });

    } catch (error) {
        console.error('Erro no webhook:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});