import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'pinterest');

const user = await harness.call('GET', '/v5/user_account');
assert.equal(user.payload.username, 'emulator');

const board = await harness.call('POST', '/v5/boards', { name: 'Smoke Board' }, { 'content-type': 'application/json' });
assert.equal(board.status, 201);

const updatedBoard = await harness.call('PATCH', `/v5/boards/${board.payload.id}`, { description: 'Updated board' }, { 'content-type': 'application/json' });
assert.equal(updatedBoard.payload.description, 'Updated board');

const pin = await harness.call('POST', '/v5/pins', { board_id: board.payload.id, title: 'Smoke Pin', media_source: { source_type: 'image_url', url: 'https://example.com/pin.png' } }, { 'content-type': 'application/json' });
assert.equal(pin.status, 201);

const updatedPin = await harness.call('PATCH', `/v5/pins/${pin.payload.id}`, { title: 'Updated Pin' }, { 'content-type': 'application/json' });
assert.equal(updatedPin.payload.title, 'Updated Pin');

const pins = await harness.call('GET', `/v5/boards/${board.payload.id}/pins`);
assert.equal(pins.payload.items[0].title, 'Updated Pin');

const adAccounts = await harness.call('GET', '/v5/ad_accounts');
assert.equal(adAccounts.payload.items[0].currency, 'USD');

const catalogs = await harness.call('GET', '/v5/catalogs');
assert.equal(catalogs.payload.items[0].catalog_type, 'RETAIL');

console.log('pinterest smoke ok');
