import { createToken, fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'intuit:state';

function defaultState(baseUrl = 'https://quickbooks.api.intuit.com') {
  return {
    baseUrl,
    tokenCount: 0,
    realmId: '123145725943001',
    companyInfo: { Id: '123145725943001', CompanyName: 'Emulator Books LLC', LegalName: 'Emulator Books LLC', Country: 'US' },
    accounts: [{ Id: '1', Name: 'Checking', AccountType: 'Bank', Classification: 'Asset', Active: true, CurrentBalance: 25000 }],
    customers: [{ Id: '1', DisplayName: 'Ada Lovelace', PrimaryEmailAddr: { Address: 'ada@example.com' }, Active: true, SyncToken: '0' }],
    invoices: [{ Id: '1', CustomerRef: { value: '1', name: 'Ada Lovelace' }, TotalAmt: 125.5, Balance: 125.5, DocNumber: '1001', SyncToken: '0' }],
    payments: [],
    nextId: 2,
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());

function save(store, next) {
  return setState(store, STATE_KEY, next);
}

function fault(c, message, status = 400, code = '4000', type = 'ValidationFault') {
  return c.json({ Fault: { Error: [{ Message: message, Detail: message, code }], type }, time: fixedNow }, status);
}

function queryResponse(rows, name) {
  return { QueryResponse: { [name]: rows, startPosition: 1, maxResults: rows.length, totalCount: rows.length }, time: fixedNow };
}

function byId(rows, id) {
  return rows.find((row) => String(row.Id) === String(id));
}

function listForQuery(s, query = '') {
  const lower = query.toLowerCase();
  if (lower.includes('from customer')) return ['Customer', s.customers];
  if (lower.includes('from invoice')) return ['Invoice', s.invoices];
  if (lower.includes('from payment')) return ['Payment', s.payments];
  if (lower.includes('from account')) return ['Account', s.accounts];
  return ['Customer', s.customers];
}

async function createEntity(c, store, key, entityName) {
  const s = state(store);
  const body = await readBody(c);
  const row = { Id: String(s.nextId++), SyncToken: '0', Active: true, MetaData: { CreateTime: fixedNow, LastUpdatedTime: fixedNow }, ...body };
  s[key].push(row);
  save(store, s);
  return c.json({ [entityName]: row, time: fixedNow });
}

export function seedFromConfig(store, baseUrl = 'https://quickbooks.api.intuit.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'intuit',
  source: 'Intuit QuickBooks Online REST API documentation-informed subset',
  docs: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account',
  baseUrl: 'https://quickbooks.api.intuit.com',
  scope: ['oauth2_token', 'companyinfo', 'query', 'customers', 'invoices', 'payments', 'accounts'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'intuit',
  register(app, store) {
    app.post('/oauth2/v1/tokens/bearer', (c) => {
      const s = state(store);
      s.tokenCount += 1;
      return c.json({ token_type: 'bearer', access_token: createToken('intuit_access', s.tokenCount), refresh_token: createToken('intuit_refresh', s.tokenCount), expires_in: 3600, x_refresh_token_expires_in: 8726400 });
    });
    app.get('/v3/company/:realmId/companyinfo/:companyId', (c) => c.json({ CompanyInfo: state(store).companyInfo, time: fixedNow }));
    app.get('/v3/company/:realmId/query', (c) => {
      const [name, rows] = listForQuery(state(store), c.req.query('query'));
      return c.json(queryResponse(rows, name));
    });
    app.post('/v3/company/:realmId/query', async (c) => {
      const body = await readBody(c);
      const [name, rows] = listForQuery(state(store), body.query ?? body);
      return c.json(queryResponse(rows, name));
    });
    app.post('/v3/company/:realmId/customer', (c) => createEntity(c, store, 'customers', 'Customer'));
    app.get('/v3/company/:realmId/customer/:id', (c) => {
      const row = byId(state(store).customers, c.req.param('id'));
      return row ? c.json({ Customer: row, time: fixedNow }) : fault(c, 'Object Not Found', 404, '610');
    });
    app.post('/v3/company/:realmId/invoice', (c) => createEntity(c, store, 'invoices', 'Invoice'));
    app.get('/v3/company/:realmId/invoice/:id', (c) => {
      const row = byId(state(store).invoices, c.req.param('id'));
      return row ? c.json({ Invoice: row, time: fixedNow }) : fault(c, 'Object Not Found', 404, '610');
    });
    app.post('/v3/company/:realmId/payment', (c) => createEntity(c, store, 'payments', 'Payment'));
    app.get('/v3/company/:realmId/account/:id', (c) => {
      const row = byId(state(store).accounts, c.req.param('id'));
      return row ? c.json({ Account: row, time: fixedNow }) : fault(c, 'Object Not Found', 404, '610');
    });
    app.get('/intuit/inspect/state', (c) => c.json(state(store)));
    app.get('/inspect/contract', (c) => c.json(contract));
  },
};

export const label = 'Intuit QuickBooks API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { intuit: { realmId: '123145725943001' } };
export default plugin;
