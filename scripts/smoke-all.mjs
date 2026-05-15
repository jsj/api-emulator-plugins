import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { availableParallelism } from 'node:os';

const smokeFiles = [
  '@anthropic/smoke.mjs',
  '@openai/smoke.mjs',
  '@salesforce/smoke.mjs',
  '@hubspot/smoke.mjs',
  '@attio/smoke.mjs',
  '@audible/smoke.mjs',
  '@posthog/smoke.mjs',
  '@lucent/smoke.mjs',
  '@github/smoke.mjs',
  '@craigslist/smoke.mjs',
  '@doordash/smoke.mjs',
  '@eight-sleep/smoke.mjs',
  '@e-trade/smoke.mjs',
  '@elevenlabs/smoke.mjs',
  '@facebook-messenger/smoke.mjs',
  '@fidelity/smoke.mjs',
  '@flightradar24/smoke.mjs',
  '@intercom/smoke.mjs',
  '@interactive-brokers/smoke.mjs',
  '@servicenow/smoke.mjs',
  '@decagon/smoke.mjs',
  '@devin/smoke.mjs',
  '@sierra/smoke.mjs',
  '@sentry/smoke.mjs',
  '@google/smoke.mjs',
  '@google-play/smoke.mjs',
  '@goodreads/smoke.mjs',
  '@linkedin/smoke.mjs',
  '@app-store-connect/smoke.mjs',
  '@applecare/smoke.mjs',
  '@apple-maps/smoke.mjs',
  '@apple-music/smoke.mjs',
  '@apple-podcasts/smoke.mjs',
  '@weatherkit/smoke.mjs',
  '@oculus/smoke.mjs',
  '@oura/smoke.mjs',
  '@snap/smoke.mjs',
  '@applovin/smoke.mjs',
  '@argo/smoke.mjs',
  '@arxiv/smoke.mjs',
  '@apple/smoke.mjs',
  '@spotify/smoke.mjs',
  '@siriusxm/smoke.mjs',
  '@skyscanner/smoke.mjs',
  '@shazam/smoke.mjs',
  '@youtube-music/smoke.mjs',
  '@youtube/smoke.mjs',
  '@alpaca/smoke.mjs',
  '@kalshi/smoke.mjs',
  '@plaid/smoke.mjs',
  '@perplexity/smoke.mjs',
  '@exa/smoke.mjs',
  '@brave-search/smoke.mjs',
  '@polymarket/smoke.mjs',
  '@fred/smoke.mjs',
  '@sec/smoke.mjs',
  '@fireworks/smoke.mjs',
  '@geico/smoke.mjs',
  '@fal/smoke.mjs',
  '@modal/smoke.mjs',
  '@togetherai/smoke.mjs',
  '@crusoe/smoke.mjs',
  '@coreweave/smoke.mjs',
  '@tiktok/smoke.mjs',
  '@whatsapp/smoke.mjs',
  '@whoop/smoke.mjs',
  '@tryprofound/smoke.mjs',
  '@truemed/smoke.mjs',
  '@rentahuman/smoke.mjs',
  '@uber/smoke.mjs',
  '@jira/smoke.mjs',
  '@docusign/smoke.mjs',
  '@harvey/smoke.mjs',
  '@hashicorp-vault/smoke.mjs',
  '@legalzoom/smoke.mjs',
  '@lemonade/smoke.mjs',
  '@legora/smoke.mjs',
  '@lexis/smoke.mjs',
  '@brex/smoke.mjs',
  '@ramp/smoke.mjs',
  '@rippling/smoke.mjs',
  '@gusto/smoke.mjs',
  '@deel/smoke.mjs',
  '@joinwarp-payroll/smoke.mjs',
  '@adp/smoke.mjs',
  '@workday/smoke.mjs',
  '@samsara/smoke.mjs',
  '@datadog/smoke.mjs',
  '@doppler/smoke.mjs',
  '@coderabbit/smoke.mjs',
  '@mercury/smoke.mjs',
  '@grafana/smoke.mjs',
  '@concur/smoke.mjs',
  '@huggingface/smoke.mjs',
  '@coinbase/smoke.mjs',
  '@figma/smoke.mjs',
  '@nextdoor/smoke.mjs',
  '@nytimes/smoke.mjs',
  '@paypal/smoke.mjs',
  '@shipstation/smoke.mjs',
  '@steam/smoke.mjs',
  '@stainless/smoke.mjs',
  '@ebay-seller/smoke.mjs',
  '@ethos/smoke.mjs',
  '@shopify/smoke.mjs',
  '@mintlify/smoke.mjs',
  '@mobbin/smoke.mjs',
  '@reddit/smoke.mjs',
  '@replit/smoke.mjs',
  '@retool/smoke.mjs',
  '@amazon-seller/smoke.mjs',
  '@zapier/smoke.mjs',
  '@granola/smoke.mjs',
  '@baseten/smoke.mjs',
  '@bilt/smoke.mjs',
  '@bland/smoke.mjs',
  '@unifygtm/smoke.mjs',
  '@clay/smoke.mjs',
  '@gong/smoke.mjs',
  '@canva/smoke.mjs',
  '@greptile/smoke.mjs',
  '@canvas/smoke.mjs',
  '@capcut/smoke.mjs',
  '@google-flights/smoke.mjs',
  '@google-analytics/smoke.mjs',
  '@google-classroom/smoke.mjs',
  '@duke-energy/smoke.mjs',
  '@x/smoke.mjs',
  '@quizlet/smoke.mjs',
  '@wolfram/smoke.mjs',
  '@symbolab/smoke.mjs',
  '@postbridge/smoke.mjs',
  '@progressive/smoke.mjs',
  '@pinterest/smoke.mjs',
  '@prime-music/smoke.mjs',
  '@substack/smoke.mjs',
  '@patreon/smoke.mjs',
  '@marketo/smoke.mjs',
  '@metlife/smoke.mjs',
  '@spectrum/smoke.mjs',
  '@statefarm/smoke.mjs',
  '@sourcegraph/smoke.mjs',
  '@suno/smoke.mjs',
  '@uipath/smoke.mjs',
  '@workato/smoke.mjs',
];

const checkFiles = [
  'scripts/check-cloudflare-openapi-coverage.mjs',
  'scripts/check-github-openapi-coverage.mjs',
  'scripts/check-google-workspace-coverage.mjs',
  'scripts/check-plaid-openapi-coverage.mjs',
  'scripts/check-restored-provider-packages.mjs',
];

const jobs = [...smokeFiles.filter((file) => existsSync(file)), ...checkFiles].map((file) => ({ file }));
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
