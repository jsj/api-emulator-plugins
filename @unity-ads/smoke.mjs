import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'unity-ads');

const token = await harness.call('POST', '/auth/v1/token-exchange');
assert.equal(token.payload.accessToken, 'unity_ads_emulator_access_token');

const apps = await harness.call('GET', '/advertise/v1/organizations/unity_org_emulator/apps');
assert.equal(apps.payload.results[0].id, 'unity_game_seed');

const createdCampaign = await harness.call('POST', '/advertise/v1/apps/unity_game_seed/campaigns', {
  name: 'Smoke Campaign',
  dailyBudget: 75,
});
assert.equal(createdCampaign.status, 201);
assert.equal(createdCampaign.payload.status, 'paused');

const campaigns = await harness.call('GET', '/advertise/v1/apps/unity_game_seed/campaigns');
assert.equal(campaigns.payload.results.length, 2);

const patched = await harness.call('PATCH', `/advertise/v1/campaigns/${createdCampaign.payload.id}`, { status: 'active' });
assert.equal(patched.payload.status, 'active');

const monetization = await harness.call(
  'GET',
  '/stats/v1/operate/organizations/unity_org_emulator?fields=adrequest_count,revenue_sum&groupBy=country,placement&scale=day&start=2026-01-01T00:00:00Z&end=2026-01-02T00:00:00Z',
  undefined,
  { authorization: 'Token unity_ads_emulator_key', accept: 'application/json' },
);
assert.equal(monetization.payload.data[0].revenue_sum, 654.32);

const acquisition = await harness.call(
  'GET',
  '/statistics/v2/organizations/unity_org_emulator/reports?fields=clicks,installs,spend&groupBy=campaign&scale=day&start=2026-01-01T00:00:00Z&end=2026-01-02T00:00:00Z',
  undefined,
  { accept: 'text/csv' },
);
assert.match(acquisition.payload, /unity_campaign_seed/);

const missing = await harness.call('GET', '/advertise/v1/campaigns/missing');
assert.equal(missing.status, 404);

console.log('unity-ads smoke ok');
