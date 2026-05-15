import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'substack');

const publication = await harness.call('GET', '/api/v1/publication');
assert.equal(publication.payload.subdomain, 'emulator');

const created = await harness.call('POST', '/api/v1/posts', { title: 'Smoke Newsletter', body_html: '<p>Smoke</p>' }, { 'content-type': 'application/json' });
assert.equal(created.status, 201);

const post = await harness.call('GET', `/api/v1/posts/${created.payload.slug}`);
assert.equal(post.payload.title, 'Smoke Newsletter');

const updated = await harness.call('PATCH', `/api/v1/posts/${created.payload.slug}`, { subtitle: 'Updated subtitle' }, { 'content-type': 'application/json' });
assert.equal(updated.payload.subtitle, 'Updated subtitle');

const comment = await harness.call('POST', `/api/v1/posts/${created.payload.slug}/comments`, { body: 'Smoke comment', name: 'Smoke Reader' }, { 'content-type': 'application/json' });
assert.equal(comment.status, 201);

const comments = await harness.call('GET', `/api/v1/posts/${created.payload.slug}/comments`);
assert.equal(comments.payload.comments[0].body, 'Smoke comment');

const subscriber = await harness.call('POST', '/api/v1/subscribers', { email: 'smoke@example.com' }, { 'content-type': 'application/json' });
assert.equal(subscriber.payload.subscription_status, 'active');

const recommendations = await harness.call('GET', '/api/v1/recommendations');
assert.equal(recommendations.payload.recommendations[0].subdomain, 'recommended');

console.log('substack smoke ok');
