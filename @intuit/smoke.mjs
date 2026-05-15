import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'intuit');

const token = await harness.call('POST', '/oauth2/v1/tokens/bearer', 'grant_type=authorization_code', { 'content-type': 'application/x-www-form-urlencoded' });
assert.equal(token.payload.token_type, 'bearer');

const company = await harness.call('GET', '/v3/company/123145725943001/companyinfo/123145725943001');
assert.equal(company.payload.CompanyInfo.CompanyName, 'Emulator Books LLC');

const customers = await harness.call('GET', '/v3/company/123145725943001/query?query=select%20*%20from%20Customer');
assert.equal(customers.payload.QueryResponse.Customer.length, 1);

const created = await harness.call('POST', '/v3/company/123145725943001/customer', { DisplayName: 'Grace Hopper' });
assert.equal(created.payload.Customer.DisplayName, 'Grace Hopper');

const invoice = await harness.call('POST', '/v3/company/123145725943001/invoice', { CustomerRef: { value: created.payload.Customer.Id }, TotalAmt: 42 });
assert.equal(invoice.payload.Invoice.TotalAmt, 42);

console.log('intuit smoke ok');
