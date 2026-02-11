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
    const offers = await base44.entities.Offer.list('-created_date', 5000);
    const deals = await base44.entities.Deal.list('-closed_at', 5000);
    const products = await base44.entities.Product.list();

    // Filter by date
    const filterByDate = (items, dateField) => {
      return items.filter(item => {
        if (!item[dateField]) return false;
        const date = new Date(item[dateField]);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    };

    const filteredOffers = filterByDate(offers, 'created_date');
    const filteredDeals = filterByDate(deals, 'closed_at');

    // Group by product
    const productStats = {};

    products.forEach(product => {
      const productId = product.id;
      const productName = product.name;

      const productOffers = filteredOffers.filter(o => o.product_id === productId);
      const productDeals = filteredDeals.filter(d => d.product_id === productId);
      const productDealsWon = productDeals.filter(d => d.status === 'won');

      const totalSalesValue = productDealsWon.reduce((sum, d) => sum + (d.value || 0), 0);
      const conversionRate = productOffers.length > 0
        ? ((productDealsWon.length / productOffers.length) * 100).toFixed(1)
        : 0;

      if (productOffers.length > 0 || productDealsWon.length > 0) {
        productStats[productId] = {
          product_name: productName,
          product_id: productId,
          total_offers: productOffers.length,
          total_deals_won: productDealsWon.length,
          total_sales_value: totalSalesValue,
          offer_to_deal_conversion_rate: `${conversionRate}%`
        };
      }
    });

    // Convert to array and sort by sales value
    const result = Object.values(productStats).sort((a, b) => 
      b.total_sales_value - a.total_sales_value
    );

    return Response.json(result);
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});