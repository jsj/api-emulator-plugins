import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'crusoe:state';

function defaultState(baseUrl = 'https://api.crusoecloud.com') {
  return {
    baseUrl,
    projects: [{ id: 'project-emulator', name: 'emulator-project', organization_id: 'org-emulator' }],
    locations: [{ name: 'us-northcentral1-a', description: 'Emulator region', available: true }],
    instanceTypes: [
      { name: 'a100.1x', description: '1x NVIDIA A100 emulator instance', gpu_count: 1, cpu_count: 12, memory_gib: 120 },
      { name: 'h100.8x', description: '8x NVIDIA H100 emulator instance', gpu_count: 8, cpu_count: 192, memory_gib: 1800 },
    ],
    instances: [
      {
        id: 'vm-emulator-001',
        name: 'trainer',
        project_id: 'project-emulator',
        location: 'us-northcentral1-a',
        type: 'a100.1x',
        state: 'RUNNING',
        created_at: fixedNow,
        public_ip: '203.0.113.10',
      },
    ],
    sshKeys: [{ id: 'ssh-emulator', name: 'ada', public_key: 'ssh-ed25519 AAAAEmulator ada@example.com' }],
    operations: [],
  };
}

function state(store) {
  return getState(store, STATE_KEY, () => defaultState());
}

function save(store, next) {
  return setState(store, STATE_KEY, next);
}

function list(items, key) {
  return { [key]: items, next_page_token: '' };
}

function projectInstances(s, projectId) {
  return s.instances.filter((instance) => instance.project_id === projectId);
}

function vmWire(instance) {
  return {
    ...instance,
    project_id: instance.project_id,
    location: instance.location,
    type: instance.type,
    state: instance.state,
  };
}

function operation(id, targetId, action) {
  return { id, name: id, target_id: targetId, action, status: 'DONE', created_at: fixedNow, done: true };
}

export const contract = {
  provider: 'crusoe',
  source: 'Crusoe Cloud API Gateway and official CLI/client shaped subset',
  docs: 'https://docs.crusoecloud.com/api/',
  baseUrl: 'https://api.crusoecloud.com/v1alpha5',
  scope: ['projects', 'locations', 'instance_types', 'instances', 'ssh_keys', 'operations'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'crusoe',
  register(app, store) {
    app.get('/v1alpha5/featureflags', (c) => c.json({ flags: {} }));
    app.get('/v1alpha5/projects', (c) => c.json(list(state(store).projects, 'projects')));
    app.get('/v1alpha5/organizations/projects', (c) => c.json(list(state(store).projects, 'projects')));
    app.get('/v1alpha5/projects/:project_id', (c) => {
      const project = state(store).projects.find((item) => item.id === c.req.param('project_id'));
      return project ? c.json(project) : routeError(c, 'project not found', 404, 'not_found');
    });
    app.get('/v1alpha5/locations', (c) => c.json(list(state(store).locations, 'locations')));
    app.get('/v1alpha5/instance-types', (c) => c.json(list(state(store).instanceTypes, 'instance_types')));
    app.get('/v1alpha5/projects/:project_id/instances', (c) => c.json(list(projectInstances(state(store), c.req.param('project_id')), 'instances')));
    app.get('/v1alpha5/projects/:project_id/compute/vms', (c) => c.json(list(projectInstances(state(store), c.req.param('project_id')).map(vmWire), 'vms')));
    app.get('/v1alpha5/compute/vms', (c) => c.json(list(state(store).instances.map(vmWire), 'vms')));
    app.post('/v1alpha5/projects/:project_id/instances', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const instance = {
        id: `vm-emulator-${String(s.instances.length + 1).padStart(3, '0')}`,
        name: body.name ?? `vm-${s.instances.length + 1}`,
        project_id: c.req.param('project_id'),
        location: body.location ?? body.location_id ?? s.locations[0].name,
        type: body.type ?? body.instance_type ?? s.instanceTypes[0].name,
        state: 'RUNNING',
        created_at: fixedNow,
        public_ip: `203.0.113.${10 + s.instances.length}`,
        image: body.image ?? 'ubuntu-22.04',
      };
      s.instances.push(instance);
      const op = operation(`op-emulator-${s.operations.length + 1}`, instance.id, 'create_instance');
      s.operations.push(op);
      save(store, s);
      return c.json({ instance, operation: op }, 201);
    });
    app.get('/v1alpha5/projects/:project_id/instances/:instance_id', (c) => {
      const instance = projectInstances(state(store), c.req.param('project_id')).find((item) => item.id === c.req.param('instance_id') || item.name === c.req.param('instance_id'));
      return instance ? c.json(instance) : routeError(c, 'instance not found', 404, 'not_found');
    });
    app.patch('/v1alpha5/projects/:project_id/instances/:instance_id', async (c) => {
      const s = state(store);
      const instance = projectInstances(s, c.req.param('project_id')).find((item) => item.id === c.req.param('instance_id') || item.name === c.req.param('instance_id'));
      if (!instance) return routeError(c, 'instance not found', 404, 'not_found');
      Object.assign(instance, await readBody(c));
      save(store, s);
      return c.json(instance);
    });
    app.delete('/v1alpha5/projects/:project_id/instances/:instance_id', (c) => {
      const s = state(store);
      const instance = projectInstances(s, c.req.param('project_id')).find((item) => item.id === c.req.param('instance_id') || item.name === c.req.param('instance_id'));
      if (!instance) return routeError(c, 'instance not found', 404, 'not_found');
      instance.state = 'DELETED';
      const op = operation(`op-emulator-${s.operations.length + 1}`, instance.id, 'delete_instance');
      s.operations.push(op);
      save(store, s);
      return c.json({ operation: op });
    });
    app.get('/v1alpha5/projects/:project_id/ssh-keys', (c) => c.json(list(state(store).sshKeys, 'ssh_keys')));
    app.post('/v1alpha5/projects/:project_id/ssh-keys', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const key = { id: `ssh-emulator-${s.sshKeys.length + 1}`, name: body.name ?? 'emulator', public_key: body.public_key ?? body.key };
      s.sshKeys.push(key);
      save(store, s);
      return c.json(key, 201);
    });
    app.get('/v1alpha5/operations/:operation_id', (c) => {
      const op = state(store).operations.find((item) => item.id === c.req.param('operation_id') || item.name === c.req.param('operation_id'));
      return op ? c.json(op) : routeError(c, 'operation not found', 404, 'not_found');
    });
    app.get('/crusoe/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, baseUrl, config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const label = 'Crusoe Cloud API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { crusoe: { projectId: 'project-emulator', token: 'crusoe-emulator-token' } };
export default plugin;
