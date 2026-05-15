import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'reddit');

const token = await harness.call('POST', '/api/v1/access_token', 'grant_type=client_credentials', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'bearer');

const me = await harness.call('GET', '/api/v1/me');
assert.equal(me.payload.name, 'reddit_emulator');

const hot = await harness.call('GET', '/r/emulator/hot');
assert.equal(hot.payload.data.children[0].data.subreddit, 'emulator');

const submit = await harness.call('POST', '/api/submit', { sr: 'emulator', title: 'Smoke post' });
assert.equal(submit.payload.json.errors.length, 0);

console.log('reddit smoke ok');
