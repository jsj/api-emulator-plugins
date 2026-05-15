import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'bland');

const me = await harness.call('GET', '/v1/me');
assert.equal(me.payload.id, 'org_emulator');

const queued = await harness.call('POST', '/v1/calls', { phone_number: '+15550101010', task: 'Confirm appointment' }, { 'content-type': 'application/json' });
assert.equal(queued.payload.status, 'success');

const call = await harness.call('GET', `/v1/calls/${queued.payload.call_id}`);
assert.equal(call.payload.to, '+15550101010');

const active = await harness.call('GET', '/v1/active');
assert.ok(active.payload.calls.some((item) => item.call_id === queued.payload.call_id));

const analysis = await harness.call('POST', `/v1/calls/${queued.payload.call_id}/analyze`, { questions: ['Did they answer?'] }, { 'content-type': 'application/json' });
assert.equal(analysis.payload.answers[0].answer, 'emulator_answer_1');

const recording = await harness.call('GET', `/v1/calls/${queued.payload.call_id}/recording`);
assert.ok(recording.payload.recording_url.includes(queued.payload.call_id));

const pathway = await harness.call('POST', '/v1/pathways', { name: 'Smoke Pathway' }, { 'content-type': 'application/json' });
assert.equal(pathway.status, 201);

const tools = await harness.call('GET', '/v2/tools');
assert.equal(tools.payload.data[0].tool_id, 'tool_emulator');

const batch = await harness.call('POST', '/v2/batches', { label: 'Smoke Batch', recipients: [{ phone_number: '+15550202020' }] }, { 'content-type': 'application/json' });
assert.equal(batch.payload.total_calls, 1);

const contact = await harness.call('POST', '/v1/contacts/resolve', { phone_number: '+15550303030', name: 'Smoke Contact' }, { 'content-type': 'application/json' });
assert.equal(contact.payload.name, 'Smoke Contact');

const inbound = await harness.call('GET', '/v1/inbound');
assert.equal(inbound.payload.numbers[0].label, 'Emulator Line');

console.log('bland smoke ok');
