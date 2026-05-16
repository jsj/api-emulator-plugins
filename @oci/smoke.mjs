import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'oci');

const regions = await harness.call('GET', '/20160918/regions');
assert.equal(regions.payload[0].name, 'us-phoenix-1');

const ads = await harness.call('GET', '/20160918/availabilityDomains?compartmentId=ocid1.compartment.oc1..emulator');
assert.equal(ads.payload[0].name, 'kIdk:PHX-AD-1');

const instances = await harness.call('GET', '/20160918/instances?compartmentId=ocid1.compartment.oc1..emulator');
assert.equal(instances.payload[0].displayName, 'emulator-instance');

const stopped = await harness.call('POST', `/20160918/instances/${instances.payload[0].id}?action=STOP`);
assert.equal(stopped.payload.lifecycleState, 'STOPPED');

console.log('oci smoke ok');
