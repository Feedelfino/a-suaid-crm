import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate, agentEmail, productId } = await req.json();

    // Fetch deals
    const deals = await base44.entities.Deal.list('-closed_at', 5000);
    
    // Fetch clients and products
    const clients = await base44.entities.Client.list();
    const products = await base44.entities.Product.list();
    const accessRecords = await base44.entities.UserAccess.filter({ status: 'approved' });

    // Create lookup maps
    const clientMap = {};
    clients.forEach(c => clientMap[c.id] = c.client_name);

    const productMap = {};
    products.forEach(p => productMap[p.id] = p.name);

    const agentMap = {};
    accessRecords.forEach(a => {
      agentMap[a.user_email] = a.nickname || a.user_name;
    });

    // Filter by date and other criteria
    let filteredDeals = deals.filter(d => {
      if (!d.closed_at) return false;
      const date = new Date(d.closed_at);
      const inRange = date >= new Date(startDate) && date <= new Date(endDate);
      
      if (!inRange) return false;
      if (agentEmail && d.agent_email !== agentEmail) return false;
      if (productId && d.product_id !== productId) return false;
      
      return true;
    });

    // Map to detailed format
    const detailedDeals = filteredDeals.map(d => ({
      deal_id: d.id,
      client_name: clientMap[d.client_id] || 'Cliente Desconhecido',
      product_name: productMap[d.product_id] || 'Produto Desconhecido',
      agent_name: agentMap[d.agent_email] || d.agent_email,
      value: d.value,
      status: d.status,
      closed_at: d.closed_at,
      discount_percent: d.discount_percent || 0,
      lost_reason: d.lost_reason || null,
      notes: d.notes || null
    }));

    return Response.json(detailedDeals);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});