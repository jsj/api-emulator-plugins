import { fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'metlife:state';

function initialState(config = {}) {
  return {
    products: [
      { id: 'prod_met_term', name: 'Term Life', type: 'life', terms: [10, 20, 30], currencies: ['USD'] },
      { id: 'prod_met_accident', name: 'Accident Protect', type: 'accident', terms: [1], currencies: ['USD'] },
    ],
    needsAnalyses: [{ id: 'na_met_1', status: 'completed', recommendedProductId: 'prod_met_term', coverageAmount: 500000, createdAt: fixedNow }],
    quotes: [{ id: 'quote_met_1', productId: 'prod_met_term', status: 'illustrated', faceAmount: 500000, monthlyPremium: { amount: 42.18, currency: 'USD' }, createdAt: fixedNow }],
    applications: [{ id: 'app_met_1', quoteId: 'quote_met_1', status: 'submitted', applicant: { firstName: 'Ada', lastName: 'Lovelace' }, createdAt: fixedNow }],
    nextId: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const list = (data) => ({ data, meta: { count: data.length, next: null } });
const error = (c, message, status = 404) => c.json({ error: { code: status === 404 ? 'RESOURCE_NOT_FOUND' : 'VALIDATION_ERROR', message } }, status);

export const contract = {
  provider: 'metlife',
  source: 'MetLife EMEA developer portal needs-analysis, illustration, and application APIs',
  docs: 'https://emea.developer.metlife.com/',
  baseUrl: 'https://emea.developerhub.metlife.com/emea/engage',
  scope: ['products', 'needs-analysis', 'quote-illustrations', 'application-submissions', 'inspection'],
  fidelity: 'stateful-rest-emulator',
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const plugin = {
  name: 'metlife',
  register(app, store) {
    app.get('/v1/products', (c) => c.json(list(state(store).products)));
    app.post('/v1/needs-analysis', async (c) => {
      const s = state(store);
      const analysis = { id: `na_met_${s.nextId++}`, status: 'completed', recommendedProductId: 'prod_met_term', coverageAmount: 500000, createdAt: fixedNow, ...(await readBody(c)) };
      s.needsAnalyses.unshift(analysis);
      save(store, s);
      return c.json(analysis, 201);
    });
    app.post('/v1/quote-illustrations', async (c) => {
      const s = state(store);
      const quote = { id: `quote_met_${s.nextId++}`, status: 'illustrated', monthlyPremium: { amount: 42.18, currency: 'USD' }, createdAt: fixedNow, ...(await readBody(c)) };
      s.quotes.unshift(quote);
      save(store, s);
      return c.json(quote, 201);
    });
    app.get('/v1/quote-illustrations/:quoteId', (c) => {
      const quote = state(store).quotes.find((item) => item.id === c.req.param('quoteId'));
      return quote ? c.json(quote) : error(c, 'Quote illustration not found');
    });
    app.post('/v1/applications', async (c) => {
      const s = state(store);
      const application = { id: `app_met_${s.nextId++}`, status: 'submitted', createdAt: fixedNow, ...(await readBody(c)) };
      s.applications.unshift(application);
      save(store, s);
      return c.json(application, 201);
    });
    app.get('/v1/applications/:applicationId', (c) => {
      const application = state(store).applications.find((item) => item.id === c.req.param('applicationId'));
      return application ? c.json(application) : error(c, 'Application not found');
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'MetLife API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { metlife: initialState() };
export default plugin;
