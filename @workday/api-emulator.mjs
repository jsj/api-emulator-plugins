function initialState(config = {}) {
  return {
    ...{
    "workers": [
        {
            "id": "worker_1",
            "descriptor": "Ada Lovelace",
            "employeeID": "E0001",
            "primaryWorkEmail": "ada@example.com",
            "active": true
        }
    ],
    "organizations": [
        {
            "id": "org_1",
            "descriptor": "Engineering"
        }
    ],
    "jobProfiles": [
        {
            "id": "job_1",
            "descriptor": "Software Engineer"
        }
    ],
    "businessProcessEvents": [],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('workday:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('workday:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('workday:state', next);
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
  provider: 'workday',
  source: 'Workday official API documentation-informed REST subset',
  docs: 'https://community.workday.com/rest-api',
  baseUrl: 'https://{tenant}.workday.com/ccx/api',
  scope: ["workers","organizations","job-profiles","business-process-events"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'workday',
  register(app, store) {

    app.post('/ccx/oauth2/:tenant/token', (c) => c.json({ access_token: 'workday_emulator_token', token_type: 'Bearer', expires_in: 3600 }));
    app.get('/ccx/service/customreport2/:tenant/:reportOwner/:reportName', (c) => {
      const rows = state(store).workers.map((worker) => ({ Worker: worker.descriptor, Employee_ID: worker.employeeID, Email: worker.primaryWorkEmail }));
      if (c.req.query('format') === 'csv') return c.text(['Worker,Employee_ID,Email', ...rows.map((row) => `${row.Worker},${row.Employee_ID},${row.Email}`)].join('\n'));
      return c.json({ Report_Entry: rows });
    });
    wdList(app, store, '/ccx/api/v1/:tenant/workers', 'workers'); wdGet(app, store, '/ccx/api/v1/:tenant/workers/:id', 'workers'); app.post('/ccx/api/v1/:tenant/workers', async (c) => createWd(c, store, 'workers', 'worker'));
    wdList(app, store, '/ccx/api/v1/:tenant/organizations', 'organizations'); wdList(app, store, '/ccx/api/v1/:tenant/values/jobProfiles', 'jobProfiles');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Workday API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { workday: initialState() };
export default plugin;
