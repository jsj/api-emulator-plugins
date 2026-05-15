function initialState(config = {}) {
  return {
    ...{
    "user": {
        "sub": "user_1",
        "email": "ada@example.com",
        "given_name": "Ada",
        "family_name": "Lovelace",
        "company_uuid": "company_1"
    },
    "reports": [
        {
            "ID": "report_1",
            "Name": "January Expenses",
            "OwnerLoginID": "ada@example.com",
            "Total": 42.99,
            "CurrencyCode": "USD",
            "ApprovalStatusName": "Not Submitted"
        }
    ],
    "entries": [
        {
            "ID": "entry_1",
            "ReportID": "report_1",
            "ExpenseTypeName": "Meal",
            "TransactionAmount": 42.99,
            "TransactionCurrencyCode": "USD"
        }
    ],
    "travelRequests": [
        {
            "ID": "request_1",
            "Name": "Emulator Trip",
            "Status": "Approved"
        }
    ],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('concur:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('concur:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('concur:state', next);
}

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function byId(rows, id) {
  return rows.find((row) => String(row.id ?? row.uuid ?? row.ID ?? row.uid) === String(id));
}

function page(app, store, route, key) {
  app.get(route, (c) => c.json({ data: state(store)[key], page: { next: null } }));
}

function dataList(app, store, route, key) {
  app.get(route, (c) => c.json({ data: state(store)[key] }));
}

function dataGet(app, store, route, key) {
  app.get(route, (c) => { const row = byId(state(store)[key], c.req.param('id')); return row ? c.json({ data: row }) : c.json({ error: 'not_found', message: 'Resource not found' }, 404); });
}

async function createPlain(c, store, key, prefix) {
  const s = state(store); const body = await json(c);
  const row = { id: body.id ?? s.nextId++, created_at: new Date().toISOString(), ...body };
  s[key].push(row); saveState(store, s); return row;
}

async function createData(c, store, key, prefix) {
  const row = await createPlain(c, store, key, prefix);
  if (typeof row.id === 'number') row.id = `${prefix}_${row.id}`;
  saveState(store, state(store));
  return c.json({ data: row }, 201);
}

async function createRow(c, store, key, prefix) {
  const row = await createPlain(c, store, key, prefix);
  if (typeof row.id === 'number') row.id = `${prefix}_${row.id}`;
  saveState(store, state(store));
  return c.json(row, 201);
}

async function createKeyed(c, store, key, prefix) {
  const row = await createPlain(c, store, key, prefix);
  row.id ??= `${prefix}_${state(store).nextId}`;
  return c.json(row, 201);
}

function wdList(app, store, route, key) { app.get(route, (c) => c.json({ total: state(store)[key].length, data: state(store)[key] })); }
function wdGet(app, store, route, key) { app.get(route, (c) => { const row = byId(state(store)[key], c.req.param('id')); return row ? c.json(row) : c.json({ error: 'not_found' }, 404); }); }
async function createWd(c, store, key, prefix) { const row = await createPlain(c, store, key, prefix); if (typeof row.id === 'number') row.id = `${prefix}_${row.id}`; saveState(store, state(store)); return c.json(row, 201); }

function samList(app, store, route, key) { app.get(route, (c) => c.json({ data: state(store)[key], pagination: { endCursor: '', hasNextPage: false } })); }
function samGet(app, store, route, key) { app.get(route, (c) => { const row = byId(state(store)[key], c.req.param('id')); return row ? c.json({ data: row }) : c.json({ message: 'Not Found' }, 404); }); }
async function createSam(c, store, key, prefix) { return createData(c, store, key, prefix); }

function concurList(app, store, route, key) { app.get(route, (c) => c.json({ Items: state(store)[key], NextPage: null })); }
async function createConcur(c, store, key, prefix) { const s = state(store); const body = await json(c); const row = { ID: body.ID ?? `${prefix}_${s.nextId++}`, ...body }; s[key].push(row); saveState(store, s); return c.json(row, 201); }



export const contract = {
  provider: 'concur',
  source: 'Concur official API documentation-informed REST subset',
  docs: 'https://developer.concur.com/api-reference/',
  baseUrl: 'https://us.api.concursolutions.com',
  scope: ["userinfo","expense-reports","expense-entries","travel-requests"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'concur',
  register(app, store) {

    app.get('/oauth2/v0/userinfo', (c) => c.json(state(store).user)); concurList(app, store, '/api/v3.0/expense/reports', 'reports'); app.post('/api/v3.0/expense/reports', async (c) => createConcur(c, store, 'reports', 'report'));
    concurList(app, store, '/api/v3.0/expense/entries', 'entries'); concurList(app, store, '/api/v3.0/travelrequest/requests', 'travelRequests');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Concur API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { concur: initialState() };
export default plugin;
