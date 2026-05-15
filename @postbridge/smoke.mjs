import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'postbridge');

const accounts = await harness.call('GET', '/v1/accounts');
assert.equal(accounts.payload.data[0].platform, 'instagram');

const account = await harness.call('GET', '/v1/accounts/acc_instagram');
assert.ok(account.payload.data.capabilities.includes('carousel'));

const media = await harness.call('POST', '/v1/media', { url: 'https://example.com/smoke.jpg', type: 'image' }, { 'content-type': 'application/json' });
assert.equal(media.status, 201);

const created = await harness.call('POST', '/v1/posts', { caption: 'Smoke post', platforms: ['instagram'], scheduled_at: '2026-01-03T12:00:00.000Z' }, { 'content-type': 'application/json' });
assert.equal(created.status, 201);
assert.equal(created.payload.data.status, 'scheduled');

const updated = await harness.call('PATCH', `/v1/posts/${created.payload.data.id}`, { caption: 'Updated smoke post' }, { 'content-type': 'application/json' });
assert.equal(updated.payload.data.caption, 'Updated smoke post');

const published = await harness.call('POST', `/v1/posts/${created.payload.data.id}/publish`);
assert.equal(published.payload.data.status, 'published');

const analytics = await harness.call('GET', '/v1/analytics/posts/post_emulator_1');
assert.equal(analytics.payload.data.impressions, 1200);

console.log('postbridge smoke ok');
