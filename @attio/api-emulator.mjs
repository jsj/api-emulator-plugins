function initialState(config = {}) {
  return {
    workspace: config.workspace ?? { id: 'workspace_emulator', name: 'Emulator Workspace', slug: 'emulator' },
    user: config.user ?? { id: 'user_emulator', email_address: 'emulator@example.com', name: 'Emulator User' },
    objects: config.objects ?? [
      { id: 'object_people', api_slug: 'people', singular_noun: 'person', plural_noun: 'people' },
      { id: 'object_companies', api_slug: 'companies', singular_noun: 'company', plural_noun: 'companies' },
      { id: 'object_deals', api_slug: 'deals', singular_noun: 'deal', plural_noun: 'deals' },
    ],
    records: config.records ?? {
      people: [{
        id: { record_id: 'record_person_1', workspace_id: 'workspace_emulator', object_id: 'object_people' },
        created_at: '2026-01-01T00:00:00.000Z',
        values: {
          name: [{ value: 'Ada Lovelace' }],
          email_addresses: [{ email_address: 'ada@example.com' }],
        },
      }],
      companies: [{
        id: { record_id: 'record_company_1', workspace_id: 'workspace_emulator', object_id: 'object_companies' },
        created_at: '2026-01-01T00:00:00.000Z',
        values: {
          name: [{ value: 'Emulator Co' }],
          domains: [{ domain: 'example.com' }],
        },
      }],
      deals: [{
        id: { record_id: 'record_deal_1', workspace_id: 'workspace_emulator', object_id: 'object_deals' },
        created_at: '2026-01-01T00:00:00.000Z',
        values: {
          name: [{ value: 'Emulator Deal' }],
          value: [{ currency_value: 12000, currency_code: 'USD' }],
        },
      }],
    },
    lists: config.lists ?? [{ id: { list_id: 'list_emulator' }, name: 'Emulator List', api_slug: 'emulator-list' }],
    nextRecord: 2,
  };
}

function state(store) {
  const current = store.getData?.('attio:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('attio:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('attio:state', next);
}

function objectFor(s, objectSlug) {
  return s.objects.find((object) => object.api_slug === objectSlug || object.id === objectSlug);
}

function valuesContain(values, query) {
  const text = JSON.stringify(values).toLowerCase();
  return text.includes(String(query).toLowerCase());
}

function recordId(record) {
  return record.id?.record_id ?? record.record_id;
}

export const contract = {
  provider: 'attio',
  source: 'Attio CLI/API-informed REST API subset',
  docs: 'https://docs.attio.com/rest-api/overview',
  scope: ['self', 'objects', 'attributes', 'records', 'record-search', 'lists'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'attio',
  register(app, store) {
    app.get('/v2/self', (c) => {
      const s = state(store);
      return c.json({ data: { workspace: s.workspace, user: s.user } });
    });
    app.get('/v2/objects', (c) => c.json({ data: state(store).objects }));
    app.get('/v2/objects/:object', (c) => {
      const object = objectFor(state(store), c.req.param('object'));
      if (!object) return c.json({ status_code: 404, error: 'not_found', message: 'Object not found' }, 404);
      return c.json({ data: object });
    });
    app.get('/v2/objects/:object/attributes', (c) => {
      const attributes = {
        people: ['name', 'email_addresses'],
        companies: ['name', 'domains'],
        deals: ['name', 'value'],
      }[c.req.param('object')] ?? ['name'];
      return c.json({ data: attributes.map((api_slug) => ({ id: { attribute_id: `attribute_${api_slug}` }, api_slug, title: api_slug.replaceAll('_', ' ') })) });
    });

    app.post('/v2/objects/:object/records/query', async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const rows = state(store).records[c.req.param('object')] ?? [];
      const query = body.query ?? body.filter?.query;
      const filtered = query ? rows.filter((row) => valuesContain(row.values, query)) : rows;
      return c.json({ data: filtered.slice(0, body.limit ?? 100) });
    });
    app.get('/v2/objects/:object/records/:recordId', (c) => {
      const row = (state(store).records[c.req.param('object')] ?? []).find((item) => recordId(item) === c.req.param('recordId'));
      if (!row) return c.json({ status_code: 404, error: 'not_found', message: 'Record not found' }, 404);
      return c.json({ data: row });
    });
    app.post('/v2/objects/:object/records', async (c) => {
      const s = state(store);
      const object = objectFor(s, c.req.param('object'));
      if (!object) return c.json({ status_code: 404, error: 'not_found', message: 'Object not found' }, 404);
      const body = await c.req.json().catch(() => ({}));
      const row = {
        id: { record_id: `record_${c.req.param('object')}_${s.nextRecord++}`, workspace_id: s.workspace.id, object_id: object.id },
        created_at: new Date().toISOString(),
        values: body.data?.values ?? body.values ?? {},
      };
      s.records[c.req.param('object')] ??= [];
      s.records[c.req.param('object')].push(row);
      saveState(store, s);
      return c.json({ data: row }, 201);
    });
    app.patch('/v2/objects/:object/records/:recordId', async (c) => {
      const s = state(store);
      const row = (s.records[c.req.param('object')] ?? []).find((item) => recordId(item) === c.req.param('recordId'));
      if (!row) return c.json({ status_code: 404, error: 'not_found', message: 'Record not found' }, 404);
      const body = await c.req.json().catch(() => ({}));
      row.values = { ...row.values, ...(body.data?.values ?? body.values ?? {}) };
      saveState(store, s);
      return c.json({ data: row });
    });

    app.get('/v2/lists', (c) => c.json({ data: state(store).lists }));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Attio API emulator';
export const endpoints = 'Self, objects, attributes, record query/create/read/update, and lists';
export const capabilities = contract.scope;
export const initConfig = { attio: initialState() };
export default plugin;
