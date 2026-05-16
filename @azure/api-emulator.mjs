import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'azure:state';

function defaultState() {
  return {
    subscriptionId: '00000000-0000-0000-0000-000000000000',
    resourceGroups: [
      { id: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/emulator-rg', name: 'emulator-rg', type: 'Microsoft.Resources/resourceGroups', location: 'eastus', tags: { environment: 'emulator' }, properties: { provisioningState: 'Succeeded' } },
    ],
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);
const save = (store, next) => setState(store, STATE_KEY, next);
const armError = (c, status, code, message) => c.json({ error: { code, message } }, status);
const groupId = (subscriptionId, name) => `/subscriptions/${subscriptionId}/resourceGroups/${name}`;

export const contract = {
  provider: 'azure',
  source: 'Azure Resource Manager OpenAPI specifications',
  docs: 'https://learn.microsoft.com/en-us/rest/api/resources/resource-groups',
  baseUrl: 'https://management.azure.com',
  auth: 'Bearer token',
  scope: ['resource-groups'],
  fidelity: 'stateful-arm-rest-emulator',
};

export const plugin = {
  name: 'azure',
  register(app, store) {
    app.get('/subscriptions/:subscriptionId/resourcegroups', (c) => c.json({ value: state(store).resourceGroups }));
    app.get('/subscriptions/:subscriptionId/resourceGroups', (c) => c.json({ value: state(store).resourceGroups }));
    app.get('/subscriptions/:subscriptionId/resourcegroups/:resourceGroupName', (c) => {
      const group = state(store).resourceGroups.find((item) => item.name.toLowerCase() === c.req.param('resourceGroupName').toLowerCase());
      if (!group) return armError(c, 404, 'ResourceGroupNotFound', 'Resource group could not be found.');
      return c.json(group);
    });
    app.get('/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName', (c) => {
      const group = state(store).resourceGroups.find((item) => item.name.toLowerCase() === c.req.param('resourceGroupName').toLowerCase());
      if (!group) return armError(c, 404, 'ResourceGroupNotFound', 'Resource group could not be found.');
      return c.json(group);
    });
    app.put('/subscriptions/:subscriptionId/resourcegroups/:resourceGroupName', async (c) => upsertGroup(c, store));
    app.put('/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName', async (c) => upsertGroup(c, store));
    app.delete('/subscriptions/:subscriptionId/resourcegroups/:resourceGroupName', (c) => deleteGroup(c, store));
    app.delete('/subscriptions/:subscriptionId/resourceGroups/:resourceGroupName', (c) => deleteGroup(c, store));
    app.get('/azure/inspect/state', (c) => c.json(state(store)));
  },
};

async function upsertGroup(c, store) {
  const s = state(store);
  const subscriptionId = c.req.param('subscriptionId');
  const name = c.req.param('resourceGroupName');
  const body = await c.req.json().catch(() => ({}));
  const existing = s.resourceGroups.find((item) => item.name.toLowerCase() === name.toLowerCase());
  const group = { id: groupId(subscriptionId, name), name, type: 'Microsoft.Resources/resourceGroups', location: body.location ?? existing?.location ?? 'eastus', tags: body.tags ?? existing?.tags ?? {}, properties: { provisioningState: 'Succeeded' } };
  if (existing) Object.assign(existing, group);
  else s.resourceGroups.push(group);
  save(store, s);
  return c.json(group, existing ? 200 : 201);
}

function deleteGroup(c, store) {
  const s = state(store);
  const before = s.resourceGroups.length;
  s.resourceGroups = s.resourceGroups.filter((item) => item.name.toLowerCase() !== c.req.param('resourceGroupName').toLowerCase());
  save(store, s);
  return before === s.resourceGroups.length ? armError(c, 404, 'ResourceGroupNotFound', 'Resource group could not be found.') : c.body(null, 204);
}

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, { ...defaultState(), ...config });
}

export const label = 'Azure Resource Manager API emulator';
export const endpoints = 'ARM resource group list, get, create/update, and delete';
export const capabilities = contract.scope;
export const initConfig = { azure: { subscriptionId: defaultState().subscriptionId } };
export default plugin;
