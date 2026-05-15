import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'marketo:state';

function initialState(config = {}) {
  return {
    tokenCount: 0,
    leads: [{ id: 1, email: 'developerfeedback@marketo.com', firstName: 'Kenneth', lastName: 'Elkington', createdAt: '2013-02-19T23:17:04Z', updatedAt: '2015-08-24T20:17:23Z' }],
    programs: [{ id: 1001, name: 'Emulator Program', description: 'Local Marketo test program', type: 'Default', status: 'on', workspace: 'Default', createdAt: fixedNow, updatedAt: fixedNow }],
    lists: [{ id: 2001, name: 'Emulator List', programName: 'Emulator Program', leads: [1], createdAt: fixedNow, updatedAt: fixedNow }],
    activities: [{ id: 3001, leadId: 1, activityTypeId: 1, activityDate: fixedNow, primaryAttributeValue: 'Visit Webpage' }],
    nextLead: 2,
    nextActivity: 3002,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const ok = (result = []) => ({ requestId: 'emulator#0001', success: true, result });
const fail = (code, message) => ({ requestId: 'emulator#0001', success: false, errors: [{ code, message }] });

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const contract = {
  provider: 'marketo',
  source: 'Adobe Marketo Engage REST API docs subset',
  docs: 'https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/rest-api',
  baseUrl: 'https://example.mktorest.com',
  scope: ['oauth_token', 'leads', 'lead_create_update_delete', 'fields', 'programs', 'lists', 'list_membership', 'activities'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'marketo',
  register(app, store) {
    app.get('/identity/oauth/token', (c) => {
      const current = state(store);
      current.tokenCount += 1;
      save(store, current);
      return c.json({ access_token: createToken('marketo_access', current.tokenCount), token_type: 'bearer', expires_in: 3600, scope: 'emulator' });
    });
    app.get('/rest/v1/leads.json', (c) => {
      const current = state(store);
      const type = c.req.query('filterType') ?? 'email';
      const values = String(c.req.query('filterValues') ?? '').split(',').filter(Boolean);
      const result = values.length ? current.leads.filter((lead) => values.includes(String(lead[type]))) : current.leads;
      return c.json(ok(result));
    });
    app.get('/rest/v1/lead/:id.json', (c) => {
      const lead = state(store).leads.find((item) => String(item.id) === c.req.param('id'));
      return c.json(lead ? ok([lead]) : fail('1004', 'Lead not found'));
    });
    app.delete('/rest/v1/leads.json', async (c) => {
      const current = state(store);
      const ids = ((await readBody(c)).input ?? []).map((item) => Number(item.id));
      current.leads = current.leads.filter((lead) => !ids.includes(lead.id));
      current.lists.forEach((list) => {
        list.leads = (list.leads ?? []).filter((id) => !ids.includes(id));
      });
      save(store, current);
      return c.json(ok(ids.map((id) => ({ id, status: 'deleted' }))));
    });
    app.post('/rest/v1/leads.json', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const input = body.input ?? [];
      const result = input.map((item) => {
        const existing = current.leads.find((lead) => lead.email === item.email || (item.id && lead.id === item.id));
        if (existing) {
          Object.assign(existing, item, { updatedAt: fixedNow });
          return { id: existing.id, status: 'updated' };
        }
        const lead = { id: current.nextLead++, createdAt: fixedNow, updatedAt: fixedNow, ...item };
        current.leads.push(lead);
        return { id: lead.id, status: 'created' };
      });
      save(store, current);
      return c.json(ok(result));
    });
    app.get('/rest/v1/leads/describe.json', (c) => c.json(ok([{ id: 1, displayName: 'Email Address', dataType: 'email', rest: { name: 'email', readOnly: false } }, { id: 2, displayName: 'First Name', dataType: 'string', rest: { name: 'firstName', readOnly: false } }, { id: 3, displayName: 'Last Name', dataType: 'string', rest: { name: 'lastName', readOnly: false } }])));
    app.get('/rest/asset/v1/programs.json', (c) => c.json(ok(state(store).programs)));
    app.get('/rest/asset/v1/program/:id.json', (c) => {
      const program = state(store).programs.find((item) => String(item.id) === c.req.param('id'));
      return c.json(program ? ok([program]) : fail('702', 'Program not found'));
    });
    app.get('/rest/asset/v1/staticLists.json', (c) => c.json(ok(state(store).lists)));
    app.get('/rest/asset/v1/staticList/:id.json', (c) => {
      const list = state(store).lists.find((item) => String(item.id) === c.req.param('id'));
      return c.json(list ? ok([list]) : fail('709', 'Static list not found'));
    });
    app.get('/rest/v1/list/:id/leads.json', (c) => {
      const current = state(store);
      const list = current.lists.find((item) => String(item.id) === c.req.param('id'));
      if (!list) return c.json(fail('1013', 'List not found'));
      return c.json(ok(current.leads.filter((lead) => (list.leads ?? []).includes(lead.id))));
    });
    app.post('/rest/v1/lists/:id/leads.json', async (c) => {
      const current = state(store);
      const list = current.lists.find((item) => String(item.id) === c.req.param('id'));
      if (!list) return c.json(fail('1013', 'List not found'));
      const ids = ((await readBody(c)).input ?? []).map((item) => Number(item.id));
      list.leads = Array.from(new Set([...(list.leads ?? []), ...ids]));
      save(store, current);
      return c.json(ok(ids.map((id) => ({ id, status: 'added' }))));
    });
    app.get('/rest/v1/activities.json', (c) => {
      const leadIds = String(c.req.query('leadIds') ?? '').split(',').filter(Boolean).map(Number);
      const activities = leadIds.length ? state(store).activities.filter((item) => leadIds.includes(item.leadId)) : state(store).activities;
      return c.json({ ...ok(activities), nextPageToken: null, moreResult: false });
    });
    app.get('/marketo/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Marketo API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { marketo: initialState() };
export default plugin;
