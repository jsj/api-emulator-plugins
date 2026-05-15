import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'fireworks');
assert.equal(contract.baseUrl, 'https://api.fireworks.ai/inference/v1');

const models = await harness.call('GET', '/inference/v1/models');
assert.equal(models.payload.object, 'list');
assert.ok(models.payload.data.some((model) => model.id.includes('llama-v3p1')));

const chat = await harness.call('POST', '/inference/v1/chat/completions', {
  model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
  messages: [{ role: 'user', content: 'hello' }],
});
assert.equal(chat.payload.choices[0].message.role, 'assistant');
assert.match(chat.payload.choices[0].message.content, /Fireworks/);

const completion = await harness.call('POST', '/v1/completions', { prompt: 'hello' });
assert.equal(completion.payload.object, 'text_completion');

const embeddings = await harness.call('POST', '/inference/v1/embeddings', { input: ['hello'] });
assert.equal(embeddings.payload.data[0].object, 'embedding');

const state = await harness.call('GET', '/fireworks/inspect/state');
assert.equal(state.payload.collections.models.length, 2);

console.log('fireworks smoke ok');
