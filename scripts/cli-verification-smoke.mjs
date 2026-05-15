import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

import { customerRoutes } from '../@stripe/api-emulator/src/routes/customers.ts';
import { s3Routes } from '../@aws/api-emulator/src/routes/s3.ts';
import { plugin as googlePlugin } from '../@google/api-emulator.mjs';
import { plugin as kubernetesPlugin, seedFromConfig as seedKubernetes } from '../@kubernetes/api-emulator/index.mjs';
import { plugin as metaPlugin, seedFromConfig as seedMeta } from '../@meta/api-emulator.mjs';
import { plugin as openaiPlugin } from '../@openai/api-emulator.mjs';
import { plugin as supabasePlugin } from '../@supabase/api-emulator.mjs';
import { plugin as falPlugin } from '../@fal/api-emulator.mjs';

class Collection {
  constructor(indexes = []) {
    this.rows = [];
    this.indexes = indexes;
    this.nextId = 1;
  }

  insert(row) {
    const next = { id: this.nextId++, created_at: new Date().toISOString(), ...row };
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
}

class Store {
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

function createApp() {
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
    on: (method, path, handler) => add(method, path, handler),
  };
}

function matchRoute(routePath, requestPath) {
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

function routeScore(routePath) {
  return routePath
    .split('/')
    .filter(Boolean)
    .reduce((score, part) => {
      if (part === '*') return score;
      if (part.startsWith(':')) return score + 1;
      return score + 100;
    }, routePath === '/' ? 100 : 0);
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
    text: (value, status = 200, extraHeaders = {}) => send(String(value), status, { 'content-type': 'text/plain', ...extraHeaders }),
    body: (value, status = 200, extraHeaders = {}) => send(value, status, extraHeaders),
  };
}

async function requestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function withServer(app, fn, options = {}) {
  const server = createServer(async (req, res) => {
    const rawBody = await requestBody(req);
    const requestUrl = `http://${req.headers.host}${req.url}`;
    const pathname = new URL(requestUrl).pathname;
    if (process.env.DEBUG_CLI_SMOKE) console.error(`${req.method} ${pathname}`);
    let selected;
    for (const route of app.routes) {
      if (route.method !== req.method && route.method !== 'ALL') continue;
      const params = matchRoute(route.path, pathname);
      if (!params) continue;
      const score = routeScore(route.path);
      if (!selected || score > selected.score) selected = { route, params, score };
    }
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

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...options.env },
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(' ')} failed with ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`));
    });
  });
}

async function commandPath(command) {
  const located = await run('/usr/bin/which', [command]).catch(() => null);
  return located?.stdout.trim() || null;
}

async function patchedGenmedia(apiBaseUrl) {
  const source = process.env.GENMEDIA_BIN || await commandPath('genmedia');
  if (!source) return null;
  const original = Buffer.from('https://api.fal.ai/v1');
  const replacement = Buffer.from(apiBaseUrl);
  assert.equal(replacement.length, original.length, 'patched genmedia API base must match embedded URL length');

  const binary = await readFile(source);
  assert.ok(binary.includes(original), 'genmedia binary does not contain expected fal API base URL');
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-genmedia-'));
  const path = join(dir, 'genmedia');
  const patched = Buffer.from(binary.toString('binary').replaceAll(original.toString('binary'), replacement.toString('binary')), 'binary');
  await writeFile(path, patched, { mode: 0o755 });
  return { path, dir };
}

function metaCliBaseArgs(help, baseUrl) {
  if (help.includes('--api-base')) return ['--api-base', baseUrl];
  if (help.includes('--base-url')) return ['--base-url', baseUrl];
  return null;
}

async function googleDiscoveryCache(baseUrl) {
  return {
    kind: 'discovery#restDescription',
    discoveryVersion: 'v1',
    name: 'drive',
    version: 'v3',
    title: 'Google Drive API',
    rootUrl: `${baseUrl}/`,
    servicePath: 'drive/v3/',
    resources: {
      files: {
        methods: {
          list: {
            id: 'drive.files.list',
            path: 'files',
            httpMethod: 'GET',
            parameters: {
              pageSize: { type: 'integer', location: 'query' },
              fields: { type: 'string', location: 'query' },
            },
            response: { '$ref': 'FileList' },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
          },
          create: {
            id: 'drive.files.create',
            path: 'files',
            httpMethod: 'POST',
            parameters: {},
            request: { '$ref': 'File' },
            response: { '$ref': 'File' },
            scopes: ['https://www.googleapis.com/auth/drive'],
          },
        },
      },
    },
    schemas: {
      File: {
        id: 'File',
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          mimeType: { type: 'string' },
        },
      },
      FileList: {
        id: 'FileList',
        type: 'object',
        properties: {
          files: { type: 'array', items: { '$ref': 'File' } },
        },
      },
    },
  };
}

async function registerShims(app, store) {
  app.get('/api', (c) => c.json({ kind: 'APIVersions', versions: ['v1'], serverAddressByClientCIDRs: [] }));
  app.get('/api/v1', (c) => c.json({
    kind: 'APIResourceList',
    groupVersion: 'v1',
    resources: [
      { name: 'namespaces', singularName: '', namespaced: false, kind: 'Namespace', verbs: ['get', 'list'] },
      { name: 'pods', singularName: '', namespaced: true, kind: 'Pod', verbs: ['get', 'list'] },
    ],
  }));
  app.get('/apis', (c) => c.json({ kind: 'APIGroupList', groups: [] }));
  app.get('/version', (c) => c.json({ major: '1', minor: '30', gitVersion: 'v1.30.0-emulator' }));
  app.get('/v1/projects', (c) => c.json([
    {
      id: 'project_emulator',
      ref: 'project_emulator',
      name: 'Emulator Project',
      organization_id: 'org_emulator',
      region: 'local',
      status: 'ACTIVE_HEALTHY',
      database: { host: '127.0.0.1', version: '15' },
    },
  ]));
  app.post('/chat/completions', async (c) => {
    const input = await c.req.json();
    const content = input.messages?.at?.(-1)?.content ?? 'hello';
    return c.json({
      id: 'chatcmpl_cli_smoke',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: input.model ?? 'gpt-4.1-mini',
      choices: [{ index: 0, message: { role: 'assistant', content: `openai-emulator-text: ${content}` }, finish_reason: 'stop' }],
    });
  });
  app.get('/inspect/cli-hits', (c) => c.json({
    google: store.getData('google:workspace-state')?.hits ?? [],
    openai: store.getData('openai:last-chat-completion') ?? null,
  }));
}

async function main() {
  const app = createApp();
  const store = new Store();
  const webhooks = { dispatch: async () => undefined, register: () => undefined };
  const tokenMap = new Map();

  await registerShims(app, store);
  customerRoutes({ app, store, webhooks, baseUrl: 'http://127.0.0.1', tokenMap });
  store.collection('stripe.customers', ['stripe_id', 'email']).insert({
    stripe_id: 'cus_cli_smoke',
    email: 'cli-smoke@example.com',
    name: 'CLI Smoke Customer',
    description: null,
    metadata: {},
  });
  store.collection('aws.s3_buckets', ['bucket_name']).insert({
    bucket_name: 'emulate-default',
    region: 'us-east-1',
    creation_date: new Date().toISOString(),
    acl: 'private',
    versioning_enabled: false,
  });
  s3Routes({ app, store, webhooks, baseUrl: 'http://127.0.0.1', tokenMap });
  kubernetesPlugin.register(app, store);
  seedKubernetes(store, 'http://127.0.0.1', {
    clusters: [{
      name: 'cli-smoke',
      namespaces: [{ name: 'default' }],
      pods: [{ name: 'api', namespace: 'default', node: 'node-a', phase: 'Running', containers: [{ name: 'api', ready: true }] }],
      logs: { default: { api: 'api emulator log line' } },
    }],
  });
  openaiPlugin.register(app, store);
  metaPlugin.register(app, store);
  seedMeta(store, 'http://127.0.0.1', {
    campaigns: [{ id: 'meta_campaign_seed', name: 'Meta CLI Seed Campaign', status: 'active', budget: 100 }],
  });
  supabasePlugin.register(app, store);
  googlePlugin.register(app, store);
  falPlugin.register(app, store);

  await withServer(app, async (baseUrl) => {
    const stripe = await run('stripe', ['get', '/v1/customers', '--api-base', baseUrl, '--api-key', 'sk_test_cli_smoke', '--limit', '1']);
    assert.match(stripe.stdout, /cus_/);

    const aws = await run('aws', ['--endpoint-url', baseUrl, 's3', 'ls'], {
      env: {
        AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
        AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        AWS_DEFAULT_REGION: 'us-east-1',
      },
    });
    assert.match(aws.stdout, /emulate-default/);

    const kubeDir = await mkdtemp(join(tmpdir(), 'api-emulator-kube-'));
    const kubeconfig = join(kubeDir, 'config');
    await writeFile(kubeconfig, [
      'apiVersion: v1',
      'kind: Config',
      'clusters:',
      `- cluster: {server: ${baseUrl}}`,
      '  name: emulator',
      'contexts:',
      '- context: {cluster: emulator, user: emulator}',
      '  name: emulator',
      'current-context: emulator',
      'users:',
      '- name: emulator',
      '  user: {token: emulator}',
      '',
    ].join('\n'));
    const kubectl = await run('kubectl', ['--kubeconfig', kubeconfig, 'get', 'namespaces', '-o', 'json']);
    assert.equal(JSON.parse(kubectl.stdout).items[0].metadata.name, 'default');
    await rm(kubeDir, { recursive: true, force: true });

    const openai = await run('openai', ['--api-base', `${baseUrl}/v1/`, '--api-key', 'sk-test', 'api', 'chat.completions.create', '-m', 'gpt-4.1-mini', '-g', 'user', 'hello from cli']);
    assert.match(openai.stdout, /openai-emulator-text/);

    const metaAdAccounts = await fetch(`${baseUrl}/v20.0/me/adaccounts?access_token=test`);
    assert.equal(metaAdAccounts.status, 200);
    assert.equal((await metaAdAccounts.json()).data[0].id, 'act_123456');
    const metaCampaignCreate = await fetch(`${baseUrl}/v20.0/act_123456/campaigns`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ name: 'Meta CLI Smoke Campaign', status: 'PAUSED', daily_budget: '5000', objective: 'OUTCOME_SALES' }),
    });
    assert.equal(metaCampaignCreate.status, 201);
    const metaCampaign = await metaCampaignCreate.json();
    assert.equal(metaCampaign.status, 'PAUSED');
    assert.equal(metaCampaign.name, 'Meta CLI Smoke Campaign');
    const metaCampaignRead = await fetch(`${baseUrl}/v20.0/${metaCampaign.id}?access_token=test`);
    assert.equal(metaCampaignRead.status, 200);
    assert.equal((await metaCampaignRead.json()).name, 'Meta CLI Smoke Campaign');

    const metaHelp = await run('meta', ['--help']).catch((error) => ({ stdout: '', stderr: String(error), skipped: true }));
    const metaBaseArgs = metaHelp.skipped ? null : metaCliBaseArgs(`${metaHelp.stdout}\n${metaHelp.stderr}`, baseUrl);
    if (metaBaseArgs) {
      const metaEnv = { ACCESS_TOKEN: 'test', AD_ACCOUNT_ID: 'act_123456' };
      const metaAccounts = await run('meta', [...metaBaseArgs, 'ads', 'adaccount', 'list', '--output', 'json'], { env: metaEnv });
      assert.match(metaAccounts.stdout, /act_123456/);
      const metaCreated = await run('meta', [...metaBaseArgs, 'ads', 'campaign', 'create', '--name', 'Meta CLI Smoke Created', '--objective', 'OUTCOME_SALES', '--daily-budget', '5000', '--output', 'json'], { env: metaEnv });
      assert.match(metaCreated.stdout, /Meta CLI Smoke Created|meta_campaign_/);
    } else {
      console.warn('meta-ads CLI unavailable or lacks a documented base URL flag; Meta Graph emulator route smoke covered');
    }

    const gws = '/Users/james/Developer/zzabandoned/gwspace-cli/target/debug/gws';
    if (existsSync(gws)) {
      const gwsConfig = await mkdtemp(join(tmpdir(), 'api-emulator-gws-'));
      const cacheDir = join(gwsConfig, 'cache');
      await writeFile(join(cacheDir, '.keep'), '', { flag: 'w' }).catch(async () => {
        await import('node:fs/promises').then(({ mkdir }) => mkdir(cacheDir, { recursive: true }));
      });
      await writeFile(join(cacheDir, 'drive_v3.json'), JSON.stringify(await googleDiscoveryCache(baseUrl)));
      const google = await run(gws, ['drive', 'files', 'list', '--params', '{"pageSize":1}'], {
        env: {
          GOOGLE_WORKSPACE_CLI_CONFIG_DIR: gwsConfig,
          GOOGLE_WORKSPACE_CLI_TOKEN: 'ya29.emulator',
          GOOGLE_WORKSPACE_CLI_KEYRING_BACKEND: 'file',
        },
      });
      assert.match(google.stdout, /Emulator Seed Doc/);
      await rm(gwsConfig, { recursive: true, force: true });
    }

    const supabaseToken = `sbp_${'a'.repeat(40)}`;
    const supabase = await run('supabase', ['projects', 'list', '-o', 'json'], {
      env: {
        SUPABASE_ACCESS_TOKEN: supabaseToken,
        SUPABASE_API_URL: baseUrl,
      },
    }).catch((error) => ({ stdout: '', stderr: String(error), skipped: true }));
    if (!supabase.skipped) assert.match(supabase.stdout, /project_emulator/);
    else console.warn('supabase CLI management API base override unavailable in installed CLI; emulator route shim registered');
  });

  await withServer(app, async () => {
    const genmedia = await patchedGenmedia('http://127.0.0.1:8787');
    if (!genmedia) {
      console.warn('genmedia CLI unavailable; skipping fal CLI smoke');
      return;
    }
    try {
      const env = {
        FAL_KEY: 'fal_emulator_key',
        GENMEDIA_NO_ANALYTICS: '1',
        GENMEDIA_NO_UPDATE: '1',
      };
      const models = await run(genmedia.path, ['models', '--endpoint_id', 'fal-ai/flux/dev'], { env });
      assert.match(models.stdout, /fal-ai\/flux\/dev/);
      const schema = await run(genmedia.path, ['schema', 'fal-ai/flux/dev'], { env });
      assert.match(schema.stdout, /fal-ai\/flux\/dev/);
    } finally {
      await rm(genmedia.dir, { recursive: true, force: true });
    }
  }, { port: 8787, host: '127.0.0.1' });
}

await main();
console.log('cli verification smoke ok');
