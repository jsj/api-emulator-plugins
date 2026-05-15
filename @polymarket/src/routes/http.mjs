import { includesQuery, marketFromBody } from '../concepts/markets.mjs';
import { saveState, state } from '../store.mjs';

export function registerRoutes(app, store) {
  app.get('/markets', (c) => {
    const current = state(store);
    const query = c.req.query?.('q') ?? c.req.query?.('query') ?? '';
    const limit = Math.max(0, Number(c.req.query?.('limit') ?? 100));
    current.requests.push({ endpoint: '/markets', query, limit, requestedAt: new Date().toISOString() });
    saveState(store, current);
    const markets = Object.values(current.markets).filter((market) => includesQuery(market, query)).slice(0, limit);
    return c.json(markets);
  });

  app.get('/markets/:id', (c) => {
    const current = state(store);
    const id = c.req.param('id');
    const market = current.markets[id];
    current.requests.push({ endpoint: `/markets/${id}`, requestedAt: new Date().toISOString() });
    saveState(store, current);
    if (!market) return c.json({ error: 'Market not found' }, 404);
    return c.json(market);
  });

  app.post('/control/markets', async (c) => {
    const market = marketFromBody(await c.req.json().catch(() => ({})));
    const current = state(store);
    current.markets[market.id] = market;
    saveState(store, current);
    return c.json(market, 201);
  });

  app.get('/inspect/markets', (c) => c.json(Object.values(state(store).markets)));
  app.get('/inspect/requests', (c) => c.json(state(store).requests));
}
