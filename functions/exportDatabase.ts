import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all data using service role
    const [clients, certificates, interactions, appointments, campaigns, goals, tasks] = await Promise.all([
      base44.asServiceRole.entities.Client.list('-created_date', 5000),
      base44.asServiceRole.entities.Certificate.list('-created_date', 5000),
      base44.asServiceRole.entities.Interaction.list('-created_date', 5000),
      base44.asServiceRole.entities.Appointment.list('-created_date', 5000),
      base44.asServiceRole.entities.Campaign.list('-created_date', 500),
      base44.asServiceRole.entities.Goal.list('-created_date', 1000),
      base44.asServiceRole.entities.Task.list('-created_date', 2000),
    ]);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Clients sheet
    const clientsData = clients.map(c => ({
      'ID': c.id,
      'Nome': c.client_name,
      'Empresa': c.company_name,
      'CPF': c.cpf,
      'CNPJ': c.cnpj,
      'Telefone': c.phone,
      'WhatsApp': c.whatsapp,
      'Email': c.email,
      'Área de Negócio': c.business_area,
      'Status Lead': c.lead_status,
      'Origem Lead': c.lead_source,
      'Agente Responsável': c.assigned_agent,
      'ID Campanha': c.campaign_id,
      'Data Retorno': c.return_date,
      'Etapa Funil': c.funnel_stage,
      'Observações': c.notes,
      'Criado em': c.created_date,
      'Criado por': c.created_by,
    }));
    const clientsSheet = XLSX.utils.json_to_sheet(clientsData);
    XLSX.utils.book_append_sheet(workbook, clientsSheet, 'Clientes');

    // Certificates sheet
    const certificatesData = certificates.map(c => ({
      'ID': c.id,
      'ID Cliente': c.client_id,
      'Nome Cliente': c.client_name,
      'Email': c.client_email,
      'Telefone': c.client_phone,
      'Tipo Certificado': c.certificate_type,
      'Data Emissão': c.issue_date,
      'Data Vencimento': c.expiry_date,
      'Status': c.status,
      'Status Renovação': c.renewal_status,
      'Agente Responsável': c.assigned_agent,
      'Último Contato': c.last_contact_date,
      'Observações': c.notes,
      'Criado em': c.created_date,
    }));
    const certificatesSheet = XLSX.utils.json_to_sheet(certificatesData);
    XLSX.utils.book_append_sheet(workbook, certificatesSheet, 'Certificados');

    // Interactions sheet
    const interactionsData = interactions.map(i => ({
      'ID': i.id,
      'Protocolo': i.protocol_number,
      'ID Cliente': i.client_id,
      'Nome Cliente': i.client_name,
      'Tipo Interação': i.interaction_type,
      'Método Contato': i.contact_method,
      'Produto Oferecido': i.product_offered,
      'Tabulação': i.tabulation,
      'Motivo Sem Interesse': i.no_interest_reason,
      'Valor Venda': i.sale_value,
      'Teve Desconto': i.had_discount,
      'Percentual Desconto': i.discount_percent,
      'Data Follow-up': i.followup_date,
      'Método Follow-up': i.followup_method,
      'Tipo Parceria': i.partnership_type,
      'Agente': i.agent_name,
      'Email Agente': i.agent_email,
      'Observações': i.notes,
      'Criado em': i.created_date,
    }));
    const interactionsSheet = XLSX.utils.json_to_sheet(interactionsData);
    XLSX.utils.book_append_sheet(workbook, interactionsSheet, 'Interações');

    // Appointments sheet
    const appointmentsData = appointments.map(a => ({
      'ID': a.id,
      'Título': a.title,
      'Descrição': a.description,
      'Categoria': a.category,
      'Tipo Evento': a.event_type,
      'ID Cliente': a.client_id,
      'Nome Cliente': a.client_name,
      'Empresa': a.company_name,
      'Telefone': a.phone,
      'Email': a.email,
      'Agente': a.agent,
      'Email Agente': a.agent_email,
      'Participantes': Array.isArray(a.participants) ? a.participants.filter(Boolean).join(', ') : '',
      'Tipo Compromisso': a.appointment_type,
      'Data': a.date,
      'Horário': a.time,
      'Duração (min)': a.duration,
      'Local': a.location,
      'Link Reunião': a.meeting_link,
      'Agendado por': a.scheduled_by,
      'Origem Lead': a.lead_source,
      'Motivo Reunião': a.meeting_reason,
      'Produto': a.product,
      'ID Campanha': a.campaign_id,
      'Etapa Funil': a.funnel_stage,
      'Área Interna': a.internal_area,
      'Status': a.status,
      'Google Event ID': a.google_event_id,
      'Observações': a.notes,
      'Criado em': a.created_date,
    }));
    const appointmentsSheet = XLSX.utils.json_to_sheet(appointmentsData);
    XLSX.utils.book_append_sheet(workbook, appointmentsSheet, 'Compromissos');

    // Campaigns sheet
    const campaignsData = campaigns.map(c => ({
      'ID': c.id,
      'Nome': c.name,
      'Descrição': c.description,
      'Data Início': c.start_date,
      'Data Fim': c.end_date,
      'Meta Valor': c.goal,
      'Meta Quantidade': c.goal_quantity,
      'Produto Alvo': c.target_product,
      'Região Alvo': c.target_region,
      'Agentes Atribuídos': Array.isArray(c.assigned_agents) ? c.assigned_agents.filter(Boolean).join(', ') : '',
      'Gerente Campanha': c.campaign_manager,
      'Status': c.status,
      'Valor Alcançado': c.achieved_value,
      'Quantidade Alcançada': c.achieved_quantity,
      'Criado em': c.created_date,
      'Criado por': c.created_by,
    }));
    const campaignsSheet = XLSX.utils.json_to_sheet(campaignsData);
    XLSX.utils.book_append_sheet(workbook, campaignsSheet, 'Campanhas');

    // Goals sheet
    const goalsData = goals.map(g => ({
      'ID': g.id,
      'Tipo Período': g.period_type,
      'Tipo Meta': g.goal_type,
      'Ano': g.year,
      'Trimestre': g.quarter,
      'Semestre': g.semester,
      'Mês': g.month,
      'Semana': g.week,
      'Agente': g.agent,
      'Email Agente': g.agent_email,
      'Meta Valor': g.goal_value,
      'Meta Quantidade': g.goal_quantity,
      'Valor Alcançado': g.achieved_value,
      'Quantidade Alcançada': g.achieved_quantity,
      'Criado em': g.created_date,
      'Criado por': g.created_by,
    }));
    const goalsSheet = XLSX.utils.json_to_sheet(goalsData);
    XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Metas');

    // Tasks sheet
    const tasksData = tasks.map(t => ({
      'ID': t.id,
      'Título': t.title,
      'Tipo Tarefa': t.task_type,
      'ID Cliente': t.client_id,
      'Nome Cliente': t.client_name,
      'Agente': t.agent,
      'Data/Hora Prevista': t.due_date,
      'Status': t.status,
      'ID Compromisso': t.appointment_id,
      'Interação Registrada': t.interaction_registered,
      'Observações': t.notes,
      'Criado em': t.created_date,
      'Criado por': t.created_by,
    }));
    const tasksSheet = XLSX.utils.json_to_sheet(tasksData);
    XLSX.utils.book_append_sheet(workbook, tasksSheet, 'Tarefas');

    // Generate Excel file as base64 then convert
    const excelBase64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    
    // Convert base64 to Uint8Array
    const binaryString = atob(excelBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Return as downloadable file
    const timestamp = new Date().toISOString().split('T')[0];
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="backup_crm_${timestamp}.xlsx"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});