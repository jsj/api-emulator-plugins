import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'zapier',
  label: 'Zapier API emulator',
  source: 'Zapier Platform and REST API documented subset',
  docs: 'https://docs.zapier.com/platform/home',
  baseUrl: 'https://api.zapier.com',
  scope: ["authentication","apps","actions","zaps","tasks","hooks"],
  endpoints: 'authentication, apps, actions, zaps, tasks, hooks',
  initConfig: { zapier: { apiKey: 'zapier-emulator-key', accountId: 'acct_emulator' } },
  collections: {
      apps: [{ id: 'app_001', title: 'Webhooks by Zapier', slug: 'webhook', categories: ['developer-tools'] }],
      actions: [{ id: 'action_001', app_id: 'app_001', key: 'catch_hook', type: 'trigger', title: 'Catch Hook' }],
      zaps: [{ id: 'zap_001', title: 'New lead to CRM', status: 'on', trigger_app: 'webhook', action_app: 'crm', created_at: fixedNow }],
      tasks: [{ id: 'task_001', zap_id: 'zap_001', status: 'success', created_at: fixedNow }],
      actionRuns: [{ id: 'run_001', action_id: 'action_001', status: 'success', output: { ok: true }, created_at: fixedNow }],
      hooks: [{ id: 'hook_001', url: 'https://hooks.zapier.com/hooks/catch/123/abc', event: 'lead.created' }],
    },
  routes: [
      { method: 'GET', path: '/v1/me', response: () => ({ id: 'acct_emulator', email: 'emulator@example.test', name: 'Zapier Emulator' }) },
      { method: 'GET', path: '/v2/me', response: () => ({ data: { id: 'acct_emulator', email: 'emulator@example.test', name: 'Zapier Emulator' } }) },
      { method: 'GET', path: '/v2/apps', collection: 'apps', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/v2/actions', collection: 'actions', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/v2/action-runs', collection: 'actionRuns', action: 'list', envelope: 'data' },
      { method: 'POST', path: '/v2/action-runs', collection: 'actionRuns', action: 'create', idPrefix: 'run', status: 201, envelope: 'data', defaults: { status: 'success', created_at: fixedNow } },
      { method: 'GET', path: '/v2/zaps', collection: 'zaps', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/v1/zaps', collection: 'zaps', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/v1/zaps/:id', collection: 'zaps', action: 'get', param: 'id', envelope: 'data' },
      { method: 'POST', path: '/v1/zaps', collection: 'zaps', action: 'create', idPrefix: 'zap', status: 201, envelope: 'data', defaults: { status: 'off', created_at: fixedNow } },
      { method: 'GET', path: '/v1/tasks', collection: 'tasks', action: 'list', envelope: 'data' },
      { method: 'POST', path: '/hooks/catch/:account/:hook', collection: 'tasks', action: 'create', idPrefix: 'task', status: 200, response: (c, item) => ({ status: 'success', task_id: item.id }) },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
