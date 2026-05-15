import assert from 'node:assert/strict';
import { createHarness } from '../scripts/provider-smoke-harness.mjs';
import { contract, plugin } from './api-emulator.mjs';

const harness = createHarness(plugin);
assert.equal(contract.provider, 'shopify');

const shop = await harness.call('GET', '/admin/api/2026-01/shop.json');
assert.equal(shop.payload.shop.myshopify_domain, 'emulator.myshopify.com');

const products = await harness.call('GET', '/admin/api/2026-01/products.json');
assert.equal(products.payload.products[0].title, 'Emulator T-Shirt');

const created = await harness.call('POST', '/admin/api/2026-01/products.json', { product: { title: 'Smoke Product', handle: 'smoke-product' } });
assert.equal(created.status, 201);

const graph = await harness.call('POST', '/admin/api/2026-01/graphql.json', { query: '{ shop { name myshopifyDomain } }' });
assert.equal(graph.payload.data.shop.name, 'Emulator Shop');

console.log('shopify smoke ok');
