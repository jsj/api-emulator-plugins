import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'turbotax');

const token = await harness.call('POST', '/oauth2/v1/tokens/bearer', 'grant_type=authorization_code', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'bearer');

const docs = await harness.call('GET', '/v1/tax-documents?taxYear=2025');
assert.equal(docs.payload.data.length, 2);

const created = await harness.call('POST', '/v1/tax-documents', { taxYear: 2025, formType: '1099-DIV', payerName: 'Emulator Brokerage' });
assert.equal(created.status, 201);
assert.equal(created.payload.formType, '1099-DIV');

const fetched = await harness.call('GET', `/v1/tax-documents/${created.payload.id}`);
assert.equal(fetched.payload.payerName, 'Emulator Brokerage');

const session = await harness.call('POST', '/v1/import-sessions', { taxYear: 2025, documentIds: [created.payload.id] });
assert.equal(session.status, 201);
assert.deepEqual(session.payload.documentIds, [created.payload.id]);

console.log('turbotax smoke ok');
