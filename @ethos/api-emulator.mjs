import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'ethos:state';

function initialState(config = {}) {
  return {
    leads: [{ id: 'lead_ethos_1', email: 'ada@example.test', status: 'qualified', created_at: fixedNow }],
    quotes: [{ id: 'quote_ethos_1', lead_id: 'lead_ethos_1', product: 'term_life', status: 'offered', term_years: 20, coverage_amount: 500000, monthly_premium: { amount: 39.12, currency: 'USD' }, created_at: fixedNow }],
    applications: [{ id: 'app_ethos_1', quote_id: 'quote_ethos_1', status: 'decisioned', decision: 'approved', created_at: fixedNow }],
    policies: [{ id: 'pol_ethos_1', policy_number: 'ETH-10001', application_id: 'app_ethos_1', status: 'active', coverage_amount: 500000 }],
    nextId: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const list = (data) => ({ data, has_more: false });
const error = (c, message, status = 404) => c.json({ error: { code: status === 404 ? 'not_found' : 'invalid_request', message } }, status);

export const contract = {
  provider: 'ethos',
  source: 'Ethos partnership API public landing page informed life-insurance application subset',
  docs: 'https://www.ethos.com/api/',
  baseUrl: 'https://api.ethoslife.com',
  scope: ['leads', 'term-life-quotes', 'applications', 'underwriting-decisions', 'policies', 'inspection'],
  fidelity: 'stateful-rest-emulator',
  notes: 'Ethos API access is gated; this emulator provides a deterministic partner lead-to-policy workflow.',
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const plugin = {
  name: 'ethos',
  register(app, store) {
    app.get('/v1/leads', (c) => c.json(list(state(store).leads)));
    app.post('/v1/leads', async (c) => {
      const s = state(store);
      const lead = { id: `lead_ethos_${s.nextId++}`, status: 'qualified', created_at: fixedNow, ...(await readBody(c)) };
      s.leads.unshift(lead);
      save(store, s);
      return c.json(lead, 201);
    });
    app.post('/v1/quotes/term-life', async (c) => {
      const s = state(store);
      const quote = { id: `quote_ethos_${s.nextId++}`, product: 'term_life', status: 'offered', term_years: 20, coverage_amount: 500000, monthly_premium: { amount: 39.12, currency: 'USD' }, created_at: fixedNow, ...(await readBody(c)) };
      s.quotes.unshift(quote);
      save(store, s);
      return c.json(quote, 201);
    });
    app.get('/v1/quotes/:quoteId', (c) => {
      const quote = state(store).quotes.find((item) => item.id === c.req.param('quoteId'));
      return quote ? c.json(quote) : error(c, 'Quote not found');
    });
    app.post('/v1/applications', async (c) => {
      const s = state(store);
      const application = { id: `app_ethos_${s.nextId++}`, status: 'decisioned', decision: 'approved', created_at: fixedNow, ...(await readBody(c)) };
      s.applications.unshift(application);
      save(store, s);
      return c.json(application, 201);
    });
    app.get('/v1/applications/:applicationId', (c) => {
      const application = state(store).applications.find((item) => item.id === c.req.param('applicationId'));
      return application ? c.json(application) : error(c, 'Application not found');
    });
    app.get('/v1/policies', (c) => c.json(list(state(store).policies)));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Ethos Life API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { ethos: initialState() };
export default plugin;
