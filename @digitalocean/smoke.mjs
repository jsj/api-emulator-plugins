import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'digitalocean');

const account = await harness.call('GET', '/v2/account');
assert.equal(account.payload.account.email, 'ada@example.com');

const projects = await harness.call('GET', '/v2/projects');
assert.equal(projects.payload.projects[0].id, 'proj-emulator');

const created = await harness.call('POST', '/v2/projects', { name: 'CLI Smoke Project' });
assert.equal(created.status, 201);
assert.equal(created.payload.project.name, 'CLI Smoke Project');

const droplets = await harness.call('GET', '/v2/droplets');
assert.equal(droplets.payload.droplets[0].name, 'emulator-droplet');

const droplet = await harness.call('GET', '/v2/droplets/1001');
assert.equal(droplet.payload.droplet.status, 'active');

console.log('digitalocean smoke ok');
