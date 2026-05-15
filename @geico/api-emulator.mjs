import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'geico:state';

function initialState(config = {}) {
  return {
    customer: { id: 'cust_geico_1', name: 'Ada Lovelace', email: 'ada@example.test' },
    policies: [
      { id: 'pol_geico_auto', policyNumber: 'GEICO-AUTO-0001', lineOfBusiness: 'personal_auto', status: 'active', effectiveDate: '2026-01-01', expirationDate: '2026-07-01', premium: { amount: 612.44, currency: 'USD', billingFrequency: 'monthly' }, vehicles: [{ vin: '1HGCM82633A004352', year: 2024, make: 'Honda', model: 'Accord' }] },
    ],
    claims: [
      { id: 'clm_geico_1', claimNumber: 'GC-10001', policyId: 'pol_geico_auto', status: 'open', lossDate: '2026-02-10', lossType: 'collision', createdAt: fixedNow },
    ],
    invoices: [
      { id: 'inv_geico_1', policyId: 'pol_geico_auto', status: 'due', dueDate: '2026-02-01', amountDue: { amount: 102.07, currency: 'USD' } },
    ],
    quotes: [],
    nextId: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const list = (data) => ({ data, has_more: false });
const error = (c, message, status = 404) => c.json({ error: { code: status === 404 ? 'not_found' : 'bad_request', message } }, status);

export const contract = {
  provider: 'geico',
  source: 'GEICO partner-service and ACORD P&C insurance workflow informed subset',
  docs: 'https://www.geico.com/about/b2b-services/',
  baseUrl: 'https://api.geico.com',
  scope: ['customer', 'policies', 'claims', 'billing', 'auto-quotes', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'No public official GEICO OpenAPI was found; payloads model a safe ACORD-style P&C servicing slice.',
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const plugin = {
  name: 'geico',
  register(app, store) {
    app.get('/v1/customers/current', (c) => c.json(state(store).customer));
    app.get('/v1/policies', (c) => c.json(list(state(store).policies)));
    app.get('/v1/policies/:policyId', (c) => {
      const policy = state(store).policies.find((item) => item.id === c.req.param('policyId') || item.policyNumber === c.req.param('policyId'));
      return policy ? c.json(policy) : error(c, 'Policy not found');
    });
    app.get('/v1/policies/:policyId/claims', (c) => c.json(list(state(store).claims.filter((claim) => claim.policyId === c.req.param('policyId')))));
    app.get('/v1/claims/:claimId', (c) => {
      const claim = state(store).claims.find((item) => item.id === c.req.param('claimId') || item.claimNumber === c.req.param('claimId'));
      return claim ? c.json(claim) : error(c, 'Claim not found');
    });
    app.post('/v1/claims', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const claim = { id: `clm_geico_${s.nextId++}`, claimNumber: `GC-${10000 + s.nextId}`, status: 'received', createdAt: fixedNow, ...body };
      s.claims.unshift(claim);
      save(store, s);
      return c.json(claim, 201);
    });
    app.get('/v1/billing/invoices', (c) => c.json(list(state(store).invoices)));
    app.post('/v1/quotes/auto', async (c) => {
      const s = state(store);
      const quote = { id: `qt_geico_${s.nextId++}`, status: 'quoted', premium: { amount: 118.25, currency: 'USD', billingFrequency: 'monthly' }, createdAt: fixedNow, ...(await readBody(c)) };
      s.quotes.unshift(quote);
      save(store, s);
      return c.json(quote, 201);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'GEICO Insurance API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { geico: initialState() };
export default plugin;
