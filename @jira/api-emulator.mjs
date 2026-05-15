function initialState(config = {}) {
  return {
    ...{
    "user": {
        "accountId": "account_emulator",
        "accountType": "atlassian",
        "displayName": "Emulator User",
        "emailAddress": "emulator@example.com",
        "active": true
    },
    "projects": [
        {
            "id": "10000",
            "key": "EMU",
            "name": "Emulator Project",
            "projectTypeKey": "software",
            "self": "/rest/api/3/project/10000"
        }
    ],
    "issues": [
        {
            "id": "10001",
            "key": "EMU-1",
            "self": "/rest/api/3/issue/10001",
            "fields": {
                "summary": "Emulator issue",
                "issuetype": {
                    "id": "10001",
                    "name": "Task"
                },
                "project": {
                    "id": "10000",
                    "key": "EMU"
                },
                "status": {
                    "name": "To Do"
                }
            }
        }
    ],
    "nextIssue": 2
},
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('jira:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('jira:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('jira:state', next);
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

function findIssue(s, id) { return s.issues.find((issue) => issue.id === id || issue.key === id); }
function jiraSearch(c, issues) { return c.json({ startAt: 0, maxResults: 50, total: issues.length, issues }); }
function error(message) { return { errorMessages: [message], errors: {} }; }
function projectList(s) { return s.projects.map((project) => ({ ...project, style: 'classic' })); }

export const contract = {
  provider: 'jira',
  source: 'Jira official API documentation-informed REST subset',
  docs: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
  baseUrl: 'https://api.atlassian.com/ex/jira/{cloudid}',
  scope: ["myself","projects","issue-search","issue-create-read-update"],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'jira',
  register(app, store) {

    app.get('/rest/api/3/myself', (c) => c.json(state(store).user));
    app.get('/rest/api/2/myself', (c) => c.json(state(store).user));
    app.get('/rest/api/3/serverInfo', (c) => c.json({ baseUrl: new URL(c.req.url).origin, version: '1001.0.0-SNAPSHOT', versionNumbers: [1001, 0, 0], deploymentType: 'Cloud' }));
    app.get('/rest/api/2/serverInfo', (c) => c.json({ baseUrl: new URL(c.req.url).origin, version: '9.12.0', versionNumbers: [9, 12, 0], deploymentType: 'Server' }));
    app.get('/rest/api/3/project', (c) => c.json(projectList(state(store))));
    app.get('/rest/api/2/project', (c) => c.json(projectList(state(store))));
    app.get('/rest/api/3/project/search', (c) => c.json({ self: c.req.url, maxResults: 50, startAt: 0, total: state(store).projects.length, values: projectList(state(store)) }));
    app.get('/rest/api/3/search', (c) => jiraSearch(c, state(store).issues));
    app.get('/rest/api/2/search', (c) => jiraSearch(c, state(store).issues));
    app.get('/rest/api/3/search/jql', (c) => jiraSearch(c, state(store).issues));
    app.post('/rest/api/3/search', (c) => jiraSearch(c, state(store).issues));
    app.post('/rest/api/2/search', (c) => jiraSearch(c, state(store).issues));
    app.post('/rest/api/3/search/jql', (c) => jiraSearch(c, state(store).issues));
    app.get('/rest/api/3/issue/:issueIdOrKey', (c) => {
      const issue = findIssue(state(store), c.req.param('issueIdOrKey'));
      if (!issue) return c.json(error('Issue does not exist or you do not have permission to see it.'), 404);
      return c.json(issue);
    });
    app.get('/rest/api/2/issue/:issueIdOrKey', (c) => {
      const issue = findIssue(state(store), c.req.param('issueIdOrKey'));
      if (!issue) return c.json(error('Issue does not exist or you do not have permission to see it.'), 404);
      return c.json(issue);
    });
    app.post('/rest/api/3/issue', async (c) => {
      const s = state(store); const body = await json(c); const key = body.key ?? `EMU-${s.nextIssue++}`;
      const issue = { id: String(10000 + s.nextIssue), key, self: `/rest/api/3/issue/${key}`, fields: { project: s.projects[0], status: { name: 'To Do' }, ...(body.fields ?? {}) } };
      s.issues.push(issue); saveState(store, s); return c.json(issue, 201);
    });
    app.put('/rest/api/3/issue/:issueIdOrKey', async (c) => {
      const s = state(store); const issue = findIssue(s, c.req.param('issueIdOrKey')); if (!issue) return c.json(error('Issue not found'), 404);
      const body = await json(c); issue.fields = { ...issue.fields, ...(body.fields ?? {}) }; saveState(store, s); return c.json(issue);
    });
    app.put('/rest/api/2/issue/:issueIdOrKey', async (c) => {
      const s = state(store); const issue = findIssue(s, c.req.param('issueIdOrKey')); if (!issue) return c.json(error('Issue not found'), 404);
      const body = await json(c); issue.fields = { ...issue.fields, ...(body.fields ?? {}) }; saveState(store, s); return c.json(issue);
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Jira API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { jira: initialState() };
export default plugin;
