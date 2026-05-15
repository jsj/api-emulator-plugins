import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'patreon');

const token = await harness.call('POST', '/api/oauth2/token');
assert.equal(token.payload.token_type, 'Bearer');

const identity = await harness.call('GET', '/api/oauth2/v2/identity');
assert.equal(identity.payload.data.type, 'user');

const campaigns = await harness.call('GET', '/api/oauth2/v2/campaigns');
assert.equal(campaigns.payload.data[0].id, 'campaign_emulator');

const members = await harness.call('GET', '/api/oauth2/v2/campaigns/campaign_emulator/members');
assert.equal(members.payload.data[0].attributes.patron_status, 'active_patron');

const tiers = await harness.call('GET', '/api/oauth2/v2/campaigns/campaign_emulator/tiers');
assert.equal(tiers.payload.data[0].attributes.title, 'Supporter');

const webhook = await harness.call('POST', '/api/oauth2/v2/webhooks', { data: { attributes: { uri: 'https://example.com/webhook', triggers: ['members:create'] } } }, { 'content-type': 'application/json' });
assert.equal(webhook.status, 201);

const patchedWebhook = await harness.call('PATCH', `/api/oauth2/v2/webhooks/${webhook.payload.data.id}`, { data: { attributes: { uri: 'https://example.com/updated' } } }, { 'content-type': 'application/json' });
assert.equal(patchedWebhook.payload.data.attributes.uri, 'https://example.com/updated');

const live = await harness.call('POST', '/api/oauth2/v2/lives', { data: { attributes: { title: 'Smoke Live' } } }, { 'content-type': 'application/json' });
assert.equal(live.status, 201);

const patchedLive = await harness.call('PATCH', `/api/oauth2/v2/lives/${live.payload.data.id}`, { data: { attributes: { status: 'live' } } }, { 'content-type': 'application/json' });
assert.equal(patchedLive.payload.data.attributes.status, 'live');

console.log('patreon smoke ok');
