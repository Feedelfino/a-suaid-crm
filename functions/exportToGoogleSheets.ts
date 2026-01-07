import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@140.0.0';

// ============================================================================
// EXPORT DATA TO GOOGLE SHEETS USING SERVICE ACCOUNT
// ============================================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, sheetTitle, entityType } = await req.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return Response.json({ 
        error: 'No data provided or empty data array' 
      }, { status: 400 });
    }

    // Load Service Account credentials
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKeyRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
    
    if (!serviceAccountEmail || !privateKeyRaw) {
      return Response.json({ 
        error: 'Service account credentials not configured. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY secrets.' 
      }, { status: 500 });
    }

    // CRITICAL FIX: Handle newlines in private key
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    // Create JWT client
    const jwtClient = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Authorize
    await jwtClient.authorize();

    const sheets = google.sheets({ version: 'v4', auth: jwtClient });

    // Create new spreadsheet
    const title = sheetTitle || `${entityType || 'Dados'} Export - ${new Date().toLocaleDateString('pt-BR')}`;
    
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title
        }
      }
    });

    const spreadsheetId = createResponse.data.spreadsheetId;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    // Prepare data for export
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    }));

    // Write data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers, ...rows]
      }
    });

    // Format headers (bold, background color)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
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
                  backgroundColor: { red: 0.42, green: 0.18, blue: 0.55 }, // Purple
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)'
            }
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: headers.length }
            }
          }
        ]
      }
    });

    return Response.json({ 
      success: true, 
      spreadsheetId,
      spreadsheetUrl,
      rowsExported: data.length,
      message: `${data.length} registros exportados com sucesso!`
    });

  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});