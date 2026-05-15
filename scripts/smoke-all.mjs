import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const smokeFiles = [
  '@anthropic/smoke.mjs',
  '@openai/smoke.mjs',
  '@posthog/smoke.mjs',
  '@github/smoke.mjs',
  '@sentry/smoke.mjs',
  '@google/smoke.mjs',
  '@apple/smoke.mjs',
  '@alpaca/smoke.mjs',
  '@kalshi/smoke.mjs',
  '@plaid/smoke.mjs',
  '@perplexity/smoke.mjs',
  '@polymarket/smoke.mjs',
  '@fred/smoke.mjs',
  '@sec/smoke.mjs',
  '@fal/smoke.mjs',
];

for (const file of smokeFiles) {
  if (!existsSync(file)) continue;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${file} failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/check-cloudflare-openapi-coverage.mjs'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error('cloudflare openapi coverage failed'));
  });
  child.on('error', reject);
});

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/check-github-openapi-coverage.mjs'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error('github openapi coverage failed'));
  });
  child.on('error', reject);
});

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/check-google-workspace-coverage.mjs'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error('google workspace coverage failed'));
  });
  child.on('error', reject);
});

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/check-plaid-openapi-coverage.mjs'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error('plaid openapi coverage failed'));
  });
  child.on('error', reject);
});

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['scripts/check-restored-provider-packages.mjs'], { stdio: 'inherit' });
  child.on('exit', (code) => {
    if (code === 0) resolve();
    else reject(new Error('restored provider package smoke failed'));
  });
  child.on('error', reject);
});

console.log('plugin smoke tests ok');
