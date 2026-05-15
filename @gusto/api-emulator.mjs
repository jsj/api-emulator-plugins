function initialState(config = {}) {
  return {
    ...{
    "me": {
        "uuid": "user_1",
        "email": "emulator@example.com",
        "roles": [
            "payroll_admin"
        ]
    },
    "companies": [
        {
            "uuid": "company_1",
            "name": "Emulator Bakery",
            "ein": "00-0000000",
            "company_status": "Approved"
        }
    ],
    "employees": [
        {
            "uuid": "employee_1",
            "company_uuid": "company_1",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "ada@example.com"
        }
    ],
    "payrolls": [
        {
            "uuid": "payroll_1",
            "company_uuid": "company_1",
            "payroll_deadline": "2026-01-05",
            "check_date": "2026-01-08",
            "processed": false
        }
    ],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('gusto:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('gusto:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('gusto:state', next);
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
  provider: 'gusto',
  source: 'Gusto official API documentation-informed REST subset',
  docs: 'https://docs.gusto.com/app-integrations/reference',
  baseUrl: 'https://api.gusto.com',
  scope: ["current-user","companies","employees","payrolls","contractors"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'gusto',
  register(app, store) {

    app.get('/v1/me', (c) => c.json(state(store).me)); dataList(app, store, '/v1/companies', 'companies');
    app.get('/v1/companies/:companyId/employees', (c) => c.json(state(store).employees.filter((row) => row.company_uuid === c.req.param('companyId'))));
    app.post('/v1/companies/:companyId/employees', async (c) => { const row = await createPlain(c, store, 'employees', 'employee'); row.company_uuid = c.req.param('companyId'); return c.json(row, 201); });
    app.get('/v1/companies/:companyId/payrolls', (c) => c.json(state(store).payrolls.filter((row) => row.company_uuid === c.req.param('companyId'))));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Gusto API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { gusto: initialState() };
export default plugin;
