import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'progressive:state';

function initialState(config = {}) {
  return {
    customers: [{ id: 'cust_prog_1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test' }],
    policies: [{ id: 'pol_prog_auto', policyNumber: 'PGR-PA-0001', lineOfBusiness: 'personal_auto', status: 'active', effectiveDate: '2026-01-01', expirationDate: '2026-07-01', premium: { amount: 132.5, currency: 'USD', billingFrequency: 'monthly' } }],
    quotes: [{ id: 'quote_prog_1', status: 'rated', product: 'auto', premium: { amount: 128.33, currency: 'USD' }, createdAt: fixedNow }],
    claims: [{ id: 'claim_prog_1', claimNumber: 'PGR-10001', policyId: 'pol_prog_auto', status: 'in_review', lossType: 'comprehensive', createdAt: fixedNow }],
    nextId: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const list = (data) => ({ data, pagination: { nextCursor: null, total: data.length } });
const error = (c, message, status = 404) => c.json({ error: { code: status === 404 ? 'not_found' : 'bad_request', message } }, status);

export const contract = {
  provider: 'progressive',
  source: 'Progressive developer portal and Embedded Direct partner API informed subset',
  docs: 'https://developer.progressive.com/s/',
  baseUrl: 'https://api.progressive.com',
  scope: ['customers', 'auto-quotes', 'policies', 'claims', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'Exact Embedded Direct schemas are partner-gated; this emulator models quote and servicing flows without production calls.',
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const plugin = {
  name: 'progressive',
  register(app, store) {
    app.get('/v1/customers', (c) => c.json(list(state(store).customers)));
    app.get('/v1/policies', (c) => c.json(list(state(store).policies)));
    app.get('/v1/policies/:policyId', (c) => {
      const policy = state(store).policies.find((item) => item.id === c.req.param('policyId') || item.policyNumber === c.req.param('policyId'));
      return policy ? c.json(policy) : error(c, 'Policy not found');
    });
    app.get('/v1/quotes', (c) => c.json(list(state(store).quotes)));
    app.post('/v1/quotes/auto', async (c) => {
      const s = state(store);
      const quote = { id: `quote_prog_${s.nextId++}`, status: 'rated', product: 'auto', premium: { amount: 128.33, currency: 'USD' }, createdAt: fixedNow, ...(await readBody(c)) };
      s.quotes.unshift(quote);
      save(store, s);
      return c.json(quote, 201);
    });
    app.get('/v1/claims', (c) => c.json(list(state(store).claims)));
    app.post('/v1/claims', async (c) => {
      const s = state(store);
      const claim = { id: `claim_prog_${s.nextId++}`, claimNumber: `PGR-${10000 + s.nextId}`, status: 'received', createdAt: fixedNow, ...(await readBody(c)) };
      s.claims.unshift(claim);
      save(store, s);
      return c.json(claim, 201);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Progressive Insurance API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { progressive: initialState() };
export default plugin;
