import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SignJWT, importPKCS8 } from 'npm:jose@5.2.0';

// Configurações fixas
const SPREADSHEET_ID = '13SiGYKT3TwRXjhnogdHAMGXZrWjT15aiEQONn-r54qE';
const SHEET_NAME = 'Página1';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

Deno.serve(async (req) => {
  try {
    // --- STEP 1: AUTENTICAÇÃO BASE44 ---
    console.log("Iniciando exportação...");
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // --- STEP 2: CARREGAR E SANITIZAR SECRETS ---
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    let privateKeyPEM = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

    if (!serviceAccountEmail || !privateKeyPEM) {
      throw new Error('❌ ERRO CRÍTICO: Credenciais do Google não configuradas. Verifique GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY nas variáveis de ambiente.');
    }

    // ⚡ TRUQUE DE ENGENHARIA: Converter '\n' literais em quebras de linha reais
    privateKeyPEM = privateKeyPEM.replace(/\\n/g, '\n');

    // --- STEP 3: AUTENTICAÇÃO GOOGLE (JWT) ---
    console.log("Importando chave privada com importPKCS8...");
    const privateKey = await importPKCS8(privateKeyPEM, 'RS256');
    
    console.log("Gerando JWT assinado...");
    const jwt = await new SignJWT({
      scope: SCOPES,
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setIssuer(serviceAccountEmail)
      .setSubject(serviceAccountEmail)
      .setAudience('https://oauth2.googleapis.com/token')
      .setExpirationTime('1h')
      .sign(privateKey);

    // --- STEP 4: TROCAR JWT POR ACCESS TOKEN ---
    console.log("Trocando JWT por Access Token...");
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error("Erro detalhado do Google:", tokenData);
      throw new Error(`Falha na autenticação Google: ${tokenData.error_description || JSON.stringify(tokenData)}`);
    }

    console.log("✅ Access Token obtido com sucesso!");

    // --- STEP 5: BUSCAR DADOS DO CRM ---
    console.log("Buscando clientes do banco de dados...");
    const clients = await base44.entities.Client.list('-created_date', 1000);

    if (!clients || clients.length === 0) {
      return Response.json({
        success: false,
        message: 'Nenhum cliente encontrado para exportar.',
      });
    }

    // --- STEP 6: PREPARAR DADOS PARA EXPORTAÇÃO ---
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const rows = [
      ['ID', 'CPF', 'CNPJ', 'Nome', 'Empresa', 'Email', 'Telefone', 'WhatsApp', 'Status', 'Origem', 'Data Cadastro', 'Agente']
    ];

    for (const client of clients) {
      rows.push([
        client.id || '',
        client.cpf || '',
        client.cnpj || '',
        client.client_name || '',
        client.company_name || '',
        client.email || '',
        client.phone || '',
        client.whatsapp || '',
        client.lead_status || '',
        client.lead_source || '',
        formatDate(client.created_date),
        client.assigned_agent || '',
      ]);
    }

    // --- STEP 7: ENVIAR PARA GOOGLE SHEETS ---
    console.log(`Enviando ${rows.length} linhas para Google Sheets...`);
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:L:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
      }
    );

    const sheetsResult = await sheetsResponse.json();

    if (sheetsResult.error) {
      console.error("Erro da API do Google Sheets:", sheetsResult);
      
      if (sheetsResponse.status === 403) {
        throw new Error(`❌ Erro de Permissão: Verifique se a planilha foi compartilhada com ${serviceAccountEmail} com permissão de EDITOR`);
      }
      if (sheetsResponse.status === 404) {
        throw new Error(`❌ Planilha não encontrada. Verifique se o ID está correto e se a aba "${SHEET_NAME}" existe`);
      }
      
      throw new Error(`Erro Google Sheets: ${sheetsResult.error.message}`);
    }

    // --- SUCCESS ---
    console.log("✅ Exportação concluída com sucesso!");
    return Response.json({
      success: true,
      message: `${clients.length} clientes exportados com sucesso para Google Sheets`,
      updatedCells: sheetsResult.updates?.updatedCells || 0,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    });

  } catch (error) {
    // --- ERROR HANDLING ---
    console.error("❌ ERRO FINAL:", error.message);
    console.error("Stack:", error.stack);
    
    return Response.json({
      error: error.message || 'Erro desconhecido',
      tip: 'Verifique os Logs da função backend para mais detalhes',
    }, { status: 500 });
  }
});