import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'retool');

const users = await harness.call('GET', '/api/v2/users');
assert.equal(users.payload[0].email, 'ada@example.test');

const apps = await harness.call('GET', '/api/v2/apps');
assert.equal(apps.payload[0].name, 'Incident Console');

const resources = await harness.call('GET', '/api/v2/resource_configurations');
assert.equal(resources.payload[0].type, 'postgresql');

const sourceControl = await harness.call('GET', '/api/v2/source_control/config');
assert.equal(sourceControl.payload.enabled, true);

const permissions = await harness.call('POST', '/api/v2/permissions/listObjects');
assert.equal(permissions.payload.objects[0].type, 'app');

console.log('retool smoke ok');
