import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'x');

const token = await harness.call('POST', '/2/oauth2/token', 'grant_type=client_credentials', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'bearer');

const me = await harness.call('GET', '/2/users/me');
assert.equal(me.payload.data.username, 'x_emulator');

const tweets = await harness.call('GET', `/2/users/${me.payload.data.id}/tweets`);
assert.equal(tweets.payload.data[0].author_id, me.payload.data.id);

const created = await harness.call('POST', '/2/tweets', { text: 'Smoke tweet' });
assert.equal(created.status, 201);
assert.equal(created.payload.data.text, 'Smoke tweet');

console.log('x smoke ok');
