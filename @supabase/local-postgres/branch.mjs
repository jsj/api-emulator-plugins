import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(root, 'seed.sql');
const name = process.env.SUPABASE_PG_CONTAINER ?? 'api-emulator-supabase-postgres';
const image = process.env.SUPABASE_PG_IMAGE ?? 'postgres:16-alpine';
const port = process.env.SUPABASE_PG_PORT ?? '55432';
const password = process.env.SUPABASE_PG_PASSWORD ?? 'postgres';
const database = process.env.SUPABASE_PG_DATABASE ?? 'postgres';
const user = process.env.SUPABASE_PG_USER ?? 'postgres';
let selectedRuntime;

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const stdio = options.capture
      ? [options.input ? 'pipe' : 'ignore', 'pipe', 'pipe']
      : [options.input ? 'pipe' : 'inherit', 'inherit', 'inherit'];
    const child = spawn(command, args, { stdio, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => stdout += chunk);
    child.stderr?.on('data', (chunk) => stderr += chunk);
    if (options.input) child.stdin?.end(options.input);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}\n${stderr}`));
    });
    child.on('error', reject);
  });
}

async function commandWorks(command, args) {
  try {
    await run(command, args, { capture: true });
    return true;
  } catch {
    return false;
  }
}

async function resolveRuntime() {
  if (selectedRuntime) return selectedRuntime;
  const requested = process.env.SUPABASE_PG_RUNTIME ?? 'auto';
  if (requested !== 'auto') {
    selectedRuntime = requested;
    return selectedRuntime;
  }
  if (await commandWorks('container', ['ls', '--all', '--format', 'json'])) {
    selectedRuntime = 'container';
  } else if (await commandWorks('docker', ['info'])) {
    selectedRuntime = 'docker';
  } else if (await commandWorks('which', ['container'])) {
    selectedRuntime = 'container';
  } else {
    selectedRuntime = 'docker';
  }
  return selectedRuntime;
}

async function runtime(args, options) {
  return run(await resolveRuntime(), args, options);
}

async function ensureRuntimeStarted() {
  if (await resolveRuntime() !== 'container') return;
  if (await commandWorks('container', ['ls', '--all', '--format', 'json'])) return;
  await run('container', ['system', 'start', '--timeout', '60', '--disable-kernel-install']);
}

async function execInContainer(args, options = {}) {
  const runtimeName = await resolveRuntime();
  const execArgs = ['exec'];
  const { env = [], ...runOptions } = options;
  if (options.input) execArgs.push('-i');
  for (const value of env) execArgs.push('-e', value);
  execArgs.push(name, ...args);
  return run(runtimeName, execArgs, runOptions);
}

async function containerExists() {
  if (await resolveRuntime() === 'docker') {
    const out = await runtime(['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.Names}}'], { capture: true });
    return out.split('\n').includes(name);
  }
  const out = await runtime(['ls', '--all', '--format', 'json'], { capture: true });
  try {
    const containers = JSON.parse(out || '[]');
    return containers.some((container) => [container.id, container.name, container.names, container.configuration?.id].flat().includes(name));
  } catch {
    return out.includes(name);
  }
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await execInContainer(['pg_isready', '-U', user, '-d', database], { capture: true });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('Postgres did not become ready in time.');
}

async function start() {
  await ensureRuntimeStarted();
  if (!(await containerExists())) {
    await runtime([
      'run',
      '-d',
      '--name', name,
      '-p', `${port}:5432`,
      '-e', `POSTGRES_PASSWORD=${password}`,
      '-e', `POSTGRES_USER=${user}`,
      '-e', `POSTGRES_DB=${database}`,
      image,
    ]);
  } else {
    await runtime(['start', name]).catch(() => undefined);
  }
  await waitForPostgres();
  const seed = await readFile(seedPath, 'utf8');
  await execInContainer(['psql', '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-f', '-'], {
    env: [`PGPASSWORD=${password}`],
    input: seed,
  });
  printEnv(database);
}

async function branch(source, target) {
  if (!source || !target) throw new Error('Usage: node @supabase/local-postgres/branch.mjs branch <source_db> <target_db>');
  assertDatabaseName(source);
  assertDatabaseName(target);
  await waitForPostgres();
  await execInContainer(['dropdb', '-U', user, '--if-exists', target], { env: [`PGPASSWORD=${password}`] });
  await execInContainer(['createdb', '-U', user, '-T', source, target], { env: [`PGPASSWORD=${password}`] });
  printEnv(target);
}

function assertDatabaseName(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value)) {
    throw new Error(`Invalid database name: ${value}`);
  }
}

async function psql(db, args, options) {
  assertDatabaseName(db);
  await waitForPostgres();
  return execInContainer(['psql', '-U', user, '-d', db, ...args], { ...options, env: [`PGPASSWORD=${password}`] });
}

async function queryJson(db, sql) {
  const out = await psql(db, ['-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { capture: true });
  return out ? JSON.parse(out) : null;
}

async function execSql(db, sql) {
  return psql(db, ['-v', 'ON_ERROR_STOP=1', '-c', sql], { capture: true });
}

async function listBranches() {
  return queryJson('postgres', `
    select coalesce(json_agg(json_build_object('name', datname) order by datname), '[]'::json)::text
    from pg_database
    where datname like 'agent\\_branch\\_%' escape '\\'
  `);
}

async function deleteBranch(target) {
  assertDatabaseName(target);
  await waitForPostgres();
  await execInContainer(['dropdb', '-U', user, '--if-exists', target], { env: [`PGPASSWORD=${password}`] });
}

async function schemaSnapshot(db) {
  return queryJson(db, `
    with tables as (
      select table_schema, table_name
      from information_schema.tables
      where table_type = 'BASE TABLE'
        and table_schema not in ('pg_catalog', 'information_schema')
    ),
    indexes as (
      select schemaname, tablename, indexname, indexdef
      from pg_indexes
      where schemaname not in ('pg_catalog', 'information_schema')
    ),
    policies as (
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
    )
    select json_build_object(
      'tables', coalesce((select json_agg(t order by table_schema, table_name) from tables t), '[]'::json),
      'indexes', coalesce((select json_agg(i order by schemaname, tablename, indexname) from indexes i), '[]'::json),
      'policies', coalesce((select json_agg(p order by schemaname, tablename, policyname) from policies p), '[]'::json)
    )::text
  `);
}

async function rowCounts(db) {
  const tables = await queryJson(db, `
    select coalesce(json_agg(json_build_object('schema', table_schema, 'name', table_name) order by table_schema, table_name), '[]'::json)::text
    from information_schema.tables
    where table_type = 'BASE TABLE'
      and table_schema not in ('pg_catalog', 'information_schema')
  `);
  const counts = {};
  for (const table of tables) {
    const key = `${table.schema}.${table.name}`;
    const count = await psql(db, ['-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', `select count(*) from "${table.schema}"."${table.name}"`], { capture: true });
    counts[key] = Number(count);
  }
  return counts;
}

function added(left, right, key) {
  const leftSet = new Set(left.map(key));
  return right.filter((item) => !leftSet.has(key(item)));
}

function changed(left, right, key) {
  const leftMap = new Map(left.map((item) => [key(item), JSON.stringify(item)]));
  return right.filter((item) => leftMap.has(key(item)) && leftMap.get(key(item)) !== JSON.stringify(item));
}

async function diffBranch(branchName, parent = 'postgres') {
  assertDatabaseName(branchName);
  assertDatabaseName(parent);
  const [parentSchema, branchSchema, parentCounts, branchCounts] = await Promise.all([
    schemaSnapshot(parent),
    schemaSnapshot(branchName),
    rowCounts(parent),
    rowCounts(branchName),
  ]);
  const tableKey = (table) => `${table.table_schema}.${table.table_name}`;
  const indexKey = (index) => `${index.schemaname}.${index.tablename}.${index.indexname}`;
  const policyKey = (policy) => `${policy.schemaname}.${policy.tablename}.${policy.policyname}`;
  const changedTables = Object.keys({ ...parentCounts, ...branchCounts })
    .filter((name) => parentCounts[name] !== branchCounts[name])
    .map((name) => ({ name, parentRows: parentCounts[name] ?? 0, branchRows: branchCounts[name] ?? 0 }));
  return {
    provider: 'supabase',
    database: parent,
    branch: branchName,
    schema: {
      addedTables: added(parentSchema.tables, branchSchema.tables, tableKey).map(tableKey),
      removedTables: added(branchSchema.tables, parentSchema.tables, tableKey).map(tableKey),
      changedTables: [],
      addedIndexes: added(parentSchema.indexes, branchSchema.indexes, indexKey).map(indexKey),
      removedIndexes: added(branchSchema.indexes, parentSchema.indexes, indexKey).map(indexKey),
      changedPolicies: changed(parentSchema.policies, branchSchema.policies, policyKey).map(policyKey),
    },
    data: { changedTables },
  };
}

async function promoteBranch(branchName, parent = 'postgres') {
  assertDatabaseName(branchName);
  assertDatabaseName(parent);
  await waitForPostgres();
  await execInContainer([
    'sh',
    '-c',
    `pg_dump -U "$PGUSER" --clean --if-exists --no-owner --no-privileges ${branchName} | psql -U "$PGUSER" -v ON_ERROR_STOP=1 -d ${parent}`,
  ], { env: [`PGPASSWORD=${password}`, `PGUSER=${user}`] });
}

async function reset() {
  await ensureRuntimeStarted();
  if (await containerExists()) {
    if (await resolveRuntime() === 'docker') await runtime(['rm', '-f', name]);
    else await runtime(['rm', '--force', name]);
  }
}

function printEnv(db) {
  const url = `postgres://${user}:${password}@127.0.0.1:${port}/${db}`;
  console.log(`SUPABASE_DB_URL=${url}`);
  console.log(`psql ${url}`);
}

export { start, branch, reset, execSql, listBranches, deleteBranch, diffBranch, promoteBranch };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, first, second] = process.argv.slice(2);
  if (command === 'start' || !command) await start();
  else if (command === 'branch') await branch(first, second);
  else if (command === 'reset') await reset();
  else {
    console.error('Usage: node @supabase/local-postgres/branch.mjs [start|branch <source_db> <target_db>|reset]');
    process.exit(1);
  }
}
