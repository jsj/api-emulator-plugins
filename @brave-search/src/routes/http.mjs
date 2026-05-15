import { recordNewsSearch, recordSuggest, recordWebSearch } from '../concepts/search.mjs';
import { saveState, state } from '../store.mjs';

function persist(store, current, payload) {
  saveState(store, current);
  return payload;
}

export function registerRoutes(app, store, contract) {
  app.get('/res/v1/web/search', (c) => {
    const current = state(store);
    return c.json(persist(store, current, recordWebSearch(current, c)));
  });

  app.get('/res/v1/news/search', (c) => {
    const current = state(store);
    return c.json(persist(store, current, recordNewsSearch(current, c)));
  });

  app.get('/res/v1/suggest/search', (c) => {
    const current = state(store);
    return c.json(persist(store, current, recordSuggest(current, c)));
  });

  app.get('/inspect/contract', (c) => c.json(contract));
  app.get('/inspect/state', (c) => c.json(state(store)));
  app.post('/inspect/reset', (c) => {
    store.setData?.('brave-search:state', null);
    return c.json({ ok: true, state: state(store) });
  });
}
