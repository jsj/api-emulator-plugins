import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'statefarm:state';

function initialState(config = {}) {
  return {
    customers: [{ id: 'cust_sf_1', name: 'Ada Lovelace', email: 'ada@example.test' }],
    quotes: [{ id: 'quote_sf_renters', product: 'renters', status: 'quoted', annualPremium: { amount: 156, currency: 'USD' }, createdAt: fixedNow }],
    policies: [{ id: 'pol_sf_renters', policyNumber: 'SF-R-0001', product: 'renters', status: 'active', effectiveDate: '2026-01-01', annualPremium: { amount: 156, currency: 'USD' } }],
    claims: [{ id: 'claim_sf_1', claimNumber: 'SF-10001', policyId: 'pol_sf_renters', status: 'assigned', lossType: 'water', createdAt: fixedNow }],
    bills: [{ id: 'bill_sf_1', policyId: 'pol_sf_renters', status: 'scheduled', dueDate: '2026-02-01', amount: { amount: 13, currency: 'USD' } }],
    nextId: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const list = (data) => ({ items: data, nextPageToken: null });
const error = (c, message, status = 404) => c.json({ error: { code: status === 404 ? 'NOT_FOUND' : 'INVALID_REQUEST', message } }, status);

export const contract = {
  provider: 'statefarm',
  source: 'State Farm developer portal renters API and ACORD P&C workflow informed subset',
  docs: 'https://developer.statefarm/api/renters',
  baseUrl: 'https://developer.statefarm',
  scope: ['customers', 'renters-quotes', 'policies', 'claims', 'billing', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'State Farm partner API docs are gated; this provides a deterministic renters policy servicing slice.',
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const plugin = {
  name: 'statefarm',
  register(app, store) {
    app.get('/v1/customers', (c) => c.json(list(state(store).customers)));
    app.get('/v1/quotes', (c) => c.json(list(state(store).quotes)));
    app.post('/v1/quotes/renters', async (c) => {
      const s = state(store);
      const quote = { id: `quote_sf_${s.nextId++}`, product: 'renters', status: 'quoted', annualPremium: { amount: 156, currency: 'USD' }, createdAt: fixedNow, ...(await readBody(c)) };
      s.quotes.unshift(quote);
      save(store, s);
      return c.json(quote, 201);
    });
    app.get('/v1/policies', (c) => c.json(list(state(store).policies)));
    app.get('/v1/policies/:policyId', (c) => {
      const policy = state(store).policies.find((item) => item.id === c.req.param('policyId') || item.policyNumber === c.req.param('policyId'));
      return policy ? c.json(policy) : error(c, 'Policy not found');
    });
    app.post('/v1/claims', async (c) => {
      const s = state(store);
      const claim = { id: `claim_sf_${s.nextId++}`, claimNumber: `SF-${10000 + s.nextId}`, status: 'received', createdAt: fixedNow, ...(await readBody(c)) };
      s.claims.unshift(claim);
      save(store, s);
      return c.json(claim, 201);
    });
    app.get('/v1/billing/bills', (c) => c.json(list(state(store).bills)));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'State Farm Insurance API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { statefarm: initialState() };
export default plugin;
