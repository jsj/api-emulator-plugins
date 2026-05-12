const DEFAULT_MARKETS = [
  {
    id: 'polymarket-weather-2026',
    question: 'Will global average temperature set a new record in 2026?',
    outcomes: JSON.stringify(['Yes', 'No']),
    outcomePrices: JSON.stringify(['0.58', '0.42']),
    volume: '4200000',
    endDate: '2026-06-30T00:00:00Z',
    description: 'Emulated Polymarket climate and weather market.',
  },
  {
    id: 'polymarket-space-launch-2026',
    question: 'Will there be more than 200 orbital launch attempts in 2026?',
    outcomes: JSON.stringify(['Yes', 'No']),
    outcomePrices: JSON.stringify(['0.47', '0.53']),
    volume: '1900000',
    endDate: '2026-12-31T00:00:00Z',
    description: 'Emulated Polymarket space industry market.',
  },
];

export const contract = {
  provider: 'polymarket',
  source: 'Polymarket Gamma API compatible market subset',
  docs: 'https://docs.polymarket.com',
  scope: ['gamma-markets'],
  fidelity: 'resource-model-subset',
};

function state(store) {
  const existing = store.getData?.('polymarket:state');
  if (existing) return existing;
  const initial = {
    markets: Object.fromEntries(DEFAULT_MARKETS.map((market) => [market.id, market])),
    requests: [],
  };
  store.setData?.('polymarket:state', initial);
  return initial;
}

function saveState(store, value) {
  store.setData?.('polymarket:state', value);
}

function includesQuery(market, query) {
  if (!query) return true;
  const haystack = `${market.question} ${market.description ?? ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export const plugin = {
  name: 'polymarket',
  register(app, store) {
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
      const body = await c.req.json().catch(() => ({}));
      const id = String(body.id ?? crypto.randomUUID());
      const market = {
        id,
        question: body.question ?? 'Emulated Polymarket question',
        outcomes: typeof body.outcomes === 'string' ? body.outcomes : JSON.stringify(body.outcomes ?? ['Yes', 'No']),
        outcomePrices: typeof body.outcomePrices === 'string' ? body.outcomePrices : JSON.stringify(body.outcomePrices ?? ['0.5', '0.5']),
        volume: String(body.volume ?? '0'),
        endDate: body.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: body.description ?? '',
      };
      const current = state(store);
      current.markets[id] = market;
      saveState(store, current);
      return c.json(market, 201);
    });

    app.get('/inspect/markets', (c) => c.json(Object.values(state(store).markets)));
    app.get('/inspect/requests', (c) => c.json(state(store).requests));
  },
};

export const label = 'Polymarket Gamma API emulator';
export const endpoints = 'markets, markets/:id';
export const initConfig = { polymarket: {} };
