import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'crusoe');

const projects = await harness.call('GET', '/v1alpha5/projects');
assert.equal(projects.payload.projects[0].id, 'project-emulator');

const cliProjects = await harness.call('GET', '/v1alpha5/organizations/projects');
assert.equal(cliProjects.payload.projects[0].name, 'emulator-project');

const featureFlags = await harness.call('GET', '/v1alpha5/featureflags');
assert.deepEqual(featureFlags.payload.flags, {});

const locations = await harness.call('GET', '/v1alpha5/locations');
assert.equal(locations.payload.locations[0].available, true);

const types = await harness.call('GET', '/v1alpha5/instance-types');
assert.ok(types.payload.instance_types.some((type) => type.name === 'a100.1x'));

const created = await harness.call('POST', '/v1alpha5/projects/project-emulator/instances', {
  name: 'smoke-vm',
  instance_type: 'h100.8x',
});
assert.equal(created.status, 201);
assert.equal(created.payload.instance.name, 'smoke-vm');
assert.equal(created.payload.operation.done, true);

const instance = await harness.call('GET', `/v1alpha5/projects/project-emulator/instances/${created.payload.instance.id}`);
assert.equal(instance.payload.type, 'h100.8x');

const vms = await harness.call('GET', '/v1alpha5/projects/project-emulator/compute/vms');
assert.ok(vms.payload.vms.some((vm) => vm.name === 'smoke-vm'));

const patched = await harness.call('PATCH', `/v1alpha5/projects/project-emulator/instances/${created.payload.instance.id}`, { state: 'STOPPED' });
assert.equal(patched.payload.state, 'STOPPED');

const deleted = await harness.call('DELETE', `/v1alpha5/projects/project-emulator/instances/${created.payload.instance.id}`);
assert.equal(deleted.payload.operation.action, 'delete_instance');

const state = await harness.call('GET', '/crusoe/inspect/state');
assert.ok(state.payload.operations.length >= 2);

console.log('crusoe smoke ok');
