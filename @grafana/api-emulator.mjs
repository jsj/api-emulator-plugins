function initialState(config = {}) {
  return {
    ...{
    "org": {
        "id": 1,
        "name": "Emulator Org"
    },
    "datasources": [
        {
            "id": 1,
            "uid": "prometheus",
            "name": "Prometheus",
            "type": "prometheus",
            "url": "http://prometheus:9090",
            "access": "proxy"
        }
    ],
    "dashboards": [
        {
            "id": 1,
            "uid": "emulator-overview",
            "title": "Emulator Overview",
            "uri": "db/emulator-overview",
            "url": "/d/emulator-overview/emulator-overview",
            "type": "dash-db"
        }
    ],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('grafana:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('grafana:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('grafana:state', next);
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
  provider: 'grafana',
  source: 'Grafana official API documentation-informed REST subset',
  docs: 'https://grafana.com/docs/grafana/latest/developers/http_api/',
  baseUrl: 'https://grafana.example.com',
  scope: ["health","org","datasources","search","dashboards"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'grafana',
  register(app, store) {

    app.get('/api/health', (c) => c.json({ database: 'ok', version: '11.0.0', commit: 'emulator' })); app.get('/api/org', (c) => c.json(state(store).org));
    app.get('/api/datasources', (c) => c.json(state(store).datasources)); app.get('/api/search', (c) => c.json(state(store).dashboards));
    app.get('/api/dashboards/uid/:uid', (c) => { const dash = state(store).dashboards.find((d) => d.uid === c.req.param('uid')); return dash ? c.json({ dashboard: dash, meta: { type: 'db', canSave: true } }) : c.json({ message: 'Dashboard not found' }, 404); });
    app.post('/api/dashboards/db', async (c) => { const s = state(store); const body = await json(c); const dashboard = { id: s.nextId++, uid: body.dashboard?.uid ?? `dash_${s.nextId}`, title: body.dashboard?.title ?? 'Untitled', uri: `db/${body.dashboard?.uid ?? 'untitled'}`, url: `/d/${body.dashboard?.uid ?? 'untitled'}`, type: 'dash-db' }; s.dashboards.push(dashboard); saveState(store, s); return c.json({ id: dashboard.id, uid: dashboard.uid, url: dashboard.url, status: 'success' }, 200); });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Grafana API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { grafana: initialState() };
export default plugin;
