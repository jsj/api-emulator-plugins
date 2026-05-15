function initialState(config = {}) {
  return {
    ...{
    "workers": [
        {
            "associateOID": "aoid_1",
            "workerID": {
                "idValue": "E0001"
            },
            "person": {
                "legalName": {
                    "givenName": "Ada",
                    "familyName1": "Lovelace"
                },
                "communication": {
                    "emails": [
                        {
                            "emailUri": "ada@example.com"
                        }
                    ]
                }
            },
            "workerStatus": {
                "statusCode": {
                    "codeValue": "Active"
                }
            }
        }
    ],
    "payDataInputs": [],
    "nextId": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('adp:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('adp:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('adp:state', next);
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

function adpError(message) { return { confirmMessage: { confirmMessageID: { idValue: 'emulator-error' }, createDateTime: new Date().toISOString(), requestStatusCode: { codeValue: 'failed' }, resourceMessages: [{ processMessages: [{ messageTypeCode: { codeValue: 'error' }, userMessage: { messageTxt: message } }] }] } }; }

export const contract = {
  provider: 'adp',
  source: 'ADP official API documentation-informed REST subset',
  docs: 'https://developers.adp.com/',
  baseUrl: 'https://api.adp.com',
  scope: ["workers","worker-read","worker-hire-event","pay-data-input"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'adp',
  register(app, store) {

    app.get('/hr/v2/workers', (c) => c.json({ workers: state(store).workers }));
    app.get('/hr/v2/workers/:associateOid', (c) => { const row = state(store).workers.find((w) => w.associateOID === c.req.param('associateOid')); return row ? c.json(row) : c.json(adpError('Worker not found'), 404); });
    app.post('/events/hr/v1/worker.hire', async (c) => { const s = state(store); const body = await json(c); const row = { associateOID: body.associateOID ?? `aoid_${s.nextId++}`, workerID: { idValue: body.workerID?.idValue ?? `E${String(s.nextId).padStart(4, '0')}` }, person: body.person ?? {}, workerStatus: { statusCode: { codeValue: 'Active' } } }; s.workers.push(row); saveState(store, s); return c.json({ eventStatusCode: { codeValue: 'complete' }, worker: row }, 201); });
    app.post('/payroll/v1/pay-data-input', async (c) => createKeyed(c, store, 'payDataInputs', 'payDataInput'));

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'ADP API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { adp: initialState() };
export default plugin;
