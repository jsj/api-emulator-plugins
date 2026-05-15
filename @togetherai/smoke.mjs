import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'togetherai');
assert.equal(contract.baseUrl, 'https://api.together.xyz/v1');

const models = await harness.call('GET', '/v1/models');
assert.equal(models.payload.object, 'list');
assert.ok(models.payload.data.some((model) => model.id.includes('Meta-Llama')));

const chat = await harness.call('POST', '/v1/chat/completions', { messages: [] });
assert.equal(chat.payload.choices[0].message.content, 'Together AI emulator response');

const aliasChat = await harness.call('POST', '/together/v1/chat/completions', { messages: [] });
assert.equal(aliasChat.payload.choices[0].message.content, 'Together AI emulator response');

const embeddings = await harness.call('POST', '/v1/embeddings', { input: 'hello' });
assert.equal(embeddings.payload.data[0].embedding.length, 4);

const rerank = await harness.call('POST', '/v1/rerank', { query: 'emulator', documents: ['a', 'b'] });
assert.equal(rerank.payload.results[0].index, 0);

const state = await harness.call('GET', '/togetherai/inspect/state');
assert.equal(state.payload.collections.models.length, 3);

console.log('togetherai smoke ok');
