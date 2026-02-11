import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Buscar todos os clientes
    const allClients = await base44.asServiceRole.entities.Client.list();

    // Filtrar clientes sem client_code
    const clientsWithoutCode = allClients.filter(c => !c.client_code || c.client_code.trim() === '');

    if (clientsWithoutCode.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Todos os clientes já possuem código',
        updated: 0 
      });
    }

    // Buscar o maior número de código existente para continuar a sequência
    const existingCodes = allClients
      .filter(c => c.client_code && c.client_code.startsWith('CLI-'))
      .map(c => {
        const num = parseInt(c.client_code.replace('CLI-', ''));
        return isNaN(num) ? 0 : num;
      });

    let nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;

    // Atualizar cada cliente sem código
    const updated = [];
    for (const client of clientsWithoutCode) {
      const newCode = `CLI-${String(nextNumber).padStart(4, '0')}`;
      
      await base44.asServiceRole.entities.Client.update(client.id, {
        client_code: newCode
      });

      updated.push({
        id: client.id,
        name: client.client_name,
        new_code: newCode
      });

      nextNumber++;
    }

    return Response.json({
      success: true,
      message: `${updated.length} clientes atualizados com sucesso`,
      updated: updated.length,
      clients: updated
    });

  } catch (error) {
    console.error('Erro ao gerar códigos:', error);
    return Response.json(
      { error: error?.message || String(error) },
      { status: 500 }
    );
  }
});