// ============================================================
// BACKEND — Função: migrateCertificatesToClients
// Migra os dados da entidade Certificate para a entidade Client.
// Para cada certificado existente:
//   - Se encontrar um cliente com o mesmo e-mail ou ID → atualiza
//   - Se não encontrar → cria um novo cliente com os dados do cert.
// Só pode ser executada por usuários com role "admin".
// Chamada pelo frontend via: base44.functions.invoke('migrateCertificatesToClients')
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6'; // SDK base44 para funções backend (Deno)

// Deno.serve é o ponto de entrada de toda função backend no base44
Deno.serve(async (req) => {
  try {
    // Cria o cliente base44 a partir da requisição HTTP (mantém o contexto de autenticação)
    const base44 = createClientFromRequest(req);

    // Verifica a identidade do usuário que chamou esta função
    const user = await base44.auth.me();

    // Segurança: apenas administradores podem executar migrações de dados
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem executar migrações' }, { status: 403 });
    }

    // BACKEND: busca todos os certificados usando permissão de service role (admin de sistema)
    const certificates = await base44.asServiceRole.entities.Certificate.list();
    
    // BACKEND: busca todos os clientes já cadastrados para verificar duplicatas
    const existingClients = await base44.asServiceRole.entities.Client.list();
    
    // Contadores para o resumo final da migração
    let migrated = 0; // Certificados que geraram novos clientes
    let updated = 0;  // Certificados que atualizaram clientes existentes
    let skipped = 0;  // Certificados que deram erro e foram ignorados

    // Percorre cada certificado e decide se cria ou atualiza o cliente correspondente
    for (const cert of certificates) {
      try {
        const cpf = String(cert.client_id || '').replace(/\D/g, ''); // Remove formatação do CPF
        const email = cert.client_email?.toLowerCase().trim(); // Normaliza o e-mail para comparação
        
        // Tenta localizar um cliente já cadastrado com o mesmo ID ou e-mail
        let existingClient = existingClients.find(c => {
          if (c.id === cert.client_id) return true;
          if (email && c.email?.toLowerCase().trim() === email) return true;
          return false;
        });

        if (existingClient) {
          // Cliente já existe → apenas atualiza os campos de certificado
          await base44.asServiceRole.entities.Client.update(existingClient.id, {
            has_certificate: true,
            certificate_type: cert.certificate_type,
            certificate_expiry_date: cert.expiry_date,
            renewal_status: cert.status === 'vencido' ? 'vencido' : 
                           cert.renewal_status === 'renovado' ? 'renovado' : 'ativo',
            lead_source: existingClient.lead_source || 'renovacao',
          });
          updated++;
        } else {
          // Cliente não encontrado → cria um novo com os dados do certificado
          const newClient = await base44.asServiceRole.entities.Client.create({
            client_name: cert.client_name || 'Cliente sem nome',
            email: cert.client_email || '',
            phone: cert.client_phone || '',
            whatsapp: cert.client_phone || '', // Usa o mesmo telefone para WhatsApp por padrão
            has_certificate: true,
            certificate_type: cert.certificate_type,
            certificate_expiry_date: cert.expiry_date,
            renewal_status: cert.status === 'vencido' ? 'vencido' : 
                           cert.renewal_status === 'renovado' ? 'renovado' : 'ativo',
            lead_status: 'qualificado', // Lead qualificado pois já tem produto
            lead_source: 'renovacao',   // Origem marcada como renovação
            funnel_stage: 'contato',    // Etapa inicial do funil
            notes: `Migrado do módulo de renovação - ${cert.notes || ''}`,
          });
          
          // Vincula o certificado ao novo cliente criado
          await base44.asServiceRole.entities.Certificate.update(cert.id, {
            client_id: newClient.id,
          });
          
          migrated++;
        }
      } catch (error) {
        // Se der erro em um certificado específico, registra e continua para o próximo
        console.error(`Erro ao processar certificado ${cert.id}:`, error);
        skipped++;
      }
    }

    // Retorna o resumo completo da operação para o frontend
    return Response.json({
      success: true,
      migrated,
      updated,
      skipped,
      total: certificates.length,
      message: `Migração concluída: ${migrated} novos, ${updated} atualizados, ${skipped} ignorados`
    });

  } catch (error) {
    // Retorna erro genérico caso ocorra uma falha não esperada
    return Response.json({ error: error.message }, { status: 500 });
  }
});