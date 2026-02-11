import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const spreadsheetUrl = body.spreadsheet_url;
        
        if (!spreadsheetUrl) {
            return Response.json({ error: 'URL da planilha é obrigatória' }, { status: 400 });
        }

        // Extrair spreadsheet ID da URL
        const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            return Response.json({ error: 'URL inválida' }, { status: 400 });
        }
        const spreadsheetId = match[1];

        // Obter access token do Google Sheets
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

        // Buscar todas as entidades
        const [clients, interactions, appointments, tasks, campaigns, goals, certificates] = await Promise.all([
            base44.asServiceRole.entities.Client.list(),
            base44.asServiceRole.entities.Interaction.list(),
            base44.asServiceRole.entities.Appointment.list(),
            base44.asServiceRole.entities.Task.list(),
            base44.asServiceRole.entities.Campaign.list(),
            base44.asServiceRole.entities.Goal.list(),
            base44.asServiceRole.entities.Certificate.list(),
        ]);

        const sheets = [
            {
                name: 'Clientes',
                headers: ['ID', 'Código', 'Nome', 'Empresa', 'CPF', 'CNPJ', 'Email', 'Telefone', 'WhatsApp', 'Endereço', 'Área', 'Status', 'Origem', 'Agente', 'Funil', 'Criado em', 'Atualizado em'],
                rows: clients.map(c => [
                    c.id || '', c.client_code || '', c.client_name || '', c.company_name || '',
                    c.cpf || '', c.cnpj || '', c.email || '', c.phone || '', c.whatsapp || '',
                    c.address || '', c.business_area || '', c.lead_status || '', c.lead_source || '',
                    c.assigned_agent || '', c.funnel_stage || '', c.created_date || '', c.updated_date || ''
                ])
            },
            {
                name: 'Interações',
                headers: ['ID', 'Protocolo', 'Cliente ID', 'Cliente Nome', 'Tipo', 'Método', 'Produto', 'Tabulação', 'Valor', 'Desconto', 'Data Follow-up', 'Notas', 'Agente', 'Criado em'],
                rows: interactions.map(i => [
                    i.id || '', i.protocol_number || '', i.client_id || '', i.client_name || '',
                    i.interaction_type || '', i.contact_method || '', i.product_offered || '',
                    i.tabulation || '', i.sale_value || '', i.discount_percent || '',
                    i.followup_date || '', i.notes || '', i.agent_name || '', i.created_date || ''
                ])
            },
            {
                name: 'Agenda',
                headers: ['ID', 'Título', 'Categoria', 'Tipo', 'Cliente', 'Data', 'Horário', 'Duração', 'Local/Link', 'Status', 'Agente', 'Criado em'],
                rows: appointments.map(a => [
                    a.id || '', a.title || '', a.category || '', a.event_type || '',
                    a.client_name || '', a.date || '', a.time || '', a.duration || '',
                    a.location || a.meeting_link || '', a.status || '', a.agent || '', a.created_date || ''
                ])
            },
            {
                name: 'Tarefas',
                headers: ['ID', 'Título', 'Tipo', 'Cliente', 'Agente', 'Data Prevista', 'Status', 'Interação Registrada', 'Notas', 'Criado em'],
                rows: tasks.map(t => [
                    t.id || '', t.title || '', t.task_type || '', t.client_name || '',
                    t.agent || '', t.due_date || '', t.status || '', t.interaction_registered ? 'Sim' : 'Não',
                    t.notes || '', t.created_date || ''
                ])
            },
            {
                name: 'Campanhas',
                headers: ['ID', 'Nome', 'Descrição', 'Início', 'Fim', 'Meta Valor', 'Meta Quantidade', 'Alcançado Valor', 'Alcançado Quantidade', 'Status', 'Gerente', 'Criado em'],
                rows: campaigns.map(c => [
                    c.id || '', c.name || '', c.description || '', c.start_date || '',
                    c.end_date || '', c.goal || '', c.goal_quantity || '', c.achieved_value || '',
                    c.achieved_quantity || '', c.status || '', c.campaign_manager || '', c.created_date || ''
                ])
            },
            {
                name: 'Metas',
                headers: ['ID', 'Período', 'Tipo', 'Ano', 'Mês', 'Agente', 'Meta Valor', 'Meta Quantidade', 'Alcançado Valor', 'Alcançado Quantidade', 'Criado em'],
                rows: goals.map(g => [
                    g.id || '', g.period_type || '', g.goal_type || '', g.year || '',
                    g.month || '', g.agent || '', g.goal_value || '', g.goal_quantity || '',
                    g.achieved_value || '', g.achieved_quantity || '', g.created_date || ''
                ])
            },
            {
                name: 'Certificados',
                headers: ['ID', 'Cliente', 'Email', 'Telefone', 'Tipo', 'Emissão', 'Vencimento', 'Status', 'Status Renovação', 'Agente', 'Criado em'],
                rows: certificates.map(c => [
                    c.id || '', c.client_name || '', c.client_email || '', c.client_phone || '',
                    c.certificate_type || '', c.issue_date || '', c.expiry_date || '',
                    c.status || '', c.renewal_status || '', c.assigned_agent || '', c.created_date || ''
                ])
            }
        ];

        // Criar/atualizar cada aba
        for (const sheet of sheets) {
            // Limpar aba
            const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet.name}:clear`;
            await fetch(clearUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            // Escrever dados
            const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet.name}!A1:append?valueInputOption=RAW`;
            await fetch(updateUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: [sheet.headers, ...sheet.rows]
                })
            });
        }

        // Formatar cabeçalhos
        const formatUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
        await fetch(formatUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: sheets.map((_, index) => ({
                    repeatCell: {
                        range: {
                            sheetId: index,
                            startRowIndex: 0,
                            endRowIndex: 1
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 0.2, green: 0.2, blue: 0.8 },
                                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                }))
            })
        });

        return Response.json({
            success: true,
            message: `Dados exportados com sucesso`,
            details: {
                clientes: clients.length,
                interacoes: interactions.length,
                agenda: appointments.length,
                tarefas: tasks.length,
                campanhas: campaigns.length,
                metas: goals.length,
                certificados: certificates.length
            },
            spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        });

    } catch (error) {
        console.error('Erro na exportação:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});