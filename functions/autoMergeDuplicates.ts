import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Critérios de duplicação
function areDuplicates(client1, client2) {
  // NUNCA unificar se campos de comparação estiverem vazios
  const cpfMatch = client1.cpf && client2.cpf && 
                   client1.cpf.replace(/\D/g, '') === client2.cpf.replace(/\D/g, '') &&
                   client1.client_name?.toLowerCase() === client2.client_name?.toLowerCase();
  
  const phoneEmailMatch = client1.phone && client2.phone && client1.email && client2.email &&
                          client1.phone.replace(/\D/g, '') === client2.phone.replace(/\D/g, '') &&
                          client1.email?.toLowerCase() === client2.email?.toLowerCase();
  
  return cpfMatch || phoneEmailMatch;
}

// Mesclar dados: priorizar campos preenchidos
function mergeClientData(oldClient, newClient) {
  const merged = { ...oldClient };
  
  // Enriquecer campos vazios com dados novos
  Object.keys(newClient).forEach(key => {
    if (key === 'id' || key === 'created_date' || key === 'created_by') return;
    
    // Se campo vazio no registro antigo, preencher com novo
    if (!merged[key] && newClient[key]) {
      merged[key] = newClient[key];
    }
  });
  
  // Manter data de criação original
  merged.created_date = oldClient.created_date;
  
  return merged;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { newClientIds } = await req.json();

    if (!newClientIds || newClientIds.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Nenhum cliente novo para verificar',
        merged: 0 
      });
    }

    // Buscar clientes novos
    const newClients = await Promise.all(
      newClientIds.map(id => base44.entities.Client.filter({ id }))
    );
    const newClientsFlat = newClients.flat();

    // Buscar todos os clientes existentes (exceto os novos)
    const allClients = await base44.entities.Client.list('-created_date', 5000);
    const existingClients = allClients.filter(c => !newClientIds.includes(c.id));

    const results = {
      checked: 0,
      merged: 0,
      deleted: 0,
      enriched: 0,
      details: [],
    };

    // Para cada cliente novo, verificar se há duplicata
    for (const newClient of newClientsFlat) {
      results.checked++;
      
      let foundDuplicate = null;
      
      // Procurar duplicata mais antiga
      for (const existing of existingClients) {
        if (areDuplicates(newClient, existing)) {
          // Verificar qual é mais antigo
          const newDate = new Date(newClient.created_date);
          const existingDate = new Date(existing.created_date);
          
          if (existingDate < newDate) {
            foundDuplicate = existing;
            break;
          }
        }
      }

      if (foundDuplicate) {
        // Unificar: manter o mais antigo e enriquecer com dados novos
        const mergedData = mergeClientData(foundDuplicate, newClient);
        
        await base44.entities.Client.update(foundDuplicate.id, mergedData);
        
        // Transferir interações para o registro antigo
        const interactions = await base44.entities.Interaction.filter({ 
          client_id: newClient.id 
        });
        
        for (const interaction of interactions) {
          await base44.entities.Interaction.update(interaction.id, {
            client_id: foundDuplicate.id,
            client_name: foundDuplicate.client_name,
          });
        }

        // Transferir agendamentos
        const appointments = await base44.entities.Appointment.filter({ 
          client_id: newClient.id 
        });
        
        for (const appointment of appointments) {
          await base44.entities.Appointment.update(appointment.id, {
            client_id: foundDuplicate.id,
            client_name: foundDuplicate.client_name,
          });
        }

        // Excluir o registro novo
        await base44.entities.Client.delete(newClient.id);
        
        results.merged++;
        results.deleted++;
        results.enriched++;
        results.details.push({
          kept: foundDuplicate.client_name,
          deleted: newClient.client_name,
          reason: newClient.cpf && foundDuplicate.cpf ? 'CPF + Nome' : 'Telefone + Email',
        });
      }
    }

    console.log(`✅ Auto-merge concluído: ${results.merged} unificações`);
    
    return Response.json({
      success: true,
      message: results.merged > 0 
        ? `${results.merged} duplicata(s) unificada(s) automaticamente` 
        : 'Nenhuma duplicata encontrada',
      results,
    });

  } catch (error) {
    console.error("❌ Erro no auto-merge:", error.message);
    return Response.json({
      error: error.message || 'Erro desconhecido',
    }, { status: 500 });
  }
});