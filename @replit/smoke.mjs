import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'replit');

const user = await harness.call('POST', '/graphql', { query: 'query { currentUser { id username } }' }, { 'content-type': 'application/json' });
assert.equal(user.payload.data.currentUser.username, 'emulator');

const repl = await harness.call('POST', '/graphql', { query: 'query($id: String!) { repl(id: $id) { id title url } }', variables: { id: 'repl_ada_1' } }, { 'content-type': 'application/json' });
assert.equal(repl.payload.data.repl.title, 'api-emulator-demo');

const key = await harness.call('GET', '/data/extensions/publicKey/emulator');
assert.match(key.payload, /BEGIN PUBLIC KEY/);

console.log('replit smoke ok');
