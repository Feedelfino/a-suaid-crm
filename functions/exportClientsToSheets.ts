import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Obter o spreadsheet_id do body ou usar o padrão
        const body = await req.json().catch(() => ({}));
        const spreadsheetId = body.spreadsheet_id || '1OOC_AWdV0zv6qwLzXRPHNLiDEp4hmTFzpByp_tioVdo';
        const sheetName = body.sheet_name || 'Clientes';

        // Obter access token do Google Sheets
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

        // Buscar todos os clientes
        const clients = await base44.asServiceRole.entities.Client.list();

        // Preparar os dados para exportação
        const headers = [
            'ID',
            'Código do Cliente',
            'Nome do Cliente',
            'Nome da Empresa',
            'CPF',
            'CNPJ',
            'Email',
            'Telefone',
            'WhatsApp',
            'Endereço',
            'Área de Atuação',
            'Status do Lead',
            'Origem do Lead',
            'Agente Responsável',
            'Etapa do Funil',
            'Data de Criação',
            'Data de Atualização',
            'Origem de Sincronização',
            'Última Sincronização'
        ];

        const rows = clients.map(client => [
            client.id || '',
            client.client_code || '',
            client.client_name || '',
            client.company_name || '',
            client.cpf || '',
            client.cnpj || '',
            client.email || '',
            client.phone || '',
            client.whatsapp || '',
            client.address || '',
            client.business_area || '',
            client.lead_status || '',
            client.lead_source || '',
            client.assigned_agent || '',
            client.funnel_stage || '',
            client.created_date || '',
            client.updated_date || '',
            'CRM', // sync_source
            new Date().toISOString() // last_sync_at
        ]);

        // Limpar a planilha primeiro
        const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:clear`;
        await fetch(clearUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            }
        });

        // Escrever dados na planilha
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1:append?valueInputOption=RAW`;
        const updateResponse = await fetch(updateUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: [headers, ...rows]
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.text();
            throw new Error(`Erro ao escrever na planilha: ${error}`);
        }

        // Formatar o cabeçalho (negrito e fundo cinza)
        const formatUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
        await fetch(formatUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: [
                    {
                        repeatCell: {
                            range: {
                                sheetId: 0,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                                    textFormat: { bold: true }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    }
                ]
            })
        });

        return Response.json({
            success: true,
            message: `${clients.length} clientes exportados com sucesso`,
            spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
        });

    } catch (error) {
        console.error('Erro na exportação:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});