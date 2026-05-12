const SERIES = [
  {
    id: 'EMU_RATE',
    title: 'Emulator Policy Rate',
    frequency: 'Monthly',
    frequency_short: 'M',
    units: 'Percent',
    units_short: '%',
    last_updated: '2026-01-01 00:00:00-06',
    popularity: 99,
  },
  {
    id: 'EMU_PRICE_INDEX',
    title: 'Emulator Price Index',
    frequency: 'Monthly',
    frequency_short: 'M',
    units: 'Index 2020=100',
    units_short: 'Index',
    last_updated: '2026-01-01 00:00:00-06',
    popularity: 80,
  },
];

const OBSERVATIONS = {
  EMU_RATE: [
    { date: '2026-01-01', value: '4.25' },
    { date: '2025-12-01', value: '4.50' },
    { date: '2025-11-01', value: '4.50' },
  ],
  EMU_PRICE_INDEX: [
    { date: '2026-01-01', value: '112.4' },
    { date: '2025-12-01', value: '111.9' },
    { date: '2025-11-01', value: '111.2' },
  ],
};

export const contract = {
  provider: 'fred',
  source: 'FRED API compatible series subset',
  docs: 'https://fred.stlouisfed.org/docs/api/fred',
  scope: ['series-search', 'series', 'observations'],
  fidelity: 'deterministic-subset',
};

function state(store) {
  const existing = store.getData?.('fred:state');
  if (existing) return existing;
  const initial = { requests: [], series: SERIES, observations: OBSERVATIONS };
  store.setData?.('fred:state', initial);
  return initial;
}

function saveState(store, value) {
  store.setData?.('fred:state', value);
}

function queryParam(c, name, fallback = '') {
  return c.req.query?.(name) ?? fallback;
}

export const plugin = {
  name: 'fred',
  register(app, store) {
    app.get('/series/search', (c) => {
      const current = state(store);
      const searchText = queryParam(c, 'search_text').toLowerCase();
      const limit = Math.max(0, Number(queryParam(c, 'limit', '100')));
      current.requests.push({ endpoint: '/series/search', searchText, requestedAt: new Date().toISOString() });
      saveState(store, current);
      const seriess = current.series
        .filter((series) => !searchText || `${series.id} ${series.title}`.toLowerCase().includes(searchText))
        .slice(0, limit);
      return c.json({ realtime_start: '2026-01-01', realtime_end: '2026-01-01', count: seriess.length, seriess });
    });

    app.get('/series', (c) => {
      const current = state(store);
      const seriesId = queryParam(c, 'series_id');
      current.requests.push({ endpoint: '/series', seriesId, requestedAt: new Date().toISOString() });
      saveState(store, current);
      const series = current.series.filter((item) => item.id === seriesId);
      return c.json({ realtime_start: '2026-01-01', realtime_end: '2026-01-01', seriess: series });
    });

    app.get('/series/observations', (c) => {
      const current = state(store);
      const seriesId = queryParam(c, 'series_id');
      const limit = Math.max(0, Number(queryParam(c, 'limit', '100')));
      current.requests.push({ endpoint: '/series/observations', seriesId, requestedAt: new Date().toISOString() });
      saveState(store, current);
      return c.json({
        realtime_start: '2026-01-01',
        realtime_end: '2026-01-01',
        observation_start: queryParam(c, 'observation_start', '1776-07-04'),
        observation_end: queryParam(c, 'observation_end', '9999-12-31'),
        observations: (current.observations[seriesId] ?? []).slice(0, limit),
      });
    });

    app.get('/inspect/requests', (c) => c.json(state(store).requests));
  },
};

export const label = 'FRED API emulator';
export const endpoints = 'series/search, series, series/observations';
export const initConfig = { fred: { apiKey: 'fred-emulator-key' } };
