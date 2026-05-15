import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'applecare');

const devices = await harness.call('GET', '/v1/orgDevices');
assert.equal(devices.payload.data[0].serialNumber, 'C02EMULATOR1');

const coverage = await harness.call('GET', '/v1/orgDevices/dev_apple_1/appleCareCoverage');
assert.equal(coverage.payload.status, 'covered');

const repair = await harness.call('POST', '/v1/repairCases', { serialNumber: 'C02EMULATOR1', issueType: 'display', contactEmail: 'ada@example.test' });
assert.equal(repair.status, 201);
assert.equal(repair.payload.status, 'created');

const fetched = await harness.call('GET', `/v1/repairCases/${repair.payload.id}`);
assert.equal(fetched.payload.issueType, 'display');

console.log('applecare smoke ok');
