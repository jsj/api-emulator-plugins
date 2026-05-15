import { spawn } from 'node:child_process';
import { branch, deleteBranch, diffBranch, execSql, start } from './local-postgres/branch.mjs';
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
    delete: (path, handler) => routes.set(`DELETE ${path}`, handler),
  };
  const store = {
    getData: (key) => data.get(key),
    setData: (key, value) => data.set(key, value),
  };
  registerRoutes(app, store, { provider: 'supabase' });
  return {
    async call(method, path, body = {}, params = {}) {
      const handler = routes.get(`${method} ${path}`);
      assert(handler, `missing route ${method} ${path}`);
      let status = 200;
      let payload;
      await handler({
        req: {
          json: async () => body,
          header: () => undefined,
          param: (name) => params[name],
          query: () => undefined,
        },
        json: (value, nextStatus = 200) => {
          status = nextStatus;
          payload = value;
          return { status, payload };
        },
        body: (value, nextStatus = 200) => {
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
  console.log('Skipping Supabase DB workspace smoke. Set RUN_DB_WORKSPACE_TESTS=1 to run container-backed checks.');
  process.exit(0);
}

if (!(await commandAvailable('container')) && !(await commandAvailable('docker'))) {
  console.log('Skipping Supabase DB workspace smoke because neither Apple container nor Docker is installed.');
  process.exit(0);
}

const branchName = `agent_branch_smoke_${Date.now()}`;

try {
  await start();

  assert(await scalar('postgres', "select to_regprocedure('auth.uid()') is not null") === 't', 'auth.uid() should exist');
  assert(Number(await scalar('postgres', 'select count(*) from pg_policies')) > 0, 'RLS policies should be visible');
  assert(Number(await scalar('postgres', 'select count(*) from storage.buckets')) > 0, 'storage.buckets should be queryable');
  assert(Number(await scalar('postgres', 'select count(*) from storage.objects')) > 0, 'storage.objects should be queryable');

  const harness = createHarness();
  const bucketId = `agent-smoke-${Date.now()}`;
  const objectName = 'route-object.txt';
  await harness.call('POST', '/storage/v1/bucket', { id: bucketId, name: bucketId, public: true }, {});
  await harness.call('POST', '/storage/v1/object/:bucket/:path', { content: 'route-backed', metadata: { size: '12', mimetype: 'text/plain' } }, { bucket: bucketId, path: objectName });
  assert(await scalar('postgres', `select count(*) from storage.buckets where id = '${bucketId}'`) === '1', 'storage bucket route should insert into Postgres');
  assert(await scalar('postgres', `select count(*) from storage.objects where bucket_id = '${bucketId}' and name = '${objectName}'`) === '1', 'storage object route should insert into Postgres');

  await branch('postgres', branchName);
  await execSql(branchName, 'create table public.agent_smoke_table (id serial primary key, value text); insert into public.agent_smoke_table (value) values (\'branch-only\');');

  const parentTableExists = await scalar('postgres', "select to_regclass('public.agent_smoke_table') is not null");
  const branchRows = await scalar(branchName, 'select count(*) from public.agent_smoke_table');
  assert(parentTableExists === 'f', 'branch table should not affect parent database');
  assert(branchRows === '1', 'branch should contain migrated data');

  const diff = await diffBranch(branchName);
  assert(diff.schema.addedTables.includes('public.agent_smoke_table'), 'diff should include added branch table');
  const normalizedDiff = await harness.call('GET', '/_emu/db/supabase/databases/:id/branches/:branch/diff', {}, { id: 'postgres', branch: branchName });
  assert(normalizedDiff.payload.schema.addedTables.includes('public.agent_smoke_table'), 'normalized Supabase diff route should include added branch table');
  const normalizedExport = await harness.call('GET', '/_emu/db/supabase/databases/:id/branches/:branch/export', {}, { id: 'postgres', branch: branchName });
  assert(normalizedExport.payload.sql.includes('agent_smoke_table'), 'normalized Supabase export route should include branch schema');

  console.log('Supabase DB workspace smoke passed.');
} finally {
  await deleteBranch(branchName).catch(() => undefined);
}
