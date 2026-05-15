function initialState(config = {}) {
  return {
    tables: config.tables ?? {
      incident: [{
        sys_id: 'incident_1',
        number: 'INC0010001',
        short_description: 'Customer cannot log in',
        description: 'Password reset email is not arriving.',
        state: '1',
        priority: '3',
        caller_id: { value: 'user_1', link: '/api/now/table/sys_user/user_1' },
        sys_created_on: '2026-01-01 00:00:00',
        sys_updated_on: '2026-01-01 00:00:00',
      }],
      sys_user: [{
        sys_id: 'user_1',
        user_name: 'ada.lovelace',
        email: 'ada@example.com',
        name: 'Ada Lovelace',
        active: 'true',
      }],
      sys_user_group: [{
        sys_id: 'group_1',
        name: 'Customer Support',
        description: 'Emulator support team',
      }],
    },
    nextIncident: 1002,
    nextSysId: 2,
  };
}

function state(store) {
  const current = store.getData?.('servicenow:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('servicenow:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('servicenow:state', next);
}

function failure(message, detail = '') {
  return { error: { message, detail }, status: 'failure' };
}

function fields(row, selected) {
  if (!selected?.length) return row;
  return Object.fromEntries(selected.map((field) => [field, row[field] ?? '']));
}

function tableRows(s, table) {
  s.tables[table] ??= [];
  return s.tables[table];
}

function matchesQuery(row, query) {
  if (!query) return true;
  return query.split('^').every((clause) => {
    const [key, value] = clause.split('=');
    if (!key || value === undefined) return true;
    return String(row[key] ?? '') === value;
  });
}

function serviceNowNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export const contract = {
  provider: 'servicenow',
  source: 'ServiceNow Table API-informed support subset',
  docs: 'https://www.servicenow.com/docs/r/zurich/api-reference/rest-apis/c_TableAPI.html',
  baseUrl: 'https://{instance}.service-now.com/api/now',
  scope: ['table-list', 'incident-create-read-update', 'user-lookup', 'group-lookup'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'servicenow',
  register(app, store) {
    app.get('/api/now/table/:table', (c) => {
      const rows = tableRows(state(store), c.req.param('table'));
      const offset = Number(c.req.query('sysparm_offset') ?? 0);
      const limit = Number(c.req.query('sysparm_limit') ?? (rows.length || 100));
      const selected = c.req.query('sysparm_fields')?.split(',').filter(Boolean);
      const query = c.req.query('sysparm_query');
      return c.json({ result: rows.filter((row) => matchesQuery(row, query)).slice(offset, offset + limit).map((row) => fields(row, selected)) });
    });

    app.post('/api/now/table/:table', async (c) => {
      const s = state(store);
      const table = c.req.param('table');
      const body = await c.req.json().catch(() => ({}));
      const now = serviceNowNow();
      const row = {
        sys_id: body.sys_id ?? `${table}_${s.nextSysId++}`,
        sys_created_on: now,
        sys_updated_on: now,
        ...body,
      };
      if (table === 'incident' && !row.number) row.number = `INC${String(s.nextIncident++).padStart(7, '0')}`;
      tableRows(s, table).push(row);
      saveState(store, s);
      return c.json({ result: row }, 201);
    });

    app.get('/api/now/table/:table/:sysId', (c) => {
      const row = tableRows(state(store), c.req.param('table')).find((item) => item.sys_id === c.req.param('sysId'));
      if (!row) return c.json(failure('No Record found', `Table ${c.req.param('table')} record ${c.req.param('sysId')} was not found`), 404);
      const selected = c.req.query('sysparm_fields')?.split(',').filter(Boolean);
      return c.json({ result: fields(row, selected) });
    });

    app.patch('/api/now/table/:table/:sysId', async (c) => {
      const s = state(store);
      const row = tableRows(s, c.req.param('table')).find((item) => item.sys_id === c.req.param('sysId'));
      if (!row) return c.json(failure('No Record found', `Record ${c.req.param('sysId')} was not found`), 404);
      const body = await c.req.json().catch(() => ({}));
      Object.assign(row, body, { sys_updated_on: serviceNowNow() });
      saveState(store, s);
      return c.json({ result: row });
    });

    app.put('/api/now/table/:table/:sysId', async (c) => {
      const route = app.routes?.find?.((item) => item.method === 'PATCH' && item.path === '/api/now/table/:table/:sysId');
      return route?.handler ? route.handler(c) : c.json(failure('No Record found'), 404);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'ServiceNow API emulator';
export const endpoints = 'Table API list/create/read/update for incidents, users, and groups';
export const capabilities = contract.scope;
export const initConfig = { servicenow: initialState() };
export default plugin;
