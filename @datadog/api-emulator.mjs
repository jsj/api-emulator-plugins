function initialState(config = {}) {
  return {
    ...{
    "hosts": [
        {
            "name": "emulator-host",
            "aliases": [
                "emulator.local"
            ],
            "apps": [
                "agent"
            ],
            "sources": [
                "api"
            ],
            "up": true
        }
    ],
    "monitors": [
        {
            "id": 1,
            "name": "Emulator CPU monitor",
            "type": "metric alert",
            "query": "avg(last_5m):avg:system.cpu.user{*} > 90",
            "message": "CPU high",
            "overall_state": "OK"
        }
    ],
    "metrics": [
        {
            "metric": "emulator.requests",
            "type": "count",
            "description": "Emulator request count"
        }
    ],
    "events": [],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('datadog:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('datadog:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('datadog:state', next);
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
  provider: 'datadog',
  source: 'Datadog official API documentation-informed REST subset',
  docs: 'https://docs.datadoghq.com/api/latest/',
  baseUrl: 'https://api.datadoghq.com',
  scope: ["api-validate","hosts","metrics","monitors","events"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'datadog',
  register(app, store) {

    app.get('/api/v1/validate', (c) => c.json({ valid: true }));
    app.get('/api/v1/hosts', (c) => c.json({ host_list: state(store).hosts, total_matching: state(store).hosts.length, total_returned: state(store).hosts.length }));
    app.get('/api/v1/monitor', (c) => c.json(state(store).monitors)); app.get('/api/v1/monitor/:id', (c) => { const row = state(store).monitors.find((m) => String(m.id) === c.req.param('id')); return row ? c.json(row) : c.json({ errors: ['Monitor not found'] }, 404); });
    app.post('/api/v1/monitor', async (c) => c.json(await createPlain(c, store, 'monitors', 'monitor'), 201));
    app.get('/api/v2/metrics', (c) => c.json({ data: state(store).metrics.map((m) => ({ id: m.metric, type: 'metrics', attributes: m })) }));
    app.post('/api/v1/series', async (c) => c.json({ status: 'ok' }, 202));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Datadog API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { datadog: initialState() };
export default plugin;
