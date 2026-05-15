import { spawn } from 'node:child_process';
import { deleteBranch, execSql } from '../@supabase/local-postgres/branch.mjs';
import { registerRoutes } from './src/routes/http.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function scalar(db, sql) {
  const out = await execSql(db, `copy (${sql}) to stdout`);
  return out.trim();
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
  registerRoutes(app, store, { provider: 'neon' });
  return {
    data,
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

if (process.env.RUN_DB_WORKSPACE_TESTS !== '1') {
  console.log('Skipping Neon DB workspace smoke. Set RUN_DB_WORKSPACE_TESTS=1 to run container-backed checks.');
  process.exit(0);
}

if (!(await commandAvailable('container')) && !(await commandAvailable('docker'))) {
  console.log('Skipping Neon DB workspace smoke because neither Apple container nor Docker is installed.');
  process.exit(0);
}

const harness = createHarness();
let branchDb;

try {
  const projectResponse = await harness.call('POST', '/projects', { project: { name: 'emulator-smoke' } });
  const projectId = projectResponse.payload.project.id;
  const branchResponse = await harness.call('POST', '/projects/:projectId/branches', { branch: { name: 'agent-smoke' } }, { projectId });
  const branch = branchResponse.payload.branch;
  branchDb = branch.database_name;

  assert(branch.connection_uri.endsWith(`/${branchDb}`), 'branch response should include a working database URI');
  await harness.call('POST', '/projects/:projectId/branches/:branchId/databases', { database: { name: 'neondb' } }, { projectId, branchId: branch.id });
  await harness.call('POST', '/projects/:projectId/branches/:branchId/roles', { role: { name: 'neondb_owner' } }, { projectId, branchId: branch.id });
  const uriResponse = await harness.call('GET', '/projects/:projectId/connection_uri', {}, { projectId }, { branch_id: branch.id });
  assert(uriResponse.payload.uri.endsWith(`/${branchDb}`), 'connection_uri should target the physical branch database');

  await execSql(branchDb, 'create table public.neon_smoke_table (id serial primary key, value text); insert into public.neon_smoke_table (value) values (\'branch-only\');');
  assert(await scalar(branchDb, 'select count(*) from public.neon_smoke_table') === '1', 'Neon branch should accept SQL migrations');
  assert(await scalar('postgres', "select to_regclass('public.neon_smoke_table') is not null") === 'f', 'Neon branch migration should not affect parent database');
  const normalizedDiff = await harness.call('GET', '/_emu/db/neon/databases/:id/branches/:branch/diff', {}, { id: projectId, branch: branch.id });
  assert(normalizedDiff.payload.provider === 'neon', 'normalized Neon diff route should use the Neon provider shape');
  assert(normalizedDiff.payload.schema.addedTables.includes('public.neon_smoke_table'), 'normalized Neon diff route should include added branch table');

  console.log('Neon DB workspace smoke passed.');
} finally {
  if (branchDb) await deleteBranch(branchDb).catch(() => undefined);
}
