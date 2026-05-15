import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'gong');

const users = await harness.call('GET', '/v2/users');
assert.equal(users.payload.users[0].emailAddress, 'emulator@example.test');

const calls = await harness.call('POST', '/v2/calls', {});
assert.equal(calls.payload.calls[0].id, 'call_001');

const transcript = await harness.call('POST', '/v2/calls/transcript', {});
assert.equal(transcript.payload.callTranscripts[0].callId, 'call_001');

const state = await harness.call('GET', '/gong/inspect/state');
assert.ok(state.payload.collections);

console.log('gong smoke ok');
