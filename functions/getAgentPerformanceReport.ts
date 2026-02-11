import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate } = await req.json();

    // Fetch all data
    const interactions = await base44.entities.Interaction.list('-created_date', 5000);
    const offers = await base44.entities.Offer.list('-created_date', 5000);
    const deals = await base44.entities.Deal.list('-closed_at', 5000);
    const accessRecords = await base44.entities.UserAccess.filter({ status: 'approved' });

    // Filter by date
    const filterByDate = (items, dateField) => {
      return items.filter(item => {
        if (!item[dateField]) return false;
        const date = new Date(item[dateField]);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    };

    const filteredInteractions = filterByDate(interactions, 'created_date');
    const filteredOffers = filterByDate(offers, 'created_date');
    const filteredDeals = filterByDate(deals, 'closed_at');

    // Group by agent
    const agentStats = {};

    accessRecords.forEach(access => {
      const email = access.user_email;
      const name = access.nickname || access.user_name;

      const agentInteractions = filteredInteractions.filter(i => i.agent_email === email);
      const agentOffers = filteredOffers.filter(o => o.agent_email === email);
      const agentDeals = filteredDeals.filter(d => d.agent_email === email);
      const agentDealsWon = agentDeals.filter(d => d.status === 'won');

      const totalSalesValue = agentDealsWon.reduce((sum, d) => sum + (d.value || 0), 0);
      const conversionRate = agentOffers.length > 0
        ? ((agentDealsWon.length / agentOffers.length) * 100).toFixed(1)
        : 0;

      agentStats[email] = {
        agent_name: name,
        agent_email: email,
        total_interactions: agentInteractions.length,
        total_offers: agentOffers.length,
        total_deals_won: agentDealsWon.length,
        total_sales_value: totalSalesValue,
        offer_to_deal_conversion_rate: `${conversionRate}%`
      };
    });

    // Convert to array and sort by sales value
    const result = Object.values(agentStats).sort((a, b) => 
      b.total_sales_value - a.total_sales_value
    );

    return Response.json(result);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});