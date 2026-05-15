import { spawn } from 'node:child_process';
import { branch, deleteBranch, diffBranch, execSql, start } from './local-postgres/branch.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function scalar(db, sql) {
  const out = await execSql(db, `copy (${sql}) to stdout`);
  return out.trim();
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

  await branch('postgres', branchName);
  await execSql(branchName, 'create table public.agent_smoke_table (id serial primary key, value text); insert into public.agent_smoke_table (value) values (\'branch-only\');');

  const parentTableExists = await scalar('postgres', "select to_regclass('public.agent_smoke_table') is not null");
  const branchRows = await scalar(branchName, 'select count(*) from public.agent_smoke_table');
  assert(parentTableExists === 'f', 'branch table should not affect parent database');
  assert(branchRows === '1', 'branch should contain migrated data');

  const diff = await diffBranch(branchName);
  assert(diff.schema.addedTables.includes('public.agent_smoke_table'), 'diff should include added branch table');

  console.log('Supabase DB workspace smoke passed.');
} finally {
  await deleteBranch(branchName).catch(() => undefined);
}
