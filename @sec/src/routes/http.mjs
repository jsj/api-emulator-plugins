import { companyFromBody, tickerRows } from '../concepts/companies.mjs';
import { saveState, state } from '../store.mjs';

export function registerRoutes(app, store) {
  app.get('/files/company_tickers.json', (c) => {
    const current = state(store);
    current.requests.push({ endpoint: '/files/company_tickers.json', requestedAt: new Date().toISOString() });
    saveState(store, current);
    return c.json(tickerRows(current.companies));
  });

  app.get('/submissions/:filename', (c) => {
    const current = state(store);
    const filename = String(c.req.param('filename') ?? '');
    const cik = filename.replace(/^CIK/i, '').replace(/\.json$/i, '').padStart(10, '0');
    current.requests.push({ endpoint: `/submissions/CIK${cik}.json`, requestedAt: new Date().toISOString() });
    saveState(store, current);
    const company = current.companies[cik];
    if (!company) return c.json({ error: 'Company not found' }, 404);
    return c.json(company);
  });

  app.post('/control/companies', async (c) => {
    const company = companyFromBody(await c.req.json().catch(() => ({})));
    const current = state(store);
    current.companies[company.cik] = company;
    saveState(store, current);
    return c.json(company, 201);
  });

  app.get('/inspect/companies', (c) => c.json(Object.values(state(store).companies)));
  app.get('/inspect/requests', (c) => c.json(state(store).requests));
}
