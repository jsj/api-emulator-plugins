import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'backblaze');

const auth = await harness.call('GET', '/b2api/v4/b2_authorize_account', undefined, { host: '127.0.0.1:9999' });
assert.equal(auth.payload.accountId, 'b2_account_emulator');

const list = await harness.call('POST', '/b2api/v4/b2_list_buckets', { accountId: 'b2_account_emulator' });
assert.equal(list.payload.buckets[0].bucketName, 'emulator-bucket');

const created = await harness.call('POST', '/b2api/v4/b2_create_bucket', { accountId: 'b2_account_emulator', bucketName: 'smoke-bucket', bucketType: 'allPrivate' });
assert.equal(created.payload.bucketName, 'smoke-bucket');

const deleted = await harness.call('POST', '/b2api/v4/b2_delete_bucket', { accountId: 'b2_account_emulator', bucketId: created.payload.bucketId });
assert.equal(deleted.payload.bucketName, 'smoke-bucket');

console.log('backblaze smoke ok');
