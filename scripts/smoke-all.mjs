import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { availableParallelism } from 'node:os';

const checkFiles = [
  'scripts/check-cloudflare-openapi-coverage.mjs',
  'scripts/check-github-openapi-coverage.mjs',
  'scripts/check-google-workspace-coverage.mjs',
  'scripts/check-plaid-openapi-coverage.mjs',
  'scripts/check-restored-provider-packages.mjs',
];

async function listSmokeFiles() {
  const entries = await readdir('.', { withFileTypes: true });
  const providers = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('@'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const smokeFiles = await Promise.all(
    providers.map(async (provider) => {
      const files = await readdir(provider);
      return files.includes('smoke.mjs') ? `${provider}/smoke.mjs` : null;
    }),
  );

  return smokeFiles.filter(Boolean);
}

const smokeFiles = await listSmokeFiles();
const jobs = [...smokeFiles, ...checkFiles].map((file) => ({ file }));
const concurrency = Math.max(1, Number(process.env.SMOKE_CONCURRENCY ?? Math.min(availableParallelism(), 8)) || 1);

function runJob(job) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [job.file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      resolve({ ...job, code: 1, stdout, stderr: `${stderr}${error.stack ?? error.message}\n`, durationMs: Date.now() - started });
    });
    child.on('exit', (code) => {
      resolve({ ...job, code: code ?? 1, stdout, stderr, durationMs: Date.now() - started });
    });
  });
}

async function runConcurrently(queue) {
  let next = 0;
  const results = [];
  async function worker() {
    while (next < queue.length) {
      const index = next;
      next += 1;
      results[index] = await runJob(queue[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return results;
}

console.log(`running ${jobs.length} smoke jobs with concurrency ${concurrency}`);
const results = await runConcurrently(jobs);
const failures = results.filter((result) => result.code !== 0);

for (const result of results) {
  const duration = `${(result.durationMs / 1000).toFixed(1)}s`;
  const status = result.code === 0 ? 'ok' : `failed (${result.code})`;
  console.log(`${status.padEnd(12)} ${duration.padStart(7)} ${result.file}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`\n--- ${failure.file} stdout ---`);
    if (failure.stdout) console.error(failure.stdout.trimEnd());
    console.error(`--- ${failure.file} stderr ---`);
    if (failure.stderr) console.error(failure.stderr.trimEnd());
  }
  throw new Error(`${failures.length} smoke job${failures.length === 1 ? '' : 's'} failed`);
}

console.log('plugin smoke tests ok');
