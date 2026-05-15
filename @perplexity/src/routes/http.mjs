import { recordSearch } from '../concepts/search.mjs';
import { saveState, state } from '../store.mjs';

export function registerRoutes(app, store) {
  app.post('/search', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const current = state(store);
    const { results } = recordSearch(current, body);
    saveState(store, current);
    return c.json({ results });
  });

  app.get('/inspect/searches', (c) => c.json(state(store).searches));
  app.get('/inspect/results', (c) => c.json(state(store).results));
}
