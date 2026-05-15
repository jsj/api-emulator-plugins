import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
const auth = { authorization: 'Bearer spectrum_emulator_token', 'content-type': 'application/json' };

assert.equal(contract.provider, 'spectrum');

const badGrant = await harness.call('POST', '/auth/oauth/v2/token', { grant_type: 'password' }, { 'content-type': 'application/json' });
assert.equal(badGrant.status, 400);

const token = await harness.call('POST', '/auth/oauth/v2/token', { grant_type: 'client_credentials', client_id: 'local', client_secret: 'secret' }, { 'content-type': 'application/json' });
assert.equal(token.payload.access_token, 'spectrum_emulator_token');

const unauthenticated = await harness.call('GET', '/entservices/ticketing-b2b/v1/tickets');
assert.equal(unauthenticated.status, 401);

const sites = await harness.call('GET', '/entservices/ticketing-b2b/v1/sites', undefined, auth);
assert.equal(sites.payload.data[0].siteId, 'site_1001');

const circuits = await harness.call('GET', '/entservices/ticketing-b2b/v1/circuits?siteId=site_1001', undefined, auth);
assert.equal(circuits.payload.data[0].serviceId, 'ETH-LOCAL-001');

const created = await harness.call('POST', '/entservices/ticketing-b2b/v1/tickets', { summary: 'Smoke ticket', customerTicketNumber: 'CUST-SMOKE-1' }, auth);
assert.equal(created.status, 201);
assert.equal(created.payload.data.spectrumTicketNumber, 'SPECTRUM-1000002');

const note = await harness.call('POST', '/entservices/ticketing-b2b/v1/tickets/SPECTRUM-1000002/notes', { text: 'CLI-compatible note' }, auth);
assert.equal(note.status, 201);
assert.equal(note.payload.data.text, 'CLI-compatible note');

const attachment = await harness.call('POST', '/entservices/ticketing-b2b/v1/tickets/SPECTRUM-1000002/attachments', { fileName: 'smoke.txt' }, auth);
assert.equal(attachment.status, 201);
assert.equal(attachment.payload.data.fileName, 'smoke.txt');

const ticket = await harness.call('GET', '/entservices/ticketing-b2b/v1/tickets/CUST-SMOKE-1', undefined, auth);
assert.equal(ticket.payload.data.notes.length, 1);
assert.equal(ticket.payload.data.attachments.length, 1);

console.log('spectrum smoke ok');
