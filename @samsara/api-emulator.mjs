function initialState(config = {}) {
  return {
    ...{
    "vehicles": [
        {
            "id": "vehicle_1",
            "name": "Emulator Truck",
            "vin": "1FTFW1E50NFA00001",
            "licensePlate": "EMU-001"
        }
    ],
    "drivers": [
        {
            "id": "driver_1",
            "name": "Ada Lovelace",
            "username": "ada@example.com"
        }
    ],
    "routes": [
        {
            "id": "route_1",
            "name": "Morning Route",
            "driverId": "driver_1",
            "vehicleId": "vehicle_1",
            "settings": {
                "routeStartingCondition": "depart"
            }
        }
    ],
    "addresses": [
        {
            "id": "address_1",
            "name": "Warehouse",
            "formattedAddress": "1 Emulator Way"
        }
    ],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('samsara:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('samsara:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('samsara:state', next);
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
  provider: 'samsara',
  source: 'Samsara official API documentation-informed REST subset',
  docs: 'https://developers.samsara.com/reference/overview',
  baseUrl: 'https://api.samsara.com',
  scope: ["vehicles","drivers","routes","locations","fleet-stats"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'samsara',
  register(app, store) {

    samList(app, store, '/fleet/vehicles', 'vehicles'); samGet(app, store, '/fleet/vehicles/:id', 'vehicles'); samList(app, store, '/fleet/drivers', 'drivers'); samList(app, store, '/fleet/routes', 'routes'); app.post('/fleet/routes', async (c) => createSam(c, store, 'routes', 'route')); samList(app, store, '/addresses', 'addresses');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Samsara API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { samsara: initialState() };
export default plugin;
