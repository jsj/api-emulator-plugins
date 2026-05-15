import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'uipath');

const folders = await harness.call('GET', '/orchestrator_/odata/Folders');
assert.equal(folders.payload.value[0].DisplayName, 'Shared');

const user = await harness.call('GET', '/orchestrator_/odata/Users/UiPath.Server.Configuration.OData.GetCurrentUserExtended?$expand=PersonalWorkspace');
assert.equal(user.payload.UserName, 'ada@example.test');

const releases = await harness.call('GET', '/emulator/default/orchestrator_/odata/Releases/UiPath.Server.Configuration.OData.ListReleases');
assert.equal(releases.payload.value[0].Name, 'Invoice Processor');

const started = await harness.call('POST', '/orchestrator_/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs', { startInfo: { ReleaseKey: 'release-key-001', InputArguments: '{}' } });
assert.equal(started.status, 201);
assert.equal(started.payload.value[0].State, 'Pending');

const queues = await harness.call('GET', '/orchestrator_/odata/QueueDefinitions');
assert.equal(queues.payload.value[0].Name, 'Invoices');

console.log('uipath smoke ok');
