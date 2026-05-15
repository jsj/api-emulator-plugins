import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'baseten');

const models = await harness.call('GET', '/v1/models');
assert.equal(models.payload[0].id, 'model_emulator');

const prediction = await harness.call('POST', '/v1/models/model_emulator/predict', { inputs: ['hello'] });
assert.equal(prediction.payload.output.label, 'emulator');

const deployedPrediction = await harness.call('POST', '/production/predict', { prompt: 'hello' });
assert.equal(deployedPrediction.payload.output.label, 'emulator');

const asyncPrediction = await harness.call('POST', '/production/async_predict', { prompt: 'hello' });
assert.equal(asyncPrediction.payload.request_id, 'async_req_001');

const asyncStatus = await harness.call('GET', '/async_request/async_req_001');
assert.equal(asyncStatus.payload.status, 'succeeded');

const chat = await harness.call('POST', '/v1/chat/completions', { messages: [] });
assert.equal(chat.payload.choices[0].message.role, 'assistant');

const state = await harness.call('GET', '/baseten/inspect/state');
assert.ok(state.payload.collections);

console.log('baseten smoke ok');
