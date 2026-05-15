import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'workato',
  label: 'Workato API emulator',
  source: 'Workato Developer API documentation-informed automation subset',
  docs: 'https://docs.workato.com/workato-api.html',
  baseUrl: 'https://www.workato.com',
  scope: ['recipes', 'connections', 'folders', 'jobs', 'manifests'],
  endpoints: 'recipes, connections, folders, jobs, manifests',
  initConfig: { workato: { baseUrl: 'same emulator origin', apiToken: 'workato-emulator-token' } },
  collections: {
    folders: [{ id: '101', name: 'Emulator project', parent_id: null, created_at: fixedNow, updated_at: fixedNow }],
    connections: [{ id: '201', name: 'Emulator Slack', provider: 'slack', authorized_at: fixedNow, status: 'connected' }],
    recipes: [{ id: '301', name: 'Sync leads to CRM', folder_id: '101', running: false, trigger_application: 'webhook', applications: ['webhook', 'salesforce'], created_at: fixedNow, updated_at: fixedNow }],
    jobs: [{ id: '401', recipe_id: '301', status: 'succeeded', started_at: fixedNow, completed_at: fixedNow, title: 'Emulator job' }],
    manifests: [{ id: 'manifest_001', name: 'Emulator package', recipe_ids: ['301'], connection_ids: ['201'], created_at: fixedNow }],
  },
  routes: [
    { method: 'GET', path: '/api/folders', collection: 'folders', action: 'list' },
    { method: 'GET', path: '/api/connections', collection: 'connections', action: 'list' },
    { method: 'GET', path: '/api/connections/:id', collection: 'connections', action: 'get', param: 'id' },
    { method: 'GET', path: '/api/recipes', collection: 'recipes', action: 'list' },
    { method: 'GET', path: '/api/recipes/:id', collection: 'recipes', action: 'get', param: 'id' },
    { method: 'POST', path: '/api/recipes', collection: 'recipes', action: 'create', idPrefix: 'recipe', defaults: { running: false, created_at: fixedNow, updated_at: fixedNow } },
    { method: 'POST', path: '/api/recipes/:id/start', response: (c, current) => {
      const recipe = current.collections.recipes.find((item) => String(item.id) === c.req.param('id'));
      if (recipe) recipe.running = true;
      return { success: Boolean(recipe), recipe };
    } },
    { method: 'POST', path: '/api/recipes/:id/stop', response: (c, current) => {
      const recipe = current.collections.recipes.find((item) => String(item.id) === c.req.param('id'));
      if (recipe) recipe.running = false;
      return { success: Boolean(recipe), recipe };
    } },
    { method: 'GET', path: '/api/jobs', collection: 'jobs', action: 'list' },
    { method: 'GET', path: '/api/recipes/:recipeId/jobs', response: (c, current) => current.collections.jobs.filter((job) => String(job.recipe_id) === c.req.param('recipeId')) },
    { method: 'GET', path: '/api/manifest_exports', collection: 'manifests', action: 'list' },
  ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);
export const capabilities = contract.scope;
export default plugin;
