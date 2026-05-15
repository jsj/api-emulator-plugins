import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'google-analytics');

const metadata = await harness.call('GET', '/v1beta/properties/1234/metadata');
assert.equal(metadata.payload.metrics[0].apiName, 'activeUsers');

const report = await harness.call('POST', '/v1beta/properties/1234:runReport', {});
assert.equal(report.payload.rows[0].metricValues[0].value, '42');
assert.equal(report.payload.totals[0].metricValues[0].value, '42');
assert.equal(report.payload.metadata.currencyCode, 'USD');

const realtime = await harness.call('POST', '/v1beta/properties/1234:runRealtimeReport', {});
assert.equal(realtime.payload.rows[0].metricValues[0].value, '7');

const batch = await harness.call('POST', '/v1beta/properties/1234:batchRunReports', {});
assert.equal(batch.payload.reports[0].rowCount, 1);

const state = await harness.call('GET', '/google-analytics/inspect/state');
assert.ok(state.payload.collections);

console.log('google-analytics smoke ok');
