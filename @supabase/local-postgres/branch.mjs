import { spawn } from 'node:child_process';
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

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => stdout += chunk);
    child.stderr?.on('data', (chunk) => stderr += chunk);
    child.on('exit', (code) => {
      if (code === 0) resolvePromise(stdout.trim());
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}\n${stderr}`));
    });
    child.on('error', reject);
  });
}

async function docker(args, options) {
  return run('docker', args, options);
}

async function containerExists() {
  const out = await docker(['ps', '-a', '--filter', `name=^/${name}$`, '--format', '{{.Names}}'], { capture: true });
  return out.split('\n').includes(name);
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      await docker(['exec', name, 'pg_isready', '-U', user, '-d', database], { capture: true });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('Postgres did not become ready in time.');
}

async function start() {
  if (!(await containerExists())) {
    await docker([
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
    await docker(['start', name]).catch(() => undefined);
  }
  await waitForPostgres();
  await docker(['cp', seedPath, `${name}:/tmp/api-emulator-supabase-seed.sql`]);
  await docker(['exec', '-e', `PGPASSWORD=${password}`, name, 'psql', '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/api-emulator-supabase-seed.sql']);
  printEnv(database);
}

async function branch(source, target) {
  if (!source || !target) throw new Error('Usage: node @supabase/local-postgres/branch.mjs branch <source_db> <target_db>');
  await waitForPostgres();
  await docker(['exec', '-e', `PGPASSWORD=${password}`, name, 'dropdb', '-U', user, '--if-exists', target]);
  await docker(['exec', '-e', `PGPASSWORD=${password}`, name, 'createdb', '-U', user, '-T', source, target]);
  printEnv(target);
}

async function reset() {
  if (await containerExists()) {
    await docker(['rm', '-f', name]);
  }
}

function printEnv(db) {
  const url = `postgres://${user}:${password}@127.0.0.1:${port}/${db}`;
  console.log(`SUPABASE_DB_URL=${url}`);
  console.log(`psql ${url}`);
}

export { start, branch, reset };

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
