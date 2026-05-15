function initialState(config = {}) {
  return {
    ...{
    "employees": [
        {
            "id": "emp_1",
            "work_email": "ada@example.com",
            "first_name": "Ada",
            "last_name": "Lovelace",
            "employment_status": "ACTIVE",
            "department_id": "dept_1"
        }
    ],
    "groups": [
        {
            "id": "group_1",
            "name": "Engineering",
            "type": "DEPARTMENT"
        }
    ],
    "departments": [
        {
            "id": "dept_1",
            "name": "Engineering"
        }
    ],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('rippling:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('rippling:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('rippling:state', next);
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
  provider: 'rippling',
  source: 'Rippling official API documentation-informed REST subset',
  docs: 'https://developer.rippling.com/documentation/platform-api/',
  baseUrl: 'https://api.rippling.com/platform/api',
  scope: ["employees","groups","departments","custom-fields"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'rippling',
  register(app, store) {

    app.get('/apps/api/integrations', (c) => c.json([{ id: 'app_1', displayName: 'Emulator Flux App', name: 'emulator_flux_app' }]));
    app.post('/apps/api/integrations/find_paginated', (c) => c.json({ data: [{ id: 'app_1', displayName: 'Emulator Flux App', name: 'emulator_flux_app' }], cursor: null }));
    app.get('/apps/api/apps/:id', (c) => c.json({ id: c.req.param('id'), displayName: 'Emulator Flux App', name: 'emulator_flux_app', spoke: { handle: 'emulator', company: 'company_1' } }));
    dataList(app, store, '/platform/api/employees', 'employees'); dataGet(app, store, '/platform/api/employees/:id', 'employees'); app.post('/platform/api/employees', async (c) => createData(c, store, 'employees', 'emp'));
    dataList(app, store, '/platform/api/groups', 'groups'); dataList(app, store, '/platform/api/departments', 'departments');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Rippling API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { rippling: initialState() };
export default plugin;
