import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'marketo');

const token = await harness.call('GET', '/identity/oauth/token?grant_type=client_credentials&client_id=id&client_secret=secret');
assert.equal(token.payload.token_type, 'bearer');

const leads = await harness.call('GET', '/rest/v1/leads.json?filterType=email&filterValues=developerfeedback@marketo.com');
assert.equal(leads.payload.success, true);
assert.equal(leads.payload.result[0].firstName, 'Kenneth');

const upsert = await harness.call('POST', '/rest/v1/leads.json', { action: 'createOrUpdate', input: [{ email: 'smoke@example.com', firstName: 'Smoke' }] }, { 'content-type': 'application/json' });
assert.equal(upsert.payload.result[0].status, 'created');
const leadId = upsert.payload.result[0].id;

const fields = await harness.call('GET', '/rest/v1/leads/describe.json');
assert.equal(fields.payload.result[0].rest.name, 'email');

const programs = await harness.call('GET', '/rest/asset/v1/programs.json');
assert.equal(programs.payload.result[0].name, 'Emulator Program');

const addToList = await harness.call('POST', '/rest/v1/lists/2001/leads.json', { input: [{ id: leadId }] }, { 'content-type': 'application/json' });
assert.equal(addToList.payload.result[0].status, 'added');

const listLeads = await harness.call('GET', '/rest/v1/list/2001/leads.json');
assert.ok(listLeads.payload.result.some((lead) => lead.email === 'smoke@example.com'));

const activities = await harness.call('GET', '/rest/v1/activities.json?leadIds=1');
assert.equal(activities.payload.result[0].primaryAttributeValue, 'Visit Webpage');

console.log('marketo smoke ok');
