function initialState(config = {}) {
  return {
    orgId: config.orgId ?? '00D000000000001',
    userId: config.userId ?? '005000000000001',
    username: config.username ?? 'emulator@example.com',
    accounts: config.accounts ?? [{
      Id: '001000000000001',
      Name: 'Emulator Account',
      Website: 'https://example.com',
      Phone: '(415) 555-0100',
    }],
    contacts: config.contacts ?? [{
      Id: '003000000000001',
      FirstName: 'Ada',
      LastName: 'Lovelace',
      Email: 'ada@example.com',
      AccountId: '001000000000001',
    }],
    nextAccount: 2,
    nextContact: 2,
  };
}

function state(store) {
  const current = store.getData?.('salesforce:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('salesforce:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('salesforce:state', next);
}

function originFromUrl(url) {
  return new URL(url).origin;
}

function objectRows(s, sobject) {
  const key = sobject.toLowerCase();
  if (key === 'account') return s.accounts;
  if (key === 'contact') return s.contacts;
  if (key === 'user') return [{ Id: s.userId, Username: s.username, Name: 'Emulator User', Email: s.username }];
  if (key === 'organization') return [{ Id: s.orgId, Name: 'Emulator Org', NamespacePrefix: null }];
  if (key === 'scratchorginfo') return [];
  return [];
}

function collectionName(sobject) {
  const key = sobject.toLowerCase();
  if (key === 'account') return 'accounts';
  if (key === 'contact') return 'contacts';
  return null;
}

function nextId(s, sobject) {
  const key = sobject.toLowerCase();
  if (key === 'contact') return `003000000000${String(s.nextContact++).padStart(3, '0')}`;
  return `001000000000${String(s.nextAccount++).padStart(3, '0')}`;
}

function parseFields(soql) {
  const match = soql.match(/select\s+(.+?)\s+from\s+/i);
  if (!match) return ['Id'];
  return match[1].split(',').map((field) => field.trim()).filter(Boolean);
}

function parseSobject(soql) {
  return soql.match(/\sfrom\s+([a-zA-Z0-9_]+)/i)?.[1] ?? 'Account';
}

function parseWhereName(soql) {
  return soql.match(/\swhere\s+Name\s*=\s*'([^']+)'/i)?.[1];
}

function projectRecord(row, fields, sobject) {
  const record = { attributes: { type: sobject, url: `/services/data/v64.0/sobjects/${sobject}/${row.Id}` } };
  for (const field of fields) record[field] = row[field] ?? null;
  return record;
}

function describe(sobject) {
  const fields = {
    Account: ['Id', 'Name', 'Website', 'Phone', 'BillingCity'],
    Contact: ['Id', 'FirstName', 'LastName', 'Email', 'AccountId'],
    User: ['Id', 'Username', 'Name', 'Email'],
    Organization: ['Id', 'Name', 'NamespacePrefix'],
  }[sobject] ?? ['Id', 'Name'];
  return {
    name: sobject,
    label: sobject,
    keyPrefix: sobject === 'Contact' ? '003' : sobject === 'User' ? '005' : '001',
    createable: sobject === 'Account' || sobject === 'Contact',
    queryable: true,
    updateable: sobject === 'Account' || sobject === 'Contact',
    fields: fields.map((name) => ({
      name,
      label: name,
      type: name === 'Id' || name.endsWith('Id') ? 'id' : 'string',
      createable: name !== 'Id',
      updateable: name !== 'Id',
      nillable: name !== 'Name',
    })),
  };
}

export const contract = {
  provider: 'salesforce',
  source: 'Salesforce CLI-informed REST API subset',
  docs: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm',
  scope: ['oauth-userinfo', 'versions', 'limits', 'soql-query', 'sobject-describe', 'record-create', 'record-read', 'record-update'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'salesforce',
  register(app, store) {
    app.get('/services/oauth2/userinfo', (c) => {
      const s = state(store);
      const origin = originFromUrl(c.req.url);
      return c.json({
        preferred_username: s.username,
        organization_id: s.orgId,
        user_id: s.userId,
        urls: {
          rest: `${origin}/services/data/v64.0`,
        },
      });
    });

    app.get('/services/data', (c) => c.json([{ version: '64.0', label: 'Winter 26', url: '/services/data/v64.0' }]));
    app.get('/services/data/:version', (c) => c.json({
      sobjects: `/services/data/${c.req.param('version')}/sobjects`,
      query: `/services/data/${c.req.param('version')}/query`,
      limits: `/services/data/${c.req.param('version')}/limits`,
    }));
    app.get('/services/data/:version/limits', (c) => c.json({
      DailyApiRequests: { Max: 15000, Remaining: 14999 },
      DailyBulkApiRequests: { Max: 5000, Remaining: 5000 },
    }));

    app.get('/services/data/:version/query', (c) => {
      const s = state(store);
      const soql = c.req.query('q') ?? '';
      const sobject = parseSobject(soql);
      if (c.req.query('columns') === 'true') {
        return c.json({
          columnMetadata: parseFields(soql).map((field) => ({
            columnName: field,
            type: field === 'Id' || field.endsWith('Id') ? 'id' : 'string',
            joinColumns: [],
            aggregate: false,
          })),
        });
      }
      let rows = objectRows(s, sobject);
      const name = parseWhereName(soql);
      if (name) rows = rows.filter((row) => row.Name === name);
      if (/limit\s+1/i.test(soql)) rows = rows.slice(0, 1);
      const records = rows.map((row) => projectRecord(row, parseFields(soql), sobject));
      return c.json({ totalSize: records.length, done: true, records });
    });

    app.get('/services/data/:version/sobjects', (c) => c.json({
      encoding: 'UTF-8',
      maxBatchSize: 200,
      sobjects: ['Account', 'Contact', 'User', 'Organization'].map((name) => ({
        name,
        label: name,
        createable: name === 'Account' || name === 'Contact',
        queryable: true,
        urls: {
          describe: `/services/data/${c.req.param('version')}/sobjects/${name}/describe`,
          rowTemplate: `/services/data/${c.req.param('version')}/sobjects/${name}/{ID}`,
        },
      })),
    }));
    app.get('/services/data/:version/sobjects/:sobject/describe', (c) => c.json(describe(c.req.param('sobject'))));
    app.get('/services/data/:version/sobjects/:sobject/:id', (c) => {
      const sobject = c.req.param('sobject');
      const record = objectRows(state(store), sobject).find((row) => row.Id === c.req.param('id'));
      if (!record) return c.json([{ message: 'The requested resource does not exist', errorCode: 'NOT_FOUND' }], 404);
      return c.json(projectRecord(record, Object.keys(record), sobject));
    });
    app.post('/services/data/:version/sobjects/:sobject', async (c) => {
      const s = state(store);
      const sobject = c.req.param('sobject');
      const collection = collectionName(sobject);
      if (!collection) return c.json([{ message: `${sobject} is not createable`, errorCode: 'INVALID_TYPE' }], 400);
      const body = await c.req.json().catch(() => ({}));
      const record = { Id: nextId(s, sobject), ...body };
      s[collection].push(record);
      saveState(store, s);
      return c.json({ id: record.Id, success: true, errors: [] }, 201);
    });
    app.patch('/services/data/:version/sobjects/:sobject/:id', async (c) => {
      const s = state(store);
      const collection = collectionName(c.req.param('sobject'));
      const record = collection ? s[collection].find((row) => row.Id === c.req.param('id')) : null;
      if (!record) return c.json([{ message: 'The requested resource does not exist', errorCode: 'NOT_FOUND' }], 404);
      Object.assign(record, await c.req.json().catch(() => ({})));
      saveState(store, s);
      return c.body(null, 204);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Salesforce API emulator';
export const endpoints = 'OAuth userinfo, REST discovery, limits, SOQL query, sObject describe, and record CRUD';
export const capabilities = contract.scope;
export const initConfig = { salesforce: initialState() };
export default plugin;
