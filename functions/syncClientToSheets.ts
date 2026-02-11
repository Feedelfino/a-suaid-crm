import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data } = await req.json();

        if (!event || !data) {
            return Response.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // Buscar configuração da planilha
        const configs = await base44.asServiceRole.entities.Client.filter({ client_code: 'GOOGLE_SHEETS_CONFIG' });
        if (configs.length === 0) {
            return Response.json({ error: 'Planilha não configurada' }, { status: 400 });
        }

        const spreadsheetId = configs[0].notes; // Armazenamos o ID na nota do registro de config

        if (!spreadsheetId) {
            return Response.json({ error: 'Spreadsheet ID não encontrado' }, { status: 400 });
        }

        // Obter access token
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

        const client = data;

        if (event.type === 'create') {
            // Adicionar nova linha na planilha
            const newRow = [
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
                client.assigned_agent || ''
            ];

            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clientes!A:A:append?valueInputOption=RAW`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: [newRow]
                })
            });
        } else if (event.type === 'update') {
            // Buscar a linha do cliente pelo ID
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clientes!A:A`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            const sheetData = await response.json();
            const rows = sheetData.values || [];
            
            // Encontrar índice da linha com o ID do cliente
            const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === client.id);

            if (rowIndex > 0) {
                // Atualizar a linha
                const updatedRow = [
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
                    client.assigned_agent || ''
                ];

                await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clientes!A${rowIndex + 1}:N${rowIndex + 1}?valueInputOption=RAW`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        values: [updatedRow]
                    })
                });
            }
        } else if (event.type === 'delete') {
            // Buscar e remover a linha
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clientes!A:A`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            });

            const sheetData = await response.json();
            const rows = sheetData.values || [];
            
            const rowIndex = rows.findIndex((row, index) => index > 0 && row[0] === client.id);

            if (rowIndex > 0) {
                await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        requests: [{
                            deleteDimension: {
                                range: {
                                    sheetId: 0,
                                    dimension: 'ROWS',
                                    startIndex: rowIndex,
                                    endIndex: rowIndex + 1
                                }
                            }
                        }]
                    })
                });
            }
        }

        return Response.json({ success: true });

    } catch (error) {
        console.error('Erro ao sincronizar:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});