import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { SignJWT, importPKCS8 } from 'npm:jose@5.2.0';

// Configurações
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

// LIMITES DO GOOGLE SHEETS API
const LIMITS = {
  maxCellsPerSheet: 10000000, // 10 milhões de células
  maxColumnsPerSheet: 18278,
  maxRowsPerRequest: 40000, // Máximo por operação append
  dailyReadQuota: 500, // 500 leituras por dia (quota gratuita)
  maxRowsPerDay: 20000, // Recomendado para não estourar quota
};

async function getAccessToken(serviceAccountEmail, privateKeyPEM) {
  privateKeyPEM = privateKeyPEM.replace(/\\n/g, '\n');
  
  const privateKey = await importPKCS8(privateKeyPEM, 'RS256');
  
  const jwt = await new SignJWT({ scope: SCOPES })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(serviceAccountEmail)
    .setSubject(serviceAccountEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setExpirationTime('1h')
    .sign(privateKey);

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
    throw new Error(`Falha na autenticação: ${tokenData.error_description || JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

async function readSheet(accessToken, spreadsheetId, sheetName, maxRows) {
  const range = maxRows ? `${sheetName}!A1:L${maxRows + 1}` : `${sheetName}!A:L`;
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erro ao ler planilha: ${error.error?.message || response.statusText}`);
  }

  return await response.json();
}

function detectDataType(headers) {
  const headerStr = headers.join(' ').toLowerCase();
  const isRenewal = headerStr.includes('dt_fim') || 
                    headerStr.includes('validade') || 
                    headerStr.includes('vencimento') ||
                    headerStr.includes('expir');
  return isRenewal ? 'renewal' : 'client';
}

function mapRowToClient(row, headers) {
  const client = {};
  
  headers.forEach((header, index) => {
    const value = row[index];
    if (!value) return;
    
    const headerLower = header.toLowerCase().trim();
    
    // Mapeamento inteligente de colunas
    if (headerLower.includes('cpf')) client.cpf = value;
    else if (headerLower.includes('cnpj')) client.cnpj = value;
    else if (headerLower.includes('nome') && !headerLower.includes('empresa')) client.client_name = value;
    else if (headerLower.includes('empresa') || headerLower.includes('companhia')) client.company_name = value;
    else if (headerLower.includes('email') || headerLower.includes('e-mail')) client.email = value;
    else if (headerLower.includes('telefone') || headerLower.includes('fone')) client.phone = value;
    else if (headerLower.includes('whatsapp')) client.whatsapp = value;
    else if (headerLower.includes('status')) client.lead_status = value;
    else if (headerLower.includes('origem') || headerLower.includes('source')) client.lead_source = value;
    else if (headerLower.includes('agente') || headerLower.includes('responsável')) client.assigned_agent = value;
  });
  
  return client;
}

function mapRowToCertificate(row, headers) {
  const cert = {};
  
  headers.forEach((header, index) => {
    const value = row[index];
    if (!value) return;
    
    const headerLower = header.toLowerCase().trim();
    
    if (headerLower.includes('cpf')) cert.client_cpf = value;
    else if (headerLower.includes('cnpj')) cert.client_cnpj = value;
    else if (headerLower.includes('nome')) cert.client_name = value;
    else if (headerLower.includes('email')) cert.client_email = value;
    else if (headerLower.includes('telefone') || headerLower.includes('fone')) cert.client_phone = value;
    else if (headerLower.includes('tipo')) {
      const tipo = value.toLowerCase();
      if (tipo.includes('a1')) cert.certificate_type = tipo.includes('cnpj') ? 'e_cnpj_a1' : 'e_cpf_a1';
      else if (tipo.includes('a3')) cert.certificate_type = tipo.includes('cnpj') ? 'e_cnpj_a3' : 'e_cpf_a3';
    }
    else if (headerLower.includes('emissão') || headerLower.includes('emissao')) cert.issue_date = value;
    else if (headerLower.includes('dt_fim') || headerLower.includes('validade') || headerLower.includes('vencimento')) {
      cert.expiry_date = value;
    }
    else if (headerLower.includes('agente')) cert.assigned_agent = value;
  });
  
  return cert;
}

Deno.serve(async (req) => {
  try {
    console.log("Iniciando importação...");
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Receber parâmetros
    const { spreadsheetId, sheetName, maxRows } = await req.json();

    if (!spreadsheetId || !sheetName) {
      return Response.json({ 
        error: 'Parâmetros obrigatórios: spreadsheetId e sheetName' 
      }, { status: 400 });
    }

    // Validar limites
    const rowsToImport = maxRows || 1000;
    if (rowsToImport > LIMITS.maxRowsPerRequest) {
      return Response.json({ 
        error: `Máximo de ${LIMITS.maxRowsPerRequest} linhas por importação` 
      }, { status: 400 });
    }

    // Autenticar com Google
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKeyPEM = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

    if (!serviceAccountEmail || !privateKeyPEM) {
      throw new Error('Credenciais do Google não configuradas');
    }

    const accessToken = await getAccessToken(serviceAccountEmail, privateKeyPEM);

    // Ler dados da planilha
    console.log(`Lendo planilha ${sheetName} (max ${rowsToImport} linhas)...`);
    const sheetData = await readSheet(accessToken, spreadsheetId, sheetName, rowsToImport);

    if (!sheetData.values || sheetData.values.length < 2) {
      return Response.json({
        success: false,
        message: 'Planilha vazia ou sem dados para importar',
      });
    }

    const [headers, ...dataRows] = sheetData.values;
    
    // Detectar tipo de dados (clientes ou renovações)
    const dataType = detectDataType(headers);
    console.log(`Tipo de dados detectado: ${dataType}`);
    
    // Processar dados
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      dataType,
    };

    if (dataType === 'renewal') {
      // Processar renovações (certificados)
      for (const row of dataRows) {
        try {
          const certData = mapRowToCertificate(row, headers);
          
          if (!certData.client_name || !certData.expiry_date) {
            results.skipped++;
            continue;
          }

          // Verificar se certificado já existe
          let existingCerts = [];
          if (certData.client_cpf) {
            existingCerts = await base44.asServiceRole.entities.Certificate.filter({ 
              client_name: certData.client_name,
              expiry_date: certData.expiry_date 
            });
          }

          if (existingCerts.length > 0) {
            await base44.asServiceRole.entities.Certificate.update(existingCerts[0].id, certData);
            results.updated++;
          } else {
            await base44.asServiceRole.entities.Certificate.create(certData);
            results.created++;
          }
        } catch (err) {
          results.errors.push(`Linha ${dataRows.indexOf(row) + 2}: ${err.message}`);
        }
      }
    } else {
      // Processar clientes normais
      for (const row of dataRows) {
        try {
          const clientData = mapRowToClient(row, headers);
          
          if (!clientData.client_name || (!clientData.cpf && !clientData.cnpj)) {
            results.skipped++;
            continue;
          }

          let existingClients = [];
          
          if (clientData.cpf) {
            existingClients = await base44.entities.Client.filter({ cpf: clientData.cpf });
          }
          
          if (existingClients.length === 0 && clientData.cnpj) {
            existingClients = await base44.entities.Client.filter({ cnpj: clientData.cnpj });
          }

          if (existingClients.length > 0) {
            await base44.entities.Client.update(existingClients[0].id, clientData);
            results.updated++;
          } else {
            await base44.entities.Client.create(clientData);
            results.created++;
          }
        } catch (err) {
          results.errors.push(`Linha ${dataRows.indexOf(row) + 2}: ${err.message}`);
        }
      }
    }

    console.log("✅ Importação concluída!");
    
    // Auto-merge de duplicatas após importação
    let mergeResults = null;
    if (results.created > 0) {
      console.log("🔄 Executando auto-merge de duplicatas...");
      try {
        // Buscar IDs dos clientes recém-criados
        const recentClients = await base44.entities.Client.list('-created_date', results.created);
        const newClientIds = recentClients.map(c => c.id);
        
        const mergeResponse = await base44.functions.invoke('autoMergeDuplicates', {
          newClientIds,
        });
        
        mergeResults = mergeResponse.data;
      } catch (err) {
        console.error("Erro no auto-merge:", err.message);
      }
    }
    
    return Response.json({
      success: true,
      message: `Importação concluída: ${results.created} criados, ${results.updated} atualizados, ${results.skipped} ignorados` +
               (mergeResults?.merged > 0 ? ` • ${mergeResults.merged} duplicata(s) unificada(s)` : ''),
      results,
      mergeResults,
      limits: {
        maxRowsPerImport: LIMITS.maxRowsPerRequest,
        maxRowsPerDay: LIMITS.maxRowsPerDay,
        dailyReadQuota: LIMITS.dailyReadQuota,
      },
    });

  } catch (error) {
    console.error("❌ Erro na importação:", error.message);
    return Response.json({
      error: error.message || 'Erro desconhecido',
      tip: 'Verifique se a planilha foi compartilhada com a conta de serviço e se as credenciais estão corretas',
    }, { status: 500 });
  }
});