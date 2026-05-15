import { matchingSeries, queryParam } from '../concepts/series.mjs';
import { saveState, state } from '../store.mjs';

export function registerRoutes(app, store) {
  app.get('/series/search', (c) => {
    const current = state(store);
    const searchText = queryParam(c, 'search_text').toLowerCase();
    const limit = Math.max(0, Number(queryParam(c, 'limit', '100')));
    current.requests.push({ endpoint: '/series/search', searchText, requestedAt: new Date().toISOString() });
    saveState(store, current);
    const seriess = matchingSeries(current.series, searchText, limit);
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
}
