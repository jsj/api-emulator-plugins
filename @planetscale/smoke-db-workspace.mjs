import { spawn } from 'node:child_process';
import { deleteBranch, execSql } from './local-mysql/branch.mjs';
import { registerRoutes } from './src/routes/http.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createHarness() {
  const routes = new Map();
  const data = new Map();
  const app = {
    get: (path, handler) => routes.set(`GET ${path}`, handler),
    post: (path, handler) => routes.set(`POST ${path}`, handler),
  };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  registerRoutes(app, store, { provider: 'planetscale' });
  return {
    async call(method, path, body = {}, params = {}, query = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: {
          json: async () => body,
          header: () => undefined,
          param: (name) => params[name],
          query: (name) => query[name],
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
      });
      return { status, payload };
    },
  };
}

function commandAvailable(command) {
  return new Promise((resolve) => {
    const child = spawn('which', [command], { stdio: 'ignore' });
    child.on('exit', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

async function scalar(db, sql) {
  const out = await execSql(db, sql);
  return out.split('\n')[1]?.trim() ?? '';
}

if (process.env.RUN_DB_WORKSPACE_TESTS !== '1') {
  console.log('Skipping PlanetScale DB workspace smoke. Set RUN_DB_WORKSPACE_TESTS=1 to run container-backed checks.');
  process.exit(0);
}

if (!(await commandAvailable('container')) && !(await commandAvailable('docker'))) {
  console.log('Skipping PlanetScale DB workspace smoke because neither Apple container nor Docker is installed.');
  process.exit(0);
}

const harness = createHarness();
let mainDb;
let branchDb;

try {
  const databaseResponse = await harness.call('POST', '/organizations/:org/databases', { name: 'emulator_smoke' }, { org: 'emu' });
  mainDb = databaseResponse.payload.database_name;
  await execSql(mainDb, 'create table parent_items (id int primary key, value varchar(255)); insert into parent_items values (1, \'parent\');');

  const branchResponse = await harness.call('POST', '/organizations/:org/databases/:database/branches', { name: 'agent_smoke' }, { org: 'emu', database: 'emulator_smoke' });
  branchDb = branchResponse.payload.database_name;
  const passwordResponse = await harness.call('POST', '/organizations/:org/databases/:database/branches/:branch/passwords', { name: 'default' }, { org: 'emu', database: 'emulator_smoke', branch: 'agent_smoke' });
  assert(passwordResponse.payload.host === '127.0.0.1', 'password route should return local credentials');
  assert(passwordResponse.payload.database === branchDb, 'password route should target branch database');

  await execSql(branchDb, 'create table branch_only (id int primary key, value varchar(255)); insert into branch_only values (1, \'branch\');');
  assert(await scalar(branchDb, 'select count(*) as count from branch_only') === '1', 'PlanetScale branch should accept SQL migrations');
  assert(await scalar(mainDb, "select count(*) as count from information_schema.tables where table_schema = database() and table_name = 'branch_only'") === '0', 'PlanetScale branch migration should not affect parent database');

  const deployResponse = await harness.call('POST', '/organizations/:org/databases/:database/deploy-requests', { branch: 'agent_smoke' }, { org: 'emu', database: 'emulator_smoke' });
  assert(deployResponse.payload.diff.schema.addedTables.includes('branch_only'), 'deploy request diff should include branch-only table');
  const normalizedDiff = await harness.call('GET', '/_emu/db/planetscale/databases/:id/branches/:branch/diff', {}, { id: 'emulator_smoke', branch: 'agent_smoke' });
  assert(normalizedDiff.payload.schema.addedTables.includes('branch_only'), 'normalized PlanetScale diff route should include branch-only table');
  const normalizedExport = await harness.call('GET', '/_emu/db/planetscale/databases/:id/branches/:branch/export', {}, { id: 'emulator_smoke', branch: 'agent_smoke' });
  assert(normalizedExport.payload.sql.includes('branch_only'), 'normalized PlanetScale export route should include branch schema');

  console.log('PlanetScale DB workspace smoke passed.');
} finally {
  if (branchDb) await deleteBranch(branchDb).catch(() => undefined);
  if (mainDb) await deleteBranch(mainDb).catch(() => undefined);
}
