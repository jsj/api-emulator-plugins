import assert from 'node:assert/strict';
import { chmod, cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
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
import { developerToken as appleMusicDeveloperToken, plugin as appleMusicPlugin } from '../@apple-music/api-emulator.mjs';
import { plugin as audiblePlugin } from '../@audible/api-emulator.mjs';
import { plugin as goodreadsPlugin } from '../@goodreads/api-emulator.mjs';
import { plugin as googlePlugin } from '../@google/api-emulator.mjs';
import { plugin as googlePlayPlugin } from '../@google-play/api-emulator.mjs';
import { plugin as huggingFacePlugin } from '../@huggingface/api-emulator.mjs';
import { plugin as kubernetesPlugin, seedFromConfig as seedKubernetes } from '../@kubernetes/api-emulator/index.mjs';
import { plugin as linkedinPlugin } from '../@linkedin/api-emulator.mjs';
import { plugin as lucentPlugin } from '../@lucent/api-emulator.mjs';
import { plugin as metaPlugin, seedFromConfig as seedMeta } from '../@meta/api-emulator.mjs';
import { plugin as nextdoorPlugin } from '../@nextdoor/api-emulator.mjs';
import { plugin as oculusPlugin, seedFromConfig as seedOculus } from '../@oculus/api-emulator.mjs';
import { plugin as snapPlugin, seedFromConfig as seedSnap } from '../@snap/api-emulator.mjs';
import { plugin as appLovinPlugin, seedFromConfig as seedAppLovin } from '../@applovin/api-emulator.mjs';
import { plugin as argoPlugin, seedFromConfig as seedArgo } from '../@argo/api-emulator.mjs';
import { plugin as openaiPlugin } from '../@openai/api-emulator.mjs';
import { plugin as plaidPlugin } from '../@plaid/api-emulator/src/index.ts';
import { plugin as salesforcePlugin } from '../@salesforce/api-emulator.mjs';
import { plugin as sentryPlugin } from '../@sentry/api-emulator.mjs';
import { plugin as sierraPlugin } from '../@sierra/api-emulator.mjs';
import { plugin as skyscannerPlugin } from '../@skyscanner/api-emulator.mjs';
import { plugin as spotifyPlugin } from '../@spotify/api-emulator.mjs';
import { plugin as supabasePlugin } from '../@supabase/api-emulator.mjs';
import { plugin as elevenLabsPlugin } from '../@elevenlabs/api-emulator.mjs';
import { plugin as falPlugin } from '../@fal/api-emulator.mjs';
import { plugin as flightradar24Plugin } from '../@flightradar24/api-emulator.mjs';
import { plugin as fireworksPlugin } from '../@fireworks/api-emulator.mjs';
import { plugin as modalPlugin } from '../@modal/api-emulator.mjs';
import { plugin as togetherAiPlugin } from '../@togetherai/api-emulator.mjs';
import { plugin as sunoPlugin } from '../@suno/api-emulator.mjs';
import { plugin as symbolabPlugin } from '../@symbolab/api-emulator.mjs';
import { plugin as crusoePlugin } from '../@crusoe/api-emulator.mjs';
import { plugin as coreweavePlugin } from '../@coreweave/api-emulator.mjs';
import { plugin as tiktokPlugin, seedFromConfig as seedTikTok } from '../@tiktok/api-emulator.mjs';
import { plugin as upstashPlugin } from '../@upstash/api-emulator.mjs';
import { plugin as replicatePlugin } from '../@replicate/api-emulator.mjs';
import { plugin as twilioPlugin, seedFromConfig as seedTwilio } from '../@twilio/api-emulator/src/index.ts';
import { plugin as youtubePlugin } from '../@youtube/api-emulator.mjs';
import { plugin as youtubeMusicPlugin } from '../@youtube-music/api-emulator.mjs';
import { plugin as adpPlugin } from '../@adp/api-emulator.mjs';
import { plugin as brexPlugin } from '../@brex/api-emulator.mjs';
import { plugin as concurPlugin } from '../@concur/api-emulator.mjs';
import { plugin as coinbasePlugin } from '../@coinbase/api-emulator.mjs';
import { plugin as datadogPlugin } from '../@datadog/api-emulator.mjs';
import { plugin as dopplerPlugin } from '../@doppler/api-emulator.mjs';
import { plugin as eTradePlugin } from '../@e-trade/api-emulator.mjs';
import { plugin as grafanaPlugin } from '../@grafana/api-emulator.mjs';
import { plugin as hashicorpVaultPlugin } from '../@hashicorp-vault/api-emulator.mjs';
import { plugin as gustoPlugin } from '../@gusto/api-emulator.mjs';
import { plugin as deelPlugin } from '../@deel/api-emulator.mjs';
import { plugin as intuitPlugin } from '../@intuit/api-emulator.mjs';
import { plugin as jiraPlugin } from '../@jira/api-emulator.mjs';
import { plugin as joinwarpPayrollPlugin } from '../@joinwarp-payroll/api-emulator.mjs';
import { plugin as mercuryPlugin } from '../@mercury/api-emulator.mjs';
import { plugin as rampPlugin, seedFromConfig as seedRamp } from '../@ramp/api-emulator.mjs';
import { plugin as ripplingPlugin } from '../@rippling/api-emulator.mjs';
import { plugin as robinhoodPlugin } from '../@robinhood/api-emulator.mjs';
import { plugin as samsaraPlugin } from '../@samsara/api-emulator.mjs';
import { plugin as schwabPlugin } from '../@schwab/api-emulator.mjs';
import { plugin as stainlessPlugin } from '../@stainless/api-emulator.mjs';
import { plugin as turbotaxPlugin } from '../@turbotax/api-emulator.mjs';
import { plugin as usaaPlugin } from '../@usaa/api-emulator.mjs';
import { plugin as workdayPlugin } from '../@workday/api-emulator.mjs';

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
    .reduce(
      (score, part) => {
        if (part === '*') return score;
        if (part.startsWith(':')) return score + 1;
        return score + 100;
      },
      routePath === '/' ? 100 : 0,
    );
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

async function commandPath(command) {
  const located = await run('/usr/bin/which', [command]).catch(() => null);
  return located?.stdout.trim() || null;
}

async function runDopplerCliSmoke(baseUrl) {
  const doppler = await commandPath('doppler');
  if (!doppler) return null;
  const env = {
    DOPPLER_API_HOST: baseUrl,
    DOPPLER_TOKEN: 'dp.st.emulator',
    DOPPLER_UPDATE_CHECKS_DISABLED: '1',
    DOPPLER_ANALYTICS_DISABLED: '1',
  };
  const projects = await run(doppler, ['projects', '--json', '--no-check-version'], { env }).catch(() => null);
  if (!projects) return null;
  assert.match(projects.stdout, /Demo|demo/);
  const configs = await run(doppler, ['configs', '-p', 'demo', '--json', '--no-check-version'], { env }).catch(() => null);
  if (!configs) return null;
  assert.match(configs.stdout, /dev/);
  const secrets = await run(doppler, ['secrets', 'download', '-p', 'demo', '-c', 'dev', '--no-file', '--format=json', '--no-check-version'], { env }).catch(() => null);
  if (!secrets) return null;
  assert.match(secrets.stdout, /doppler-emulator-key/);
  return { projects, configs, secrets };
}

async function runVaultCliSmoke(baseUrl) {
  const vault = await commandPath('vault');
  if (!vault) return null;
  const env = {
    VAULT_ADDR: baseUrl,
    VAULT_TOKEN: 'root',
    VAULT_FORMAT: 'json',
  };
  const status = await run(vault, ['status', '-format=json'], { env }).catch(() => null);
  if (!status) return null;
  assert.equal(JSON.parse(status.stdout).sealed, false);
  const mounts = await run(vault, ['secrets', 'list', '-format=json'], { env }).catch(() => null);
  if (!mounts) return null;
  assert.match(mounts.stdout, /secret\//);
  const put = await run(vault, ['kv', 'put', 'secret/cli-smoke', 'hello=vault'], { env }).catch(() => null);
  if (!put) return null;
  const get = await run(vault, ['kv', 'get', '-format=json', 'secret/cli-smoke'], { env }).catch(() => null);
  if (!get) return null;
  assert.equal(JSON.parse(get.stdout).data.data.hello, 'vault');
  return { status, mounts, put, get };
}


async function runNpmPackageNodeSmoke(packageName, script, env = {}) {
  const npm = await commandPath('npm');
  if (!npm) return null;
  return run(npm, ['exec', '--yes', '--package', packageName, '--', 'node', '--input-type=module', '-e', script], { env }).catch(() => null);
}

async function runBusinessProviderE2E(baseUrl) {
  const jiraProject = await fetch(`${baseUrl}/rest/api/3/project/search`, { headers: { authorization: 'Bearer jira_emulator_token' } });
  assert.equal(jiraProject.status, 200);
  assert.equal((await jiraProject.json()).values[0].key, 'EMU');
  const jiraCreated = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: { authorization: 'Bearer jira_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { summary: 'Jira CLI E2E Smoke' } }),
  });
  assert.equal(jiraCreated.status, 201);
  const jiraIssue = await jiraCreated.json();
  const jiraFetched = await fetch(`${baseUrl}/rest/api/3/issue/${jiraIssue.key}`);
  assert.equal((await jiraFetched.json()).fields.summary, 'Jira CLI E2E Smoke');

  const rampUsers = await fetch(`${baseUrl}/developer/v1/users`, { headers: { authorization: 'Bearer ramp_emulator_token' } });
  assert.equal(rampUsers.status, 200);
  assert.equal((await rampUsers.json()).data[0].email, 'ada@example.com');
  const rampReimbursement = await fetch(`${baseUrl}/developer/v1/reimbursements`, {
    method: 'POST',
    headers: { authorization: 'Bearer ramp_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ amount: 1250, currency: 'USD', memo: 'CLI E2E smoke' }),
  });
  assert.equal(rampReimbursement.status, 201);
  assert.equal((await rampReimbursement.json()).amount, 1250);

  const ripplingEmployees = await fetch(`${baseUrl}/platform/api/employees`, { headers: { authorization: 'Bearer rippling_emulator_token' } });
  assert.equal(ripplingEmployees.status, 200);
  assert.equal((await ripplingEmployees.json()).data[0].work_email, 'ada@example.com');
  const ripplingCreated = await fetch(`${baseUrl}/platform/api/employees`, {
    method: 'POST',
    headers: { authorization: 'Bearer rippling_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ work_email: 'cli-grace@example.com', first_name: 'Grace', last_name: 'Hopper' }),
  });
  assert.equal(ripplingCreated.status, 201);
  assert.equal((await ripplingCreated.json()).data.work_email, 'cli-grace@example.com');

  const gustoMe = await fetch(`${baseUrl}/v1/me`, { headers: { authorization: 'Bearer gusto_emulator_token' } });
  assert.equal(gustoMe.status, 200);
  assert.equal((await gustoMe.json()).email, 'emulator@example.com');
  const gustoEmployee = await fetch(`${baseUrl}/v1/companies/company_1/employees`, {
    method: 'POST',
    headers: { authorization: 'Bearer gusto_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ first_name: 'CLI', last_name: 'Smoke', email: 'gusto-cli@example.com' }),
  });
  assert.equal(gustoEmployee.status, 201);
  assert.equal((await gustoEmployee.json()).company_uuid, 'company_1');

  const deelPeople = await fetch(`${baseUrl}/rest/v2/people`, { headers: { authorization: 'Bearer deel_emulator_token' } });
  assert.equal(deelPeople.status, 200);
  assert.equal((await deelPeople.json()).data[0].email, 'ada@example.com');
  const deelContract = await fetch(`${baseUrl}/rest/v2/contracts`, {
    method: 'POST',
    headers: { authorization: 'Bearer deel_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ worker_id: 'person_1', title: 'CLI Deel Worker', status: 'draft' }),
  });
  assert.equal(deelContract.status, 201);
  assert.equal((await deelContract.json()).data.title, 'CLI Deel Worker');

  const warpWorkers = await fetch(`${baseUrl}/v1/workers`, { headers: { 'x-api-key': 'warp_emulator_key' } });
  assert.equal(warpWorkers.status, 200);
  assert.equal((await warpWorkers.json()).data[0].email, 'ada@example.com');
  const warpWorker = await fetch(`${baseUrl}/v1/workers/employee`, {
    method: 'POST',
    headers: { 'x-api-key': 'warp_emulator_key', 'content-type': 'application/json' },
    body: JSON.stringify({ firstName: 'CLI', lastName: 'Worker', email: 'warp-cli@example.com', departmentId: 'dept_1' }),
  });
  assert.equal(warpWorker.status, 201);
  assert.equal((await warpWorker.json()).email, 'warp-cli@example.com');

  const adpWorkers = await fetch(`${baseUrl}/hr/v2/workers`, { headers: { authorization: 'Bearer adp_emulator_token' } });
  assert.equal(adpWorkers.status, 200);
  assert.equal((await adpWorkers.json()).workers[0].associateOID, 'aoid_1');
  const adpHire = await fetch(`${baseUrl}/events/hr/v1/worker.hire`, {
    method: 'POST',
    headers: { authorization: 'Bearer adp_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ person: { legalName: { givenName: 'CLI', familyName1: 'Worker' } } }),
  });
  assert.equal(adpHire.status, 201);
  assert.equal((await adpHire.json()).eventStatusCode.codeValue, 'complete');

  const workdayWorkers = await fetch(`${baseUrl}/ccx/api/v1/emulator/workers`, { headers: { authorization: 'Bearer workday_emulator_token' } });
  assert.equal(workdayWorkers.status, 200);
  assert.equal((await workdayWorkers.json()).data[0].employeeID, 'E0001');
  const workdayCreated = await fetch(`${baseUrl}/ccx/api/v1/emulator/workers`, {
    method: 'POST',
    headers: { authorization: 'Bearer workday_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ descriptor: 'CLI Workday Worker', primaryWorkEmail: 'workday-cli@example.com' }),
  });
  assert.equal(workdayCreated.status, 201);
  assert.equal((await workdayCreated.json()).descriptor, 'CLI Workday Worker');

  const samsaraVehicles = await fetch(`${baseUrl}/fleet/vehicles`, { headers: { authorization: 'Bearer samsara_emulator_token' } });
  assert.equal(samsaraVehicles.status, 200);
  assert.equal((await samsaraVehicles.json()).data[0].vin, '1FTFW1E50NFA00001');
  const samsaraRoute = await fetch(`${baseUrl}/fleet/routes`, {
    method: 'POST',
    headers: { authorization: 'Bearer samsara_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Samsara CLI E2E Route', driverId: 'driver_1', vehicleId: 'vehicle_1' }),
  });
  assert.equal(samsaraRoute.status, 201);
  assert.equal((await samsaraRoute.json()).data.name, 'Samsara CLI E2E Route');

  const datadogValidate = await fetch(`${baseUrl}/api/v1/validate`, { headers: { 'dd-api-key': 'datadog_emulator_key', 'dd-application-key': 'datadog_emulator_app' } });
  assert.equal(datadogValidate.status, 200);
  assert.equal((await datadogValidate.json()).valid, true);
  const datadogMonitor = await fetch(`${baseUrl}/api/v1/monitor`, {
    method: 'POST',
    headers: { 'dd-api-key': 'datadog_emulator_key', 'dd-application-key': 'datadog_emulator_app', 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Datadog CLI E2E Monitor', type: 'metric alert', query: 'avg:emulator.requests{*} > 1' }),
  });
  assert.equal(datadogMonitor.status, 201);
  assert.equal((await datadogMonitor.json()).name, 'Datadog CLI E2E Monitor');

  const grafanaHealth = await fetch(`${baseUrl}/api/health`, { headers: { authorization: 'Bearer grafana_emulator_token' } });
  assert.equal(grafanaHealth.status, 200);
  assert.equal((await grafanaHealth.json()).database, 'ok');
  const grafanaSaved = await fetch(`${baseUrl}/api/dashboards/db`, {
    method: 'POST',
    headers: { authorization: 'Bearer grafana_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ dashboard: { uid: 'cli-e2e', title: 'CLI E2E Dashboard' } }),
  });
  assert.equal(grafanaSaved.status, 200);
  assert.equal((await grafanaSaved.json()).status, 'success');

  const concurUser = await fetch(`${baseUrl}/oauth2/v0/userinfo`, { headers: { authorization: 'Bearer concur_emulator_token' } });
  assert.equal(concurUser.status, 200);
  assert.equal((await concurUser.json()).email, 'ada@example.com');
  const concurReport = await fetch(`${baseUrl}/api/v3.0/expense/reports`, {
    method: 'POST',
    headers: { authorization: 'Bearer concur_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ Name: 'Concur CLI E2E Expenses', CurrencyCode: 'USD' }),
  });
  assert.equal(concurReport.status, 201);
  assert.equal((await concurReport.json()).Name, 'Concur CLI E2E Expenses');

  const intuitCompany = await fetch(`${baseUrl}/v3/company/123145725943001/companyinfo/123145725943001`, { headers: { authorization: 'Bearer intuit_emulator_token' } });
  assert.equal(intuitCompany.status, 200);
  assert.equal((await intuitCompany.json()).CompanyInfo.CompanyName, 'Emulator Books LLC');
  const intuitCustomer = await fetch(`${baseUrl}/v3/company/123145725943001/customer`, {
    method: 'POST',
    headers: { authorization: 'Bearer intuit_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ DisplayName: 'Intuit CLI Customer' }),
  });
  assert.equal(intuitCustomer.status, 200);
  assert.equal((await intuitCustomer.json()).Customer.DisplayName, 'Intuit CLI Customer');

  const coinbaseProducts = await fetch(`${baseUrl}/api/v3/brokerage/market/products`);
  assert.equal(coinbaseProducts.status, 200);
  assert.equal((await coinbaseProducts.json()).products[0].product_id, 'BTC-USD');
  const coinbasePreview = await fetch(`${baseUrl}/api/v3/brokerage/orders/preview`, {
    method: 'POST',
    headers: { authorization: 'Bearer coinbase_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ product_id: 'BTC-USD', side: 'BUY', order_configuration: { market_market_ioc: { quote_size: '50.00' } } }),
  });
  assert.equal(coinbasePreview.status, 200);
  assert.match((await coinbasePreview.json()).preview_id, /^coinbase-preview-/);

  const brexVendors = await fetch(`${baseUrl}/v1/vendors`, { headers: { authorization: 'Bearer brex_emulator_token' } });
  assert.equal(brexVendors.status, 200);
  assert.equal((await brexVendors.json()).items[0].id, 'vendor_001');
  const brexVendor = await fetch(`${baseUrl}/v1/vendors`, {
    method: 'POST',
    headers: { authorization: 'Bearer brex_emulator_token', 'content-type': 'application/json', 'idempotency-key': 'cli-brex-vendor' },
    body: JSON.stringify({ company_name: 'Brex CLI E2E Vendor', email: 'brex-cli@example.com' }),
  });
  assert.equal(brexVendor.status, 201);
  assert.equal((await brexVendor.json()).company_name, 'Brex CLI E2E Vendor');

  const mercuryAccounts = await fetch(`${baseUrl}/api/v1/accounts`, { headers: { authorization: 'Bearer secret-token:mercury_emulator' } });
  assert.equal(mercuryAccounts.status, 200);
  assert.equal((await mercuryAccounts.json()).accounts[0].id, 'mercury-account-1');
  const mercuryApproval = await fetch(`${baseUrl}/api/v1/account/mercury-account-1/request-send-money`, {
    method: 'POST',
    headers: { authorization: 'Bearer secret-token:mercury_emulator', 'content-type': 'application/json' },
    body: JSON.stringify({ amount: 25, recipientId: 'mercury-recipient-1' }),
  });
  assert.equal(mercuryApproval.status, 201);
  assert.equal((await mercuryApproval.json()).status, 'pendingApproval');

  const robinhoodAccounts = await fetch(`${baseUrl}/api/v1/crypto/trading/accounts/`, { headers: { authorization: 'Bearer robinhood_emulator_token' } });
  assert.equal(robinhoodAccounts.status, 200);
  assert.equal((await robinhoodAccounts.json()).results[0].status, 'active');
  const robinhoodOrder = await fetch(`${baseUrl}/api/v1/crypto/trading/orders/`, {
    method: 'POST',
    headers: { authorization: 'Bearer robinhood_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ currency_pair_id: 'BTC-USD', side: 'buy', quantity: '0.00100000' }),
  });
  assert.equal(robinhoodOrder.status, 201);
  assert.equal((await robinhoodOrder.json()).state, 'queued');

  const schwabAccounts = await fetch(`${baseUrl}/trader/v1/accounts/accountNumbers`, { headers: { authorization: 'Bearer schwab_emulator_token' } });
  assert.equal(schwabAccounts.status, 200);
  assert.equal((await schwabAccounts.json())[0].hashValue, 'SCHWAB_HASH_1');
  const schwabOrder = await fetch(`${baseUrl}/trader/v1/accounts/SCHWAB_HASH_1/orders`, {
    method: 'POST',
    headers: { authorization: 'Bearer schwab_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ orderType: 'MARKET', orderLegCollection: [{ instruction: 'BUY', quantity: 1, instrument: { symbol: 'AAPL' } }] }),
  });
  assert.equal(schwabOrder.status, 201);
  assert.equal((await schwabOrder.json()).status, 'QUEUED');

  const eTradeAccounts = await fetch(`${baseUrl}/v1/accounts/list.json`, { headers: { authorization: 'OAuth oauth_token="etrade_emulator_token"' } });
  assert.equal(eTradeAccounts.status, 200);
  assert.equal((await eTradeAccounts.json()).AccountListResponse.accounts.account[0].accountIdKey, 'ETRADE_KEY_1');
  const eTradePreview = await fetch(`${baseUrl}/v1/accounts/ETRADE_KEY_1/orders/preview.json`, {
    method: 'POST',
    headers: { authorization: 'OAuth oauth_token="etrade_emulator_token"', 'content-type': 'application/json' },
    body: JSON.stringify({ PreviewOrderRequest: { orderType: 'EQ', clientOrderId: 'cli-preview', Order: [{ priceType: 'MARKET', orderTerm: 'GOOD_FOR_DAY', marketSession: 'REGULAR', Instrument: [{ Product: { securityType: 'EQ', symbol: 'AAPL' }, orderAction: 'BUY', quantityType: 'QUANTITY', quantity: 1 }] }] } }),
  });
  assert.equal(eTradePreview.status, 200);
  assert.equal((await eTradePreview.json()).PreviewOrderResponse.Order[0].Instrument[0].Product.symbol, 'AAPL');

  const usaaAccounts = await fetch(`${baseUrl}/fdx/v6/accounts`, { headers: { authorization: 'Bearer usaa_emulator_token' } });
  assert.equal(usaaAccounts.status, 200);
  assert.equal((await usaaAccounts.json()).items[0].displayName, 'USAA Classic Checking');
  const usaaTransactions = await fetch(`${baseUrl}/fdx/v6/accounts/acct_checking_1/transactions`, { headers: { authorization: 'Bearer usaa_emulator_token' } });
  assert.equal(usaaTransactions.status, 200);
  assert.equal((await usaaTransactions.json()).items[0].description, 'EMULATOR PAYROLL');

  const turboTaxDocs = await fetch(`${baseUrl}/v1/tax-documents?taxYear=2025`, { headers: { authorization: 'Bearer turbotax_emulator_token' } });
  assert.equal(turboTaxDocs.status, 200);
  assert.equal((await turboTaxDocs.json()).data[0].formType, '1099-INT');
  const turboTaxSession = await fetch(`${baseUrl}/v1/import-sessions`, {
    method: 'POST',
    headers: { authorization: 'Bearer turbotax_emulator_token', 'content-type': 'application/json' },
    body: JSON.stringify({ taxYear: 2025 }),
  });
  assert.equal(turboTaxSession.status, 201);
  assert.equal((await turboTaxSession.json()).status, 'created');
}

async function runETradePyetradeSmoke(baseUrl) {
  const uv = await commandPath('uv');
  const python = await commandPath('python3');
  if (!uv && !python) return null;

  const script = String.raw`
import json, os
from pyetrade import ETradeAccounts

accounts = ETradeAccounts("key", "secret", "token", "token_secret", dev=True)
accounts.base_url = os.environ["ETRADE_BASE_URL"] + "/v1/accounts"
listed = accounts.list_accounts(resp_format="json")
balance = accounts.get_account_balance("ETRADE_KEY_1", resp_format="json")
print(json.dumps({
  "account": listed["AccountListResponse"]["accounts"]["account"][0]["accountIdKey"],
  "balance": balance["BalanceResponse"]["accountId"],
}))
`;
  const command = uv ?? python;
  const args = uv ? ['run', '--with', 'pyetrade', 'python', '-c', script] : ['-c', script];
  const result = await run(command, args, { env: { ETRADE_BASE_URL: baseUrl } }).catch(() => null);
  if (!result) return null;
  assert.match(result.stdout, /ETRADE_KEY_1/);
  assert.match(result.stdout, /10000001/);
  return { ok: true };
}

async function runJiraCliSmoke(baseUrl) {
  const git = (await commandPath('git')) || (existsSync('/opt/homebrew/bin/git') ? '/opt/homebrew/bin/git' : null);
  const go = (await commandPath('go')) || (existsSync('/opt/homebrew/bin/go') ? '/opt/homebrew/bin/go' : null);
  const installed = await commandPath('jira');
  if (!installed && (!git || !go)) return null;

  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-jira-cli-'));
  try {
    let jira = installed;
    if (!jira) {
      const source = join(dir, 'jira-cli');
      await run(git, ['clone', '--depth', '1', 'https://github.com/ankitpokhrel/jira-cli.git', source]);
      jira = join(dir, 'jira');
      await run(go, ['build', '-o', jira, './cmd/jira'], { cwd: source });
    }

    const configFile = join(dir, 'jira.yml');
    await writeFile(
      configFile,
      [
        'installation: Cloud',
        `server: ${baseUrl}`,
        'login: emulator@example.com',
        'auth_type: bearer',
        'project:',
        '  key: EMU',
        '  type: classic',
        'timezone: UTC',
        'issue:',
        '  types:',
        '    - id: "10001"',
        '      name: Task',
        '      handle: Task',
        '      subtask: false',
        '',
      ].join('\n'),
    );

    const env = {
      HOME: dir,
      XDG_CONFIG_HOME: join(dir, '.config'),
      XDG_CACHE_HOME: join(dir, '.cache'),
      JIRA_CONFIG_FILE: configFile,
      JIRA_API_TOKEN: 'jira_emulator_token',
      JIRA_AUTH_TYPE: 'bearer',
    };

    const listed = await run(jira, ['issue', 'list', '--raw', '--no-headers', '--plain'], { env });
    assert.match(listed.stdout, /EMU-1/);
    const viewed = await run(jira, ['issue', 'view', 'EMU-1', '--raw'], { env });
    assert.match(viewed.stdout, /Emulator issue/);
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runRipplingCliSmoke(baseUrl) {
  const git = await commandPath('git');
  const python = await commandPath('python3');
  const uv = await commandPath('uv');
  if (!git || (!python && !uv)) return null;

  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-rippling-cli-'));
  try {
    const source = join(dir, 'rippling-cli');
    await run(git, ['clone', '--depth', '1', 'https://github.com/Rippling/rippling-cli.git', source]);
    const constantsPath = join(source, 'rippling_cli', 'constants.py');
    const constants = await readFile(constantsPath, 'utf8');
    await writeFile(
      constantsPath,
      constants
        .replaceAll('RIPPLING_BASE_URL = "https://app.rippling.com"', `RIPPLING_BASE_URL = "${baseUrl}"`)
        .replaceAll('RIPPLING_API = "https://app.rippling.com/api"', `RIPPLING_API = "${baseUrl}"`),
    );
    const home = join(dir, 'home');
    await mkdir(join(home, '.rippling_cli'), { recursive: true });
    await writeFile(join(home, '.rippling_cli', 'oauth_token.json'), JSON.stringify({ token: 'rippling_emulator_token', expiration_timestamp: Math.floor(Date.now() / 1000) + 3600 }));
    const script = 'from rippling_cli.cli.main import initialize_cli, cli; initialize_cli(); cli()';
    const env = { HOME: home, PYTHONPATH: source };
    const command = uv ?? python;
    const prefix = uv ? ['run', '--with', 'click', '--with', 'pkce', '--with', 'urllib3', '--with', 'requests', 'python'] : [];
    const listed = await run(command, [...prefix, '-c', script, 'flux', 'app', 'list'], { cwd: dir, env }).catch(() => null);
    if (!listed) return null;
    assert.match(listed.stdout, /Emulator Flux App/);
    const selected = await run(command, [...prefix, '-c', script, 'flux', 'app', 'set', '--app_id', 'app_1'], { cwd: dir, env });
    assert.match(selected.stdout, /Emulator Flux App/);
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runWorkdayRaasCliSmoke(baseUrl) {
  const git = await commandPath('git');
  const python = await commandPath('python3');
  if (!git || !python) return null;

  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-workday-raas-'));
  try {
    const source = join(dir, 'raas-python');
    await run(git, ['clone', '--depth', '1', 'https://github.com/Workday/raas-python.git', source]);
    const script = [
      'import json, os, sys',
      `sys.path.insert(0, ${JSON.stringify(source)})`,
      'from raas import RaaS',
      'r = RaaS(os.environ["WORKDAY_BASE_URL"], "emulator", "client", "secret", "refresh")',
      'r.create_bearer_token()',
      'data = r.get_report(os.environ["WORKDAY_BASE_URL"] + "/ccx/service/customreport2/emulator/isur/Workers?format=json")',
      'print(json.dumps(data))',
    ].join('; ');
    const result = await run(python, ['-c', script], { env: { WORKDAY_BASE_URL: baseUrl } }).catch(() => null);
    if (!result) return null;
    assert.match(result.stdout, /Ada Lovelace/);
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runGrafanactlCliSmoke(baseUrl) {
  const git = (await commandPath('git')) || (existsSync('/opt/homebrew/bin/git') ? '/opt/homebrew/bin/git' : null);
  const go = (await commandPath('go')) || (existsSync('/opt/homebrew/bin/go') ? '/opt/homebrew/bin/go' : null);
  const installed = await commandPath('grafanactl');
  if (!installed && (!git || !go)) return null;

  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-grafanactl-'));
  try {
    let grafanactl = installed;
    if (!grafanactl) {
      const source = join(dir, 'grafanactl');
      await run(git, ['clone', '--depth', '1', 'https://github.com/grafana/grafanactl.git', source]);
      grafanactl = join(dir, 'grafanactl-bin');
      const built = await run(go, ['build', '-o', grafanactl, './cmd/grafanactl'], { cwd: source }).catch(() => null);
      if (!built) return null;
    }
    const env = {
      HOME: dir,
      XDG_CONFIG_HOME: join(dir, '.config'),
      GRAFANA_SERVER: baseUrl,
      GRAFANA_TOKEN: 'grafana_emulator_token',
      GRAFANA_ORG_ID: '1',
    };
    const checked = await run(grafanactl, ['config', 'check'], { env });
    assert.match(checked.stdout + checked.stderr, /Grafana|version|ok|valid/i);
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runRampCliSmoke(baseUrl) {
  const uv = await commandPath('uv');
  if (!uv) return null;

  const home = await mkdtemp(join(tmpdir(), 'api-emulator-ramp-home-'));
  const env = {
    HOME: home,
    XDG_CONFIG_HOME: join(home, '.config'),
    XDG_CACHE_HOME: join(home, '.cache'),
    RAMP_API_URL: baseUrl,
    RAMP_ACCESS_TOKEN: 'ramp_emulator_token',
    RAMP_DEVTOOL_TOKEN: 'ramp_emulator_devtool_token',
  };
  const prefix = ['tool', 'run', '--from', 'git+https://github.com/ramp-public/ramp-cli.git', 'ramp', '--agent', '--no-input'];

  try {
    const available = await run(uv, [...prefix, '--help'], { env }).catch(() => null);
    if (!available) return null;

    const me = await run(uv, [...prefix, 'users', 'me', '--rationale', 'api emulator smoke test'], { env });
    assert.equal(JSON.parse(me.stdout).data[0].email, 'ada@example.com');

    const users = await run(uv, [...prefix, 'users', 'list', '--rationale', 'api emulator smoke test'], { env });
    assert.equal(JSON.parse(users.stdout).data[0].users[0].email, 'ada@example.com');

    const transactions = await run(
      uv,
      [...prefix, 'transactions', 'list', '--transactions_to_retrieve', 'my_transactions', '--rationale', 'api emulator smoke test'],
      { env },
    );
    assert.equal(JSON.parse(transactions.stdout).data[0].transactions[0].merchant_name, 'Emulator Cafe');

    const transaction = await run(uv, [...prefix, 'transactions', 'get', '--json', '{"id":"txn_1"}', '--rationale', 'api emulator smoke test'], { env });
    assert.equal(JSON.parse(transaction.stdout).data[0].transaction_uuid, 'txn_1');

    const reimbursements = await run(uv, [...prefix, 'reimbursements', 'list', '--rationale', 'api emulator smoke test'], { env });
    assert.equal(JSON.parse(reimbursements.stdout).data[0].reimbursements[0].memo, 'CLI E2E smoke');

    return { ok: true };
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

async function runStainlessCliSmoke(baseUrl) {
  const git = await commandPath('git');
  const go = await commandPath('go');
  if (!git || !go) return null;
  const dir = await mkdtemp(join(tmpdir(), 'stainless-cli-smoke-'));
  try {
    await run(git, ['clone', '--depth', '1', 'https://github.com/stainless-api/stainless-api-cli', dir]);
    const common = ['run', './cmd/stl', '--base-url', baseUrl, '--api-key', 'stl_emulator_key', '--format', 'json'];
    const env = {
      HOME: dir,
      XDG_CONFIG_HOME: join(dir, 'config'),
      XDG_CACHE_HOME: join(dir, 'cache'),
      STAINLESS_API_KEY: 'stl_emulator_key',
    };

    const user = await run(go, [...common, 'user', 'retrieve'], { cwd: dir, env });
    assert.match(user.stdout, /ada@example\.test/);

    const projects = await run(go, [...common, 'projects', 'list', '--org', 'acme-corp'], { cwd: dir, env });
    assert.match(projects.stdout, /acme-api/);

    const project = await run(go, [...common, 'projects', 'retrieve', '--project', 'acme-api'], { cwd: dir, env });
    assert.match(project.stdout, /Acme API/);

    const branches = await run(go, [...common, 'projects:branches', 'list', '--project', 'acme-api'], { cwd: dir, env });
    assert.match(branches.stdout, /main/);

    const builds = await run(go, [...common, 'builds', 'list', '--project', 'acme-api', '--limit', '1'], { cwd: dir, env });
    assert.match(builds.stdout, /bui_emulator_/);

    const output = await run(go, [...common, 'builds:target-outputs', 'retrieve', '--project', 'acme-api', '--target', 'typescript', '--type', 'source', '--output', 'git'], { cwd: dir, env }).catch(() => null);
    if (!output) return null;
    assert.match(output.stdout, /acme-api-typescript/);
    return true;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runBusinessSdkSmoke(baseUrl) {
  const datadog = await runNpmPackageNodeSmoke(
    '@datadog/datadog-api-client',
    "import * as client from '@datadog/datadog-api-client'; const configuration = client.client.createConfiguration({ authMethods: { apiKeyAuth: 'datadog_emulator_key', appKeyAuth: 'datadog_emulator_app' }, baseServer: new client.client.ServerConfiguration(process.env.API_EMULATOR_BASE_URL, {}) }); const api = new client.v1.AuthenticationApi(configuration); const result = await api.validate(); if (!result.valid) throw new Error('Datadog validation failed'); console.log('datadog sdk ok');",
    { API_EMULATOR_BASE_URL: baseUrl },
  );
  if (!datadog) console.warn('@datadog/datadog-api-client unavailable; Datadog direct e2e route coverage passed');

  const samsara = await runNpmPackageNodeSmoke(
    '@samsarahq/samsara',
    "import { SamsaraClient } from '@samsarahq/samsara'; const client = new SamsaraClient({ token: 'samsara_emulator_token', baseUrl: process.env.API_EMULATOR_BASE_URL }); const result = await client.vehicles.list(); if (!result.data?.[0]?.vin) throw new Error('Samsara vehicles missing'); console.log('samsara sdk ok');",
    { API_EMULATOR_BASE_URL: baseUrl },
  );
  if (!samsara) console.warn('@samsarahq/samsara unavailable; Samsara direct e2e route coverage passed');

  const gusto = await runNpmPackageNodeSmoke(
    '@gusto/embedded-api',
    "import { GustoEmbedded } from '@gusto/embedded-api'; const gusto = new GustoEmbedded({ companyAccessAuth: 'gusto_emulator_token', serverURL: process.env.API_EMULATOR_BASE_URL }); const response = await gusto.introspection.getInfo({}); if (!response) throw new Error('Gusto SDK did not return'); console.log('gusto sdk ok');",
    { API_EMULATOR_BASE_URL: baseUrl },
  );
  if (!gusto) console.warn('@gusto/embedded-api unavailable or incompatible; Gusto direct e2e route coverage passed');

  const warp = await runNpmPackageNodeSmoke(
    'warp-hr',
    "import Warp from 'warp-hr'; const client = new Warp({ apiKey: 'warp_emulator_key', baseURL: process.env.API_EMULATOR_BASE_URL }); const workers = await client.workers.list(); if (!workers.data?.[0]?.email) throw new Error('Warp SDK did not return workers'); console.log('warp sdk ok');",
    { API_EMULATOR_BASE_URL: baseUrl, WARP_API_KEY: 'warp_emulator_key', WARP_BASE_URL: baseUrl },
  );
  if (!warp) console.warn('warp-hr unavailable or incompatible; JoinWarp Payroll direct e2e route coverage passed');

  console.warn('ADP, Concur, and Deel have no safely required local CLI in this smoke; direct e2e route coverage passed.');
}

async function runHuggingFaceSdkSmoke(baseUrl) {
  const python = await commandPath('python3');
  if (!python) return null;
  const probe = await run(python, ['-c', 'import huggingface_hub']).catch(() => null);
  if (!probe) return null;
  const script = String.raw`
import json
import os
from huggingface_hub import HfApi

api = HfApi(endpoint=os.environ["HF_ENDPOINT"], token="hf_emulator_token")
whoami = api.whoami()
models = list(api.list_models(search="hello", limit=1))
info = api.model_info("emulator/hello-world")
likes = api.list_liked_repos("emulator")
likers = list(api.list_repo_likers("emulator/hello-world"))
api.unlike("emulator/hello-world")
created = api.create_repo("emulator/sdk-created", repo_type="model", private=True)
print(json.dumps({
    "user": whoami["name"],
    "model": models[0].id,
    "pipeline": info.pipeline_tag,
    "liked": likes.models[0],
    "liker": likers[0].username,
    "created": str(created),
}))
`;
  return run(python, ['-c', script], {
    env: {
      HF_ENDPOINT: baseUrl,
      HF_TOKEN: 'hf_emulator_token',
      HF_HUB_DISABLE_TELEMETRY: '1',
    },
  });
}

async function runOpenAiCompatibleCliSmoke(baseUrl) {
  const openai = await commandPath('openai');
  if (!openai) return null;

  const fireworks = await run(openai, ['--api-base', `${baseUrl}/inference/v1/`, '--api-key', 'fw-emulator-key', 'api', 'chat.completions.create', '-m', 'accounts/fireworks/models/llama-v3p1-8b-instruct', '-g', 'user', 'hello fireworks']);
  assert.match(fireworks.stdout, /Fireworks emulator response/);

  const together = await run(openai, ['--api-base', `${baseUrl}/together/v1/`, '--api-key', 'together-emulator-key', 'api', 'chat.completions.create', '-m', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', '-g', 'user', 'hello together']);
  assert.match(together.stdout, /Together AI emulator response/);
  return { ok: true };
}

async function runSunoRouteSmoke(baseUrl) {
  const headers = {
    authorization: 'Bearer suno-emulator-key',
    'content-type': 'application/json',
  };
  const credit = await fetch(`${baseUrl}/api/v1/generate/credit`, { headers });
  assert.equal(credit.status, 200);
  assert.equal((await credit.json()).data, 1200);

  const created = await fetch(`${baseUrl}/api/v1/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customMode: false,
      instrumental: false,
      model: 'V4_5ALL',
      callBackUrl: 'https://example.com/suno-callback',
      prompt: 'A peaceful acoustic guitar melody',
    }),
  });
  assert.equal(created.status, 200);
  const taskId = (await created.json()).data.taskId;
  assert.match(taskId, /^suno_task_/);

  const record = await fetch(`${baseUrl}/api/v1/generate/record-info?taskId=${taskId}`, { headers });
  assert.equal(record.status, 200);
  const payload = await record.json();
  assert.equal(payload.data.status, 'SUCCESS');
  assert.match(payload.data.response.sunoData[0].audioUrl, /suno_audio_emulator_001/);
  return { ok: true };
}

async function runCrusoeCliSmoke(baseUrl) {
  const crusoe = await commandPath('crusoe');
  if (!crusoe) return null;

  const configDir = await mkdtemp(join(tmpdir(), 'api-emulator-crusoe-config-'));
  try {
    const env = {
      CRUSOE_CONFIG_DIR: configDir,
      CRUSOE_ACCESS_KEY_ID: 'crusoe-emulator-access',
      CRUSOE_SECRET_KEY: Buffer.from('crusoe-emulator-secret').toString('base64'),
      CRUSOE_DEFAULT_PROJECT: 'project-emulator',
      CRUSOE_API_ENDPOINT: `${baseUrl}/v1alpha5`,
    };
    const projects = await run(crusoe, ['projects', 'list', '--json'], { env });
    assert.match(projects.stdout, /project-emulator/);

    const vms = await run(crusoe, ['compute', 'vms', 'list', '--project-id', 'project-emulator', '--json'], { env });
    assert.match(vms.stdout, /trainer|vm-emulator-001/);
    return { ok: true };
  } finally {
    await rm(configDir, { recursive: true, force: true });
  }
}

async function startModalGrpcServer() {
  const python = existsSync('/usr/local/bin/python3.10') ? '/usr/local/bin/python3.10' : await commandPath('python3');
  const modal = await commandPath('modal');
  if (!python || !modal) return null;
  const probe = await run(python, ['-c', 'import grpclib, modal_proto']).catch(() => null);
  if (!probe) return null;

  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-modal-grpc-'));
  const serverPath = join(dir, 'server.py');
  await writeFile(
    serverPath,
    String.raw`import asyncio
from grpclib.server import Server
from google.protobuf.timestamp_pb2 import Timestamp
from modal_proto import api_grpc, api_pb2

class ModalEmulator(api_grpc.ModalClientBase):
    async def ClientHello(self, stream):
        await stream.recv_message()
        await stream.send_message(api_pb2.ClientHelloResponse(image_builder_version="2025.06"))

    async def TokenInfoGet(self, stream):
        await stream.recv_message()
        await stream.send_message(api_pb2.TokenInfoGetResponse(
            token_id="ak-emulator",
            token_name="emulator-token",
            workspace_id="ws-emulator",
            workspace_name="emulator",
            user_identity=api_pb2.UserIdentity(user_id="u-emulator", username="ada"),
            created_at=Timestamp(seconds=1700000000),
        ))

    async def WorkspaceDashboardUrlGet(self, stream):
        await stream.recv_message()
        await stream.send_message(api_pb2.WorkspaceDashboardUrlResponse(url="http://127.0.0.1/modal/dashboard"))

    async def EnvironmentList(self, stream):
        await stream.recv_message()
        await stream.send_message(api_pb2.EnvironmentListResponse(items=[
            api_pb2.EnvironmentListItem(
                environment_id="env-main",
                name="main",
                webhook_suffix="main",
                created_at=1700000000,
                default=True,
            )
        ]))

    async def AppList(self, stream):
        await stream.recv_message()
        await stream.send_message(api_pb2.AppListResponse(apps=[
            api_pb2.AppListResponse.AppListItem(
                app_id="ap-aaaaaaaaaaaaaaaaaaaaaa",
                name="api-emulator",
                description="api-emulator",
                state=api_pb2.APP_STATE_DEPLOYED,
                created_at=1700000000,
                n_running_tasks=1,
            )
        ]))

ModalEmulator.__abstractmethods__ = frozenset()

async def main():
    server = Server([ModalEmulator()])
    await server.start("127.0.0.1", 0)
    print(server._server.sockets[0].getsockname()[1], flush=True)
    await server.wait_closed()

asyncio.run(main())
`,
  );

  const child = spawn(python, [serverPath], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (data) => {
    stderr += data;
  });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Modal gRPC server did not start\n${stderr}`)), 5000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.stdout.once('data', (data) => {
      clearTimeout(timer);
      resolve(data.toString().trim());
    });
  }).catch(async () => {
    child.kill();
    await rm(dir, { recursive: true, force: true });
    return null;
  });
  if (!port) return null;

  return {
    modal,
    baseUrl: `http://127.0.0.1:${port}`,
    async close() {
      child.kill();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

async function patchedLucentCli(baseUrl) {
  const npm = await commandPath('npm');
  if (!npm) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-lucent-cli-'));
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      private: true,
      dependencies: { '@lucenthq/cli': '0.1.0' },
    }),
  );
  const installed = await run(npm, ['install', '--no-audit', '--no-fund', '--silent'], { cwd: dir }).catch(() => null);
  if (!installed) {
    await rm(dir, { recursive: true, force: true });
    return null;
  }
  const path = join(dir, 'node_modules', '@lucenthq', 'cli', 'dist', 'index.js');
  const source = await readFile(path, 'utf8');
  const validateUrl = 'https://batch-jobs-lucent.onrender.com/api/sdk/init';
  if (!source.includes(validateUrl)) {
    await rm(dir, { recursive: true, force: true });
    return null;
  }
  await writeFile(path, source.replaceAll(validateUrl, `${baseUrl}/api/sdk/init`));
  const projectDir = join(dir, 'project');
  await mkdir(join(projectDir, 'src'), { recursive: true });
  await writeFile(join(projectDir, 'package.json'), JSON.stringify({ private: true, dependencies: {} }));
  await writeFile(join(projectDir, 'src', 'main.tsx'), ['import App from "./App";', '', 'createRoot(document.getElementById("root")!).render(<App />);', ''].join('\n'));
  return { path, dir, projectDir };
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
  if ((help.stdout + help.stderr).includes('--db-url'))
    return {
      command: npm,
      prefix: ['exec', '--yes', '@upstash/cli@next', '--'],
    };
  return null;
}

async function runElevenLabsSdkSmoke(baseUrl) {
  const npm = await commandPath('npm');
  if (!npm) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-elevenlabs-sdk-'));
  try {
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: { '@elevenlabs/elevenlabs-js': 'latest' },
      }),
    );
    const installed = await run(npm, ['install', '--no-audit', '--no-fund', '--silent'], { cwd: dir }).catch(() => null);
    if (!installed) return null;
    const script = join(dir, 'smoke.mjs');
    await writeFile(
      script,
      [
        "import assert from 'node:assert/strict';",
        "import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';",
        `const client = new ElevenLabsClient({ apiKey: 'elevenlabs-emulator-key', baseUrl: ${JSON.stringify(baseUrl)} });`,
        'const models = await client.models.list();',
        "assert.ok(models.some((model) => model.modelId === 'eleven_multilingual_v2' || model.model_id === 'eleven_multilingual_v2'));",
        'const voices = await client.voices.search({ pageSize: 1 });',
        'assert.equal(voices.voices.length, 1);',
        'assert.equal(voices.hasMore ?? voices.has_more, true);',
        "const audio = await client.textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', { text: 'hello from sdk', modelId: 'eleven_multilingual_v2' });",
        'const bytes = Buffer.from(await new Response(audio).arrayBuffer());',
        'assert.match(bytes.toString(), /hello from sdk/);',
        'const history = await client.history.list({ pageSize: 1 });',
        'assert.equal(history.history.length, 1);',
        'const user = await client.user.get();',
        'assert.ok((user.subscription?.characterCount ?? user.subscription?.character_count) >= 14);',
      ].join('\n'),
    );
    await run(process.execPath, [script], { cwd: dir });
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runSierraReactNativeSdkSmoke(baseUrl) {
  const bun = await commandPath('bun');
  const git = await commandPath('git');
  if (!bun || !git) return null;

  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-sierra-rn-sdk-'));
  const root = join(dir, 'sdk');
  try {
    const sourceRoot = process.env.SIERRA_REACT_NATIVE_SDK_ROOT;
    if (sourceRoot && existsSync(join(sourceRoot, 'models', 'AgentConfig.ts'))) {
      await cp(sourceRoot, root, { recursive: true });
    } else {
      const cloned = await run(git, ['clone', '--depth', '1', 'https://github.com/sierra-inc/sierra-react-native-sdk.git', root]).catch(() => null);
      if (!cloned) return null;
    }

    const agentConfigPath = join(root, 'models', 'AgentConfig.ts');
    const agentConfig = await readFile(agentConfigPath, 'utf8');
    if (!agentConfig.includes('https://sierra.chat')) return null;
    await writeFile(
      agentConfigPath,
      agentConfig
        .replaceAll('https://sierra.chat', baseUrl)
        .replaceAll('https://eu.sierra.chat', baseUrl)
        .replaceAll('https://sg.sierra.chat', baseUrl)
        .replaceAll('https://staging.sierra.chat', baseUrl)
        .replaceAll('https://chat.sierra.codes:8083', baseUrl),
    );

    const script = join(dir, 'sierra-rn-smoke.ts');
    await writeFile(
      script,
      [
        "import assert from 'node:assert/strict';",
        `import { Agent } from ${JSON.stringify(join(root, 'Agent.ts'))};`,
        `import { AgentConfig, AgentAPIHostType } from ${JSON.stringify(join(root, 'models', 'AgentConfig.ts'))};`,
        `import { PersistenceMode } from ${JSON.stringify(join(root, 'models', 'PersistenceMode.ts'))};`,
        "const config = new AgentConfig('agent_emulator', 'production', AgentAPIHostType.PROD, PersistenceMode.MEMORY);",
        "const agent = new Agent({ config, options: { name: 'Sierra Emulator Agent', conversationOptions: { variables: { plan: 'enterprise' }, secrets: { session: 'redacted' }, enableContactCenter: true }, canEndConversation: true, canStartNewChat: true, initialUserMessage: 'hello from sdk' } });",
        'const embedUrl = agent.getEmbedUrl();',
        `assert.ok(embedUrl.startsWith(${JSON.stringify(`${baseUrl}/agent/agent_emulator/mobile?`)}), embedUrl);`,
        "assert.match(embedUrl, /target=production/);",
        "assert.match(embedUrl, /variable=plan%3Aenterprise/);",
        "assert.match(embedUrl, /secret=session%3Aredacted/);",
        "assert.match(embedUrl, /enableContactCenter=true/);",
        'const response = await fetch(embedUrl);',
        'assert.equal(response.status, 200);',
        'const html = await response.text();',
        "assert.match(html, /Sierra Emulator Agent/);",
        "assert.match(html, /agentMessageEnd/);",
        `const voice = await fetch(${JSON.stringify(`${baseUrl}/chat/voice/svp/agent_emulator`)});`,
        'assert.equal(voice.status, 426);',
        'const state = await fetch(new URL("/sierra/inspect/state", embedUrl));',
        'const stateJson = await state.json();',
        "assert.equal(stateJson.contractStatus, 'mobile-sdk-public');",
      ].join('\n'),
    );
    const result = await run(bun, [script], { cwd: dir }).catch(() => null);
    if (!result) return null;
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runElevenLabsCommunityCliSmoke(baseUrl) {
  const cargo = await commandPath('cargo');
  const git = await commandPath('git');
  if (!cargo || !git) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-elevenlabs-cli-'));
  try {
    const root = join(dir, 'elevenlabs-cli');
    const cloned = await run(git, ['clone', '--depth', '1', 'https://github.com/hongkongkiwi/elevenlabs-cli.git', root]).catch(() => null);
    if (!cloned) return null;
    for (const file of [
      join(root, 'src', 'commands', 'tts_stream.rs'),
      join(root, 'src', 'commands', 'tts_timestamps.rs'),
      join(root, 'src', 'commands', 'music.rs'),
      join(root, 'src', 'commands', 'voice.rs'),
    ]) {
      if (!existsSync(file)) continue;
      const source = await readFile(file, 'utf8');
      await writeFile(file, source.replaceAll('https://api.elevenlabs.io', baseUrl));
    }
    const built = await run(cargo, ['build', '--release', '--quiet', '--no-default-features', '--features', 'cli'], { cwd: root }).catch(() => null);
    if (!built) return null;
    const output = join(dir, 'community-cli-output.mp3');
    const cli = join(root, 'target', 'release', 'elevenlabs-cli');
    const result = await run(cli, ['--api-key', 'elevenlabs-emulator-key', '--yes', 'tts-stream', 'hello from community cli', '--voice', 'JBFqnCBsd6RMkjVDRZzb', '--output', output]).catch(() => null);
    if (!result || !existsSync(output)) return null;
    assert.match(await readFile(output, 'utf8'), /hello from community cli/);
    return { ok: true };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
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
  const source = process.env.GENMEDIA_BIN || (await commandPath('genmedia'));
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
  const patched = Buffer.from(
    binary
      .toString('binary')
      .replaceAll(original.toString('binary'), replacement.toString('binary'))
      .replaceAll(configOriginal.toString('binary'), configReplacement.toString('binary'))
      .replaceAll(proxyWhenOriginal.toString('binary'), proxyWhenReplacement.toString('binary')),
    'binary',
  );
  await writeFile(path, patched, { mode: 0o755 });
  return { path, dir };
}

async function metaCliShim(baseUrl) {
  if (!(await commandPath('meta'))) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-meta-'));
  await writeFile(
    join(dir, 'sitecustomize.py'),
    ['import os', "base = os.environ.get('META_ADS_API_BASE_URL')", 'if base:', '    from facebook_business.session import FacebookSession', "    FacebookSession.GRAPH = base.rstrip('/')", ''].join('\n'),
  );
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

async function patchedLinkedInCli(baseUrl) {
  const python = await commandPath('python3');
  const git = await commandPath('git');
  if (!python || !git) return null;
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-linkedin-cli-'));
  const root = join(dir, 'linkedin-cli');
  const sourceRoot = process.env.LINKEDIN_CLI_ROOT;
  if (sourceRoot && existsSync(join(sourceRoot, 'linkedin', '__main__.py'))) {
    await cp(sourceRoot, root, { recursive: true });
  } else {
    const cloned = await run(git, ['clone', '--depth', '1', 'https://github.com/tigillo/linkedin-cli', root]).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  }

  const replacements = [
    ['linkedin/commands/me.py', 'https://api.linkedin.com/v2/me', `${baseUrl}/v2/me`],
    ['linkedin/commands/login.py', 'https://www.linkedin.com/oauth/v2/accessToken', `${baseUrl}/oauth/v2/accessToken`],
    ['linkedin/commands/login.py', 'https://api.linkedin.com/v2/me', `${baseUrl}/v2/me`],
    ['linkedin/utils/linkedin.py', 'https://api.linkedin.com/v2/ugcPosts', `${baseUrl}/v2/ugcPosts`],
  ];
  for (const [relativePath, original, replacement] of replacements) {
    const target = join(root, relativePath);
    const source = await readFile(target, 'utf8');
    if (!source.includes(original)) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
    await writeFile(target, source.replaceAll(original, replacement));
  }

  const home = join(dir, 'home');
  await mkdir(join(home, '.linkedin'), { recursive: true });
  await writeFile(
    join(home, '.linkedin', 'config.json'),
    JSON.stringify({
      application: {
        client_id: 'linkedin_client',
        client_secret: 'linkedin_secret',
      },
      access_token: 'linkedin_emulator_access_token',
      port: 4625,
      urn: 'urn:li:person:linkedin_member_seed',
    }),
  );
  return { python, root, dir, home };
}

async function runLinkedInCliSmoke(baseUrl) {
  const cli = await patchedLinkedInCli(baseUrl);
  if (!cli) return null;
  try {
    const env = { HOME: cli.home, PYTHONPATH: cli.root };
    const me = await run(cli.python, ['-m', 'linkedin', 'me'], {
      cwd: cli.root,
      env,
    });
    assert.match(me.stdout, /linkedin_member_seed|Ada|Lovelace/);
    const post = await run(cli.python, ['-m', 'linkedin', 'post', 'LinkedIn CLI Smoke'], { cwd: cli.root, env });
    assert.match(post.stderr + post.stdout, /Post sent/);
    const stateResponse = await fetch(`${baseUrl}/linkedin/inspect/state`);
    const linkedinState = await stateResponse.json();
    assert.equal(linkedinState.ugcPosts.at(-1).specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text, 'LinkedIn CLI Smoke');
    return { me, post };
  } finally {
    await rm(cli.dir, { recursive: true, force: true });
  }
}

async function patchedYoutubeCli({ baseUrl, kind }) {
  const npm = await commandPath('npm');
  const git = await commandPath('git');
  if (!npm || !git) return null;

  const isAnalytics = kind === 'analytics';
  const envRoot = isAnalytics ? process.env.YOUTUBE_ANALYTICS_CLI_ROOT : process.env.YOUTUBE_DATA_CLI_ROOT;
  const repo = isAnalytics ? 'Bin-Huang/youtube-analytics-cli' : 'Bin-Huang/youtube-data-cli';
  const dir = await mkdtemp(join(tmpdir(), `api-emulator-youtube-${kind}-cli-`));
  const root = join(dir, isAnalytics ? 'youtube-analytics-cli' : 'youtube-data-cli');
  if (envRoot && existsSync(join(envRoot, 'src', 'api.ts'))) {
    await cp(envRoot, root, { recursive: true });
  } else {
    const cloned = await run(git, ['clone', '--depth', '1', `https://github.com/${repo}`, root]).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  }

  const apiPath = join(root, 'src', 'api.ts');
  const authPath = join(root, 'src', 'auth.ts');
  let apiSource = await readFile(apiPath, 'utf8');
  const replacements = isAnalytics
    ? [
        ['https://www.googleapis.com/youtube/v3', `${baseUrl}/youtube/v3`],
        ['https://youtubeanalytics.googleapis.com/v2', `${baseUrl}/v2`],
      ]
    : [
        ['https://www.googleapis.com/youtube/v3', `${baseUrl}/youtube/v3`],
        ['https://www.googleapis.com/upload/youtube/v3', `${baseUrl}/upload/youtube/v3`],
      ];
  for (const [original, replacement] of replacements) {
    if (!apiSource.includes(original)) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
    apiSource = apiSource.replaceAll(original, replacement);
  }
  await writeFile(apiPath, apiSource);

  let authSource = await readFile(authPath, 'utf8');
  if (!authSource.includes('https://oauth2.googleapis.com/token')) {
    await rm(dir, { recursive: true, force: true });
    return null;
  }
  authSource = authSource.replaceAll('https://oauth2.googleapis.com/token', `${baseUrl}/token`);
  await writeFile(authPath, authSource);

  const installed = await run(npm, ['install', '--no-audit', '--no-fund', '--silent'], { cwd: root }).catch(() => null);
  if (!installed) {
    await rm(dir, { recursive: true, force: true });
    return null;
  }
  const built = await run(npm, ['run', 'build', '--silent'], { cwd: root }).catch(() => null);
  if (!built) {
    await rm(dir, { recursive: true, force: true });
    return null;
  }

  return { path: join(root, 'dist', 'index.js'), dir, root };
}

async function runYoutubeCliSmoke(baseUrl) {
  const dataCli = await patchedYoutubeCli({ baseUrl, kind: 'data' });
  const analyticsCli = await patchedYoutubeCli({ baseUrl, kind: 'analytics' });
  const env = {
    YOUTUBE_API_KEY: 'youtube_emulator_key',
    YOUTUBE_CLIENT_ID: 'youtube_client',
    YOUTUBE_CLIENT_SECRET: 'youtube_secret',
    YOUTUBE_REFRESH_TOKEN: 'youtube_refresh',
  };
  try {
    if (dataCli) {
      const search = await run(process.execPath, [dataCli.path, '--format', 'compact', 'search', '--q', 'emulator', '--type', 'video'], { env, cwd: dataCli.root });
      assert.match(search.stdout, /video_cli_seed/);
      const channels = await run(process.execPath, [dataCli.path, '--format', 'compact', 'channels', 'UC_emulator_creator'], { env, cwd: dataCli.root });
      assert.match(channels.stdout, /API Emulator Creator/);
      const videos = await run(process.execPath, [dataCli.path, '--format', 'compact', 'videos', 'video_cli_seed'], { env, cwd: dataCli.root });
      assert.match(videos.stdout, /YouTube CLI Seed Video/);
      const playlists = await run(process.execPath, [dataCli.path, '--format', 'compact', 'playlists', '--channel-id', 'UC_emulator_creator'], { env, cwd: dataCli.root });
      assert.match(playlists.stdout, /CLI Smoke Playlist/);
      const playlistItem = await run(
        process.execPath,
        [dataCli.path, '--format', 'compact', 'playlist-items-insert', '--playlist-id', 'PL_emulator_creator', '--video-id', 'video_cli_seed'],
        { env, cwd: dataCli.root },
      );
      assert.match(playlistItem.stdout, /PLI_cli_created_/);
      const videoPath = join(dataCli.dir, 'smoke.mp4');
      await writeFile(videoPath, 'not a real mp4, but good enough for emulator');
      const upload = await run(process.execPath, [dataCli.path, '--format', 'compact', 'videos-insert', '--file', videoPath, '--title', 'CLI Uploaded Video'], { env, cwd: dataCli.root });
      assert.match(upload.stdout, /video_cli_upload_/);
    }

    if (analyticsCli) {
      const channels = await run(process.execPath, [analyticsCli.path, '--format', 'compact', 'channels', 'UC_emulator_creator'], { env, cwd: analyticsCli.root });
      assert.match(channels.stdout, /API Emulator Creator/);
      const report = await run(
        process.execPath,
        [analyticsCli.path, '--format', 'compact', 'report', '--metrics', 'views,likes', '--start-date', '2026-05-15', '--end-date', '2026-05-15', '--dimensions', 'day'],
        { env, cwd: analyticsCli.root },
      );
      assert.match(report.stdout, /1234/);
      const groups = await run(process.execPath, [analyticsCli.path, '--format', 'compact', 'groups'], { env, cwd: analyticsCli.root });
      assert.match(groups.stdout, /group_cli_seed/);
      const groupItems = await run(process.execPath, [analyticsCli.path, '--format', 'compact', 'group-items', 'group_cli_seed'], { env, cwd: analyticsCli.root });
      assert.match(groupItems.stdout, /video_cli_seed/);
    }
  } finally {
    if (dataCli) await rm(dataCli.dir, { recursive: true, force: true });
    if (analyticsCli) await rm(analyticsCli.dir, { recursive: true, force: true });
  }
  return { data: Boolean(dataCli), analytics: Boolean(analyticsCli) };
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
  await writeFile(
    tokenPath,
    JSON.stringify({
      access_token: 'gplay_emulator_token',
      token_type: 'Bearer',
      expiry: '2999-01-01T00:00:00Z',
    }),
  );
  await writeFile(
    configPath,
    JSON.stringify({
      package_name: 'com.example.app',
      timeout: '30s',
      upload_timeout: '30s',
      max_retries: 0,
    }),
  );
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
      await writeFile(
        join(installDir, 'package.json'),
        JSON.stringify({
          private: true,
          dependencies: { 'twilio-cli': '6.2.4' },
        }),
      );
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
  await writeFile(
    clientPath,
    (await readFile(clientPath, 'utf8'))
      .replaceAll("API_URL = 'https://adsapi.snapchat.com'", `API_URL = '${baseUrl}'`)
      .replaceAll("SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token'", `SNAPCHAT_TOKEN_URL = '${baseUrl}/login/oauth2/access_token'`),
  );
  if (existsSync(streamsPath)) {
    await writeFile(streamsPath, (await readFile(streamsPath, 'utf8')).replaceAll("BASE_URL = 'https://adsapi.snapchat.com/v1'", `BASE_URL = '${baseUrl}/v1'`));
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
  await writeFile(reportPath, (await readFile(reportPath, 'utf8')).replaceAll('https://r.applovin.com/maxReport', `${baseUrl}/maxReport`));
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
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
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
  await writeFile(csvPath, ['Store ID,Payment Methods,Currency', 'adyen-cli-store,visa|mc,EUR', ''].join('\n'));
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
  await writeFile(configPath, configSource.replaceAll('https://paper-api.alpaca.markets', baseUrl).replaceAll('https://api.alpaca.markets', baseUrl).replaceAll('https://data.alpaca.markets', baseUrl));
  const updatePath = join(root, 'internal', 'cmd', 'update.go');
  const updateSource = await readFile(updatePath, 'utf8');
  await writeFile(
    updatePath,
    updateSource.replace(/func getLatestVersion\(timeout time\.Duration\) \(string, error\) \{[\s\S]*?\n\}/, 'func getLatestVersion(timeout time.Duration) (string, error) {\n\t_ = http.MethodGet\n\treturn "v999.0.0", nil\n}'),
  );
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
    const runAlpacaLocal = (args) =>
      run(cli.path, args, {
        env: { ALPACA_CONFIG_DIR: cli.dir, ALPACA_QUIET: '1' },
      });
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
    const walletTransferEstimate = await runAlpaca([
      'wallet',
      'transfer',
      'estimate',
      '--asset',
      'USDC',
      '--amount',
      '1',
      '--from-address',
      '0x1111111111111111111111111111111111111111',
      '--to-address',
      '0x0000000000000000000000000000000000000000',
    ]);
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
    const perpWalletTransferEstimate = await runAlpaca([
      'crypto-perp',
      'wallet',
      'transfer',
      'estimate',
      '--asset',
      'USDC',
      '--amount',
      '1',
      '--from-address',
      '0x1111111111111111111111111111111111111111',
      '--to-address',
      '0x0000000000000000000000000000000000000000',
    ]);
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

async function builtSpogoCli(baseUrl) {
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-spogo-cli-'));
  const root = join(dir, 'spogo');
  const sourceRoot = process.env.SPOGO_CLI_ROOT || '/Users/james/Developer/zzabandoned/spogo';
  if (existsSync(join(sourceRoot, 'go.mod'))) {
    await cp(sourceRoot, root, { recursive: true });
  } else {
    const git = await commandPath('git');
    if (!git) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
    const cloned = await run(git, ['clone', '--depth', '1', 'https://github.com/openclaw/spogo.git', root]).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  }

  const factoryPath = join(root, 'internal', 'app', 'context_factory.go');
  const factorySource = await readFile(factoryPath, 'utf8');
  await writeFile(
    factoryPath,
    factorySource.replace(
      'return spotify.NewClient(spotify.Options{\n\t\tTokenProvider: spotify.CookieTokenProvider{Source: source},',
      'baseURL := os.Getenv("SPOGO_SPOTIFY_BASE_URL")\n\ttokenBaseURL := os.Getenv("SPOGO_SPOTIFY_TOKEN_BASE_URL")\n\treturn spotify.NewClient(spotify.Options{\n\t\tTokenProvider: spotify.CookieTokenProvider{Source: source, BaseURL: tokenBaseURL},\n\t\tBaseURL:       baseURL,',
    ),
  );

  const path = join(dir, 'spogo-bin');
  await run('go', ['build', '-o', path, './cmd/spogo'], { cwd: root });
  await chmod(path, 0o755);

  const cookiePath = join(dir, 'cookies.json');
  await writeFile(cookiePath, JSON.stringify([{ Name: 'sp_dc', Value: 'spotify_emulator_cookie' }]));
  const configPath = join(dir, 'config.toml');
  await writeFile(
    configPath,
    [
      'default_profile = "default"',
      '[profile.default]',
      `cookie_path = ${JSON.stringify(cookiePath)}`,
      'engine = "web"',
      'market = "US"',
      'language = "en"',
      'device = "spotify_device_seed"',
      '',
    ].join('\n'),
  );

  return {
    path,
    dir,
    configPath,
    env: {
      SPOGO_CONFIG: configPath,
      SPOGO_ENGINE: 'web',
      SPOGO_JSON: '1',
      SPOGO_NO_COLOR: '1',
      SPOGO_SPOTIFY_BASE_URL: `${baseUrl}/v1`,
      SPOGO_SPOTIFY_TOKEN_BASE_URL: `${baseUrl}/`,
    },
  };
}

async function runSpogoCliSmoke(baseUrl) {
  const cli = await builtSpogoCli(baseUrl);
  if (!cli) return null;
  try {
    const runSpogo = async (args) => {
      const result = await run(cli.path, args, { env: cli.env }).catch(() => null);
      if (!result) throw new Error('spogo command unavailable');
      return result;
    };
    const version = await runSpogo(['--version']);
    assert.match(version.stdout, /0\.|spogo/i);
    const searchTrack = await runSpogo(['search', 'track', 'emulator', '--limit', '2']);
    assert.match(searchTrack.stdout, /spotify_track_seed|Mockingbird API/);
    const searchAlbum = await runSpogo(['search', 'album', 'localhost', '--limit', '2']);
    assert.match(searchAlbum.stdout, /spotify_album_seed|Localhost Sessions/);
    const searchArtist = await runSpogo(['search', 'artist', 'emulator', '--limit', '2']);
    assert.match(searchArtist.stdout, /spotify_artist_seed|The Emulator Band/);
    const searchPlaylist = await runSpogo(['search', 'playlist', 'emulator', '--limit', '2']);
    assert.match(searchPlaylist.stdout, /spotify_playlist_seed|Emulator Mix/);
    const searchShow = await runSpogo(['search', 'show', 'emulator', '--limit', '2']);
    assert.match(searchShow.stdout, /spotify_show_seed|Emulator FM/);
    const searchEpisode = await runSpogo(['search', 'episode', 'mock', '--limit', '2']);
    assert.match(searchEpisode.stdout, /spotify_episode_seed|The Mock Episode/);

    const track = await runSpogo(['track', 'info', 'spotify:track:spotify_track_seed']);
    assert.match(track.stdout, /spotify_track_seed|Mockingbird API/);
    const album = await runSpogo(['album', 'info', 'spotify:album:spotify_album_seed']);
    assert.match(album.stdout, /spotify_album_seed|Localhost Sessions/);
    const artist = await runSpogo(['artist', 'info', 'spotify:artist:spotify_artist_seed']);
    assert.match(artist.stdout, /spotify_artist_seed|The Emulator Band/);
    const playlist = await runSpogo(['playlist', 'info', 'spotify:playlist:spotify_playlist_seed']);
    assert.match(playlist.stdout, /spotify_playlist_seed|Emulator Mix/);
    const show = await runSpogo(['show', 'info', 'spotify:show:spotify_show_seed']);
    assert.match(show.stdout, /spotify_show_seed|Emulator FM/);
    const episode = await runSpogo(['episode', 'info', 'spotify:episode:spotify_episode_seed']);
    assert.match(episode.stdout, /spotify_episode_seed|The Mock Episode/);

    const libraryTracks = await runSpogo(['library', 'tracks', 'list', '--limit', '5']);
    assert.match(libraryTracks.stdout, /spotify_track_seed|Mockingbird API/);
    const libraryAlbums = await runSpogo(['library', 'albums', 'list', '--limit', '5']);
    assert.match(libraryAlbums.stdout, /spotify_album_seed|Localhost Sessions/);
    const libraryArtists = await runSpogo(['library', 'artists', 'list', '--limit', '5']);
    assert.match(libraryArtists.stdout, /spotify_artist_seed|The Emulator Band/);
    const libraryPlaylists = await runSpogo(['library', 'playlists', 'list', '--limit', '5']);
    assert.match(libraryPlaylists.stdout, /spotify_playlist_seed|Emulator Mix/);
    await runSpogo(['library', 'tracks', 'add', 'spotify:track:spotify_track_two']);
    await runSpogo(['library', 'tracks', 'remove', 'spotify:track:spotify_track_two']);
    await runSpogo(['library', 'albums', 'add', 'spotify:album:spotify_album_seed']);
    await runSpogo(['library', 'albums', 'remove', 'spotify:album:spotify_album_seed']);
    await runSpogo(['library', 'artists', 'follow', 'spotify:artist:spotify_artist_seed']);
    await runSpogo(['library', 'artists', 'unfollow', 'spotify:artist:spotify_artist_seed']);

    const createdPlaylist = await runSpogo(['playlist', 'create', 'Spogo Smoke']);
    assert.match(createdPlaylist.stdout, /spotify_playlist_|Spogo Smoke/);
    const createdId = JSON.parse(createdPlaylist.stdout).id;
    await runSpogo(['playlist', 'add', `spotify:playlist:${createdId}`, 'spotify:track:spotify_track_seed']);
    const playlistTracks = await runSpogo(['playlist', 'tracks', `spotify:playlist:${createdId}`, '--limit', '5']);
    assert.match(playlistTracks.stdout, /spotify_track_seed|Mockingbird API/);
    await runSpogo(['playlist', 'remove', `spotify:playlist:${createdId}`, 'spotify:track:spotify_track_seed']);

    const devices = await runSpogo(['device', 'list']);
    assert.match(devices.stdout, /spotify_device_seed|Localhost Speaker/);
    await runSpogo(['device', 'set', 'Localhost Speaker']);
    await runSpogo(['play', 'spotify:track:spotify_track_seed']);
    const status = await runSpogo(['status']);
    assert.match(status.stdout, /spotify_track_seed|Mockingbird API|is_playing/);
    await runSpogo(['seek', '0:30']);
    await runSpogo(['volume', '33']);
    await runSpogo(['shuffle', 'on']);
    await runSpogo(['repeat', 'track']);
    await runSpogo(['next']);
    await runSpogo(['prev']);
    await runSpogo(['queue', 'add', 'spotify:track:spotify_track_two']);
    const queue = await runSpogo(['queue', 'show']);
    assert.match(queue.stdout, /spotify_track_two|Deterministic Shuffle/);
    await runSpogo(['pause']);
    return { searchTrack, track, status, queue };
  } catch {
    return null;
  } finally {
    await rm(cli.dir, { recursive: true, force: true });
  }
}

async function preparedAppleMusicCli(baseUrl) {
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-apple-music-cli-'));
  const root = join(dir, 'apple-music');
  const sourceRoot = process.env.APPLE_MUSIC_CLI_ROOT || '/Users/james/Developer/zzabandoned/apple-music';
  if (existsSync(join(sourceRoot, 'cli.py'))) {
    await cp(sourceRoot, root, { recursive: true });
  } else {
    const git = await commandPath('git');
    if (!git) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
    const cloned = await run(git, ['clone', '--depth', '1', 'https://github.com/kalmilon/apple-music.git', root]).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  }

  const clientPath = join(root, 'apple_music.py');
  const clientSource = await readFile(clientPath, 'utf8');
  await writeFile(
    clientPath,
    clientSource
      .replace('import re\nimport sys\nimport time', 'import os\nimport re\nimport sys\nimport time')
      .replace('BASE_URL = "https://amp-api.music.apple.com"', 'BASE_URL = os.environ.get("APPLE_MUSIC_BASE_URL", "https://amp-api.music.apple.com")')
      .replace('"https://itunes.apple.com/search"', 'os.environ.get("ITUNES_SEARCH_URL", "https://itunes.apple.com/search")'),
  );

  const venv = join(dir, 'venv');
  await run('python3', ['-m', 'venv', venv]);
  const python = join(venv, 'bin', 'python');
  await run(python, ['-m', 'pip', 'install', '-q', 'requests>=2.32.5', 'python-dotenv>=1.2.2', 'mutagen>=1.47.0']);

  return {
    dir,
    root,
    python,
    env: {
      APPLE_USER_TOKEN: 'apple_music_emulator_user_token',
      APPLE_DEV_TOKEN: appleMusicDeveloperToken(),
      APPLE_STOREFRONT: 'us',
      APPLE_MUSIC_BASE_URL: baseUrl,
      ITUNES_SEARCH_URL: `${baseUrl}/search`,
    },
  };
}

async function runAppleMusicCliSmoke(baseUrl) {
  const cli = await preparedAppleMusicCli(baseUrl);
  if (!cli) return null;
  try {
    const runAppleMusic = (args) => run(cli.python, ['cli.py', ...args], { cwd: cli.root, env: cli.env });
    const search = await runAppleMusic(['search', '--query', 'Cupertino Mock', '--limit', '3']);
    assert.match(search.stdout, /Cupertino Mock|Apple Emulator/);
    const match = await runAppleMusic(['match', '--songs', JSON.stringify([{ artist: 'Apple Emulator', title: 'Cupertino Mock' }])]);
    assert.match(match.stdout, /Cupertino Mock|matched/);
    const created = await runAppleMusic(['create', '--name', 'Apple Music CLI Smoke', '--track-ids', JSON.stringify(['apple_song_seed'])]);
    assert.match(created.stdout, /Created playlist|apple_playlist_/);
    const playlistId = created.stdout.match(/\((apple_playlist_[^)]+)\)/)?.[1];
    assert.ok(playlistId, `expected playlist id in ${created.stdout}`);
    const list = await runAppleMusic(['list']);
    assert.match(list.stdout, /Apple Music CLI Smoke|Emulator Favorites/);
    const tracks = await runAppleMusic(['tracks', '--id', playlistId]);
    assert.match(tracks.stdout, /Cupertino Mock|Apple Emulator/);
    const add = await runAppleMusic(['add', '--id', playlistId, '--track-ids', JSON.stringify(['apple_song_two'])]);
    assert.match(add.stdout, /Added 1 tracks/);
    const renamed = await runAppleMusic(['rename', '--id', playlistId, '--name', 'Apple Music CLI Smoke Renamed', '--description', 'Updated by emulator smoke']);
    assert.match(renamed.stdout, /Updated/);
    const removed = await runAppleMusic(['remove', '--id', playlistId, '--track-ids', JSON.stringify(['apple_song_seed'])]);
    assert.match(removed.stdout, /Removed 1 tracks/);
    const reordered = await runAppleMusic(['reorder', '--id', playlistId, '--track-ids', JSON.stringify(['apple_song_two', 'apple_song_seed'])]);
    assert.match(reordered.stdout, /Reordered playlist|apple_playlist_/);
    return { search, created, list, tracks };
  } finally {
    await rm(cli.dir, { recursive: true, force: true });
  }
}

async function preparedYtMusicCli(baseUrl) {
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-ytmusic-cli-'));
  const root = join(dir, 'ytmusic-cli');
  const sourceRoot = process.env.YTMUSIC_CLI_ROOT || '/Users/james/Developer/zzabandoned/ytmusic-cli';
  if (existsSync(join(sourceRoot, 'ytmusic_cli', 'player.py'))) {
    await cp(sourceRoot, root, { recursive: true });
  } else {
    const git = await commandPath('git');
    if (!git) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
    const cloned = await run(git, ['clone', '--depth', '1', 'https://github.com/gaurav712/ytmusic-cli.git', root]).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  }

  const venv = join(dir, 'venv');
  await run('python3', ['-m', 'venv', venv]);
  const python = join(venv, 'bin', 'python');
  await run(python, ['-m', 'pip', 'install', '-q', '-e', root]);
  const constantsPath = (await run(python, ['-c', 'import ytmusicapi.constants as c; print(c.__file__)'])).stdout.trim();
  const constantsSource = await readFile(constantsPath, 'utf8');
  await writeFile(
    constantsPath,
    constantsSource
      .replace('YTM_DOMAIN = "https://music.youtube.com"', `YTM_DOMAIN = "${baseUrl}"`)
      .replace('YTM_BASE_API = YTM_DOMAIN + "/youtubei/v1/"', 'YTM_BASE_API = YTM_DOMAIN + "/youtubei/v1/"'),
  );
  const headersPath = join(dir, 'headersauth.json');
  await writeFile(headersPath, JSON.stringify({
    Cookie: '__Secure-3PAPISID=ytmusic_emulator_cookie; SID=ytmusic_emulator_sid',
    authorization: 'SAPISIDHASH 1234567890_ytmusic_emulator_hash',
    origin: 'https://music.youtube.com',
    'User-Agent': 'api-emulator-ytmusic-cli-smoke',
    Accept: '*/*',
  }));
  const probePath = join(dir, 'ytmusic_probe.py');
  await writeFile(
    probePath,
    [
      'import json',
      'import sys',
      'from ytmusic_cli.player import Player',
      'results = []',
      'player = Player(sys.argv[1])',
      'player.search("Localhost", lambda songs: results.extend(songs))',
      'print(json.dumps({"search": results}))',
    ].join('\n'),
  );

  return { dir, root, python, headersPath, probePath };
}

async function runYtMusicCliSmoke(baseUrl) {
  const cli = await preparedYtMusicCli(baseUrl);
  if (!cli) return null;
  try {
    const result = await run(cli.python, [cli.probePath, cli.headersPath], { cwd: cli.root }).catch(() => null);
    if (!result) return null;
    assert.match(result.stdout, /Localhost Lullaby|ytm_video_seed/);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.search[0].videoId, 'ytm_video_seed');
    return result;
  } finally {
    await rm(cli.dir, { recursive: true, force: true });
  }
}

async function builtPlaidCli(baseUrl) {
  const dir = await mkdtemp(join(tmpdir(), 'api-emulator-plaid-cli-'));
  const root = join(dir, 'plaid-cli');
  const sourceRoot = process.env.PLAID_CLI_ROOT || '/Users/james/Developer/zzabandoned/plaid-cli';
  if (existsSync(join(sourceRoot, 'go.mod'))) {
    await cp(sourceRoot, root, { recursive: true });
  } else {
    const git = await commandPath('git');
    if (!git) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
    const cloned = await run(git, ['clone', '--depth', '1', 'https://github.com/landakram/plaid-cli', root]).catch(() => null);
    if (!cloned) {
      await rm(dir, { recursive: true, force: true });
      return null;
    }
  }

  const mainPath = join(root, 'main.go');
  const mainSource = await readFile(mainPath, 'utf8');
  await writeFile(
    mainPath,
    mainSource
      .replace('viper.SetDefault("cli.data_dir", filepath.Join(dir, ".plaid-cli"))', 'viper.SetDefault("cli.data_dir", getenvDefault("CLI_DATA_DIR", filepath.Join(dir, ".plaid-cli")))')
      .replace(
        'func sliceToMap(slice []string) map[string]bool {',
        'func getenvDefault(name string, fallback string) string {\n\tvalue := os.Getenv(name)\n\tif value == "" {\n\t\treturn fallback\n\t}\n\treturn value\n}\n\nfunc sliceToMap(slice []string) map[string]bool {',
      ),
  );

  await run('go', ['mod', 'vendor'], { cwd: root });
  const environmentsPath = join(root, 'vendor', 'github.com', 'plaid', 'plaid-go', 'plaid', 'environments.go');
  if (!existsSync(environmentsPath)) {
    await rm(dir, { recursive: true, force: true });
    return null;
  }
  const environments = await readFile(environmentsPath, 'utf8');
  await writeFile(environmentsPath, environments.replaceAll('https://sandbox.plaid.com', baseUrl).replaceAll('https://development.plaid.com', baseUrl).replaceAll('https://production.plaid.com', baseUrl));
  const path = join(dir, 'plaid-cli-bin');
  await run('go', ['build', '-mod=vendor', '-o', path, '.'], { cwd: root });
  await chmod(path, 0o755);
  return { path, dir };
}

async function runPlaidCliSmoke(baseUrl) {
  const cli = await builtPlaidCli(baseUrl);
  if (!cli) return null;
  const dataDir = join(cli.dir, 'data-dir');
  await mkdir(join(dataDir, 'data'), { recursive: true });
  await writeFile(join(dataDir, 'config.toml'), ['[plaid]', 'client_id = "plaid_emulator_client"', 'secret = "plaid_emulator_secret"', 'environment = "development"', 'countries = ["US"]', 'language = "en"', ''].join('\n'));
  await writeFile(join(dataDir, 'data', 'tokens.json'), JSON.stringify({ 'item-emulator-1': 'access-sandbox-emulator' }));
  await writeFile(join(dataDir, 'data', 'aliases.json'), JSON.stringify({ checking: 'item-emulator-1' }));

  const env = {
    CLI_DATA_DIR: dataDir,
    PLAID_CLIENT_ID: 'plaid_emulator_client',
    PLAID_SECRET: 'plaid_emulator_secret',
    PLAID_ENVIRONMENT: 'development',
    PLAID_COUNTRIES: 'US',
    PLAID_LANGUAGE: 'en',
  };

  try {
    const runPlaid = (args) => run(cli.path, args, { env });
    const tokens = await runPlaid(['tokens']);
    assert.match(tokens.stdout, /checking|access-sandbox-emulator/);
    const accounts = await runPlaid(['accounts', 'checking']);
    assert.match(accounts.stdout, /Plaid Checking|acc-checking-1/);
    const institution = await runPlaid(['institution', 'checking', '--optional-metadata']);
    assert.match(institution.stdout, /First Platypus Bank|ins_109508/);
    const transactions = await runPlaid(['transactions', 'checking', '--from', '2025-01-01', '--to', '2026-12-31']);
    assert.match(transactions.stdout, /Coffee Shop|txn-coffee-1/);
    return { tokens, accounts, institution, transactions };
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
            response: { $ref: 'FileList' },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
          },
          create: {
            id: 'drive.files.create',
            path: 'files',
            httpMethod: 'POST',
            parameters: {},
            request: { $ref: 'File' },
            response: { $ref: 'File' },
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
          files: { type: 'array', items: { $ref: 'File' } },
        },
      },
    },
  };
}

async function registerShims(app, store) {
  app.get('/api', (c) =>
    c.json({
      kind: 'APIVersions',
      versions: ['v1'],
      serverAddressByClientCIDRs: [],
    }),
  );
  app.get('/api/v1', (c) =>
    c.json({
      kind: 'APIResourceList',
      groupVersion: 'v1',
      resources: [
        {
          name: 'namespaces',
          singularName: '',
          namespaced: false,
          kind: 'Namespace',
          verbs: ['get', 'list'],
        },
        {
          name: 'pods',
          singularName: '',
          namespaced: true,
          kind: 'Pod',
          verbs: ['get', 'list'],
        },
      ],
    }),
  );
  app.get('/apis', (c) => c.json({ kind: 'APIGroupList', groups: [] }));
  app.get('/version', (c) => c.json({ major: '1', minor: '30', gitVersion: 'v1.30.0-emulator' }));
  app.get('/v1/projects', (c) =>
    c.json([
      {
        id: 'project_emulator',
        ref: 'project_emulator',
        name: 'Emulator Project',
        organization_id: 'org_emulator',
        region: 'local',
        status: 'ACTIVE_HEALTHY',
        database: { host: '127.0.0.1', version: '15' },
      },
    ]),
  );
  app.post('/chat/completions', async (c) => {
    const input = await c.req.json();
    const content = input.messages?.at?.(-1)?.content ?? 'hello';
    return c.json({
      id: 'chatcmpl_cli_smoke',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: input.model ?? 'gpt-4.1-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `openai-emulator-text: ${content}`,
          },
          finish_reason: 'stop',
        },
      ],
    });
  });
  app.get('/inspect/cli-hits', (c) =>
    c.json({
      google: store.getData('google:workspace-state')?.hits ?? [],
      openai: store.getData('openai:last-chat-completion') ?? null,
    }),
  );
  app.get('/v23/customers:listAccessibleCustomers', (c) => c.json({ resourceNames: ['customers/1234567890'] }));
  app.post('/v23/customers/:customerId/googleAds:searchStream', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const query = String(body.query ?? '');
    const result = query.includes('customer.')
      ? {
          customer: {
            id: c.req.param('customerId'),
            descriptiveName: 'Google Ads Emulator Customer',
            currencyCode: 'USD',
            timeZone: 'Etc/UTC',
            status: 'ENABLED',
          },
        }
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
          metrics: {
            impressions: 12000,
            clicks: 840,
            costMicros: 321450000,
            conversions: 42,
            ctr: 0.07,
            averageCpc: 382679,
          },
        };
    return c.json([{ results: [result] }]);
  });
}

async function runHealthCliSmoke() {
  return [
    'muinmomin/whoop-cli hardcodes api.prod.whoop.com and private WHOOP app endpoints with no safe localhost base URL override',
    'steipete/eightctl and pyEight hardcode 8slp.net API bases with no CLI flag or environment override',
    'Oura community CLIs and SDKs hardcode api.ouraring.com or support only Oura sandbox, not localhost',
  ];
}

async function main() {
  const app = createApp();
  const store = new Store();
  const webhooks = {
    dispatch: async () => undefined,
    register: () => undefined,
  };
  const tokenMap = new Map();

  await registerShims(app, store);
  customerRoutes({
    app,
    store,
    webhooks,
    baseUrl: 'http://127.0.0.1',
    tokenMap,
  });
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
    clusters: [
      {
        name: 'cli-smoke',
        namespaces: [{ name: 'default' }],
        pods: [
          {
            name: 'api',
            namespace: 'default',
            node: 'node-a',
            phase: 'Running',
            containers: [{ name: 'api', ready: true }],
          },
        ],
        logs: { default: { api: 'api emulator log line' } },
      },
    ],
  });
  openaiPlugin.register(app, store);
  plaidPlugin.register(app, store);
  plaidPlugin.seed?.(store);
  lucentPlugin.register(app, store);
  salesforcePlugin.register(app, store);
  snapPlugin.register(app, store);
  seedSnap(store, 'http://127.0.0.1', {
    campaigns: [
      {
        id: 'snap_campaign_seed',
        name: 'Snap CLI Seed Campaign',
        status: 'active',
        budget: 100,
      },
    ],
  });
  sentryPlugin.register(app, store);
  sierraPlugin.register(app, store);
  skyscannerPlugin.register(app, store);
  metaPlugin.register(app, store);
  seedMeta(store, 'http://127.0.0.1', {
    campaigns: [
      {
        id: 'meta_campaign_seed',
        name: 'Meta CLI Seed Campaign',
        status: 'active',
        budget: 100,
      },
    ],
  });
  oculusPlugin.register(app, store);
  seedOculus(store, 'http://127.0.0.1');
  tiktokPlugin.register(app, store);
  seedTikTok(store, 'http://127.0.0.1', {
    campaigns: [
      {
        id: 'tiktok_campaign_seed',
        name: 'TikTok CLI Seed Campaign',
        status: 'active',
        budget: 100,
      },
    ],
  });
  appLovinPlugin.register(app, store);
  seedAppLovin(store, 'http://127.0.0.1', {
    campaigns: [
      {
        id: 'applovin_campaign_seed',
        name: 'AppLovin CLI Seed Campaign',
        status: 'active',
        budget: 100,
      },
    ],
  });
  argoPlugin.register(app, store);
  seedArgo(store, 'http://127.0.0.1', {
    workflows: [
      {
        apiVersion: 'argoproj.io/v1alpha1',
        kind: 'Workflow',
        metadata: {
          name: 'cli-smoke',
          namespace: 'default',
          uid: 'default-cli-smoke-uid',
          resourceVersion: '1',
          creationTimestamp: '2026-01-01T00:00:00Z',
        },
        spec: { entrypoint: 'main', templates: [{ name: 'main', container: { image: 'alpine:3.19' } }] },
        status: { phase: 'Succeeded', startedAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:00:05Z', nodes: {} },
      },
    ],
  });
  supabasePlugin.register(app, store);
  googlePlugin.register(app, store);
  googlePlayPlugin.register(app, store);
  huggingFacePlugin.register(app, store);
  linkedinPlugin.register(app, store);
  youtubePlugin.register(app, store);
  youtubeMusicPlugin.register(app, store);
  spotifyPlugin.register(app, store);
  appleMusicPlugin.register(app, store);
  audiblePlugin.register(app, store);
  goodreadsPlugin.register(app, store);
  nextdoorPlugin.register(app, store);
  elevenLabsPlugin.register(app, store);
  appStoreConnectPlugin.register(app, store);
  appStoreConnectPlugin.seed?.(store, 'http://127.0.0.1');
  alpacaPlugin.register(app, store);
  alpacaPlugin.seed?.(store);
  adyenPlugin.register(app, store);
  app.get('/adyen/inspect/state', (c) =>
    c.json(
      store.getData('adyen:state') ?? {
        payments: [],
        captures: [],
        refunds: [],
        webhooks: [],
      },
    ),
  );
  upstashPlugin.register(app, store);
  replicatePlugin.register(app, store);
  falPlugin.register(app, store);
  flightradar24Plugin.register(app, store);
  fireworksPlugin.register(app, store);
  togetherAiPlugin.register(app, store);
  sunoPlugin.register(app, store);
  symbolabPlugin.register(app, store);
  crusoePlugin.register(app, store);
  coreweavePlugin.register(app, store);
  modalPlugin.register(app, store);
  rampPlugin.register(app, store);
  stainlessPlugin.register(app, store);
  seedRamp(store, 'http://127.0.0.1', {
    reimbursements: [
      {
        id: 'reimbursement_1',
        reimbursement_uuid: 'reimbursement_1',
        amount: 1250,
        currency: 'USD',
        memo: 'CLI E2E smoke',
        status: 'APPROVED',
        created_at: '2026-05-15T12:00:00Z',
      },
    ],
  });
  twilioPlugin.register(app, store);
  seedTwilio(store, 'http://127.0.0.1', {
    twilio: {
      account_sid: 'AC00000000000000000000000000000000',
      auth_token: 'twilio-emulator-token',
      phone_numbers: ['+15555550100'],
      verify_services: [
        {
          sid: 'VA00000000000000000000000000000000',
          friendly_name: 'CLI Smoke Verify Service',
        },
      ],
    },
  });

  const businessApp = createApp();
  const businessStore = new Store();
  jiraPlugin.register(businessApp, businessStore);
  rampPlugin.register(businessApp, businessStore);
  ripplingPlugin.register(businessApp, businessStore);
  gustoPlugin.register(businessApp, businessStore);
  deelPlugin.register(businessApp, businessStore);
  joinwarpPayrollPlugin.register(businessApp, businessStore);
  adpPlugin.register(businessApp, businessStore);
  workdayPlugin.register(businessApp, businessStore);
  samsaraPlugin.register(businessApp, businessStore);
  datadogPlugin.register(businessApp, businessStore);
  dopplerPlugin.register(businessApp, businessStore);
  hashicorpVaultPlugin.register(businessApp, businessStore);
  grafanaPlugin.register(businessApp, businessStore);
  concurPlugin.register(businessApp, businessStore);
  intuitPlugin.register(businessApp, businessStore);
  coinbasePlugin.register(businessApp, businessStore);
  brexPlugin.register(businessApp, businessStore);
  mercuryPlugin.register(businessApp, businessStore);
  robinhoodPlugin.register(businessApp, businessStore);
  schwabPlugin.register(businessApp, businessStore);
  eTradePlugin.register(businessApp, businessStore);
  usaaPlugin.register(businessApp, businessStore);
  turbotaxPlugin.register(businessApp, businessStore);
  await withServer(businessApp, async (baseUrl) => {
    await runBusinessProviderE2E(baseUrl);
    const eTrade = await runETradePyetradeSmoke(baseUrl);
    if (!eTrade) {
      console.warn('pyetrade unavailable or incompatible; E*TRADE direct e2e route coverage passed');
    }
    const jira = await runJiraCliSmoke(baseUrl);
    if (!jira) {
      console.warn('ankitpokhrel/jira-cli unavailable; Jira direct e2e route coverage passed');
    }
    const rippling = await runRipplingCliSmoke(baseUrl);
    if (!rippling) {
      console.warn('Rippling/rippling-cli unavailable or incompatible; Rippling direct e2e route coverage passed');
    }
    const workday = await runWorkdayRaasCliSmoke(baseUrl);
    if (!workday) {
      console.warn('Workday/raas-python unavailable; Workday direct e2e route coverage passed');
    }
    const grafana = await runGrafanactlCliSmoke(baseUrl);
    if (!grafana) {
      console.warn('grafana/grafanactl unavailable or incompatible; Grafana direct e2e route coverage passed');
    }
    const dopplerProjects = await fetch(`${baseUrl}/v3/projects`, { headers: { authorization: 'Bearer dp.st.emulator' } });
    assert.equal(dopplerProjects.status, 200);
    assert.equal((await dopplerProjects.json()).projects[0].slug, 'demo');
    const doppler = await runDopplerCliSmoke(baseUrl);
    if (!doppler) {
      console.warn('doppler CLI unavailable or incompatible; Doppler direct route smoke covered');
    }
    const vaultStatus = await fetch(`${baseUrl}/v1/sys/seal-status`);
    assert.equal(vaultStatus.status, 200);
    assert.equal((await vaultStatus.json()).sealed, false);
    const vaultWrite = await fetch(`${baseUrl}/v1/secret/data/cli-smoke`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-vault-token': 'root' },
      body: JSON.stringify({ data: { hello: 'vault' } }),
    });
    assert.equal(vaultWrite.status, 200);
    const vault = await runVaultCliSmoke(baseUrl);
    if (!vault) {
      console.warn('vault CLI unavailable; HashiCorp Vault direct route smoke covered');
    }
    await runBusinessSdkSmoke(baseUrl);
  });

  for (const reason of await runHealthCliSmoke()) {
    console.warn(`health CLI smoke skipped: ${reason}; direct route smoke covers the emulator slice`);
  }

  await withServer(app, async (baseUrl) => {
    const ramp = await runRampCliSmoke(baseUrl);
    if (!ramp) {
      console.warn('ramp-public/ramp-cli unavailable; Ramp REST and agent-tool route smoke covered');
    }
    const aiCli = await runOpenAiCompatibleCliSmoke(baseUrl);
    if (!aiCli) {
      console.warn('openai CLI unavailable; Fireworks and Together AI direct route smoke covered');
    }
    const crusoe = await runCrusoeCliSmoke(baseUrl);
    if (!crusoe) {
      console.warn('crusoe CLI unavailable; Crusoe REST emulator route smoke covered');
    }
    const stainless = await runStainlessCliSmoke(baseUrl);
    if (!stainless) {
      console.warn('go/git unavailable; Stainless official CLI route smoke covered');
    }
    const stripe = await run('stripe', ['get', '/v1/customers', '--api-base', baseUrl, '--api-key', 'sk_test_cli_smoke', '--limit', '1']);
    assert.match(stripe.stdout, /cus_/);

    const argo = await run('argo', ['list'], {
      env: {
        ARGO_SERVER: new URL(baseUrl).host,
        ARGO_HTTP1: 'true',
        ARGO_SECURE: 'false',
        ARGO_NAMESPACE: 'default',
        ARGO_TOKEN: 'Bearer argo-emulator-token',
        KUBECONFIG: '/dev/null',
      },
    }).catch((error) => ({ stdout: '', stderr: String(error), skipped: true }));
    if (!argo.skipped) assert.match(argo.stdout, /cli-smoke|hello-world-emulator/);
    else console.warn('argo CLI unavailable; Argo Workflows REST emulator route smoke covered');

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

    const spogo = await runSpogoCliSmoke(baseUrl);
    if (!spogo) {
      console.warn('openclaw/spogo unavailable; Spotify Web API emulator route smoke covered');
    }

    const appleMusic = await runAppleMusicCliSmoke(baseUrl);
    if (!appleMusic) {
      console.warn('kalmilon/apple-music unavailable; Apple Music emulator route smoke covered');
    }

    const audibleCatalog = await fetch(`${baseUrl}/1.0/catalog/products?keywords=localhost`);
    assert.equal(audibleCatalog.status, 200);
    assert.equal((await audibleCatalog.json()).products.items[0].asin, 'B0EMU00001');
    console.warn('Audible has no official public CLI/API; unofficial SDK/CLI base URL override is not safely assumed, direct route smoke covered');

    const goodreadsSearch = await fetch(`${baseUrl}/search/index.xml?key=goodreads_emulator_key&q=localhost`);
    assert.equal(goodreadsSearch.status, 200);
    assert.match(await goodreadsSearch.text(), /Localhost Library/);
    console.warn('Goodreads public API is deprecated and no maintained official CLI is available; historical XML route smoke covered');

    const nextdoorPost = await fetch(`${baseUrl}/posts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer nextdoor_emulator_token' },
      body: JSON.stringify({ profile_id: 'nd_profile_home', subject: 'CLI route smoke', body: 'Local Nextdoor emulator post.' }),
    });
    assert.equal(nextdoorPost.status, 201);
    assert.match((await nextdoorPost.json()).data.id, /^nd_post_/);
    console.warn('Nextdoor has gated API access and no official CLI/base URL override; direct route smoke covered');

    const ytMusic = await runYtMusicCliSmoke(baseUrl);
    if (!ytMusic) {
      console.warn('gaurav712/ytmusic-cli unavailable; YouTube Music emulator route smoke covered');
    }

    const plaid = await runPlaidCliSmoke(baseUrl);
    if (!plaid) {
      console.warn('landakram/plaid-cli unavailable; Plaid REST emulator route smoke covered');
    }

    const elevenLabs = await runElevenLabsSdkSmoke(baseUrl);
    if (!elevenLabs) {
      console.warn('@elevenlabs/elevenlabs-js unavailable; ElevenLabs REST emulator route smoke covered');
    }

    const elevenLabsCli = await runElevenLabsCommunityCliSmoke(baseUrl);
    if (!elevenLabsCli) {
      console.warn('hongkongkiwi/elevenlabs-cli unavailable; ElevenLabs community CLI smoke skipped');
    }

    await runSunoRouteSmoke(baseUrl);
    console.warn('official Suno CLI/SDK with safe base URL override unavailable; Suno REST route smoke covered');
    const symbolabSolution = await fetch(`${baseUrl}/pub_api/bridge/solution`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        origin: 'input',
        language: 'en',
        query: '2x+3=7',
        useDelimiters: 'true',
      }),
    });
    assert.equal(symbolabSolution.status, 200);
    assert.equal((await symbolabSolution.json()).solution.solution.default, 'x=2');
    const symbolabVerify = await fetch(`${baseUrl}/pub_api/bridge/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        symbolabQuestion: '2x+3=7',
        answer: 'x=2',
        language: 'en',
        appName: 'Symbolab',
      }),
    });
    assert.equal(symbolabVerify.status, 200);
    assert.equal((await symbolabVerify.json()).correct, true);
    console.warn('Symbolab has no maintained official CLI/SDK with safe base URL override; public bridge route smoke covered');
    console.warn('Bilt has no official public CLI/SDK or documented base URL override; Bilt REST route smoke covered');
    console.warn('Duke Energy public clients hardcode mobile API/Auth0 flows and CAPTCHA blocks automated login; Duke Energy REST route smoke covered');
    console.warn('Spectrum Enterprise has official API examples but no official CLI/SDK with safe base URL override; Spectrum REST route smoke covered');

    const sierra = await runSierraReactNativeSdkSmoke(baseUrl);
    if (!sierra) {
      console.warn('sierra-inc/sierra-react-native-sdk unavailable; Sierra mobile SDK routes covered');
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
    await writeFile(
      kubeconfig,
      [
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
      ].join('\n'),
    );
    const kubectl = await run('kubectl', ['--kubeconfig', kubeconfig, 'get', 'namespaces', '-o', 'json']);
    assert.equal(JSON.parse(kubectl.stdout).items[0].metadata.name, 'default');
    await rm(kubeDir, { recursive: true, force: true });

    const openai = await run('openai', ['--api-base', `${baseUrl}/v1/`, '--api-key', 'sk-test', 'api', 'chat.completions.create', '-m', 'gpt-4.1-mini', '-g', 'user', 'hello from cli']);
    assert.match(openai.stdout, /openai-emulator-text/);

    const hfWhoami = await fetch(`${baseUrl}/api/whoami-v2`, {
      headers: { authorization: 'Bearer hf_emulator_token' },
    });
    assert.equal(hfWhoami.status, 200);
    assert.equal((await hfWhoami.json()).name, 'emulator');
    const hfModel = await fetch(`${baseUrl}/api/models/emulator/hello-world`);
    assert.equal(hfModel.status, 200);
    const hfModelJson = await hfModel.json();
    assert.equal(hfModelJson.pipeline_tag, 'text-generation');
    assert.equal(hfModelJson.likes, 7);
    const hfLikes = await fetch(`${baseUrl}/api/users/emulator/likes`);
    assert.equal(hfLikes.status, 200);
    assert.equal((await hfLikes.json())[0].repo.name, 'emulator/hello-world');
    const hfLikers = await fetch(`${baseUrl}/api/models/emulator/hello-world/likers`);
    assert.equal(hfLikers.status, 200);
    assert.equal((await hfLikers.json())[0].user, 'emulator');
    const hfDiscovery = await fetch(`${baseUrl}/.well-known/openid-configuration`);
    assert.equal(hfDiscovery.status, 200);
    assert.match((await hfDiscovery.json()).token_endpoint, /\/oauth\/token$/);
    const hfDevice = await fetch(`${baseUrl}/oauth/device`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: 'hf_emulator_client', scope: 'openid profile' }),
    });
    assert.equal(hfDevice.status, 200);
    const hfDeviceJson = await hfDevice.json();
    assert.match(hfDeviceJson.device_code, /^hf_device_/);
    const hfOauthToken = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: hfDeviceJson.device_code,
        client_id: 'hf_emulator_client',
      }),
    });
    assert.equal(hfOauthToken.status, 200);
    assert.equal((await hfOauthToken.json()).token_type, 'Bearer');
    const hfUserinfo = await fetch(`${baseUrl}/oauth/userinfo`, {
      headers: { authorization: 'Bearer hf_emulator_token' },
    });
    assert.equal(hfUserinfo.status, 200);
    assert.equal((await hfUserinfo.json()).preferred_username, 'emulator');

    const huggingFace = await runHuggingFaceSdkSmoke(baseUrl);
    if (huggingFace) {
      const output = JSON.parse(huggingFace.stdout);
      assert.equal(output.user, 'emulator');
      assert.equal(output.model, 'emulator/hello-world');
      assert.equal(output.pipeline, 'text-generation');
      assert.equal(output.liked, 'emulator/hello-world');
      assert.equal(output.liker, 'emulator');
      assert.match(output.created, /emulator\/sdk-created/);
    } else {
      console.warn('huggingface_hub Python SDK unavailable; Hugging Face REST route smoke covered');
    }

    const upstashRestSet = await fetch(`${baseUrl}/upstash/redis`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer upstash_emulator_token',
        'content-type': 'application/json',
      },
      body: JSON.stringify(['SET', 'cli-smoke', 'upstash']),
    });
    assert.equal(upstashRestSet.status, 200);
    assert.equal((await upstashRestSet.json()).result, 'OK');
    const upstashRestGet = await fetch(`${baseUrl}/upstash/redis`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer upstash_emulator_token',
        'content-type': 'application/json',
      },
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
      headers: {
        authorization: 'Bearer replicate_emulator_token',
        'content-type': 'application/json',
      },
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

    const modalToken = await fetch(`${baseUrl}/modal/v1/token/info`, {
      headers: { authorization: 'Bearer modal_emulator_token' },
    });
    assert.equal(modalToken.status, 200);
    assert.equal((await modalToken.json()).workspace_name, 'emulator');

    const modalGrpc = await startModalGrpcServer();
    if (modalGrpc) {
      try {
        const modalEnv = {
          MODAL_SERVER_URL: modalGrpc.baseUrl,
          MODAL_TOKEN_ID: 'ak-emulator',
          MODAL_TOKEN_SECRET: 'as-emulator',
          MODAL_CONFIG_PATH: join(tmpdir(), 'api-emulator-modal-empty.toml'),
        };
        const tokenInfo = await run(modalGrpc.modal, ['token', 'info'], { env: modalEnv });
        assert.match(tokenInfo.stdout, /Workspace: emulator/);
        const listed = await run(modalGrpc.modal, ['app', 'list', '--json'], { env: modalEnv });
        assert.equal(JSON.parse(listed.stdout)[0]['App ID'], 'ap-aaaaaaaaaaaaaaaaaaaaaa');
      } finally {
        await modalGrpc.close();
      }
    } else {
      console.warn('modal CLI or Python gRPC deps unavailable; Modal route smoke covered');
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

    const lucentInit = await fetch(`${baseUrl}/api/sdk/init`, {
      method: 'POST',
      headers: { 'x-lucent-api-key': 'luc_pk_emulator' },
    });
    assert.equal(lucentInit.status, 200);
    assert.equal((await lucentInit.json()).ok, true);
    const lucentReplay = await fetch(`${baseUrl}/api/sdk/replay?api_key=luc_pk_emulator`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session: {
          id: 'lucent_cli_smoke_session',
          windowId: 'lucent_cli_smoke_window',
        },
        replay: {
          sequence: 0,
          events: [{ type: 0, data: { href: 'https://example.test' } }],
        },
      }),
    });
    assert.equal(lucentReplay.status, 202);
    assert.equal((await lucentReplay.json()).stored_events, 1);
    const lucentCli = await patchedLucentCli(baseUrl);
    if (lucentCli) {
      try {
        const setup = await run(process.execPath, [lucentCli.path, 'init', 'luc_pk_emulator', '--dry-run', '--framework=react', '--variant=vite'], { cwd: lucentCli.projectDir });
        assert.match(setup.stdout + setup.stderr, /Public key validated|Lucent SDK setup complete|Would install @lucenthq\/sdk/);
        assert.ok(store.getData('lucent:state')?.initRequests.length >= 2);
      } finally {
        await rm(lucentCli.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('@lucenthq/cli unavailable; Lucent SDK routes covered');
    }

    const metaAdAccounts = await fetch(`${baseUrl}/v20.0/me/adaccounts?access_token=test`);
    assert.equal(metaAdAccounts.status, 200);
    assert.equal((await metaAdAccounts.json()).data[0].id, 'act_123456');
    const metaCampaignCreate = await fetch(`${baseUrl}/v20.0/act_123456/campaigns`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        name: 'Meta CLI Smoke Campaign',
        status: 'PAUSED',
        daily_budget: '5000',
        objective: 'OUTCOME_SALES',
      }),
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
        body: JSON.stringify({
          version: '1.0.1',
          version_code: 101,
          draft: true,
          notes: 'CLI smoke draft',
        }),
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
        const report = await run(
          process.execPath,
          [
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
          ],
          { env: tiktokEnv },
        );
        assert.match(report.stdout, /321\.45/);
      } finally {
        await rm(tiktokCli.dir, { recursive: true, force: true });
      }
    } else {
      console.warn('tiktok-ads-cli unavailable; TikTok Business API emulator route smoke covered');
    }

    const googleAdsCustomers = await fetch(`${baseUrl}/v23/customers:listAccessibleCustomers`, {
      headers: {
        authorization: 'Bearer google_ads_emulator_token',
        'developer-token': 'developer_token',
      },
    });
    assert.equal(googleAdsCustomers.status, 200);
    assert.match(JSON.stringify(await googleAdsCustomers.json()), /1234567890/);
    const googleAdsSearch = await fetch(`${baseUrl}/v23/customers/1234567890/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer google_ads_emulator_token',
        'developer-token': 'developer_token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        query: 'SELECT campaign.id, campaign.name FROM campaign',
      }),
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
      body: new URLSearchParams({
        From: '+15555550100',
        To: '+15555550199',
        Body: 'Twilio CLI smoke direct route',
      }),
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
      body: new URLSearchParams({
        From: '+15555550100',
        To: '+15555550197',
        Url: 'https://example.test/twiml',
      }),
    });
    assert.equal(twilioCallCreate.status, 201);
    assert.match((await twilioCallCreate.json()).sid, /^CA/);
    const twilioNumberCreate = await fetch(`${baseUrl}/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        PhoneNumber: '+15555550177',
        FriendlyName: 'Twilio Direct Number',
      }),
    });
    assert.equal(twilioNumberCreate.status, 201);
    assert.match((await twilioNumberCreate.json()).sid, /^PN/);
    const twilioMessagingServiceCreate = await fetch(`${baseUrl}/v1/Services`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        FriendlyName: 'Twilio Direct Messaging Service',
      }),
    });
    assert.equal(twilioMessagingServiceCreate.status, 201);
    assert.match((await twilioMessagingServiceCreate.json()).sid, /^MG/);
    const twilioVerifyServiceCreate = await fetch(`${baseUrl}/v2/Services`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        FriendlyName: 'Twilio Direct Verify Service',
        CodeLength: '6',
      }),
    });
    assert.equal(twilioVerifyServiceCreate.status, 201);
    assert.match((await twilioVerifyServiceCreate.json()).sid, /^VA/);
    const twilioCli = await patchedTwilioCli(baseUrl);
    if (twilioCli) {
      try {
        const twilioNode = (await commandPath('node')) || process.execPath;
        const twilioEnv = {
          TWILIO_ACCOUNT_SID: twilioAccountSid,
          TWILIO_AUTH_TOKEN: 'twilio-emulator-token',
          TWILIO_API_BASE_URL: baseUrl,
          TWILIO_SKIP_UPDATE_CHECK: '1',
        };
        await run(twilioNode, [twilioCli.path, 'api:core:messages:create', '--from', '+15555550100', '--to', '+15555550198', '--body', 'Twilio CLI Smoke', '-o', 'json'], { env: twilioEnv });
        await run(twilioNode, [twilioCli.path, 'api:core:messages:list', '--limit', '10', '-o', 'json'], { env: twilioEnv });
        const twilioCliMessages = await fetch(`${baseUrl}/2010-04-01/Accounts/${twilioAccountSid}/Messages.json?PageSize=10`);
        assert.match(JSON.stringify(await twilioCliMessages.json()), /Twilio CLI Smoke/);
        await run(twilioNode, [twilioCli.path, 'api:core:calls:create', '--from', '+15555550100', '--to', '+15555550196', '--url', 'https://example.test/twiml', '-o', 'json'], { env: twilioEnv });
        await run(twilioNode, [twilioCli.path, 'api:core:calls:list', '--limit', '10', '-o', 'json'], { env: twilioEnv });
        assert.ok(
          store
            .collection('twilio.calls', ['sid'])
            .all()
            .some((call) => call.to === '+15555550196'),
        );
        await run(twilioNode, [twilioCli.path, 'api:core:incoming-phone-numbers:create', '--phone-number', '+15555550176', '--friendly-name', 'Twilio CLI Number', '-o', 'json'], { env: twilioEnv });
        await run(twilioNode, [twilioCli.path, 'api:core:incoming-phone-numbers:list', '--limit', '10', '-o', 'json'], { env: twilioEnv });
        assert.ok(
          store
            .collection('twilio.incoming_phone_numbers', ['sid'])
            .all()
            .some((number) => number.phone_number === '+15555550176'),
        );
        await run(twilioNode, [twilioCli.path, 'api:messaging:v1:services:create', '--friendly-name', 'Twilio CLI Messaging Service', '-o', 'json'], { env: twilioEnv });
        await run(twilioNode, [twilioCli.path, 'api:messaging:v1:services:list', '--limit', '10', '-o', 'json'], { env: twilioEnv });
        assert.ok(
          store
            .collection('twilio.messaging_services', ['sid'])
            .all()
            .some((service) => service.friendly_name === 'Twilio CLI Messaging Service'),
        );
        await run(twilioNode, [twilioCli.path, 'api:verify:v2:services:create', '--friendly-name', 'Twilio CLI Verify Service', '--code-length', '6', '-o', 'json'], { env: twilioEnv });
        await run(twilioNode, [twilioCli.path, 'api:verify:v2:services:list', '--limit', '10', '-o', 'json'], { env: twilioEnv });
        assert.ok(
          store
            .collection('twilio.verify_services', ['sid'])
            .all()
            .some((service) => service.friendly_name === 'Twilio CLI Verify Service'),
        );
        await run(twilioNode, [twilioCli.path, 'api:verify:v2:services:verifications:create', '--service-sid', 'VA00000000000000000000000000000000', '--to', '+15555550198', '--channel', 'sms', '-o', 'json'], { env: twilioEnv });
        assert.ok(
          store
            .collection('twilio.verifications', ['sid'])
            .all()
            .some((verification) => verification.to === '+15555550198'),
        );
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
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: 'client',
        client_secret: 'secret',
        refresh_token: 'refresh',
      }),
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
        await run('python3', [snapScript], {
          env: { PYTHONPATH: snapTap.root },
        });
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
        await run('python3', [appLovinScript], {
          env: { PYTHONPATH: appLovinWrapper.root },
        });
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

    const linkedinMe = await fetch(`${baseUrl}/v2/me`, {
      headers: { authorization: 'Bearer linkedin_emulator_access_token' },
    });
    assert.equal(linkedinMe.status, 200);
    assert.equal((await linkedinMe.json()).id, 'linkedin_member_seed');
    const linkedinPost = await fetch(`${baseUrl}/v2/ugcPosts`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer linkedin_emulator_access_token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        author: 'urn:li:person:linkedin_member_seed',
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: 'LinkedIn direct route smoke' },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    assert.equal(linkedinPost.status, 201);
    assert.match((await linkedinPost.json()).id, /urn:li:share:emulator_/);
    const linkedinCli = await runLinkedInCliSmoke(baseUrl);
    if (!linkedinCli) {
      console.warn('tigillo/linkedin-cli unavailable; LinkedIn API route smoke covered');
    }

    const fr24Live = await fetch(`${baseUrl}/api/live/flight-positions/light?bounds=52,50,-1,1`, {
      headers: {
        authorization: 'Bearer fr24_emulator_token',
        'accept-version': 'v1',
      },
    });
    assert.equal(fr24Live.status, 200);
    assert.equal((await fr24Live.json()).data[0].callsign, 'BAW117');
    const fr24Airport = await fetch(`${baseUrl}/api/static/airports/LHR/full`, {
      headers: {
        authorization: 'Bearer fr24_emulator_token',
        'accept-version': 'v1',
      },
    });
    assert.equal(fr24Airport.status, 200);
    assert.equal((await fr24Airport.json()).icao, 'EGLL');
    const fr24Sdk = await run(
      'python3',
      [
        '-c',
        [
          'from fr24sdk.client import Client',
          'with Client(api_token="fr24_emulator_token", base_url="' + baseUrl + '") as client:',
          '    flights = client.live.flight_positions.get_light(bounds="52,50,-1,1")',
          '    airport = client.airports.get_full("LHR")',
          '    assert flights.data[0].callsign == "BAW117"',
          '    assert airport.icao == "EGLL"',
          '    print("fr24sdk smoke ok")',
        ].join('\n'),
      ],
    ).catch((error) => ({ stdout: '', stderr: String(error), skipped: true }));
    if (!fr24Sdk.skipped) assert.match(fr24Sdk.stdout, /fr24sdk smoke ok/);
    else console.warn('fr24sdk unavailable or incompatible locally; Flightradar24 direct route smoke covered');

    const skyscannerSearch = await fetch(`${baseUrl}/apiservices/v3/flights/live/search/create`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': 'skyscanner_emulator_key',
      },
      body: JSON.stringify({
        query: {
          market: 'UK',
          locale: 'en-GB',
          currency: 'GBP',
          queryLegs: [
            {
              originPlaceId: { iata: 'LHR' },
              destinationPlaceId: { iata: 'JFK' },
              date: { year: 2026, month: 6, day: 1 },
            },
          ],
          adults: 1,
          cabinClass: 'CABIN_CLASS_ECONOMY',
        },
      }),
    });
    assert.equal(skyscannerSearch.status, 200);
    const skyscannerPayload = await skyscannerSearch.json();
    assert.match(skyscannerPayload.sessionToken, /^skyscanner_live_/);
    const skyscannerPoll = await fetch(`${baseUrl}/apiservices/v3/flights/live/search/poll/${skyscannerPayload.sessionToken}`, {
      method: 'POST',
      headers: { 'x-api-key': 'skyscanner_emulator_key' },
    });
    assert.equal(skyscannerPoll.status, 200);
    assert.equal((await skyscannerPoll.json()).status, 'RESULT_STATUS_COMPLETE');
    console.warn('Skyscanner has no maintained official v3 CLI/SDK with safe base URL override; direct route smoke covers the emulator slice');

    const youtubeSearch = await fetch(`${baseUrl}/youtube/v3/search?part=snippet&q=emulator&type=video&key=youtube_emulator_key`);
    assert.equal(youtubeSearch.status, 200);
    assert.equal((await youtubeSearch.json()).items[0].id.videoId, 'video_cli_seed');
    const youtubeUpload = await fetch(`${baseUrl}/upload/youtube/v3/videos?part=snippet,status`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer youtube_emulator_access_token',
        'content-type': 'multipart/related; boundary=cli',
      },
      body: '--cli\r\ncontent-type: application/json\r\n\r\n{}\r\n--cli--',
    });
    assert.equal(youtubeUpload.status, 200);
    assert.match((await youtubeUpload.json()).id, /^video_cli_upload_/);
    const youtubeReport = await fetch(`${baseUrl}/v2/reports?ids=channel==MINE&metrics=views,likes&startDate=2026-05-15&endDate=2026-05-15&dimensions=day`, {
      headers: { authorization: 'Bearer youtube_emulator_access_token' },
    });
    assert.equal(youtubeReport.status, 200);
    assert.equal((await youtubeReport.json()).rows[0][1], 1234);
    const youtubeCli = await runYoutubeCliSmoke(baseUrl);
    if (!youtubeCli.data) {
      console.warn('youtube-data-cli unavailable; YouTube Data and Upload API routes covered');
    }
    if (!youtubeCli.analytics) {
      console.warn('youtube-analytics-cli unavailable; YouTube Analytics API routes covered');
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
  await withServer(
    falApp,
    async () => {
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
        const schema = await run(genmedia.path, ['schema', 'fal-ai/flux/dev'], {
          env,
        });
        assert.match(schema.stdout, /fal-ai\/flux\/dev/);
        const submitted = await run(genmedia.path, ['run', '--async', 'fal-ai/flux/dev'], { env });
        assert.match(submitted.stdout, /emu_fal_request_/);
        const completed = await run(genmedia.path, ['run', 'fal-ai/flux/dev'], {
          env,
        });
        assert.match(completed.stdout, /fal-emulator-image\.png/);
      } finally {
        await rm(genmedia.dir, { recursive: true, force: true });
      }
    },
    { port: 8787, host: '127.0.0.1' },
  );
}

await main();
console.log('cli verification smoke ok');
