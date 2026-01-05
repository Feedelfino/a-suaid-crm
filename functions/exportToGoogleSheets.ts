import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SignJWT } from 'npm:jose@5.2.0';

const SPREADSHEET_ID = '13SiGYKT3TwRXjhnogdHAMGXZrWjT15aiEQONn-r54qE';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

async function getAccessToken() {
  const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

  if (!serviceAccountEmail || !privateKey) {
    throw new Error('Credenciais do Google não configuradas');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  // Criar JWT
  const jwt = await new SignJWT({
    iss: serviceAccountEmail,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .sign(await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    ));

  // Trocar JWT por access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Erro ao obter token de acesso do Google');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function appendToSheet(accessToken, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A:E:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: values,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 403) {
      throw new Error('Erro de Permissão: Verifique se a planilha foi compartilhada com o e-mail da automação (suaidbase@caramel-anvil-483414-n9.iam.gserviceaccount.com)');
    }
    throw new Error(`Erro ao exportar para Google Sheets: ${error}`);
  }

  return await response.json();
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Buscar todos os clientes
    const clients = await base44.entities.Client.list('-created_date', 1000);

    // Preparar dados para exportação
    const rows = [
      ['ID', 'Nome', 'Email', 'Telefone', 'Status', 'Data de Cadastro', 'Empresa', 'Agente Responsável']
    ];

    for (const client of clients) {
      rows.push([
        client.id || '',
        client.client_name || '',
        client.email || '',
        client.phone || '',
        client.lead_status || '',
        formatDate(client.created_date),
        client.company_name || '',
        client.assigned_agent || '',
      ]);
    }

    // Obter token e exportar
    const accessToken = await getAccessToken();
    const result = await appendToSheet(accessToken, rows);

    return Response.json({
      success: true,
      message: `${clients.length} clientes exportados com sucesso para Google Sheets`,
      updatedCells: result.updates?.updatedCells || 0,
    });

  } catch (error) {
    console.error('Erro na exportação:', error);
    return Response.json({
      error: error.message || 'Erro ao exportar dados',
    }, { status: 500 });
  }
});