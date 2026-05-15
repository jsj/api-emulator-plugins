import { spawn } from 'node:child_process';

const name = process.env.PLANETSCALE_MYSQL_CONTAINER ?? 'api-emulator-planetscale-mysql';
const image = process.env.PLANETSCALE_MYSQL_IMAGE ?? 'mariadb:11';
const port = process.env.PLANETSCALE_MYSQL_PORT ?? '33306';
const password = process.env.PLANETSCALE_MYSQL_PASSWORD ?? 'planetscale';
const user = process.env.PLANETSCALE_MYSQL_USER ?? 'root';
let selectedRuntime;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
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
      if (code === 0) resolve(stdout.trim());
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
  const requested = process.env.PLANETSCALE_MYSQL_RUNTIME ?? 'auto';
  if (requested !== 'auto') {
    selectedRuntime = requested;
    return selectedRuntime;
  }
  if (await commandWorks('container', ['ls', '--all', '--format', 'json'])) selectedRuntime = 'container';
  else if (await commandWorks('docker', ['info'])) selectedRuntime = 'docker';
  else if (await commandWorks('which', ['container'])) selectedRuntime = 'container';
  else selectedRuntime = 'docker';
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
  if (options.input) execArgs.push('-i');
  execArgs.push(name, ...args);
  return run(runtimeName, execArgs, options);
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

async function removeContainer() {
  if (await resolveRuntime() === 'docker') await runtime(['rm', '-f', name]);
  else await runtime(['rm', '--force', name]);
}

async function waitForMysql() {
  let lastError;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      await execInContainer(['mariadb', `-u${user}`, `-p${password}`, '-e', 'select 1'], { capture: true });
      return;
    } catch (error) {
      lastError = error;
      if (String(error.message).includes('Access denied')) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw lastError ?? new Error('MySQL did not become ready in time.');
}

async function start() {
  await ensureRuntimeStarted();
  const existed = await containerExists();
  if (!existed) {
    await runtime([
      'run',
      '-d',
      '--name', name,
      '-p', `${port}:3306`,
      '-e', `MARIADB_ROOT_PASSWORD=${password}`,
      image,
    ]);
  } else {
    await runtime(['start', name]).catch(() => undefined);
  }
  try {
    await waitForMysql();
  } catch (error) {
    if (!existed || !String(error.message).includes('Access denied')) throw error;
    await removeContainer();
    await runtime([
      'run',
      '-d',
      '--name', name,
      '-p', `${port}:3306`,
      '-e', `MARIADB_ROOT_PASSWORD=${password}`,
      image,
    ]);
    await waitForMysql();
  }
  printEnv();
}

function assertDatabaseName(value) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value)) {
    throw new Error(`Invalid database name: ${value}`);
  }
}

function quoteIdentifier(value) {
  assertDatabaseName(value);
  return `\`${value}\``;
}

async function mysql(args, options) {
  await waitForMysql();
  return execInContainer(['mariadb', `-u${user}`, `-p${password}`, ...args], options);
}

async function execSql(db, sql) {
  assertDatabaseName(db);
  return mysql(['--batch', '--raw', db, '-e', sql], { capture: true });
}

async function createDatabase(db) {
  assertDatabaseName(db);
  await start();
  await mysql(['-e', `create database if not exists ${quoteIdentifier(db)}`], { capture: true });
}

async function deleteBranch(db) {
  assertDatabaseName(db);
  await waitForMysql();
  await mysql(['-e', `drop database if exists ${quoteIdentifier(db)}`], { capture: true });
}

async function branch(source, target) {
  assertDatabaseName(source);
  assertDatabaseName(target);
  await createDatabase(source);
  await deleteBranch(target);
  await mysql(['-e', `create database ${quoteIdentifier(target)}`], { capture: true });
  await execInContainer([
    'sh',
    '-c',
    `mariadb-dump -u${user} -p${password} --skip-comments --databases ${source} | sed 's/\\\`${source}\\\`/\\\`${target}\\\`/g' | mariadb -u${user} -p${password}`,
  ]);
  printEnv(target);
}

async function listTables(db) {
  const out = await execSql(db, `
    select table_name, table_type
    from information_schema.tables
    where table_schema = database()
    order by table_name
  `);
  return out.split('\n').slice(1).filter(Boolean).map((line) => {
    const [name, type] = line.split('\t');
    return { name, type };
  });
}

async function indexes(db) {
  const out = await execSql(db, `
    select table_name, index_name, non_unique, group_concat(column_name order by seq_in_index separator ',') as columns
    from information_schema.statistics
    where table_schema = database()
    group by table_name, index_name, non_unique
    order by table_name, index_name
  `);
  return out.split('\n').slice(1).filter(Boolean).map((line) => {
    const [table, name, nonUnique, columns] = line.split('\t');
    return { table, name, nonUnique: Number(nonUnique), columns };
  });
}

async function rowCounts(db) {
  const tables = await listTables(db);
  const counts = {};
  for (const table of tables.filter((item) => item.type === 'BASE TABLE')) {
    const out = await execSql(db, `select count(*) as count from ${quoteIdentifier(table.name)}`);
    counts[table.name] = Number(out.split('\n')[1] ?? 0);
  }
  return counts;
}

function added(left, right, key) {
  const leftSet = new Set(left.map(key));
  return right.filter((item) => !leftSet.has(key(item)));
}

async function diffBranch(branchName, parent = 'app_main') {
  assertDatabaseName(branchName);
  assertDatabaseName(parent);
  const [parentTables, branchTables, parentIndexes, branchIndexes, parentCounts, branchCounts] = await Promise.all([
    listTables(parent),
    listTables(branchName),
    indexes(parent),
    indexes(branchName),
    rowCounts(parent),
    rowCounts(branchName),
  ]);
  const tableKey = (table) => table.name;
  const indexKey = (index) => `${index.table}.${index.name}.${index.columns}.${index.nonUnique}`;
  const changedTables = Object.keys({ ...parentCounts, ...branchCounts })
    .filter((table) => parentCounts[table] !== branchCounts[table])
    .map((table) => ({ name: table, parentRows: parentCounts[table] ?? 0, branchRows: branchCounts[table] ?? 0 }));
  return {
    provider: 'planetscale',
    database: parent,
    branch: branchName,
    schema: {
      addedTables: added(parentTables, branchTables, tableKey).map(tableKey),
      removedTables: added(branchTables, parentTables, tableKey).map(tableKey),
      changedTables: [],
      addedIndexes: added(parentIndexes, branchIndexes, indexKey).map((index) => `${index.table}.${index.name}`),
      removedIndexes: added(branchIndexes, parentIndexes, indexKey).map((index) => `${index.table}.${index.name}`),
      changedPolicies: [],
    },
    data: { changedTables },
  };
}

async function promoteBranch(branchName, parent = 'app_main') {
  assertDatabaseName(branchName);
  assertDatabaseName(parent);
  await deleteBranch(parent);
  await mysql(['-e', `create database ${quoteIdentifier(parent)}`], { capture: true });
  await execInContainer([
    'sh',
    '-c',
    `mariadb-dump -u${user} -p${password} --skip-comments --databases ${branchName} | sed 's/\\\`${branchName}\\\`/\\\`${parent}\\\`/g' | mariadb -u${user} -p${password}`,
  ]);
}

async function exportBranch(db) {
  assertDatabaseName(db);
  await waitForMysql();
  return execInContainer(['mariadb-dump', `-u${user}`, `-p${password}`, '--skip-comments', db], { capture: true });
}

async function reset() {
  await ensureRuntimeStarted();
  if (await containerExists()) await removeContainer();
}

function connectionConfig(database = '') {
  return { host: '127.0.0.1', port: Number(port), username: user, password, database };
}

function printEnv(db = '') {
  const url = `mysql://${user}:${password}@127.0.0.1:${port}/${db}`;
  console.log(`PLANETSCALE_DATABASE_URL=${url}`);
}

export { start, createDatabase, branch, reset, execSql, deleteBranch, diffBranch, exportBranch, promoteBranch, connectionConfig };

if (process.argv[1] && process.argv[1].endsWith('/branch.mjs')) {
  const [command, first, second] = process.argv.slice(2);
  if (command === 'start' || !command) await start();
  else if (command === 'branch') await branch(first, second);
  else if (command === 'reset') await reset();
  else {
    console.error('Usage: node @planetscale/local-mysql/branch.mjs [start|branch <source_db> <target_db>|reset]');
    process.exit(1);
  }
}
