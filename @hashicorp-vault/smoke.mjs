import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'hashicorp-vault');

const status = await harness.call('GET', '/v1/sys/seal-status');
assert.equal(status.payload.sealed, false);

const health = await harness.call('GET', '/v1/sys/health');
assert.equal(health.payload.initialized, true);

const mounts = await harness.call('GET', '/v1/sys/mounts', undefined, { 'x-vault-token': 'root' });
assert.equal(mounts.payload.data['secret/'].type, 'kv');

const written = await harness.call('POST', '/v1/secret/data/cli-smoke', { data: { hello: 'vault' } }, { 'x-vault-token': 'root' });
assert.equal(written.payload.data.version, 1);

const read = await harness.call('GET', '/v1/secret/data/cli-smoke?version=1', undefined, { 'x-vault-token': 'root' });
assert.equal(read.payload.data.data.hello, 'vault');

const metadata = await harness.call('GET', '/v1/secret/metadata/cli-smoke', undefined, { 'x-vault-token': 'root' });
assert.equal(metadata.payload.data.current_version, 1);

const listed = await harness.call('GET', '/v1/secret/metadata?list=true', undefined, { 'x-vault-token': 'root' });
assert.ok(listed.payload.data.keys.includes('cli-smoke'));

console.log('hashicorp-vault smoke ok');
