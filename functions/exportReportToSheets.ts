import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, headers, title } = await req.json();

    if (!data || !headers || !title) {
      return Response.json(
        { error: 'Missing required fields: data, headers, title' },
        { status: 400 }
      );
    }

    // Obter token de acesso do Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Criar nova planilha
    const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: title,
        },
        sheets: [{
          properties: {
            title: 'Dados',
          },
        }],
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create spreadsheet: ${error}`);
    }

    const spreadsheet = await createResponse.json();
    const spreadsheetId = spreadsheet.spreadsheetId;

    // Preparar dados para inserção
    const values = [
      headers,
      ...data.map(row => headers.map(header => row[header] ?? '')),
    ];

    // Inserir dados
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dados!A1:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values,
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      throw new Error(`Failed to update spreadsheet: ${error}`);
    }

    // Formatar cabeçalho
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
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
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.42, green: 0.18, blue: 0.55 },
                    textFormat: {
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: 0,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: headers.length,
                },
              },
            },
          ],
        }),
      }
    );

    return Response.json({
      success: true,
      spreadsheetId: spreadsheetId,
      url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });

  } catch (error) {
    console.error('Error exporting to Sheets:', error);
    return Response.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
});