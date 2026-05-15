function initialState(config = {}) {
  return {
    departments: [
      {
        id: 'dept_1',
        name: 'Engineering',
        code: 'ENG',
        parentId: null,
      },
    ],
    workplaces: [
      {
        id: 'workplace_1',
        name: 'Emulator HQ',
        address: {
          line1: '1 Market St',
          city: 'San Francisco',
          state: 'CA',
          postalCode: '94105',
          country: 'US',
        },
      },
    ],
    workers: [
      {
        id: 'worker_1',
        type: 'employee',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        status: 'active',
        departmentId: 'dept_1',
        workplaceId: 'workplace_1',
      },
    ],
    timeOffPolicies: [
      {
        id: 'policy_1',
        name: 'Paid Time Off',
        accrualType: 'fixed',
      },
    ],
    timeOffAssignments: [
      {
        id: 'assignment_1',
        workerId: 'worker_1',
        policyId: 'policy_1',
      },
    ],
    timeOffBalances: [
      {
        id: 'balance_1',
        workerId: 'worker_1',
        policyId: 'policy_1',
        hours: 80,
      },
    ],
    timeOffRequests: [
      {
        id: 'request_1',
        workerId: 'worker_1',
        policyId: 'policy_1',
        status: 'approved',
        startDate: '2026-02-16',
        endDate: '2026-02-16',
      },
    ],
    nextId: 2,
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('joinwarp-payroll:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('joinwarp-payroll:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('joinwarp-payroll:state', next);
}

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function byId(rows, id) {
  return rows.find((row) => String(row.id) === String(id));
}

function listPayload(c, rows) {
  const limit = Number(c.req.query('limit') ?? 25);
  const afterId = c.req.query('afterId');
  const beforeId = c.req.query('beforeId');
  let start = 0;
  if (afterId) start = rows.findIndex((row) => row.id === afterId) + 1;
  if (beforeId) {
    const end = rows.findIndex((row) => row.id === beforeId);
    return { hasMore: false, data: rows.slice(Math.max(0, end - limit), end < 0 ? 0 : end) };
  }
  const data = rows.slice(Math.max(0, start), Math.max(0, start) + limit);
  return { hasMore: start + limit < rows.length, data };
}

function error(c, tag, message, status) {
  return c.json({ _tag: tag, message }, status);
}

function list(app, store, route, key) {
  app.get(route, (c) => c.json(listPayload(c, state(store)[key])));
}

function get(app, store, route, key, param = 'id') {
  app.get(route, (c) => {
    const row = byId(state(store)[key], c.req.param(param));
    return row ? c.json(row) : error(c, 'NotFound', 'Resource not found', 404);
  });
}

async function create(c, store, key, prefix, defaults = {}) {
  const s = state(store);
  const body = await json(c);
  const row = {
    id: body.id ?? `${prefix}_${s.nextId++}`,
    ...defaults,
    ...body,
  };
  s[key].push(row);
  saveState(store, s);
  return c.json(row, 201);
}

async function update(c, store, key, param = 'id') {
  const s = state(store);
  const row = byId(s[key], c.req.param(param));
  if (!row) return error(c, 'NotFound', 'Resource not found', 404);
  Object.assign(row, await json(c));
  saveState(store, s);
  return c.json(row);
}

export const contract = {
  provider: 'joinwarp-payroll',
  source: 'Warp official API documentation and SDK-informed REST subset',
  docs: 'https://docs.warp.co/api',
  baseUrl: 'https://api.joinwarp.com',
  scope: ['departments', 'workplaces', 'workers', 'time-off'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'joinwarp-payroll',
  register(app, store) {
    list(app, store, '/v1/departments', 'departments');
    app.post('/v1/departments', async (c) => create(c, store, 'departments', 'dept'));
    app.patch('/v1/departments/:id', async (c) => update(c, store, 'departments'));
    list(app, store, '/v1/workplaces', 'workplaces');
    app.post('/v1/workplaces', async (c) => create(c, store, 'workplaces', 'workplace'));
    app.patch('/v1/workplaces/:id', async (c) => update(c, store, 'workplaces'));
    list(app, store, '/v1/workers', 'workers');
    app.post('/v1/workers/employee', async (c) => create(c, store, 'workers', 'worker', { type: 'employee', status: 'active' }));
    app.post('/v1/workers/contractor', async (c) => create(c, store, 'workers', 'worker', { type: 'contractor', status: 'active' }));
    app.post('/v1/workers/:id/invite', (c) => {
      const worker = byId(state(store).workers, c.req.param('id'));
      return worker ? c.json({ id: `invite_${worker.id}`, workerId: worker.id, status: 'sent' }, 201) : error(c, 'NotFound', 'Resource not found', 404);
    });
    get(app, store, '/v1/workers/:id', 'workers');
    app.delete('/v1/workers/:id', (c) => {
      const s = state(store);
      const before = s.workers.length;
      s.workers = s.workers.filter((worker) => worker.id !== c.req.param('id'));
      saveState(store, s);
      return before === s.workers.length ? error(c, 'NotFound', 'Resource not found', 404) : c.json({ id: c.req.param('id'), deleted: true });
    });
    list(app, store, '/v1/time_off/policies', 'timeOffPolicies');
    get(app, store, '/v1/time_off/policies/:id', 'timeOffPolicies');
    list(app, store, '/v1/time_off/assignments', 'timeOffAssignments');
    list(app, store, '/v1/time_off/balances', 'timeOffBalances');
    list(app, store, '/v1/time_off/requests', 'timeOffRequests');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'JoinWarp Payroll API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { 'joinwarp-payroll': initialState() };
export default plugin;
