import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'turbotax:state';

function defaultState(baseUrl = 'https://api.turbotax.intuit.com') {
  return {
    baseUrl,
    tokenCount: 0,
    taxDocuments: [
      { id: 'taxdoc_1099int_1', taxYear: 2025, formType: '1099-INT', payerName: 'Emulator Bank', recipientTinLast4: '1234', status: 'ready', totals: { interestIncome: '42.10' } },
      { id: 'taxdoc_w2_1', taxYear: 2025, formType: 'W-2', payerName: 'Emulator Payroll', recipientTinLast4: '1234', status: 'ready', totals: { wages: '125000.00', federalTaxWithheld: '21000.00' } },
    ],
    importSessions: [],
    nextId: 1,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);
const page = (items) => ({ data: items, paging: { next: null, total: items.length } });

export function seedFromConfig(store, baseUrl = 'https://api.turbotax.intuit.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'turbotax',
  source: 'Intuit TurboTax partner tax-import/FDP documentation-informed subset',
  docs: 'https://www.intuit.com/partners/fdp/implementation-support/tax-import/',
  baseUrl: 'https://api.turbotax.intuit.com',
  scope: ['oauth2_token', 'tax_documents', 'import_sessions'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'turbotax',
  register(app, store) {
    app.post('/oauth2/v1/tokens/bearer', (c) => {
      const s = state(store);
      s.tokenCount += 1;
      return c.json({ token_type: 'bearer', access_token: createToken('turbotax_access', s.tokenCount), refresh_token: createToken('turbotax_refresh', s.tokenCount), expires_in: 3600 });
    });
    app.get('/v1/tax-documents', (c) => {
      const year = c.req.query('taxYear');
      const docs = year ? state(store).taxDocuments.filter((doc) => String(doc.taxYear) === String(year)) : state(store).taxDocuments;
      return c.json(page(docs));
    });
    app.post('/v1/tax-documents', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const doc = { id: body.id ?? `taxdoc_${String(s.nextId++).padStart(6, '0')}`, status: 'ready', createdAt: fixedNow, ...body };
      s.taxDocuments.push(doc);
      save(store, s);
      return c.json(doc, 201);
    });
    app.get('/v1/tax-documents/:id', (c) => {
      const row = state(store).taxDocuments.find((doc) => doc.id === c.req.param('id'));
      return row ? c.json(row) : routeError(c, 'Tax document not found', 404, 'NOT_FOUND');
    });
    app.post('/v1/import-sessions', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const session = { id: `import_${String(s.nextId++).padStart(6, '0')}`, status: 'created', createdAt: fixedNow, taxYear: body.taxYear ?? 2025, documentIds: body.documentIds ?? s.taxDocuments.map((doc) => doc.id) };
      s.importSessions.push(session);
      save(store, s);
      return c.json(session, 201);
    });
    app.get('/v1/import-sessions/:id', (c) => {
      const row = state(store).importSessions.find((session) => session.id === c.req.param('id'));
      return row ? c.json(row) : routeError(c, 'Import session not found', 404, 'NOT_FOUND');
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'TurboTax tax import API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { turbotax: { clientId: 'turbotax-emulator-client' } };
export default plugin;
