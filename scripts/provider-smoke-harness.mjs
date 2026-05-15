import assert from 'node:assert/strict';

function matchRoute(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  const params = {};
  for (let i = 0, j = 0; i < routeParts.length; i += 1, j += 1) {
    const part = routeParts[i];
    const rest = part.match(/^:([^{}]+)\{\.\+\}$/);
    if (rest) {
      params[rest[1]] = requestParts.slice(j).join('/');
      return params;
    }
    if (j >= requestParts.length) return null;
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(requestParts[j]);
    else if (part !== requestParts[j]) return null;
  }
  return routeParts.length === requestParts.length ? params : null;
}

function routeScore(routePath) {
  return routePath.split('/').filter(Boolean).reduce((score, part) => score + (part.startsWith(':') ? 1 : 100), 0);
}

export function createHarness(plugin) {
  const routes = [];
  const data = new Map();
  const app = {
    get: (path, handler) => routes.push({ method: 'GET', path, handler }),
    post: (path, handler) => routes.push({ method: 'POST', path, handler }),
    put: (path, handler) => routes.push({ method: 'PUT', path, handler }),
    patch: (path, handler) => routes.push({ method: 'PATCH', path, handler }),
    delete: (path, handler) => routes.push({ method: 'DELETE', path, handler }),
  };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  plugin.register(app, store);

  return {
    async call(method, path, body = undefined, headers = {}) {
      const url = new URL(path, 'http://localhost');
      let selected;
      for (const route of routes) {
        if (route.method !== method) continue;
        const params = matchRoute(route.path, url.pathname);
        if (!params) continue;
        const score = routeScore(route.path);
        if (!selected || score > selected.score) selected = { route, params, score };
      }
      assert.ok(selected, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      const headerMap = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
      await selected.route.handler({
        req: {
          json: async () => body ?? {},
          text: async () => (typeof body === 'string' ? body : new URLSearchParams(body ?? {}).toString()),
          parseBody: async () => (typeof body === 'string' ? Object.fromEntries(new URLSearchParams(body)) : body ?? {}),
          query: (name) => url.searchParams.get(name) ?? undefined,
          queries: (name) => url.searchParams.getAll(name),
          param: (name) => selected.params[name],
          header: (name) => headerMap[name.toLowerCase()],
        },
        json: (value, nextStatus = 200, extraHeaders = {}) => {
          status = nextStatus;
          payload = value;
          return { status, payload, headers: extraHeaders };
        },
        text: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
      });
      return { status, payload };
    },
  };
}
