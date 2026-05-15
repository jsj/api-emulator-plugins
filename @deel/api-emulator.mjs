function initialState(config = {}) {
  return {
    people: [
      {
        id: 'person_1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.com',
        worker_type: 'employee',
        status: 'active',
      },
    ],
    legalEntities: [
      {
        id: 'legal_entity_1',
        name: 'Emulator Inc.',
        country: 'US',
        entity_type: 'company',
      },
    ],
    contracts: [
      {
        id: 'contract_1',
        worker_id: 'person_1',
        title: 'Senior Engineer',
        type: 'employee',
        status: 'active',
        start_date: '2026-01-01',
        currency: 'USD',
      },
    ],
    invoices: [
      {
        id: 'invoice_1',
        contract_id: 'contract_1',
        status: 'paid',
        currency: 'USD',
        total: '12500.00',
        issued_at: '2026-01-31T00:00:00.000Z',
      },
    ],
    roles: [
      {
        id: 'role_1',
        name: 'Payroll Admin',
        description: 'Can manage workforce and payroll data',
      },
    ],
    organizationStructures: [
      {
        id: 'org_structure_1',
        name: 'Engineering',
        parent_id: null,
      },
    ],
    nextId: 2,
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('deel:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('deel:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('deel:state', next);
}

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function byId(rows, id) {
  return rows.find((row) => String(row.id) === String(id));
}

function pageFor(c, rows) {
  const limit = Number(c.req.query('limit') ?? rows.length) || rows.length;
  const offset = Number(c.req.query('offset') ?? 0);
  return {
    data: rows.slice(offset, offset + limit),
    page: {
      limit,
      offset,
      total: rows.length,
      next: offset + limit < rows.length ? String(offset + limit) : null,
    },
  };
}

function notFound(c) {
  return c.json({ data: null, error: { type: 'not_found', message: 'Resource not found' } }, 404);
}

function list(app, store, route, key) {
  app.get(route, (c) => c.json(pageFor(c, state(store)[key])));
}

function get(app, store, route, key, param = 'id') {
  app.get(route, (c) => {
    const row = byId(state(store)[key], c.req.param(param));
    return row ? c.json({ data: row }) : notFound(c);
  });
}

async function create(c, store, key, prefix) {
  const s = state(store);
  const body = await json(c);
  const row = {
    id: body.id ?? `${prefix}_${s.nextId++}`,
    created_at: new Date().toISOString(),
    ...body,
  };
  s[key].push(row);
  saveState(store, s);
  return c.json({ data: row }, 201);
}

export const contract = {
  provider: 'deel',
  source: 'Deel official REST API documentation and OpenAPI-informed subset',
  docs: 'https://developer.deel.com/api/introduction',
  baseUrl: 'https://api.letsdeel.com/rest/v2',
  scope: ['people', 'legal-entities', 'contracts', 'invoices', 'roles', 'organization-structures'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'deel',
  register(app, store) {
    list(app, store, '/rest/v2/people', 'people');
    get(app, store, '/rest/v2/people/:id', 'people');
    list(app, store, '/rest/v2/legal-entities', 'legalEntities');
    list(app, store, '/rest/v2/contracts', 'contracts');
    get(app, store, '/rest/v2/contracts/:id', 'contracts');
    app.post('/rest/v2/contracts', async (c) => create(c, store, 'contracts', 'contract'));
    list(app, store, '/rest/v2/invoices', 'invoices');
    list(app, store, '/rest/v2/invoices/deel', 'invoices');
    get(app, store, '/rest/v2/invoices/:id', 'invoices');
    app.get('/rest/v2/invoices/:id/download', (c) => {
      const invoice = byId(state(store).invoices, c.req.param('id'));
      return invoice ? c.json({ data: { id: invoice.id, download_url: `https://api.letsdeel.com/rest/v2/invoices/${invoice.id}/download`, content_type: 'application/pdf' } }) : notFound(c);
    });
    list(app, store, '/rest/v2/roles', 'roles');
    list(app, store, '/rest/v2/hris/organization_structures', 'organizationStructures');
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Deel API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { deel: initialState() };
export default plugin;
