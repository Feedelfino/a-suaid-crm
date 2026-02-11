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

    // Filter by date range
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

    // Calculate metrics
    const dealsWon = filteredDeals.filter(d => d.status === 'won');
    const dealsLost = filteredDeals.filter(d => d.status === 'lost');
    const totalSalesValue = dealsWon.reduce((sum, d) => sum + (d.value || 0), 0);
    
    const conversionRate = filteredOffers.length > 0 
      ? ((dealsWon.length / filteredOffers.length) * 100).toFixed(1)
      : 0;

    return Response.json({
      total_interactions: filteredInteractions.length,
      total_offers: filteredOffers.length,
      total_deals_won: dealsWon.length,
      total_deals_lost: dealsLost.length,
      total_sales_value: totalSalesValue,
      offer_to_deal_conversion_rate: `${conversionRate}%`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});