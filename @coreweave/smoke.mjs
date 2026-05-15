import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'coreweave');

const regions = await harness.call('GET', '/v1beta1/cks/regions');
assert.equal(regions.payload.regions[0].name, 'US-EAST-04A');

const nodeTypes = await harness.call('GET', '/v1beta1/cks/node-types');
assert.equal(nodeTypes.payload.nodeTypes[0].gpu, 'NVIDIA A40');

const clusters = await harness.call('GET', '/v1beta1/cks/clusters');
assert.equal(clusters.payload.clusters[0].id, 'cks-emulator-001');

const created = await harness.call('POST', '/v1beta1/cks/clusters', {
  name: 'smoke-cluster',
  region: 'US-EAST-04A',
  nodePools: [{ name: 'gpu', nodeType: 'h100.8x', replicas: 2 }],
});
assert.equal(created.status, 201);
assert.equal(created.payload.status, 'Provisioning');

const patched = await harness.call('PATCH', `/v1beta1/cks/clusters/${created.payload.id}`, { status: 'Ready' });
assert.equal(patched.payload.status, 'Ready');

const kubeconfig = await harness.call('GET', `/v1beta1/cks/clusters/${created.payload.id}/kubeconfig`);
assert.match(kubeconfig.payload, /apiVersion: v1/);

const deleted = await harness.call('DELETE', `/v1beta1/cks/clusters/${created.payload.id}`);
assert.equal(deleted.payload.status, 'Deleting');

const state = await harness.call('GET', '/coreweave/inspect/state');
assert.ok(state.payload.clusters.some((cluster) => cluster.name === 'smoke-cluster'));

console.log('coreweave smoke ok');
