function initialState(config = {}) {
  return {
    portalId: config.portalId ?? 123456,
    user: config.user ?? 'emulator@example.com',
    contacts: config.contacts ?? [{
      id: '1',
      properties: {
        email: 'ada@example.com',
        firstname: 'Ada',
        lastname: 'Lovelace',
        createdate: '2026-01-01T00:00:00.000Z',
        lastmodifieddate: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      archived: false,
    }],
    companies: config.companies ?? [{
      id: '101',
      properties: {
        name: 'Emulator Co',
        domain: 'example.com',
        createdate: '2026-01-01T00:00:00.000Z',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      archived: false,
    }],
    deals: config.deals ?? [{
      id: '201',
      properties: {
        dealname: 'Emulator Deal',
        amount: '12000',
        dealstage: 'appointmentscheduled',
        pipeline: 'default',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      archived: false,
    }],
    secrets: config.secrets ?? [{ name: 'EMULATOR_SECRET', createdAt: '2026-01-01T00:00:00.000Z' }],
    hubdbTables: config.hubdbTables ?? [{ id: '301', name: 'emulator_table', label: 'Emulator Table', rowCount: 1 }],
    files: config.files ?? [{ id: '401', name: 'emulator.txt', url: 'https://cdn.example.test/emulator.txt', type: 'TEXT' }],
    nextId: 1000,
  };
}

function state(store) {
  const current = store.getData?.('hubspot:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('hubspot:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('hubspot:state', next);
}

function collectionName(objectType) {
  const normalized = objectType.toLowerCase();
  if (normalized === 'contact' || normalized === 'contacts') return 'contacts';
  if (normalized === 'company' || normalized === 'companies') return 'companies';
  if (normalized === 'deal' || normalized === 'deals') return 'deals';
  return null;
}

function now() {
  return new Date().toISOString();
}

function publicRecord(record, properties) {
  if (!properties?.length) return record;
  const selected = {};
  for (const property of properties) selected[property] = record.properties?.[property] ?? null;
  return { ...record, properties: selected };
}

function propertiesFor(objectType) {
  const common = [
    { name: 'createdate', label: 'Create Date', type: 'datetime', fieldType: 'date' },
    { name: 'lastmodifieddate', label: 'Last Modified Date', type: 'datetime', fieldType: 'date' },
  ];
  const specific = {
    contacts: [
      { name: 'email', label: 'Email', type: 'string', fieldType: 'text' },
      { name: 'firstname', label: 'First Name', type: 'string', fieldType: 'text' },
      { name: 'lastname', label: 'Last Name', type: 'string', fieldType: 'text' },
    ],
    companies: [
      { name: 'name', label: 'Company name', type: 'string', fieldType: 'text' },
      { name: 'domain', label: 'Company domain', type: 'string', fieldType: 'text' },
    ],
    deals: [
      { name: 'dealname', label: 'Deal name', type: 'string', fieldType: 'text' },
      { name: 'amount', label: 'Amount', type: 'number', fieldType: 'number' },
      { name: 'dealstage', label: 'Deal stage', type: 'enumeration', fieldType: 'select' },
      { name: 'pipeline', label: 'Pipeline', type: 'enumeration', fieldType: 'select' },
    ],
  }[collectionName(objectType)] ?? [];
  return [...specific, ...common];
}

export const contract = {
  provider: 'hubspot',
  source: 'HubSpot CLI-informed CRM/CMS API subset',
  docs: 'https://developers.hubspot.com/docs',
  scope: ['oauth-access-token-info', 'crm-objects', 'crm-search', 'crm-properties', 'secrets', 'hubdb', 'files'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'hubspot',
  register(app, store) {
    app.get('/oauth/v1/access-tokens/:token', (c) => {
      const s = state(store);
      return c.json({ token: c.req.param('token'), user: s.user, hub_id: s.portalId, scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'] });
    });
    app.get('/account-info/v3/details', (c) => {
      const s = state(store);
      return c.json({ portalId: s.portalId, accountType: 'DEVELOPER_TEST', timeZone: 'UTC', companyCurrency: 'USD' });
    });

    app.get('/crm/v3/objects/:objectType', (c) => {
      const rows = state(store)[collectionName(c.req.param('objectType'))] ?? [];
      const limit = Number(c.req.query('limit') ?? 100);
      const properties = c.req.queries?.('properties') ?? (c.req.query('properties')?.split(',').filter(Boolean) ?? []);
      return c.json({ results: rows.slice(0, limit).map((row) => publicRecord(row, properties)), paging: rows.length > limit ? { next: { after: rows[limit - 1].id } } : undefined });
    });
    app.post('/crm/v3/objects/:objectType', async (c) => {
      const s = state(store);
      const collection = collectionName(c.req.param('objectType'));
      if (!collection) return c.json({ status: 'error', message: 'Unknown object type' }, 404);
      const body = await c.req.json().catch(() => ({}));
      const timestamp = now();
      const record = { id: String(s.nextId++), properties: body.properties ?? {}, createdAt: timestamp, updatedAt: timestamp, archived: false };
      s[collection].push(record);
      saveState(store, s);
      return c.json(record, 201);
    });
    app.get('/crm/v3/objects/:objectType/:objectId', (c) => {
      const row = (state(store)[collectionName(c.req.param('objectType'))] ?? []).find((item) => item.id === c.req.param('objectId'));
      if (!row) return c.json({ status: 'error', message: 'Object not found' }, 404);
      return c.json(row);
    });
    app.patch('/crm/v3/objects/:objectType/:objectId', async (c) => {
      const s = state(store);
      const row = (s[collectionName(c.req.param('objectType'))] ?? []).find((item) => item.id === c.req.param('objectId'));
      if (!row) return c.json({ status: 'error', message: 'Object not found' }, 404);
      const body = await c.req.json().catch(() => ({}));
      row.properties = { ...row.properties, ...(body.properties ?? {}) };
      row.updatedAt = now();
      saveState(store, s);
      return c.json(row);
    });
    app.post('/crm/v3/objects/:objectType/search', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const term = String(body.query ?? '').toLowerCase();
      const rows = (state(store)[collectionName(c.req.param('objectType'))] ?? []).filter((row) => !term || Object.values(row.properties).some((value) => String(value).toLowerCase().includes(term)));
      return c.json({ total: rows.length, results: rows.slice(0, body.limit ?? 100) });
    });
    app.get('/crm/v3/properties/:objectType', (c) => c.json({ results: propertiesFor(c.req.param('objectType')) }));
    app.get('/crm/v3/properties/:objectType/:propertyName', (c) => {
      const property = propertiesFor(c.req.param('objectType')).find((item) => item.name === c.req.param('propertyName'));
      if (!property) return c.json({ status: 'error', message: 'Property not found' }, 404);
      return c.json(property);
    });

    app.get('/cms/v3/hubdb/tables', (c) => c.json({ results: state(store).hubdbTables }));
    app.get('/files/v3/files/search', (c) => c.json({ results: state(store).files }));
    app.get('/developer/v3/secrets', (c) => c.json({ results: state(store).secrets }));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'HubSpot API emulator';
export const endpoints = 'OAuth token info, account details, CRM objects/search/properties, secrets, HubDB, and files';
export const capabilities = contract.scope;
export const initConfig = { hubspot: initialState() };
export default plugin;
