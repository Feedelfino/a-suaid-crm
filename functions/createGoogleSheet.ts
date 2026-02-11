import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Obter access token do Google Sheets
        const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

        // Buscar todos os clientes
        const clients = await base44.asServiceRole.entities.Client.list('-created_date', 5000);

        // Criar nova planilha
        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                properties: {
                    title: 'CRM Clientes - Sincronização',
                },
                sheets: [{
                    properties: {
                        title: 'Clientes',
                        gridProperties: {
                            frozenRowCount: 1,
                        }
                    }
                }]
            })
        });

        if (!createResponse.ok) {
            throw new Error(`Erro ao criar planilha: ${await createResponse.text()}`);
        }

        const spreadsheet = await createResponse.json();
        const spreadsheetId = spreadsheet.spreadsheetId;

        // Preparar dados dos clientes
        const headers = [
            'ID', 'Código', 'Nome', 'Empresa', 'CPF', 'CNPJ', 
            'Email', 'Telefone', 'WhatsApp', 'Endereço', 
            'Área de Negócio', 'Status', 'Origem', 'Agente Responsável'
        ];

        const rows = clients.map(c => [
            c.id || '',
            c.client_code || '',
            c.client_name || '',
            c.company_name || '',
            c.cpf || '',
            c.cnpj || '',
            c.email || '',
            c.phone || '',
            c.whatsapp || '',
            c.address || '',
            c.business_area || '',
            c.lead_status || '',
            c.lead_source || '',
            c.assigned_agent || ''
        ]);

        const allData = [headers, ...rows];

        // Inserir dados na planilha
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clientes!A1:append?valueInputOption=RAW`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: allData
            })
        });

        // Formatar cabeçalhos
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
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
                                    backgroundColor: { red: 0.42, green: 0.18, blue: 0.55 },
                                    textFormat: {
                                        foregroundColor: { red: 1, green: 1, blue: 1 },
                                        bold: true
                                    }
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
            spreadsheetId,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
            clientsCount: clients.length
        });

    } catch (error) {
        console.error('Erro:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});