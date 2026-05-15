import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'lemonade:state';

function initialState(config = {}) {
  return {
    customers: [{ id: 'cus_lmn_1', email: 'ada@example.test', first_name: 'Ada', last_name: 'Lovelace' }],
    quotes: [{ id: 'qt_lmn_1', product: 'renters', status: 'quoted', premium: { amount: 14.25, currency: 'USD', interval: 'month' }, coverage: { personal_property: 30000, deductible: 500 }, created_at: fixedNow }],
    policies: [{ id: 'pol_lmn_renters', policy_number: 'LMN-R-0001', product: 'renters', status: 'active', address: { line1: '1 Emulator St', city: 'New York', region: 'NY', postal_code: '10001' } }],
    claims: [{ id: 'clm_lmn_1', policy_id: 'pol_lmn_renters', status: 'submitted', loss_type: 'theft', created_at: fixedNow }],
    nextId: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const list = (data) => ({ data, has_more: false });
const error = (c, message, status = 404) => c.json({ error: { type: status === 404 ? 'not_found' : 'invalid_request', message } }, status);

export const contract = {
  provider: 'lemonade',
  source: 'Lemonade partner API landing page informed insurance quote and policy subset',
  docs: 'https://www.lemonade.com/api',
  baseUrl: 'https://api.lemonade.com',
  scope: ['customers', 'renters-quotes', 'policies', 'claims', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'Full Lemonade API docs are access-gated; this models a deterministic partner quote-to-policy slice.',
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const plugin = {
  name: 'lemonade',
  register(app, store) {
    app.get('/v1/customers', (c) => c.json(list(state(store).customers)));
    app.post('/v1/customers', async (c) => {
      const s = state(store);
      const customer = { id: `cus_lmn_${s.nextId++}`, ...(await readBody(c)) };
      s.customers.unshift(customer);
      save(store, s);
      return c.json(customer, 201);
    });
    app.get('/v1/quotes', (c) => c.json(list(state(store).quotes)));
    app.post('/v1/quotes/renters', async (c) => {
      const s = state(store);
      const quote = { id: `qt_lmn_${s.nextId++}`, product: 'renters', status: 'quoted', premium: { amount: 14.25, currency: 'USD', interval: 'month' }, created_at: fixedNow, ...(await readBody(c)) };
      s.quotes.unshift(quote);
      save(store, s);
      return c.json(quote, 201);
    });
    app.post('/v1/policies', async (c) => {
      const s = state(store);
      const policy = { id: `pol_lmn_${s.nextId++}`, policy_number: `LMN-${10000 + s.nextId}`, status: 'active', created_at: fixedNow, ...(await readBody(c)) };
      s.policies.unshift(policy);
      save(store, s);
      return c.json(policy, 201);
    });
    app.get('/v1/policies/:policyId', (c) => {
      const policy = state(store).policies.find((item) => item.id === c.req.param('policyId') || item.policy_number === c.req.param('policyId'));
      return policy ? c.json(policy) : error(c, 'Policy not found');
    });
    app.get('/v1/claims', (c) => c.json(list(state(store).claims)));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Lemonade Insurance API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { lemonade: initialState() };
export default plugin;
