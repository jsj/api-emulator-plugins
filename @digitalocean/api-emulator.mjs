import { fixedNow, getState, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'digitalocean:state';

function defaultState() {
  return {
    account: { droplet_limit: 25, floating_ip_limit: 5, email: 'ada@example.com', uuid: 'do-account-1', email_verified: true, status: 'active', status_message: '' },
    projects: [{ id: 'proj-emulator', owner_uuid: 'do-account-1', owner_id: 1, name: 'Emulator Project', description: 'Local DigitalOcean emulator project', purpose: 'Service or API', environment: 'Development', is_default: true, created_at: fixedNow, updated_at: fixedNow }],
    droplets: [{ id: 1001, name: 'emulator-droplet', memory: 1024, vcpus: 1, disk: 25, locked: false, status: 'active', created_at: fixedNow, networks: { v4: [{ ip_address: '192.0.2.10', type: 'public' }], v6: [] }, region: { slug: 'nyc3', name: 'New York 3' }, size_slug: 's-1vcpu-1gb', tags: ['emulator'] }],
    nextProject: 2,
  };
}

const state = (store) => getState(store, STATE_KEY, defaultState);
const save = (store, next) => setState(store, STATE_KEY, next);
const links = (items) => ({ links: {}, meta: { total: items.length } });
const error = (c, status, id, message) => c.json({ id, message, request_id: 'do_req_emulator' }, status);

export const contract = {
  provider: 'digitalocean',
  source: 'DigitalOcean public OpenAPI specification',
  docs: 'https://docs.digitalocean.com/reference/api/',
  baseUrl: 'https://api.digitalocean.com',
  auth: 'Bearer token',
  scope: ['account', 'projects', 'droplets'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'digitalocean',
  register(app, store) {
    app.get('/v2/account', (c) => c.json({ account: state(store).account }));
    app.get('/v2/projects', (c) => {
      const projects = state(store).projects;
      return c.json({ projects, ...links(projects) });
    });
    app.post('/v2/projects', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const project = { id: `proj-${s.nextProject++}`, owner_uuid: s.account.uuid, owner_id: 1, name: body.name ?? 'Created Project', description: body.description ?? '', purpose: body.purpose ?? 'Service or API', environment: body.environment ?? 'Development', is_default: false, created_at: fixedNow, updated_at: fixedNow };
      s.projects.push(project);
      save(store, s);
      return c.json({ project }, 201);
    });
    app.get('/v2/projects/:projectId', (c) => {
      const project = state(store).projects.find((item) => item.id === c.req.param('projectId'));
      if (!project) return error(c, 404, 'not_found', 'Project not found');
      return c.json({ project });
    });
    app.get('/v2/droplets', (c) => {
      const droplets = state(store).droplets;
      return c.json({ droplets, ...links(droplets) });
    });
    app.get('/v2/droplets/:dropletId', (c) => {
      const droplet = state(store).droplets.find((item) => String(item.id) === c.req.param('dropletId'));
      if (!droplet) return error(c, 404, 'not_found', 'Droplet not found');
      return c.json({ droplet });
    });
    app.get('/digitalocean/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, { ...defaultState(), ...config });
}

export const label = 'DigitalOcean API emulator';
export const endpoints = 'account, projects, and droplets';
export const capabilities = contract.scope;
export const initConfig = { digitalocean: defaultState() };
export default plugin;
