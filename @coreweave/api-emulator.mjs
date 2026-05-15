import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'coreweave:state';

function defaultState(baseUrl = 'https://api.coreweave.com') {
  return {
    baseUrl,
    clusters: [
      {
        id: 'cks-emulator-001',
        name: 'emulator-cluster',
        region: 'US-EAST-04A',
        nodePools: [{ name: 'gpu-pool', nodeType: 'g5.4x', replicas: 1 }],
        kubernetesVersion: '1.31',
        status: 'Ready',
        endpoint: 'https://emulator-cluster.k8s.coreweave.local',
        createdAt: fixedNow,
      },
    ],
    nodeTypes: [
      { name: 'g5.4x', gpu: 'NVIDIA A40', gpuCount: 1, cpuCount: 16, memoryGiB: 128 },
      { name: 'h100.8x', gpu: 'NVIDIA H100', gpuCount: 8, cpuCount: 192, memoryGiB: 1800 },
    ],
    regions: [{ name: 'US-EAST-04A', country: 'US', available: true }],
  };
}

function state(store) {
  return getState(store, STATE_KEY, () => defaultState());
}

function save(store, next) {
  return setState(store, STATE_KEY, next);
}

function clusterWire(cluster) {
  return {
    id: cluster.id,
    name: cluster.name,
    region: cluster.region,
    status: cluster.status,
    endpoint: cluster.endpoint,
    kubernetesVersion: cluster.kubernetesVersion,
    nodePools: cluster.nodePools,
    createdAt: cluster.createdAt,
  };
}

function findCluster(s, id) {
  return s.clusters.find((cluster) => cluster.id === id || cluster.name === id);
}

export const contract = {
  provider: 'coreweave',
  source: 'CoreWeave CKS API reference documented subset',
  docs: 'https://docs.coreweave.com/products/cks/reference/cks-api',
  baseUrl: 'https://api.coreweave.com/v1beta1',
  scope: ['cks_clusters', 'regions', 'node_types', 'kubeconfig'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'coreweave',
  register(app, store) {
    app.get('/v1beta1/cks/clusters', (c) => c.json({ clusters: state(store).clusters.map(clusterWire) }));
    app.post('/v1beta1/cks/clusters', async (c) => {
      const s = state(store);
      const body = await readBody(c);
      const cluster = {
        id: `cks-emulator-${String(s.clusters.length + 1).padStart(3, '0')}`,
        name: body.name ?? `cluster-${s.clusters.length + 1}`,
        region: body.region ?? body.zone ?? s.regions[0].name,
        status: 'Provisioning',
        endpoint: `https://${body.name ?? `cluster-${s.clusters.length + 1}`}.k8s.coreweave.local`,
        kubernetesVersion: body.kubernetesVersion ?? body.kubernetes_version ?? '1.31',
        nodePools: body.nodePools ?? body.node_pools ?? [{ name: 'default', nodeType: 'g5.4x', replicas: 1 }],
        createdAt: fixedNow,
      };
      s.clusters.push(cluster);
      save(store, s);
      return c.json(clusterWire(cluster), 201);
    });
    app.get('/v1beta1/cks/clusters/:id', (c) => {
      const cluster = findCluster(state(store), c.req.param('id'));
      return cluster ? c.json(clusterWire(cluster)) : routeError(c, 'cluster not found', 404, 'not_found');
    });
    app.patch('/v1beta1/cks/clusters/:id', async (c) => {
      const s = state(store);
      const cluster = findCluster(s, c.req.param('id'));
      if (!cluster) return routeError(c, 'cluster not found', 404, 'not_found');
      const body = await readBody(c);
      if (body.name) cluster.name = body.name;
      if (body.nodePools || body.node_pools) cluster.nodePools = body.nodePools ?? body.node_pools;
      if (body.status) cluster.status = body.status;
      cluster.status = cluster.status === 'Provisioning' ? 'Ready' : cluster.status;
      save(store, s);
      return c.json(clusterWire(cluster));
    });
    app.delete('/v1beta1/cks/clusters/:id', (c) => {
      const s = state(store);
      const cluster = findCluster(s, c.req.param('id'));
      if (!cluster) return routeError(c, 'cluster not found', 404, 'not_found');
      cluster.status = 'Deleting';
      save(store, s);
      return c.json(clusterWire(cluster));
    });
    app.get('/v1beta1/cks/clusters/:id/kubeconfig', (c) => {
      const cluster = findCluster(state(store), c.req.param('id'));
      if (!cluster) return routeError(c, 'cluster not found', 404, 'not_found');
      return c.text(`apiVersion: v1\nclusters:\n- name: ${cluster.name}\n  cluster:\n    server: ${cluster.endpoint}\ncontexts: []\nkind: Config\n`);
    });
    app.get('/v1beta1/cks/regions', (c) => c.json({ regions: state(store).regions }));
    app.get('/v1beta1/cks/node-types', (c) => c.json({ nodeTypes: state(store).nodeTypes }));
    app.get('/coreweave/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, baseUrl, config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const label = 'CoreWeave API emulator';
export const endpoints = contract.scope.join(', ');
export const initConfig = { coreweave: { token: 'coreweave-emulator-token', clusterId: 'cks-emulator-001' } };
export default plugin;
