import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'capcut',
  label: 'CapCut API emulator',
  source: 'CapCut-compatible creative workflow subset',
  docs: 'https://www.capcut.com/',
  baseUrl: 'https://open.capcutapi.com',
  scope: ["projects","templates","render_tasks"],
  endpoints: 'projects, templates, render_tasks',
  initConfig: { capcut: { apiKey: 'capcut-emulator-key', workspaceId: 'ws_emulator' } },
  collections: { templates: [{ id: 'tpl_001', name: 'Product demo', aspect_ratio: '9:16' }], projects: [{ id: 'proj_001', name: 'Launch Reel', template_id: 'tpl_001', created_at: fixedNow }], tasks: [{ id: 'task_001', project_id: 'proj_001', status: 'completed', video_url: 'https://example.test/capcut/render.mp4' }] },
  routes: [
      { method: 'GET', path: '/openapi/v1/templates', collection: 'templates', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/openapi/v1/projects', collection: 'projects', action: 'list', envelope: 'data' },
      { method: 'POST', path: '/openapi/v1/projects', collection: 'projects', action: 'create', idPrefix: 'proj', status: 201, envelope: 'data', defaults: { created_at: fixedNow } },
      { method: 'POST', path: '/openapi/v1/render_tasks', collection: 'tasks', action: 'create', idPrefix: 'task', status: 202, envelope: 'data', defaults: { status: 'completed', video_url: 'https://example.test/capcut/render.mp4' } },
      { method: 'GET', path: '/openapi/v1/render_tasks/:id', collection: 'tasks', action: 'get', param: 'id', envelope: 'data' },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
