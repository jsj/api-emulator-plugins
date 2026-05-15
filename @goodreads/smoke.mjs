import assert from 'node:assert/strict';
import { contract, initConfig, plugin } from './api-emulator.mjs';

const routes = [];
const data = new Map();
const app = {
  get: (path, handler) => routes.push({ method: 'GET', path, handler }),
};
const store = { getData: (key) => data.get(key), setData: (key, value) => data.set(key, value) };

plugin.register(app, store);

function match(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  if (routeParts.length !== requestParts.length) return null;
  const params = {};
  for (let i = 0; i < routeParts.length; i += 1) {
    if (routeParts[i].startsWith(':')) {
      const routeName = routeParts[i].slice(1);
      const dotIndex = routeName.indexOf('.');
      const paramName = dotIndex === -1 ? routeName : routeName.slice(0, dotIndex);
      params[paramName] = decodeURIComponent(requestParts[i].replace(dotIndex === -1 ? '' : routeName.slice(dotIndex), ''));
    } else if (routeParts[i] !== requestParts[i]) return null;
  }
  return params;
}

async function request(path) {
  const url = new URL(`http://goodreads.local${path}`);
  const route = routes.find((item) => item.method === 'GET' && match(item.path, url.pathname));
  assert.ok(route, `GET ${path} route should exist`);
  const params = match(route.path, url.pathname);
  let status = 200;
  let payload = '';
  await route.handler({
    req: {
      url: url.toString(),
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
    },
    text: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    body: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = value;
      return { status, payload };
    },
    json: (value, nextStatus = 200) => {
      status = nextStatus;
      payload = JSON.stringify(value);
      return { status, payload };
    },
  });
  return { status, payload };
}

assert.equal(contract.provider, 'goodreads');
assert.equal(initConfig.goodreads.key, 'goodreads_emulator_key');

const search = await request('/search/index.xml?key=goodreads_emulator_key&q=localhost');
assert.equal(search.status, 200);
assert.match(search.payload, /<title>Localhost Library<\/title>/);
assert.match(search.payload, /<total-results>1<\/total-results>/);

const book = await request('/book/show/1.xml?key=goodreads_emulator_key');
assert.match(book.payload, /<average_rating>4\.21<\/average_rating>/);

const author = await request('/author/show/10.xml?key=goodreads_emulator_key');
assert.match(author.payload, /<name>API Emulator<\/name>/);

const missingKey = await request('/book/show/1.xml');
assert.equal(missingKey.status, 401);
assert.match(missingKey.payload, /Developer key required/);

console.log('goodreads smoke ok');
