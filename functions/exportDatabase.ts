import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Buscar todas as entidades
        const [
            clients,
            interactions,
            appointments,
            certificates,
            tasks,
            campaigns,
            goals,
            products,
        ] = await Promise.all([
            base44.asServiceRole.entities.Client.list('-created_date', 5000),
            base44.asServiceRole.entities.Interaction.list('-created_date', 5000),
            base44.asServiceRole.entities.Appointment.list('-date', 5000),
            base44.asServiceRole.entities.Certificate.list('-created_date', 5000),
            base44.asServiceRole.entities.Task.list('-created_date', 5000),
            base44.asServiceRole.entities.Campaign.list('-created_date', 5000),
            base44.asServiceRole.entities.Goal.list('-created_date', 5000),
            base44.asServiceRole.entities.Product.list('-created_date', 5000),
        ]);

        // Função auxiliar para converter objeto em linha CSV
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const objectToCSV = (data, headers) => {
            if (!data || data.length === 0) return '';
            
            const csvHeaders = headers.join(',');
            const csvRows = data.map(row => 
                headers.map(header => escapeCSV(row[header])).join(',')
            ).join('\n');
            
            return `${csvHeaders}\n${csvRows}`;
        };

        // Definir colunas para cada entidade
        const clientsHeaders = ['id', 'client_code', 'client_name', 'company_name', 'cpf', 'cnpj', 'email', 'phone', 'whatsapp', 'address', 'business_area', 'lead_status', 'lead_source', 'assigned_agent', 'funnel_stage', 'created_date', 'updated_date'];
        const interactionsHeaders = ['id', 'protocol_number', 'client_name', 'interaction_type', 'contact_method', 'product_offered', 'tabulation', 'sale_value', 'agent_name', 'agent_email', 'notes', 'created_date'];
        const appointmentsHeaders = ['id', 'title', 'category', 'event_type', 'client_name', 'company_name', 'agent', 'date', 'time', 'appointment_type', 'status', 'created_date'];
        const certificatesHeaders = ['id', 'client_name', 'certificate_type', 'issue_date', 'expiry_date', 'status', 'renewal_status', 'assigned_agent', 'created_date'];
        const tasksHeaders = ['id', 'title', 'task_type', 'client_name', 'agent', 'due_date', 'status', 'created_date'];
        const campaignsHeaders = ['id', 'name', 'description', 'start_date', 'end_date', 'status', 'goal', 'achieved_value', 'created_date'];
        const goalsHeaders = ['id', 'period_type', 'goal_type', 'year', 'month', 'agent', 'goal_value', 'achieved_value', 'created_date'];
        const productsHeaders = ['id', 'name', 'code', 'category', 'price', 'active', 'created_date'];

        // Gerar CSV para cada entidade
        const csvSections = [
            '=== CLIENTES ===',
            objectToCSV(clients, clientsHeaders),
            '',
            '=== INTERAÇÕES ===',
            objectToCSV(interactions, interactionsHeaders),
            '',
            '=== AGENDAMENTOS ===',
            objectToCSV(appointments, appointmentsHeaders),
            '',
            '=== CERTIFICADOS ===',
            objectToCSV(certificates, certificatesHeaders),
            '',
            '=== TAREFAS ===',
            objectToCSV(tasks, tasksHeaders),
            '',
            '=== CAMPANHAS ===',
            objectToCSV(campaigns, campaignsHeaders),
            '',
            '=== METAS ===',
            objectToCSV(goals, goalsHeaders),
            '',
            '=== PRODUTOS ===',
            objectToCSV(products, productsHeaders),
        ];

        const csvContent = csvSections.join('\n');

        // Retornar como arquivo CSV com BOM UTF-8
        const blob = '\ufeff' + csvContent;
        const timestamp = new Date().toISOString().split('T')[0];
        
        return new Response(blob, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv;charset=utf-8',
                'Content-Disposition': `attachment; filename="export_banco_dados_${timestamp}.csv"`
            }
        });
    } catch (error) {
        console.error('Erro ao exportar:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});