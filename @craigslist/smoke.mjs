import assert from 'node:assert/strict';
import { plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
  post: (path, handler) => routes.push({ method: 'POST', path, handler }),
  patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
  put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
  delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
};
const store = { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) };

plugin.register(app, store);

function match(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(':')) params[routeParts[i].slice(1)] = decodeURIComponent(requestParts[i]);
    else if (routeParts[i] !== requestParts[i]) return null;
  }
  return params;
}

async function request(method, path, requestBody) {
  const url = new URL(path, 'http://craigslist.local');
  const route = routes.find((item) => item.method === method && match(item.path, url.pathname));
  assert.ok(route, `${method} ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload;
  await route.handler({
    req: {
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      text: async () => JSON.stringify(requestBody ?? {}),
      json: async () => requestBody ?? {},
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    text: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
  });
  return { status, payload };
}

const search = await request('GET', '/sfbay/search/ggg?query=picking');
assert.equal(search.payload.results[0].id, 'cl_listing_seed');

const rss = await request('GET', '/sfbay/search/ggg/rss');
assert.match(rss.payload, /<rss/);

const bulk = await request('POST', '/posting/bulk', { title: 'Need a human courier', body: 'Pickup task', price: 50 });
assert.equal(bulk.status, 201);
assert.match(bulk.payload.posts[0].id, /^cl_post_/);

const token = await request('POST', '/bulkpost/oauth/access-token');
assert.equal(token.payload.token_type, 'Bearer');

const credit = await request('GET', '/bulkpost/v1/account/billing/credit');
assert.equal(credit.payload.apiVersion, 1);

const bodyResult = await request('PUT', `/bulkpost/v1/postings/${bulk.payload.posts[0].id}/body`, { body: 'Updated pickup task' });
assert.equal(bodyResult.payload.data.body, 'Updated pickup task');

const image = await request('POST', `/bulkpost/v1/postings/${bulk.payload.posts[0].id}/images`, { filename: '/file/smoke.webp' });
assert.equal(image.payload.data.imageInfo[0].format, 'WEBP');

const status = await request('GET', `/bulkpost/v1/postings/${bulk.payload.posts[0].id}/status`);
assert.equal(status.payload.data.status, 'active');

const deleted = await request('DELETE', `/posts/${bulk.payload.posts[0].id}`);
assert.equal(deleted.payload.status, 'deleted');

console.log('craigslist smoke ok');
