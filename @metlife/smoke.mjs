import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'metlife');

const products = await harness.call('GET', '/v1/products');
assert.equal(products.payload.data[0].id, 'prod_met_term');

const analysis = await harness.call('POST', '/v1/needs-analysis', { age: 37, dependents: 2 });
assert.equal(analysis.status, 201);

const quote = await harness.call('POST', '/v1/quote-illustrations', { productId: analysis.payload.recommendedProductId, faceAmount: 500000 });
assert.equal(quote.payload.status, 'illustrated');

const application = await harness.call('POST', '/v1/applications', { quoteId: quote.payload.id, applicant: { firstName: 'Grace' } });
assert.equal(application.payload.status, 'submitted');

const fetched = await harness.call('GET', `/v1/applications/${application.payload.id}`);
assert.equal(fetched.payload.quoteId, quote.payload.id);

console.log('metlife smoke ok');
