import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'azure');

const subscriptionId = '00000000-0000-0000-0000-000000000000';
const list = await harness.call('GET', `/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`);
assert.equal(list.payload.value[0].name, 'emulator-rg');

const created = await harness.call('PUT', `/subscriptions/${subscriptionId}/resourcegroups/smoke-rg?api-version=2021-04-01`, { location: 'westus2', tags: { smoke: 'true' } });
assert.equal(created.status, 201);
assert.equal(created.payload.properties.provisioningState, 'Succeeded');

const fetched = await harness.call('GET', `/subscriptions/${subscriptionId}/resourcegroups/smoke-rg?api-version=2021-04-01`);
assert.equal(fetched.payload.location, 'westus2');

const deleted = await harness.call('DELETE', `/subscriptions/${subscriptionId}/resourcegroups/smoke-rg?api-version=2021-04-01`);
assert.equal(deleted.status, 204);

console.log('azure smoke ok');
