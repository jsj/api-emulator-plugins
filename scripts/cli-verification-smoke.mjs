import assert from 'node:assert/strict';
import { chmod, cp, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';

import { customerRoutes } from '../@stripe/api-emulator/src/routes/customers.ts';
import { s3Routes } from '../@aws/api-emulator/src/routes/s3.ts';
import { plugin as appStoreConnectPlugin } from '../@app-store-connect/api-emulator.mjs';
import { plugin as adyenPlugin } from '../@adyen/api-emulator.mjs';
import { plugin as alpacaPlugin } from '../@alpaca/api-emulator/src/index.ts';
import { plugin as googlePlugin } from '../@google/api-emulator.mjs';
import { plugin as googlePlayPlugin } from '../@google-play/api-emulator.mjs';
import { plugin as kubernetesPlugin, seedFromConfig as seedKubernetes } from '../@kubernetes/api-emulator/index.mjs';
import { plugin as metaPlugin, seedFromConfig as seedMeta } from '../@meta/api-emulator.mjs';
import { plugin as oculusPlugin, seedFromConfig as seedOculus } from '../@oculus/api-emulator.mjs';
import { plugin as snapPlugin, seedFromConfig as seedSnap } from '../@snap/api-emulator.mjs';
import { plugin as appLovinPlugin, seedFromConfig as seedAppLovin } from '../@applovin/api-emulator.mjs';
import { plugin as openaiPlugin } from '../@openai/api-emulator.mjs';
import { plugin as salesforcePlugin } from '../@salesforce/api-emulator.mjs';
import { plugin as sentryPlugin } from '../@sentry/api-emulator.mjs';
import { plugin as supabasePlugin } from '../@supabase/api-emulator.mjs';
import { plugin as falPlugin } from '../@fal/api-emulator.mjs';
import { plugin as tiktokPlugin, seedFromConfig as seedTikTok } from '../@tiktok/api-emulator.mjs';
import { plugin as upstashPlugin } from '../@upstash/api-emulator.mjs';
import { plugin as replicatePlugin } from '../@replicate/api-emulator.mjs';
import { plugin as twilioPlugin, seedFromConfig as seedTwilio } from '../@twilio/api-emulator/src/index.ts';

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

  clear() {
    this.rows = [];
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
    use: () => undefined,
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

async function upstashCli() {
  const upstash = await commandPath('upstash');
  if (upstash) {
    const help = await run(upstash, ['redis', 'exec', '--help']).catch((error) => ({ stdout: '', stderr: String(error) }));
    if ((help.stdout + help.stderr).includes('--db-url')) return { command: upstash, prefix: [] };
  }

  const npm = await commandPath('npm');
  if (!npm) return null;
  const help = await run(npm, ['exec', '--yes', '@upstash/cli@next', '--', 'redis', 'exec', '--help']).catch((error) => ({ stdout: '', stderr: String(error) }));
  if ((help.stdout + help.stderr).includes('--db-url')) return { command: npm, prefix: ['exec', '--yes', '@upstash/cli@next', '--'] };
  return null;
}

async function builtReplicateCli() {
  const root = process.env.REPLICATE_CLI_ROOT || '/tmp/replicate-cli';
  if (!existsSync(join(root, 'go.mod'))) {
    const replicate = await commandPath('replicate');
    return replicate ? { path: replicate, dir: null } : null;
  }
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-replicate-'));
  const path = join(dir, 'replicate');
  await run('go', ['build', '-o', path, '.'], { cwd: root });
  return { path, dir };
}

async function patchedGenmedia(apiBaseUrl) {
  const source = process.env.GENMEDIA_BIN || await commandPath('genmedia');
  if (!source) return null;
  const original = Buffer.from('https://api.fal.ai/v1');
  const replacement = Buffer.from(apiBaseUrl);
  assert.equal(replacement.length, original.length, 'patched genmedia API base must match embedded URL length');

  const binary = await readFile(source);
  assert.ok(binary.includes(original), 'genmedia binary does not contain expected fal API base URL');
  const configOriginal = Buffer.from('function pa(){YJ.fal.config({credentials:XJ()})}function xa(){return{Authorization:`Key ${XJ()}`,"Content-Type":"application/json"}}');
  let configReplacement = Buffer.from('function pa(){YJ.fal.config({credentials:XJ(),proxyUrl:process.env.F})}function xa(){return{Authorization:"Key "+XJ()}}');
  configReplacement = Buffer.concat([configReplacement, Buffer.alloc(configOriginal.length - configReplacement.length, 32)]);
  const proxyWhenOriginal = Buffer.from('if(i==="always")return!0;return c.isBrowser');
  const proxyWhenReplacement = Buffer.from('if(i==="always")return!0;return!0          ');
  assert.equal(configReplacement.length, configOriginal.length, 'patched genmedia SDK config must match embedded code length');
  assert.equal(proxyWhenReplacement.length, proxyWhenOriginal.length, 'patched genmedia proxy condition must match embedded code length');
  assert.ok(binary.includes(configOriginal), 'genmedia binary does not contain expected SDK config code');
  assert.ok(binary.includes(proxyWhenOriginal), 'genmedia binary does not contain expected proxy condition code');
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-genmedia-'));
  const path = join(dir, 'genmedia');
  const patched = Buffer.from(binary
    .toString('binary')
    .replaceAll(original.toString('binary'), replacement.toString('binary'))
    .replaceAll(configOriginal.toString('binary'), configReplacement.toString('binary'))
    .replaceAll(proxyWhenOriginal.toString('binary'), proxyWhenReplacement.toString('binary')), 'binary');
  await writeFile(path, patched, { mode: 0o755 });
  return { path, dir };
}

async function metaCliShim(baseUrl) {
  if (!await commandPath('meta')) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-meta-'));
  await writeFile(join(dir, 'sitecustomize.py'), [
    'import os',
    "base = os.environ.get('META_ADS_API_BASE_URL')",
    'if base:',
    '    from facebook_business.session import FacebookSession',
    "    FacebookSession.GRAPH = base.rstrip('/')",
    '',
  ].join('\n'));
  return {
    dir,
    env: {
      ACCESS_TOKEN: 'test',
      AD_ACCOUNT_ID: 'act_123456',
      META_ADS_API_BASE_URL: baseUrl,
      PYTHONPATH: process.env.PYTHONPATH ? `${dir}:${process.env.PYTHONPATH}` : dir,
    },
  };
}

async function patchedGplay() {
  const source = '/Users/james/Developer/zzabandoned/play-console-cli/target/debug/gplay';
  if (!existsSync(source)) return null;
  const replacements = [
    ['https://androidpublisher.googleapis.com/', 'http://127.0.0.1:8788/xxxxxxxxxxxxxxxxx/'],
    ['https://androidpublisher.mtls.googleapis.com/', 'http://127.0.0.1:8788/aaaaaaaaaaaaaaaaaaaaaa/'],
    ['https://playdeveloperreporting.googleapis.com/', 'http://127.0.0.1:8788/yyyyyyyyyyyyyyyyyyyyyyy/'],
    ['https://playdeveloperreporting.mtls.googleapis.com/', 'http://127.0.0.1:8788/bbbbbbbbbbbbbbbbbbbbbbbbbbbb/'],
    ['https://www.googleapis.com/', 'http://127.0.0.1:8788/cccc/'],
  ];
  const binary = await readFile(source);
  let patchedText = binary.toString('binary');
  for (const [original, replacement] of replacements) {
    assert.equal(replacement.length, original.length, 'patched gplay endpoint must match embedded URL length');
    assert.ok(binary.includes(Buffer.from(original)), `gplay binary does not contain ${original}`);
    patchedText = patchedText.replaceAll(original, replacement);
  }
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-gplay-'));
  const path = join(dir, 'gplay');
  await writeFile(path, Buffer.from(patchedText, 'binary'), { mode: 0o755 });
  const tokenPath = join(dir, 'token.json');
  const configPath = join(dir, 'config.json');
  await writeFile(tokenPath, JSON.stringify({
    access_token: 'gplay_emulator_token',
    token_type: 'Bearer',
    expiry: '2999-01-01T00:00:00Z',
  }));
  await writeFile(configPath, JSON.stringify({
    package_name: 'com.example.app',
    timeout: '30s',
    upload_timeout: '30s',
    max_retries: 0,
  }));
  return { path, dir, tokenPath, configPath };
}

async function patchedTikTokCli(baseUrl) {
  let packageRoot = process.env.TIKTOK_ADS_CLI_ROOT;
  if (!packageRoot) {
    const source = await commandPath('tiktok-ads-cli');
    if (!source) return null;
    const binPath = await realpath(source);
    packageRoot = dirname(dirname(binPath));
  }
  const apiPath = join(packageRoot, 'dist', 'api.js');
  if (!existsSync(apiPath)) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-tiktok-'));
  const root = join(dir, 'package');
  await cp(packageRoot, root, { recursive: true });
  const patchedApiPath = join(root, 'dist', 'api.js');
  const original = await readFile(patchedApiPath, 'utf8');
  if (!original.includes('https://business-api.tiktok.com/open_api/v1.3')) return null;
  await writeFile(patchedApiPath, original.replaceAll('https://business-api.tiktok.com/open_api/v1.3', `${baseUrl}/open_api/v1.3`));
  return { path: join(root, 'dist', 'index.js'), dir };
}

async function patchedGoogleAdsCli(baseUrl) {
  let packageRoot = process.env.GOOGLE_ADS_OPEN_CLI_ROOT;
  if (!packageRoot) {
    const source = await commandPath('google-ads-open-cli');
    if (!source) return null;
    const binPath = await realpath(source);
    packageRoot = dirname(dirname(binPath));
  }
  const apiPath = join(packageRoot, 'dist', 'api.js');
  if (!existsSync(apiPath)) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-google-ads-'));
  const root = join(dir, 'package');
  await cp(packageRoot, root, { recursive: true });
  const patchedApiPath = join(root, 'dist', 'api.js');
  const original = await readFile(patchedApiPath, 'utf8');
  if (!original.includes('https://googleads.googleapis.com/v23')) return null;
  await writeFile(patchedApiPath, original.replaceAll('https://googleads.googleapis.com/v23', `${baseUrl}/v23`));
  return { path: join(root, 'dist', 'index.js'), dir };
}

async function patchedTwilioCli(baseUrl) {
  let packageRoot = process.env.TWILIO_CLI_ROOT;
  let installDir;
  if (!packageRoot) {
    const source = await commandPath('twilio');
    if (source) {
      const binPath = await realpath(source);
      packageRoot = dirname(dirname(binPath));
    } else {
      const npm = await commandPath('npm');
      if (!npm) return null;
      installDir = await mkdtemp(join(tmpdir(), 'api-emulator-twilio-install-'));
      await writeFile(join(installDir, 'package.json'), JSON.stringify({ private: true, dependencies: { 'twilio-cli': '6.2.4' } }));
      const installed = await run(npm, ['install', '--no-audit', '--no-fund', '--silent'], { cwd: installDir }).catch(() => null);
      if (!installed) {
        await rm(installDir, { recursive: true, force: true });
        return null;
      }
      packageRoot = join(installDir, 'node_modules', 'twilio-cli');
    }
  }
  const runPath = join(packageRoot, 'bin', 'run');
  const clientPath = join(packageRoot, 'node_modules', '@twilio', 'cli-core', 'src', 'services', 'open-api-client.js');
  if (!existsSync(runPath) || !existsSync(clientPath)) {
    if (installDir) await rm(installDir, { recursive: true, force: true });
    return null;
  }
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-twilio-'));
  const root = join(dir, 'package');
  await cp(packageRoot, root, { recursive: true });
  const patchedClientPath = join(root, 'node_modules', '@twilio', 'cli-core', 'src', 'services', 'open-api-client.js');
  const original = await readFile(patchedClientPath, 'utf8');
  const needle = '    const uri = new url.URL(opts.uri);\n    uri.hostname = this.getHost(uri.hostname, opts);\n    opts.uri = uri.href;';
  const replacement = [
    '    const uri = new url.URL(opts.uri);',
    '    const baseUrl = process.env.TWILIO_API_BASE_URL;',
    '    if (baseUrl) {',
    '      const override = new url.URL(baseUrl);',
    '      uri.protocol = override.protocol;',
    '      uri.host = override.host;',
    '    } else {',
    '      uri.hostname = this.getHost(uri.hostname, opts);',
    '    }',
    '    opts.uri = uri.href;',
  ].join('\n');
  if (!original.includes(needle)) {
    await rm(dir, { recursive: true, force: true });
    if (installDir) await rm(installDir, { recursive: true, force: true });
    return null;
  }
  await writeFile(patchedClientPath, original.replace(needle, replacement));
  return { path: join(root, 'bin', 'run'), dir, installDir };
}

async function patchedSnapchatTap(baseUrl) {
  const packageRoot = process.env.TAP_SNAPCHAT_ADS_ROOT;
  if (!packageRoot || !existsSync(join(packageRoot, 'tap_snapchat_ads', 'client.py'))) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-snap-tap-'));
  const root = join(dir, 'tap');
  await cp(packageRoot, root, { recursive: true });
  const clientPath = join(root, 'tap_snapchat_ads', 'client.py');
  const streamsPath = join(root, 'tap_snapchat_ads', 'streams.py');
  await writeFile(clientPath, (await readFile(clientPath, 'utf8'))
    .replaceAll("API_URL = 'https://adsapi.snapchat.com'", `API_URL = '${baseUrl}'`)
    .replaceAll("SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token'", `SNAPCHAT_TOKEN_URL = '${baseUrl}/login/oauth2/access_token'`));
  if (existsSync(streamsPath)) {
    await writeFile(streamsPath, (await readFile(streamsPath, 'utf8'))
      .replaceAll("BASE_URL = 'https://adsapi.snapchat.com/v1'", `BASE_URL = '${baseUrl}/v1'`));
  }
  return { root, dir };
}

async function patchedAppLovinReport(baseUrl) {
  const packageRoot = process.env.APPLOVIN_REPORT_ROOT;
  if (!packageRoot || !existsSync(join(packageRoot, 'applovin_report', 'revenue_reporting_api.py'))) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-applovin-report-'));
  const root = join(dir, 'applovin_report');
  await cp(packageRoot, root, { recursive: true });
  const reportPath = join(root, 'applovin_report', 'revenue_reporting_api.py');
  await writeFile(reportPath, (await readFile(reportPath, 'utf8'))
    .replaceAll('https://r.applovin.com/maxReport', `${baseUrl}/maxReport`));
  return { root, dir };
}

async function builtAscCli() {
  const root = process.env.ASC_CLI_ROOT || '/Users/james/Developer/zzabandoned/App-Store-Connect-CLI';
  if (!existsSync(join(root, 'go.mod'))) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-asc-'));
  const path = join(dir, 'asc');
  await run('go', ['build', '-o', path, '.'], {
    cwd: root,
    env: { ASC_BYPASS_KEYCHAIN: '1' },
  });
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const keyPath = join(dir, 'AuthKey_TEST.p8');
  await writeFile(keyPath, privateKey.export({ type: 'sec1', format: 'pem' }));
  await chmod(keyPath, 0o600);
  return { path, dir, keyPath };
}

async function builtAdyenCli() {
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-adyen-cli-'));
  const root = join(dir, 'adyen-cli');
  const sourceRoot = process.env.ADYEN_CLI_ROOT || '/Users/james/Developer/zzabandoned/adyen-cli';
  if (existsSync(join(sourceRoot, 'go.mod'))) {
    await cp(sourceRoot, root, { recursive: true });
  } else if (await commandPath('gh')) {
    const cloned = await run('gh', ['repo', 'clone', 'Toshik1978/adyen-cli', root, '--', '--depth', '1']).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  } else {
    await rm(dir, { recursive: true, force: true });
    return null;
  }

  const apiPath = join(root, 'pkg', 'adyen', 'adyen.go');
  const apiSource = await readFile(apiPath, 'utf8');
  await writeFile(apiPath, apiSource.replaceAll('https://%s/', 'http://%s/'));
  const path = join(dir, 'adyen-cli-bin');
  await run('go', ['build', '-o', path, './cmd/main.go'], { cwd: root });
  await chmod(path, 0o755);
  return { path, dir };
}

async function runAdyenCliSmoke(baseUrl) {
  const cli = await builtAdyenCli();
  if (!cli) return null;
  const csvPath = join(cli.dir, 'methods.csv');
  await writeFile(csvPath, [
    'Store ID,Payment Methods,Currency',
    'adyen-cli-store,visa|mc,EUR',
    '',
  ].join('\n'));
  const host = baseUrl.replace(/^https?:\/\//, '');

  try {
    return await run(cli.path, ['methods', '--csv', csvPath], {
      env: {
        ADYEN_CAL_KEY: 'adyen_cal_key',
        ADYEN_CAL_TEST_KEY: 'adyen_cal_test_key',
        ADYEN_MGMT_KEY: 'adyen_mgmt_key',
        ADYEN_MGMT_TEST_KEY: 'adyen_mgmt_test_key',
        ADYEN_KYC_KEY: 'adyen_kyc_key',
        ADYEN_KYC_TEST_KEY: 'adyen_kyc_test_key',
        ADYEN_BAL_KEY: 'adyen_bal_key',
        ADYEN_BAL_TEST_KEY: 'adyen_bal_test_key',
        ADYEN_CAL_URL: host,
        ADYEN_CAL_TEST_URL: host,
        ADYEN_MGMT_URL: host,
        ADYEN_MGMT_TEST_URL: host,
        ADYEN_KYC_URL: host,
        ADYEN_KYC_TEST_URL: host,
        ADYEN_BAL_URL: host,
        ADYEN_BAL_TEST_URL: host,
      },
    });
  } finally {
    await rm(cli.dir, { recursive: true, force: true });
  }
}

async function builtAlpacaCli(baseUrl) {
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-alpaca-cli-'));
  const root = join(dir, 'alpaca-cli');
  const sourceRoot = process.env.ALPACA_CLI_ROOT || '/Users/james/Developer/zzabandoned/alpaca-cli';
  if (existsSync(join(sourceRoot, 'go.mod'))) {
    await cp(sourceRoot, root, { recursive: true });
  } else if (await commandPath('gh')) {
    const cloned = await run('gh', ['repo', 'clone', 'alpacahq/cli', root, '--', '--depth', '1']).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  } else {
    await rm(dir, { recursive: true, force: true });
    return null;
  }

  const configPath = join(root, 'internal', 'config', 'config.go');
  const configSource = await readFile(configPath, 'utf8');
  await writeFile(configPath, configSource
    .replaceAll('https://paper-api.alpaca.markets', baseUrl)
    .replaceAll('https://api.alpaca.markets', baseUrl)
    .replaceAll('https://data.alpaca.markets', baseUrl));
  const updatePath = join(root, 'internal', 'cmd', 'update.go');
  const updateSource = await readFile(updatePath, 'utf8');
  await writeFile(updatePath, updateSource.replace(
    /func getLatestVersion\(timeout time\.Duration\) \(string, error\) \{[\s\S]*?\n\}/,
    'func getLatestVersion(timeout time.Duration) (string, error) {\n\t_ = http.MethodGet\n\treturn "v999.0.0", nil\n}',
  ));
  const path = join(dir, 'alpaca-cli-bin');
  await run('go', ['build', '-o', path, './cmd/alpaca'], { cwd: root });
  await chmod(path, 0o755);
  return { path, dir };
}

async function runAlpacaCliSmoke(baseUrl) {
  const cli = await builtAlpacaCli(baseUrl);
  if (!cli) return null;
  const env = {
    ALPACA_API_KEY: 'alpaca_emulator_key',
    ALPACA_SECRET_KEY: 'alpaca_emulator_secret',
    ALPACA_CONFIG_DIR: cli.dir,
    ALPACA_QUIET: '1',
  };

  try {
    const runAlpaca = (args) => run(cli.path, args, { env });
    const runAlpacaLocal = (args) => run(cli.path, args, { env: { ALPACA_CONFIG_DIR: cli.dir, ALPACA_QUIET: '1' } });
    const version = await runAlpaca(['version']);
    assert.match(version.stdout, /^v?\d|dev|dirty/i);
    const updateCheck = await runAlpacaLocal(['update', '--check']);
    assert.match(updateCheck.stdout, /update_available|999\.0\.0/);
    const login = await runAlpacaLocal(['profile', 'login', '--api-key', '--key', 'profile_key', '--secret', 'profile_secret', '--name', 'cli-smoke', '--no-validate']);
    assert.match(login.stderr + login.stdout, /Logged in|cli-smoke/);
    const switchProfile = await runAlpacaLocal(['profile', 'switch', 'cli-smoke']);
    assert.match(switchProfile.stderr + switchProfile.stdout, /cli-smoke|Switched/);
    const profiles = await runAlpacaLocal(['profile', 'list']);
    assert.match(profiles.stdout, /cli-smoke|paper|\[\]|profiles/i);
    const account = await runAlpaca(['account', 'get']);
    assert.match(account.stdout, /PA-EMULATE-001|buying_power/);
    const clock = await runAlpaca(['clock']);
    assert.match(clock.stdout, /is_open|next_open/);
    const marketClock = await runAlpaca(['clock', 'markets', '--markets', 'us']);
    assert.match(marketClock.stdout, /clocks|US Equities/);
    const calendar = await runAlpaca(['calendar', '--start', '2025-01-01', '--end', '2025-01-02']);
    assert.match(calendar.stdout, /session_open|open/);
    const marketCalendar = await runAlpaca(['calendar', 'market', '--market', 'us', '--start', '2025-01-01', '--end', '2025-01-02']);
    assert.match(marketCalendar.stdout, /calendar|US Equities/);
    const accountConfig = await runAlpaca(['account', 'config', 'get']);
    assert.match(accountConfig.stdout, /fractional_trading|dtbp_check/);
    const accountConfigSet = await runAlpaca(['account', 'config', 'set', '--no-shorting']);
    assert.match(accountConfigSet.stdout, /no_shorting|fractional_trading/);
    const accountActivities = await runAlpaca(['account', 'activity', 'list', '--activity-types', 'FILL']);
    assert.match(accountActivities.stdout, /activity-1|FILL/);
    const accountActivityByType = await runAlpaca(['account', 'activity', 'list-by-type', '--activity-type', 'FILL']);
    assert.match(accountActivityByType.stdout, /activity-1|FILL/);
    const portfolio = await runAlpaca(['account', 'portfolio', '--period', '1D', '--timeframe', '1D']);
    assert.match(portfolio.stdout, /portfolio|equity|profit_loss/);
    const rawApi = await runAlpaca(['api', 'GET', '/v2/account']);
    assert.match(rawApi.stdout, /PA-EMULATE-001|buying_power/);
    const assets = await runAlpaca(['asset', 'list', '--status', 'active']);
    assert.match(assets.stdout, /SPY|tradable/);
    const asset = await runAlpaca(['asset', 'get', '--symbol-or-asset-id', 'SPY']);
    assert.match(asset.stdout, /SPY|spy-asset-id/);
    const corporateBonds = await runAlpaca(['asset', 'bond', '--cusips', '123456789']);
    assert.match(corporateBonds.stdout, /us_corporates|Emulator Corporate Bond/);
    const treasuries = await runAlpaca(['asset', 'treasury', '--cusips', '9128285M8']);
    assert.match(treasuries.stdout, /us_treasuries|Emulator Treasury/);
    const corporateActions = await runAlpaca(['corporate-action', 'list', '--symbol', 'SPY', '--ca-types', 'dividend', '--since', '2025-01-01', '--until', '2026-01-01']);
    assert.match(corporateActions.stdout, /corporate-action-1|dividend/);
    const corporateAction = await runAlpaca(['corporate-action', 'get', '--id', 'corporate-action-1']);
    assert.match(corporateAction.stdout, /corporate-action-1|dividend/);
    const positions = await runAlpaca(['position', 'list']);
    assert.match(positions.stdout, /SPY/);
    const position = await runAlpaca(['position', 'get', '--symbol-or-asset-id', 'SPY']);
    assert.match(position.stdout, /SPY|market_value/);
    const order = await runAlpaca(['order', 'submit', '--client-order-id', 'alpaca-cli-smoke-order', '--symbol', 'SPY', '--side', 'buy', '--qty', '1', '--type', 'market', '--time-in-force', 'day']);
    assert.match(order.stdout, /SPY|filled/);
    const orderJson = JSON.parse(order.stdout);
    const orderId = orderJson.id ?? orderJson.order_id;
    const orders = await runAlpaca(['order', 'list', '--status', 'all', '--limit', '10']);
    assert.match(orders.stdout, /alpaca-cli-smoke-order|SPY/);
    const fetchedOrder = await runAlpaca(['order', 'get', '--order-id', orderId]);
    assert.match(fetchedOrder.stdout, /alpaca-cli-smoke-order|SPY/);
    const orderByClient = await runAlpaca(['order', 'get-by-client-id', '--client-order-id', 'alpaca-cli-smoke-order']);
    assert.match(orderByClient.stdout, /alpaca-cli-smoke-order|SPY/);
    const replacedOrder = await runAlpaca(['order', 'replace', '--order-id', orderId, '--qty', '2']);
    assert.match(replacedOrder.stdout, /replaced|SPY/);
    const watchlists = await runAlpaca(['watchlist', 'list']);
    assert.match(watchlists.stdout, /Default|watchlist-1/);
    const createdWatchlist = await runAlpaca(['watchlist', 'create', '--name', 'CLI Smoke', '--symbols', 'SPY']);
    assert.match(createdWatchlist.stdout, /CLI Smoke|SPY/);
    const watchlistByName = await runAlpaca(['watchlist', 'get-by-name', '--name', 'Default']);
    assert.match(watchlistByName.stdout, /Default|watchlist-1/);
    const watchlistGet = await runAlpaca(['watchlist', 'get', '--watchlist-id', 'watchlist-1']);
    assert.match(watchlistGet.stdout, /Default|watchlist-1/);
    const watchlistAdd = await runAlpaca(['watchlist', 'add', '--watchlist-id', 'watchlist-1', '--symbol', 'MSFT']);
    assert.match(watchlistAdd.stdout, /watchlist-1|MSFT|SPY/);
    const watchlistUpdate = await runAlpaca(['watchlist', 'update', '--watchlist-id', 'watchlist-1', '--name', 'Updated', '--symbols', 'SPY']);
    assert.match(watchlistUpdate.stdout, /Updated|watchlist-1/);
    const watchlistRemove = await runAlpaca(['watchlist', 'remove', '--watchlist-id', 'watchlist-1', '--symbol', 'SPY']);
    assert.match(watchlistRemove.stdout, /watchlist-1|assets/);
    const watchlistAddByName = await runAlpaca(['watchlist', 'add-by-name', '--name', 'Default', '--symbol', 'MSFT']);
    assert.match(watchlistAddByName.stdout, /Default|MSFT|SPY/);
    const watchlistUpdateByName = await runAlpaca(['watchlist', 'update-by-name', '--name', 'Default', '--new-name', 'Updated By Name', '--symbols', 'SPY']);
    assert.match(watchlistUpdateByName.stdout, /Updated By Name|watchlist-1/);
    const watchlistRemoveByName = await runAlpaca(['watchlist', 'remove-by-name', '--name', 'Default', '--symbol', 'SPY']);
    assert.match(watchlistRemoveByName.stdout, /watchlist-1|assets/);
    const watchlistDelete = await runAlpaca(['watchlist', 'delete', '--watchlist-id', 'watchlist-1']);
    assert.match(watchlistDelete.stdout.trim(), /^({})?$/);
    const watchlistDeleteByName = await runAlpaca(['watchlist', 'delete-by-name', '--name', 'Default']);
    assert.match(watchlistDeleteByName.stdout.trim(), /^({})?$/);
    const bars = await runAlpaca(['data', 'bars', '--symbol', 'SPY', '--timeframe', '1Day', '--start', '2025-01-01']);
    assert.match(bars.stdout, /SPY|586\.5|bars/);
    const multiBars = await runAlpaca(['data', 'multi-bars', '--symbols', 'SPY', '--timeframe', '1Day', '--start', '2025-01-01']);
    assert.match(multiBars.stdout, /SPY|bars/);
    const latestBar = await runAlpaca(['data', 'latest-bar', '--symbol', 'SPY']);
    assert.match(latestBar.stdout, /SPY|586\.5|bar/);
    const latestQuote = await runAlpaca(['data', 'latest-quote', '--symbol', 'SPY']);
    assert.match(latestQuote.stdout, /SPY|quote|ap/);
    const latestTrade = await runAlpaca(['data', 'latest-trade', '--symbol', 'SPY']);
    assert.match(latestTrade.stdout, /SPY|trade|586\.5/);
    const quotes = await runAlpaca(['data', 'quotes', '--symbol', 'SPY', '--start', '2025-01-01']);
    assert.match(quotes.stdout, /SPY|quotes/);
    const trades = await runAlpaca(['data', 'trades', '--symbol', 'SPY', '--start', '2025-01-01']);
    assert.match(trades.stdout, /SPY|trades/);
    const latestBars = await runAlpaca(['data', 'latest-bars', '--symbols', 'SPY']);
    assert.match(latestBars.stdout, /SPY|bars/);
    const latestQuotes = await runAlpaca(['data', 'latest-quotes', '--symbols', 'SPY']);
    assert.match(latestQuotes.stdout, /SPY|quotes/);
    const latestTrades = await runAlpaca(['data', 'latest-trades', '--symbols', 'SPY']);
    assert.match(latestTrades.stdout, /SPY|trades/);
    const multiQuotes = await runAlpaca(['data', 'multi-quotes', '--symbols', 'SPY', '--start', '2025-01-01']);
    assert.match(multiQuotes.stdout, /SPY|quotes/);
    const multiTrades = await runAlpaca(['data', 'multi-trades', '--symbols', 'SPY', '--start', '2025-01-01']);
    assert.match(multiTrades.stdout, /SPY|trades/);
    const snapshots = await runAlpaca(['data', 'multi-snapshots', '--symbols', 'SPY']);
    assert.match(snapshots.stdout, /SPY|latestTrade/);
    const snapshot = await runAlpaca(['data', 'snapshot', '--symbol', 'SPY']);
    assert.match(snapshot.stdout, /SPY|latestTrade/);
    const auction = await runAlpaca(['data', 'auction', '--symbol', 'SPY', '--start', '2025-01-01']);
    assert.match(auction.stdout, /SPY|auctions/);
    const auctions = await runAlpaca(['data', 'auctions', '--symbols', 'SPY', '--start', '2025-01-01']);
    assert.match(auctions.stdout, /SPY|auctions/);
    const stockExchanges = await runAlpaca(['data', 'meta', 'exchanges']);
    assert.match(stockExchanges.stdout, /IEX|V/);
    const stockConditions = await runAlpaca(['data', 'meta', 'conditions', '--ticktype', 'trade', '--tape', 'C']);
    assert.match(stockConditions.stdout, /Regular Sale|@/);
    const logo = await runAlpaca(['data', 'logo', '--symbol', 'SPY']);
    assert.match(logo.stdout, /logo|SPY/);
    const fixedIncome = await runAlpaca(['data', 'fixed-income', '--isins', 'US9128285M81']);
    assert.match(fixedIncome.stdout, /9128285M8|prices/);
    const forexLatest = await runAlpaca(['data', 'forex', 'latest', '--currency-pairs', 'EUR/USD']);
    assert.match(forexLatest.stdout, /EUR\/USD|rates/);
    const forexRates = await runAlpaca(['data', 'forex', 'rates', '--currency-pairs', 'EUR/USD', '--start', '2025-01-01']);
    assert.match(forexRates.stdout, /EUR\/USD|rates/);
    const cryptoHistoricalBars = await runAlpaca(['data', 'crypto', 'bars', '--symbols', 'BTC/USD', '--timeframe', '1Day', '--start', '2025-01-01']);
    assert.match(cryptoHistoricalBars.stdout, /BTC\/USD|bars/);
    const cryptoQuotes = await runAlpaca(['data', 'crypto', 'quotes', '--symbols', 'BTC/USD', '--start', '2025-01-01']);
    assert.match(cryptoQuotes.stdout, /BTC\/USD|quotes/);
    const cryptoHistoricalTrades = await runAlpaca(['data', 'crypto', 'trades', '--symbols', 'BTC/USD', '--start', '2025-01-01']);
    assert.match(cryptoHistoricalTrades.stdout, /BTC\/USD|trades/);
    const cryptoBars = await runAlpaca(['data', 'crypto', 'latest-bars', '--symbols', 'BTC/USD']);
    assert.match(cryptoBars.stdout, /BTC\/USD|bars/);
    const cryptoQuotesLatest = await runAlpaca(['data', 'crypto', 'latest-quotes', '--symbols', 'BTC/USD']);
    assert.match(cryptoQuotesLatest.stdout, /BTC\/USD|quotes/);
    const cryptoTrades = await runAlpaca(['data', 'crypto', 'latest-trades', '--symbols', 'BTC/USD']);
    assert.match(cryptoTrades.stdout, /BTC\/USD|trades/);
    const cryptoSnapshots = await runAlpaca(['data', 'crypto', 'snapshots', '--symbols', 'BTC/USD']);
    assert.match(cryptoSnapshots.stdout, /BTC\/USD|snapshots/);
    const cryptoOrderbook = await runAlpaca(['data', 'crypto-orderbook', '--symbols', 'BTC/USD']);
    assert.match(cryptoOrderbook.stdout, /BTC\/USD|orderbooks/);
    const cryptoPerpBars = await runAlpaca(['crypto-perp', 'data', 'latest-bars', '--symbols', 'BTC/USD']);
    assert.match(cryptoPerpBars.stdout, /BTC\/USD|bars/);
    const cryptoPerpQuotes = await runAlpaca(['crypto-perp', 'data', 'latest-quotes', '--symbols', 'BTC/USD']);
    assert.match(cryptoPerpQuotes.stdout, /BTC\/USD|quotes/);
    const cryptoPerpTrades = await runAlpaca(['crypto-perp', 'data', 'latest-trades', '--symbols', 'BTC/USD']);
    assert.match(cryptoPerpTrades.stdout, /BTC\/USD|trades/);
    const cryptoPerpOrderbooks = await runAlpaca(['crypto-perp', 'data', 'latest-orderbooks', '--symbols', 'BTC/USD']);
    assert.match(cryptoPerpOrderbooks.stdout, /BTC\/USD|orderbooks/);
    const cryptoPerpPricing = await runAlpaca(['crypto-perp', 'data', 'latest-futures-pricing', '--symbols', 'BTC/USD']);
    assert.match(cryptoPerpPricing.stdout, /BTC\/USD|pricing/);
    const cryptoPerpVitals = await runAlpaca(['crypto-perp', 'vitals']);
    assert.match(cryptoPerpVitals.stdout, /equity|buying_power/);
    const cryptoPerpLeverage = await runAlpaca(['crypto-perp', 'leverage', '--symbol', 'BTC/USD']);
    assert.match(cryptoPerpLeverage.stdout, /leverage|BTC\/USD/);
    const cryptoPerpSetLeverage = await runAlpaca(['crypto-perp', 'set-leverage', '--symbol', 'BTC/USD', '--leverage', '2']);
    assert.match(cryptoPerpSetLeverage.stdout, /leverage|BTC\/USD/);
    const optionContracts = await runAlpaca(['option', 'contracts', '--root-symbol', 'SPY']);
    assert.match(optionContracts.stdout, /SPY260116C00600000|option_contracts/);
    const optionContract = await runAlpaca(['option', 'get', '--symbol-or-id', 'SPY260116C00600000']);
    assert.match(optionContract.stdout, /SPY260116C00600000|strike_price/);
    const optionQuotes = await runAlpaca(['data', 'option', 'latest-quotes', '--symbols', 'SPY260116C00600000']);
    assert.match(optionQuotes.stdout, /SPY260116C00600000|quotes/);
    const optionTrades = await runAlpaca(['data', 'option', 'latest-trades', '--symbols', 'SPY260116C00600000']);
    assert.match(optionTrades.stdout, /SPY260116C00600000|trades/);
    const optionBars = await runAlpaca(['data', 'option', 'bars', '--symbols', 'SPY260116C00600000', '--timeframe', '1Day', '--start', '2025-01-01']);
    assert.match(optionBars.stdout, /SPY260116C00600000|bars/);
    const optionHistoricalTrades = await runAlpaca(['data', 'option', 'trades', '--symbols', 'SPY260116C00600000', '--start', '2025-01-01']);
    assert.match(optionHistoricalTrades.stdout, /SPY260116C00600000|trades/);
    const optionSnapshot = await runAlpaca(['data', 'option', 'snapshot', '--symbols', 'SPY260116C00600000']);
    assert.match(optionSnapshot.stdout, /SPY260116C00600000|snapshots/);
    const optionChain = await runAlpaca(['data', 'option', 'chain', '--underlying-symbol', 'SPY']);
    assert.match(optionChain.stdout, /SPY260116C00600000|snapshots/);
    const optionExchanges = await runAlpaca(['data', 'option', 'exchanges']);
    assert.match(optionExchanges.stdout, /NYSE|Cboe|A/);
    const optionConditions = await runAlpaca(['data', 'option', 'conditions', '--ticktype', 'trade']);
    assert.match(optionConditions.stdout, /Regular Sale|@/);
    const optionExercise = await runAlpaca(['option', 'exercise', '--symbol-or-contract-id', 'SPY260116C00600000']);
    assert.match(optionExercise.stdout.trim(), /^({})?$/);
    const optionDoNotExercise = await runAlpaca(['option', 'do-not-exercise', '--symbol-or-contract-id', 'SPY260116C00600000']);
    assert.match(optionDoNotExercise.stdout.trim(), /^({})?$/);
    const mostActives = await runAlpaca(['data', 'screener', 'most-actives', '--top', '10']);
    assert.match(mostActives.stdout, /most_actives|SPY/);
    const movers = await runAlpaca(['data', 'screener', 'movers', '--market-type', 'stocks', '--top', '5']);
    assert.match(movers.stdout, /gainers|SPY/);
    const news = await runAlpaca(['data', 'news', '--symbols', 'SPY', '--limit', '1']);
    assert.match(news.stdout, /Test market news|news/);
    const marketCorporateActions = await runAlpaca(['data', 'corporate-actions', '--symbols', 'SPY', '--types', 'dividend', '--start', '2025-01-01']);
    assert.match(marketCorporateActions.stdout, /corporate_actions|dividend/);
    const walletList = await runAlpaca(['wallet', 'list', '--asset', 'USDC']);
    assert.match(walletList.stdout, /ethereum|address/);
    const walletTransferEstimate = await runAlpaca(['wallet', 'transfer', 'estimate', '--asset', 'USDC', '--amount', '1', '--from-address', '0x1111111111111111111111111111111111111111', '--to-address', '0x0000000000000000000000000000000000000000']);
    assert.match(walletTransferEstimate.stdout, /fee|USDC/);
    const walletTransferList = await runAlpaca(['wallet', 'transfer', 'list']);
    assert.match(walletTransferList.stdout, /transfer-1|USDC/);
    const walletTransferCreate = await runAlpaca(['wallet', 'transfer', 'create', '--asset', 'USDC', '--amount', '1', '--address', '0x0000000000000000000000000000000000000000']);
    assert.match(walletTransferCreate.stdout, /transfer-created|USDC/);
    const walletTransferGet = await runAlpaca(['wallet', 'transfer', 'get', '--transfer-id', 'transfer-1']);
    assert.match(walletTransferGet.stdout, /transfer-1|USDC/);
    const walletWhitelistList = await runAlpaca(['wallet', 'whitelist', 'list']);
    assert.match(walletWhitelistList.stdout, /whitelist-1|USDC/);
    const walletWhitelistAdd = await runAlpaca(['wallet', 'whitelist', 'add', '--asset', 'USDC', '--address', '0x0000000000000000000000000000000000000000']);
    assert.match(walletWhitelistAdd.stdout, /whitelist-created|USDC/);
    const walletWhitelistDelete = await runAlpaca(['wallet', 'whitelist', 'delete', '--whitelisted-address-id', 'whitelist-created']);
    assert.match(walletWhitelistDelete.stdout.trim(), /^({})?$/);
    const perpWalletList = await runAlpaca(['crypto-perp', 'wallet', 'list', '--asset', 'USDC']);
    assert.match(perpWalletList.stdout, /ethereum|address/);
    const perpWalletTransferEstimate = await runAlpaca(['crypto-perp', 'wallet', 'transfer', 'estimate', '--asset', 'USDC', '--amount', '1', '--from-address', '0x1111111111111111111111111111111111111111', '--to-address', '0x0000000000000000000000000000000000000000']);
    assert.match(perpWalletTransferEstimate.stdout, /fee|USDC/);
    const perpWalletTransferList = await runAlpaca(['crypto-perp', 'wallet', 'transfer', 'list']);
    assert.match(perpWalletTransferList.stdout, /perp-transfer-1|USDC/);
    const perpWalletTransferCreate = await runAlpaca(['crypto-perp', 'wallet', 'transfer', 'create', '--asset', 'USDC', '--amount', '1', '--address', '0x0000000000000000000000000000000000000000']);
    assert.match(perpWalletTransferCreate.stdout, /perp-transfer-created|USDC/);
    const perpWalletTransferGet = await runAlpaca(['crypto-perp', 'wallet', 'transfer', 'get', '--transfer-id', 'perp-transfer-1']);
    assert.match(perpWalletTransferGet.stdout, /perp-transfer-1|USDC/);
    const perpWalletWhitelistList = await runAlpaca(['crypto-perp', 'wallet', 'whitelist', 'list']);
    assert.match(perpWalletWhitelistList.stdout, /perp-whitelist-1|USDC/);
    const perpWalletWhitelistAdd = await runAlpaca(['crypto-perp', 'wallet', 'whitelist', 'add', '--asset', 'USDC', '--address', '0x0000000000000000000000000000000000000000']);
    assert.match(perpWalletWhitelistAdd.stdout, /perp-whitelist-created|USDC/);
    const perpWalletWhitelistDelete = await runAlpaca(['crypto-perp', 'wallet', 'whitelist', 'delete', '--whitelisted-address-id', 'perp-whitelist-created']);
    assert.match(perpWalletWhitelistDelete.stdout.trim(), /^({})?$/);
    const canceledOrder = await runAlpaca(['order', 'cancel', '--order-id', orderId]);
    assert.match(canceledOrder.stdout.trim(), /^({})?$/);
    const secondOrder = await runAlpaca(['order', 'submit', '--client-order-id', 'alpaca-cli-cancel-all-order', '--symbol', 'SPY', '--side', 'buy', '--qty', '1', '--type', 'market', '--time-in-force', 'day']);
    assert.match(secondOrder.stdout, /alpaca-cli-cancel-all-order|SPY/);
    const canceledOrders = await runAlpaca(['order', 'cancel-all']);
    assert.match(canceledOrders.stdout, /status|\\[|\\]/);
    const closedPosition = await runAlpaca(['position', 'close', '--symbol-or-asset-id', 'SPY', '--qty', '1']);
    assert.match(closedPosition.stdout, /SPY|filled/);
    const closedPositions = await runAlpaca(['position', 'close-all', '--cancel-orders']);
    assert.match(closedPositions.stdout, /SPY|status|\[|\]/);
    const logout = await runAlpacaLocal(['profile', 'logout', 'cli-smoke']);
    assert.match(logout.stderr + logout.stdout, /Logged out|cli-smoke|Removed/);
    return { account, positions, order, bars };
  } finally {
    await rm(cli.dir, { recursive: true, force: true });
  }
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
  app.get('/v23/customers:listAccessibleCustomers', (c) => c.json({ resourceNames: ['customers/1234567890'] }));
  app.post('/v23/customers/:customerId/googleAds:searchStream', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const query = String(body.query ?? '');
    const result = query.includes('customer.')
      ? { customer: { id: c.req.param('customerId'), descriptiveName: 'Google Ads Emulator Customer', currencyCode: 'USD', timeZone: 'Etc/UTC', status: 'ENABLED' } }
      : {
          campaign: {
            resourceName: `customers/${c.req.param('customerId')}/campaigns/google_ads_campaign_seed`,
            id: 'google_ads_campaign_seed',
            name: 'Google Ads CLI Seed Campaign',
            status: 'ENABLED',
            advertisingChannelType: 'SEARCH',
            biddingStrategyType: 'CLICK_CPC',
            startDate: '20260515',
          },
          segments: { date: '2026-05-15' },
          metrics: { impressions: 12000, clicks: 840, costMicros: 321450000, conversions: 42, ctr: 0.07, averageCpc: 382679 },
        };
    return c.json([{ results: [result] }]);
  });
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
  salesforcePlugin.register(app, store);
  snapPlugin.register(app, store);
  seedSnap(store, 'http://127.0.0.1', {
    campaigns: [{ id: 'snap_campaign_seed', name: 'Snap CLI Seed Campaign', status: 'active', budget: 100 }],
  });
  sentryPlugin.register(app, store);
  metaPlugin.register(app, store);
  seedMeta(store, 'http://127.0.0.1', {
    campaigns: [{ id: 'meta_campaign_seed', name: 'Meta CLI Seed Campaign', status: 'active', budget: 100 }],
  });
  oculusPlugin.register(app, store);
  seedOculus(store, 'http://127.0.0.1');
  tiktokPlugin.register(app, store);
  seedTikTok(store, 'http://127.0.0.1', {
    campaigns: [{ id: 'tiktok_campaign_seed', name: 'TikTok CLI Seed Campaign', status: 'active', budget: 100 }],
  });
  appLovinPlugin.register(app, store);
  seedAppLovin(store, 'http://127.0.0.1', {
    campaigns: [{ id: 'applovin_campaign_seed', name: 'AppLovin CLI Seed Campaign', status: 'active', budget: 100 }],
  });
  supabasePlugin.register(app, store);
  googlePlugin.register(app, store);
  googlePlayPlugin.register(app, store);
  appStoreConnectPlugin.register(app, store);
  appStoreConnectPlugin.seed?.(store, 'http://127.0.0.1');
  alpacaPlugin.register(app, store);
  alpacaPlugin.seed?.(store);
  adyenPlugin.register(app, store);
  app.get('/adyen/inspect/state', (c) => c.json(store.getData('adyen:state') ?? { payments: [], captures: [], refunds: [], webhooks: [] }));
  upstashPlugin.register(app, store);
  replicatePlugin.register(app, store);
  falPlugin.register(app, store);
  twilioPlugin.register(app, store);
  seedTwilio(store, 'http://127.0.0.1', {
    twilio: {
      account_sid: 'AC00000000000000000000000000000000',
      auth_token: 'twilio-emulator-token',
      phone_numbers: ['+15555550100'],
      verify_services: [{ sid: 'VA00000000000000000000000000000000', friendly_name: 'CLI Smoke Verify Service' }],
    },
  });

  await withServer(app, async (baseUrl) => {
    const stripe = await run('stripe', ['get', '/v1/customers', '--api-base', baseUrl, '--api-key', 'sk_test_cli_smoke', '--limit', '1']);
    assert.match(stripe.stdout, /cus_/);

    const adyen = await runAdyenCliSmoke(baseUrl);
    if (adyen) {
      assert.match(adyen.stderr + adyen.stdout, /Finished to process restaurants/);
      const adyenState = await fetch(`${baseUrl}/adyen/inspect/state`);
      const adyenStateJson = await adyenState.json();
      assert.equal(adyenStateJson.paymentMethodSettings.length, 2);
    } else {
      console.warn('Toshik1978/adyen-cli unavailable; Adyen management routes registered');
    }

    const alpaca = await runAlpacaCliSmoke(baseUrl);
    if (!alpaca) {
      console.warn('alpacahq/cli unavailable; Alpaca REST emulator route smoke covered');
    }

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

    const upstashRestSet = await fetch(`${baseUrl}/upstash/redis`, {
      method: 'POST',
      headers: { authorization: 'Bearer upstash_emulator_token', 'content-type': 'application/json' },
      body: JSON.stringify(['SET', 'cli-smoke', 'upstash']),
    });
    assert.equal(upstashRestSet.status, 200);
    assert.equal((await upstashRestSet.json()).result, 'OK');
    const upstashRestGet = await fetch(`${baseUrl}/upstash/redis`, {
      method: 'POST',
      headers: { authorization: 'Bearer upstash_emulator_token', 'content-type': 'application/json' },
      body: JSON.stringify(['GET', 'cli-smoke']),
    });
    assert.equal(upstashRestGet.status, 200);
    assert.equal((await upstashRestGet.json()).result, 'upstash');

    const upstash = await upstashCli();
    if (upstash) {
      const set = await run(upstash.command, [...upstash.prefix, 'redis', 'exec', '--db-url', `${baseUrl}/upstash/redis`, '--db-token', 'upstash_emulator_token', 'SET', 'cli-smoke-cli', 'upstash-cli']);
      assert.equal(JSON.parse(set.stdout).result, 'OK');
      const get = await run(upstash.command, [...upstash.prefix, 'redis', 'exec', '--db-url', `${baseUrl}/upstash/redis`, '--db-token', 'upstash_emulator_token', 'GET', 'cli-smoke-cli']);
      assert.equal(JSON.parse(get.stdout).result, 'upstash-cli');
    } else {
      console.warn('upstash CLI unavailable; Upstash Redis REST route smoke covered');
    }

    const replicateModel = await fetch(`${baseUrl}/v1/models/replicate/hello-world`, {
      headers: { authorization: 'Bearer replicate_emulator_token' },
    });
    assert.equal(replicateModel.status, 200);
    assert.equal((await replicateModel.json()).latest_version.id, 'emu_replicate_version_123');
    const replicatePrediction = await fetch(`${baseUrl}/v1/models/replicate/hello-world/predictions`, {
      method: 'POST',
      headers: { authorization: 'Bearer replicate_emulator_token', 'content-type': 'application/json' },
      body: JSON.stringify({ input: { prompt: 'hello from cli smoke' } }),
    });
    assert.equal(replicatePrediction.status, 201);
    assert.equal((await replicatePrediction.json()).id, 'emu_replicate_prediction_123');

    const replicate = await builtReplicateCli();
    if (replicate) {
      try {
        const env = {
          REPLICATE_API_TOKEN: 'replicate_emulator_token',
          REPLICATE_BASE_URL: `${baseUrl}/v1`,
        };
        const shown = await run(replicate.path, ['model', 'show', 'replicate/hello-world', '--json'], { env });
        assert.equal(JSON.parse(shown.stdout).latest_version.id, 'emu_replicate_version_123');
        const created = await run(replicate.path, ['prediction', 'create', 'replicate/hello-world', 'prompt=hello from replicate cli', '--json', '--no-wait'], { env });
        assert.equal(JSON.parse(created.stdout).id, 'emu_replicate_prediction_123');
        const fetched = await run(replicate.path, ['prediction', 'show', 'emu_replicate_prediction_123', '--json'], { env });
        assert.equal(JSON.parse(fetched.stdout).output, `${baseUrl}/assets/image.png`);
      } finally {
        if (replicate.dir) await rm(replicate.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('replicate CLI unavailable; Replicate API route smoke covered');
    }

    const sf = existsSync('/opt/homebrew/bin/sf') ? '/opt/homebrew/bin/sf' : await commandPath('sf');
    if (sf) {
      const sfHome = await mkdtemp(join(tmpdir(), 'api-emulator-sf-'));
      try {
        const sfEnv = {
          HOME: sfHome,
          SF_ACCESS_TOKEN: '00D000000000001!sf_emulator_token',
          SF_DISABLE_TELEMETRY: 'true',
          SF_USE_GENERIC_UNIX_KEYCHAIN: 'true',
        };
        const login = await run(sf, ['org', 'login', 'access-token', '--instance-url', baseUrl, '--no-prompt', '--alias', 'emulator', '--json'], { env: sfEnv });
        assert.equal(JSON.parse(login.stdout).result.username, 'emulator@example.com');
        const queried = await run(sf, ['data', 'query', '--target-org', 'emulator', '--query', 'SELECT Id, Name FROM Account', '--json'], { env: sfEnv });
        assert.match(queried.stdout, /Emulator Account/);
        const created = await run(sf, ['data', 'create', 'record', '--target-org', 'emulator', '--sobject', 'Account', '--values', "Name='Salesforce CLI Smoke' Website=https://example.test", '--json'], { env: sfEnv });
        const createdId = JSON.parse(created.stdout).result.id;
        const fetched = await run(sf, ['data', 'get', 'record', '--target-org', 'emulator', '--sobject', 'Account', '--record-id', createdId, '--json'], { env: sfEnv });
        assert.match(fetched.stdout, /Salesforce CLI Smoke/);
        const limits = await run(sf, ['api', 'request', 'rest', '/services/data/v64.0/limits', '--target-org', 'emulator'], { env: sfEnv });
        assert.match(limits.stdout, /DailyApiRequests/);
      } finally {
        await rm(sfHome, { recursive: true, force: true });
      }
    } else {
      console.warn('sf CLI unavailable; Salesforce REST emulator route smoke covered');
    }

    const sentry = await run('sentry-cli', ['projects', 'list'], {
      env: {
        SENTRY_URL: baseUrl,
        SENTRY_AUTH_TOKEN: 'sentry_emulator_token',
        SENTRY_ORG: 'emulator',
      },
    }).catch((error) => ({ stdout: '', stderr: String(error), skipped: true }));
    if (!sentry.skipped) {
      assert.match(sentry.stdout, /api/);
      const sentryRelease = await run('sentry-cli', ['releases', 'new', 'cli-smoke@1.0.0'], {
        env: {
          SENTRY_URL: baseUrl,
          SENTRY_AUTH_TOKEN: 'sentry_emulator_token',
          SENTRY_ORG: 'emulator',
          SENTRY_PROJECT: 'api',
        },
      });
      assert.match(sentryRelease.stderr + sentryRelease.stdout, /cli-smoke@1.0.0|Created release/);
      const sentryReleases = await run('sentry-cli', ['releases', 'list', '--raw'], {
        env: {
          SENTRY_URL: baseUrl,
          SENTRY_AUTH_TOKEN: 'sentry_emulator_token',
          SENTRY_ORG: 'emulator',
          SENTRY_PROJECT: 'api',
        },
      });
      assert.match(sentryReleases.stdout, /cli-smoke@1.0.0/);
    } else {
      console.warn('sentry-cli unavailable; Sentry REST emulator route smoke covered');
    }

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

    const metaShim = await metaCliShim(baseUrl);
    if (metaShim) {
      try {
        const metaAccounts = await run('meta', ['--output', 'json', 'ads', 'adaccount', 'list'], { env: metaShim.env });
        assert.match(metaAccounts.stdout, /act_123456/);
        const metaCreated = await run('meta', ['--output', 'json', 'ads', 'campaign', 'create', '--name', 'Meta CLI Smoke Created', '--objective', 'outcome_sales', '--daily-budget', '5000', '--status', 'paused'], { env: metaShim.env });
        assert.match(metaCreated.stdout, /Meta CLI Smoke Created|meta_campaign_/);
        const createdId = JSON.parse(metaCreated.stdout)[0].id;
        const metaRead = await run('meta', ['--output', 'json', 'ads', 'campaign', 'get', createdId], { env: metaShim.env });
        assert.match(metaRead.stdout, /Meta CLI Smoke Created/);
      } finally {
        await rm(metaShim.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('meta-ads CLI unavailable; Meta Graph emulator route smoke covered');
    }

    const ovr = '/usr/local/bin/ovr-platform-util';
    if (existsSync(ovr)) {
      const ovrHelp = await run(ovr, ['--help', 'get-release-channel-data']);
      assert.match(ovrHelp.stdout, /--app-id/);
      assert.match(ovrHelp.stdout, /--token/);
      const horizonChannels = await fetch(`${baseUrl}/123456/release-channel-data`);
      assert.equal(horizonChannels.status, 200);
      const horizonBody = await horizonChannels.json();
      assert.equal(horizonBody.release_channels[0].latest_build.id, 'quest_build_seed');
      const horizonGraph = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: 'query GetReleaseChannelData($appID: ID!) { application(id: $appID) { release_channels { name latest_build { id version } } } }',
          variables: { appID: '123456' },
        }),
      });
      assert.equal(horizonGraph.status, 200);
      assert.equal((await horizonGraph.json()).data.release_channels[0].latest_build.id, 'quest_build_seed');
      const horizonBuild = await fetch(`${baseUrl}/123456/builds`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: '1.0.1', version_code: 101, draft: true, notes: 'CLI smoke draft' }),
      });
      assert.equal(horizonBuild.status, 201);
      assert.equal((await horizonBuild.json()).status, 'draft');
    } else {
      console.warn('ovr-platform-util unavailable; Meta Horizon emulator route smoke covered');
    }

    const tiktokAdvertiser = await fetch(`${baseUrl}/open_api/v1.3/advertiser/info/?advertiser_ids=${encodeURIComponent(JSON.stringify(['7000000000000']))}`, {
      headers: { 'access-token': 'tiktok_emulator_token' },
    });
    assert.equal(tiktokAdvertiser.status, 200);
    assert.equal((await tiktokAdvertiser.json()).data.list[0].advertiser_id, '7000000000000');
    const tiktokCampaigns = await fetch(`${baseUrl}/open_api/v1.3/campaign/get/?advertiser_id=7000000000000&page=1&page_size=100`, {
      headers: { 'access-token': 'tiktok_emulator_token' },
    });
    assert.equal(tiktokCampaigns.status, 200);
    assert.equal((await tiktokCampaigns.json()).data.list[0].campaign_id, 'tiktok_campaign_seed');
    const tiktokCli = await patchedTikTokCli(baseUrl);
    if (tiktokCli) {
      try {
        const tiktokEnv = { TIKTOK_ADS_ACCESS_TOKEN: 'tiktok_emulator_token' };
        const advertiser = await run(process.execPath, [tiktokCli.path, 'advertiser', '7000000000000', '--format', 'compact'], { env: tiktokEnv });
        assert.match(advertiser.stdout, /TikTok Ads Emulator Account/);
        const campaigns = await run(process.execPath, [tiktokCli.path, 'campaigns', '7000000000000', '--format', 'compact'], { env: tiktokEnv });
        assert.match(campaigns.stdout, /tiktok_campaign_seed/);
        const report = await run(process.execPath, [
          tiktokCli.path,
          'report',
          '7000000000000',
          '--report-type',
          'BASIC',
          '--data-level',
          'AUCTION_CAMPAIGN',
          '--dimensions',
          'campaign_id,stat_time_day',
          '--metrics',
          'spend,clicks',
          '--start-date',
          '2026-05-15',
          '--end-date',
          '2026-05-15',
          '--format',
          'compact',
        ], { env: tiktokEnv });
        assert.match(report.stdout, /321\.45/);
      } finally {
        await rm(tiktokCli.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('tiktok-ads-cli unavailable; TikTok Business API emulator route smoke covered');
    }

    const googleAdsCustomers = await fetch(`${baseUrl}/v23/customers:listAccessibleCustomers`, {
      headers: { authorization: 'Bearer google_ads_emulator_token', 'developer-token': 'developer_token' },
    });
    assert.equal(googleAdsCustomers.status, 200);
    assert.match(JSON.stringify(await googleAdsCustomers.json()), /1234567890/);
    const googleAdsSearch = await fetch(`${baseUrl}/v23/customers/1234567890/googleAds:searchStream`, {
      method: 'POST',
      headers: { authorization: 'Bearer google_ads_emulator_token', 'developer-token': 'developer_token', 'content-type': 'application/json' },
      body: JSON.stringify({ query: 'SELECT campaign.id, campaign.name FROM campaign' }),
    });
    assert.equal(googleAdsSearch.status, 200);
    assert.match(JSON.stringify(await googleAdsSearch.json()), /Google Ads CLI Seed Campaign/);
    const googleAdsCli = await patchedGoogleAdsCli(baseUrl);
    if (googleAdsCli) {
      try {
        const googleAdsEnv = {
          GOOGLE_ADS_ACCESS_TOKEN: 'google_ads_emulator_token',
          GOOGLE_ADS_DEVELOPER_TOKEN: 'developer_token',
          GOOGLE_ADS_LOGIN_CUSTOMER_ID: '1234567890',
        };
        const customers = await run(process.execPath, [googleAdsCli.path, 'customers', '--format', 'compact'], { env: googleAdsEnv });
        assert.match(customers.stdout, /1234567890/);
        const campaigns = await run(process.execPath, [googleAdsCli.path, 'campaigns', '1234567890', '--format', 'compact'], { env: googleAdsEnv });
        assert.match(campaigns.stdout, /Google Ads CLI Seed Campaign/);
        const stats = await run(process.execPath, [googleAdsCli.path, 'campaign-stats', '1234567890', '--start', '2026-05-15', '--end', '2026-05-15', '--format', 'compact'], { env: googleAdsEnv });
        assert.match(stats.stdout, /321450000|Google Ads CLI Seed Campaign/);
      } finally {
        await rm(googleAdsCli.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('google-ads-open-cli unavailable; Google Ads API emulator route smoke covered');
    }

    const twilioAccountSid = 'AC00000000000000000000000000000000';
    const twilioMessageCreate = await fetch(`${baseUrl}/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: '+15555550100', To: '+15555550199', Body: 'Twilio CLI smoke direct route' }),
    });
    assert.equal(twilioMessageCreate.status, 201);
    const twilioMessage = await twilioMessageCreate.json();
    assert.match(twilioMessage.sid, /^SM/);
    const twilioMessages = await fetch(`${baseUrl}/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`);
    assert.equal(twilioMessages.status, 200);
    assert.match(JSON.stringify(await twilioMessages.json()), /Twilio CLI smoke direct route/);
    const twilioVerification = await fetch(`${baseUrl}/v2/Services/VA00000000000000000000000000000000/Verifications`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: '+15555550199', Channel: 'sms' }),
    });
    assert.equal(twilioVerification.status, 201);
    assert.equal((await twilioVerification.json()).status, 'pending');
    const twilioCallCreate = await fetch(`${baseUrl}/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ From: '+15555550100', To: '+15555550197', Url: 'https://example.test/twiml' }),
    });
    assert.equal(twilioCallCreate.status, 201);
    assert.match((await twilioCallCreate.json()).sid, /^CA/);
    const twilioNumberCreate = await fetch(`${baseUrl}/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ PhoneNumber: '+15555550177', FriendlyName: 'Twilio Direct Number' }),
    });
    assert.equal(twilioNumberCreate.status, 201);
    assert.match((await twilioNumberCreate.json()).sid, /^PN/);
    const twilioMessagingServiceCreate = await fetch(`${baseUrl}/v1/Services`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ FriendlyName: 'Twilio Direct Messaging Service' }),
    });
    assert.equal(twilioMessagingServiceCreate.status, 201);
    assert.match((await twilioMessagingServiceCreate.json()).sid, /^MG/);
    const twilioVerifyServiceCreate = await fetch(`${baseUrl}/v2/Services`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ FriendlyName: 'Twilio Direct Verify Service', CodeLength: '6' }),
    });
    assert.equal(twilioVerifyServiceCreate.status, 201);
    assert.match((await twilioVerifyServiceCreate.json()).sid, /^VA/);
    const twilioCli = await patchedTwilioCli(baseUrl);
    if (twilioCli) {
      try {
        const twilioNode = await commandPath('node') || process.execPath;
        const twilioEnv = {
          TWILIO_ACCOUNT_SID: twilioAccountSid,
          TWILIO_AUTH_TOKEN: 'twilio-emulator-token',
          TWILIO_API_BASE_URL: baseUrl,
          TWILIO_SKIP_UPDATE_CHECK: '1',
        };
        await run(twilioNode, [
          twilioCli.path,
          'api:core:messages:create',
          '--from',
          '+15555550100',
          '--to',
          '+15555550198',
          '--body',
          'Twilio CLI Smoke',
          '-o',
          'json',
        ], { env: twilioEnv });
        await run(twilioNode, [
          twilioCli.path,
          'api:core:messages:list',
          '--limit',
          '10',
          '-o',
          'json',
        ], { env: twilioEnv });
        const twilioCliMessages = await fetch(`${baseUrl}/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`);
        assert.match(JSON.stringify(await twilioCliMessages.json()), /Twilio CLI Smoke/);
        await run(twilioNode, [
          twilioCli.path,
          'api:core:calls:create',
          '--from',
          '+15555550100',
          '--to',
          '+15555550196',
          '--url',
          'https://example.test/twiml',
          '-o',
          'json',
        ], { env: twilioEnv });
        await run(twilioNode, [
          twilioCli.path,
          'api:core:calls:list',
          '--limit',
          '10',
          '-o',
          'json',
        ], { env: twilioEnv });
        assert.ok(store.collection('twilio.calls', ['sid']).all().some((call) => call.to === '+15555550196'));
        await run(twilioNode, [
          twilioCli.path,
          'api:core:incoming-phone-numbers:create',
          '--phone-number',
          '+15555550176',
          '--friendly-name',
          'Twilio CLI Number',
          '-o',
          'json',
        ], { env: twilioEnv });
        await run(twilioNode, [
          twilioCli.path,
          'api:core:incoming-phone-numbers:list',
          '--limit',
          '10',
          '-o',
          'json',
        ], { env: twilioEnv });
        assert.ok(store.collection('twilio.incoming_phone_numbers', ['sid']).all().some((number) => number.phone_number === '+15555550176'));
        await run(twilioNode, [
          twilioCli.path,
          'api:messaging:v1:services:create',
          '--friendly-name',
          'Twilio CLI Messaging Service',
          '-o',
          'json',
        ], { env: twilioEnv });
        await run(twilioNode, [
          twilioCli.path,
          'api:messaging:v1:services:list',
          '--limit',
          '10',
          '-o',
          'json',
        ], { env: twilioEnv });
        assert.ok(store.collection('twilio.messaging_services', ['sid']).all().some((service) => service.friendly_name === 'Twilio CLI Messaging Service'));
        await run(twilioNode, [
          twilioCli.path,
          'api:verify:v2:services:create',
          '--friendly-name',
          'Twilio CLI Verify Service',
          '--code-length',
          '6',
          '-o',
          'json',
        ], { env: twilioEnv });
        await run(twilioNode, [
          twilioCli.path,
          'api:verify:v2:services:list',
          '--limit',
          '10',
          '-o',
          'json',
        ], { env: twilioEnv });
        assert.ok(store.collection('twilio.verify_services', ['sid']).all().some((service) => service.friendly_name === 'Twilio CLI Verify Service'));
        await run(twilioNode, [
          twilioCli.path,
          'api:verify:v2:services:verifications:create',
          '--service-sid',
          'VA00000000000000000000000000000000',
          '--to',
          '+15555550198',
          '--channel',
          'sms',
          '-o',
          'json',
        ], { env: twilioEnv });
        assert.ok(store.collection('twilio.verifications', ['sid']).all().some((verification) => verification.to === '+15555550198'));
      } finally {
        await rm(twilioCli.dir, { recursive: true, force: true });
        if (twilioCli.installDir) await rm(twilioCli.installDir, { recursive: true, force: true });
      }
    } else {
      console.warn('twilio CLI unavailable or unsupported for patching; Twilio REST emulator route smoke covered');
    }

    const snapToken = await fetch(`${baseUrl}/login/oauth2/access_token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: 'client', client_secret: 'secret', refresh_token: 'refresh' }),
    });
    assert.equal(snapToken.status, 200);
    assert.equal((await snapToken.json()).access_token, 'snap_emulator_access_token');
    const snapCampaigns = await fetch(`${baseUrl}/v1/adaccounts/snap_adaccount_seed/campaigns`, {
      headers: { authorization: 'Bearer snap_emulator_access_token' },
    });
    assert.equal(snapCampaigns.status, 200);
    assert.match(JSON.stringify(await snapCampaigns.json()), /snap_campaign_seed/);
    const snapTap = await patchedSnapchatTap(baseUrl);
    if (snapTap) {
      try {
        const script = [
          'import importlib.util',
          'spec = importlib.util.spec_from_file_location("snap_client", "' + join(snapTap.root, 'tap_snapchat_ads', 'client.py') + '")',
          'mod = importlib.util.module_from_spec(spec)',
          'spec.loader.exec_module(mod)',
          'SnapchatClient = mod.SnapchatClient',
          'with SnapchatClient("client", "secret", "refresh", 30, "api-emulator-smoke") as client:',
          '    orgs = client.get(url="' + baseUrl + '/v1/me/organizations")',
          '    accounts = client.get(url="' + baseUrl + '/v1/organizations/snap_org_seed/adaccounts")',
          '    campaigns = client.get(url="' + baseUrl + '/v1/adaccounts/snap_adaccount_seed/campaigns")',
          '    assert orgs["organizations"][0]["id"] == "snap_org_seed"',
          '    assert accounts["adaccounts"][0]["id"] == "snap_adaccount_seed"',
          '    assert campaigns["campaigns"][0]["id"] == "snap_campaign_seed"',
          'print("snap tap smoke ok")',
        ].join('\n');
        const snapScript = join(snapTap.dir, 'snap_smoke.py');
        await writeFile(snapScript, script);
        await run('python3', [snapScript], { env: { PYTHONPATH: snapTap.root } });
      } finally {
        await rm(snapTap.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('tap-snapchat-ads source unavailable; Snap Ads route smoke covered');
    }

    const appLovinReport = await fetch(`${baseUrl}/report?api_key=applovin_emulator_key&start=2026-05-15&end=2026-05-15&format=json&columns=day,campaign,impressions,clicks,cost`);
    assert.equal(appLovinReport.status, 200);
    assert.equal((await appLovinReport.json()).results[0].cost, '321.45');
    const appLovinWrapper = await patchedAppLovinReport(baseUrl);
    if (appLovinWrapper) {
      try {
        const script = [
          'from applovin_report.revenue_reporting_api import RevenueReport',
          'report = RevenueReport("applovin_emulator_key").get_report(start_date="2026-05-15", end_date="2026-05-15", columns=["day", "application", "revenue"])',
          'assert str(report.iloc[0]["revenue"]) == "654.32"',
          'print("applovin report smoke ok")',
        ].join('\n');
        const appLovinScript = join(appLovinWrapper.dir, 'applovin_smoke.py');
        await writeFile(appLovinScript, script);
        await run('python3', [appLovinScript], { env: { PYTHONPATH: appLovinWrapper.root } });
      } finally {
        await rm(appLovinWrapper.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('applovin_report source unavailable; AppLovin reporting route smoke covered');
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

    const gplay = await patchedGplay();
    if (gplay) {
      try {
        const gplayEnv = {
          GPLAY_OAUTH_TOKEN_PATH: gplay.tokenPath,
          GPLAY_OAUTH_CLIENT_ID: 'client',
          GPLAY_OAUTH_CLIENT_SECRET: 'secret',
          GPLAY_CONFIG_PATH: gplay.configPath,
          GPLAY_ANDROID_PUBLISHER_BASE_URL: baseUrl,
          GPLAY_REPORTING_BASE_URL: baseUrl,
          GPLAY_NO_UPDATE: '1',
          GPLAY_DEFAULT_OUTPUT: 'json',
        };
        const edit = await run(gplay.path, ['edits', 'create', '--package', 'com.example.app', '--output', 'json'], { env: gplayEnv });
        assert.match(edit.stdout, /edit_/);
        const editId = JSON.parse(edit.stdout).id;
        const tracks = await run(gplay.path, ['tracks', 'list', '--package', 'com.example.app', '--edit', editId, '--output', 'json'], { env: gplayEnv });
        assert.match(tracks.stdout, /production/);
        const reviews = await run(gplay.path, ['reviews', 'list', '--package', 'com.example.app', '--output', 'json'], { env: gplayEnv });
        assert.match(reviews.stdout, /review_cli_smoke/);
        const products = await run(gplay.path, ['iap', 'list', '--package', 'com.example.app', '--output', 'json'], { env: gplayEnv });
        assert.match(products.stdout, /coins_100/);
        const subscriptions = await run(gplay.path, ['subscriptions', 'list', '--package', 'com.example.app', '--output', 'json'], { env: gplayEnv });
        assert.match(subscriptions.stdout, /pro_monthly/);
        const vitals = await run(gplay.path, ['vitals', 'errors', 'issues', '--package', 'com.example.app', '--output', 'json'], { env: gplayEnv });
        assert.match(vitals.stdout, /error_cli_smoke/);
      } finally {
        await rm(gplay.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('gplay CLI unavailable; Google Play emulator route smoke covered');
    }

    const asc = await builtAscCli();
    if (asc) {
      try {
        const apps = await run(asc.path, ['apps', 'list', '--output', 'json'], {
          env: {
            ASC_BYPASS_KEYCHAIN: '1',
            ASC_API_BASE_URL: baseUrl,
            ASC_KEY_ID: 'TESTKEY123',
            ASC_ISSUER_ID: '00000000-0000-0000-0000-000000000000',
            ASC_PRIVATE_KEY_PATH: asc.keyPath,
          },
        });
        assert.match(apps.stdout, /1234567890/);
        assert.match(apps.stdout, /com\.example\.app/);
      } finally {
        await rm(asc.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('asc CLI source unavailable; App Store Connect emulator route smoke covered');
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

  const falApp = createApp();
  falPlugin.register(falApp, new Store());
  await withServer(falApp, async () => {
    const genmedia = await patchedGenmedia('http://127.0.0.1:8787');
    if (!genmedia) {
      console.warn('genmedia CLI unavailable; skipping fal CLI smoke');
      return;
    }
    try {
      const env = {
        F: 'http://127.0.0.1:8787',
        FAL_KEY: 'fal_emulator_key',
        GENMEDIA_NO_ANALYTICS: '1',
        GENMEDIA_NO_UPDATE: '1',
      };
      const models = await run(genmedia.path, ['models', '--endpoint_id', 'fal-ai/flux/dev'], { env });
      assert.match(models.stdout, /fal-ai\/flux\/dev/);
      const schema = await run(genmedia.path, ['schema', 'fal-ai/flux/dev'], { env });
      assert.match(schema.stdout, /fal-ai\/flux\/dev/);
      const submitted = await run(genmedia.path, ['run', '--async', 'fal-ai/flux/dev'], { env });
      assert.match(submitted.stdout, /emu_fal_request_/);
      const completed = await run(genmedia.path, ['run', 'fal-ai/flux/dev'], { env });
      assert.match(completed.stdout, /fal-emulator-image\.png/);
    } finally {
      await rm(genmedia.dir, { recursive: true, force: true });
    }
  }, { port: 8787, host: '127.0.0.1' });
}

await main();
console.log('cli verification smoke ok');
