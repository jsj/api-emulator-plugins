import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

class Collection {
  constructor(indexes = []) {
    this.rows = [];
    this.indexes = indexes;
    this.nextId = 1;
  }

  insert(row) {
    const next = {
      id: this.nextId++,
      created_at: new Date().toISOString(),
      ...row,
    };
    this.rows.push(next);
    return next;
  }

  all() {
    return [...this.rows];
  }

  findOneBy(key, value) {
    return this.rows.find((row) => row[key] === value);
  }

  findBy(key, value) {
    return this.rows.filter((row) => row[key] === value);
  }

  update(id, patch) {
    const row = this.rows.find((item) => item.id === id);
    if (!row) return undefined;
    Object.assign(row, patch);
    return row;
  }

  delete(id) {
    this.rows = this.rows.filter((row) => row.id !== id);
  }

  clear() {
    this.rows = [];
  }
}

export class Store {
  constructor() {
    this.data = new Map();
    this.collections = new Map();
  }

  getData(key) {
    return this.data.get(key);
  }

  setData(key, value) {
    if (value === null) this.data.delete(key);
    else this.data.set(key, value);
  }

  collection(name, indexes = []) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Collection(indexes));
    }
    return this.collections.get(name);
  }
}

export function createApp() {
  const routes = [];
  const add = (method, path, handler) => routes.push({ method, path, handler });
  return {
    routes,
    get: (path, handler) => add('GET', path, handler),
    post: (path, handler) => add('POST', path, handler),
    put: (path, handler) => add('PUT', path, handler),
    patch: (path, handler) => add('PATCH', path, handler),
    delete: (path, handler) => add('DELETE', path, handler),
    all: (path, handler) => add('ALL', path, handler),
    use: () => undefined,
    on: (method, path, handler) => add(method, path, handler),
  };
}

export function matchRoute(routePath, requestPath) {
  const routeParts = routePath.split('/').filter(Boolean);
  const requestParts = requestPath.split('/').filter(Boolean);
  const params = {};
  for (let i = 0, j = 0; i < routeParts.length; i += 1, j += 1) {
    const part = routeParts[i];
    if (part === '*') {
      params['*'] = requestParts.slice(j).join('/');
      return params;
    }
    const rest = part.match(/^:([^{}]+)\{\.\+\}$/);
    if (rest) {
      params[rest[1]] = requestParts.slice(j).join('/');
      return params;
    }
    if (j >= requestParts.length) return null;
    if (part.startsWith(':')) {
      params[part.slice(1)] = decodeURIComponent(requestParts[j]);
    } else if (part !== requestParts[j]) {
      return null;
    }
  }
  return routeParts.length === requestParts.length ? params : null;
}

export function routeScore(routePath) {
  return routePath
    .split('/')
    .filter(Boolean)
    .reduce(
      (score, part) => {
        if (part === '*') return score;
        if (part.startsWith(':')) return score + 1;
        return score + 100;
      },
      routePath === '/' ? 100 : 0,
    );
}

export function selectRoute(routes, method, pathname) {
  let selected;
  for (const route of routes) {
    if (route.method !== method && route.method !== 'ALL') continue;
    const params = matchRoute(route.path, pathname);
    if (!params) continue;
    const score = routeScore(route.path);
    if (!selected || score > selected.score) selected = { route, params, score };
  }
  return selected;
}

function createContext(req, res, params, requestUrl, rawBody) {
  const headers = Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(',') : value]));
  const url = new URL(requestUrl);
  const send = (body, status = 200, extraHeaders = {}) => {
    res.statusCode = status;
    for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
    if (body === null || body === undefined) return res.end();
    return res.end(body);
  };
  return {
    req: {
      method: req.method,
      url: requestUrl,
      param: (name) => params[name],
      query: (name) => url.searchParams.get(name) ?? undefined,
      queries: (name) => url.searchParams.getAll(name),
      header: (name) => headers[name.toLowerCase()],
      text: async () => rawBody,
      json: async () => (rawBody ? JSON.parse(rawBody) : {}),
      parseBody: async () => Object.fromEntries(new URLSearchParams(rawBody)),
    },
    json: (value, status = 200, extraHeaders = {}) => {
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      for (const [key, headerValue] of Object.entries(extraHeaders)) res.setHeader(key, headerValue);
      res.end(JSON.stringify(value));
      return { status, payload: value };
    },
    text: (value, status = 200, extraHeaders = {}) =>
      send(String(value), status, {
        'content-type': 'text/plain',
        ...extraHeaders,
      }),
    body: (value, status = 200, extraHeaders = {}) => send(value, status, extraHeaders),
  };
}

async function requestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export async function withServer(app, fn, options = {}) {
  const server = createServer(async (req, res) => {
    const rawBody = await requestBody(req);
    const inboundUrl = new URL(`http://${req.headers.host}${req.url}`);
    const targetHeader = Array.isArray(req.headers['x-fal-target-url']) ? req.headers['x-fal-target-url'][0] : req.headers['x-fal-target-url'];
    if (targetHeader) {
      const targetUrl = new URL(targetHeader);
      inboundUrl.pathname = targetUrl.pathname;
      inboundUrl.search = targetUrl.search;
    }
    inboundUrl.pathname = inboundUrl.pathname
      .replace(/^\/+services\//, '/services/')
      .replace(/^\/x{17}\//, '/')
      .replace(/^\/y{23}\//, '/')
      .replace(/^\/a{22}\//, '/')
      .replace(/^\/b{28}\//, '/')
      .replace(/^\/c{4}\//, '/');
    const requestUrl = inboundUrl.toString();
    const pathname = inboundUrl.pathname;
    if (process.env.DEBUG_CLI_SMOKE) console.error(`${req.method} ${pathname}`);
    const selected = selectRoute(app.routes, req.method, pathname);
    if (selected) {
      const { route, params } = selected;
      if (process.env.DEBUG_CLI_SMOKE) console.error(`  -> ${route.method} ${route.path}`);
      const result = await route.handler(createContext(req, res, params, requestUrl, rawBody));
      if (result instanceof Response) {
        res.statusCode = result.status;
        for (const [key, value] of result.headers) res.setHeader(key, value);
        res.end(Buffer.from(await result.arrayBuffer()));
      }
      return;
    }
    res.statusCode = 404;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'not_found', path: pathname }));
  });
  await new Promise((resolve) => server.listen(options.port ?? 0, options.host ?? '127.0.0.1', resolve));
  const { port } = server.address();
  const host = options.host ?? '127.0.0.1';
  try {
    await fn(`http://${host}:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

export function createPluginHarness(plugin, options = {}) {
  const app = createApp();
  const store = options.store ?? new Store();
  plugin.register(app, store);

  return {
    app,
    store,
    async call(method, path, body = undefined, headers = {}) {
      const url = new URL(path, 'http://localhost');
      const selected = selectRoute(app.routes, method, url.pathname);
      if (!selected) throw new Error(`missing route ${method} ${path}`);
      let status = 200;
      let payload;
      let responseHeaders = {};
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
          responseHeaders = extraHeaders;
          return { status, payload, headers: responseHeaders };
        },
        text: (value, nextStatus = 200, extraHeaders = {}) => {
          status = nextStatus;
          payload = value;
          responseHeaders = extraHeaders;
          return { status, payload, headers: responseHeaders };
        },
        body: (value, nextStatus = 200, extraHeaders = {}) => {
          status = nextStatus;
          payload = value;
          responseHeaders = extraHeaders;
          return { status, payload, headers: responseHeaders };
        },
      });
      return { status, payload, headers: responseHeaders };
    },
  };
}

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => {
      stdout += data;
    });
    child.stderr.on('data', (data) => {
      stderr += data;
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(' ')} failed with ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });
  });
}

export async function commandPath(command) {
  const located = await run('/usr/bin/which', [command]).catch(() => null);
  return located?.stdout.trim() || null;
}
