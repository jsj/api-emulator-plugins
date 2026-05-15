import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { start } from './local-postgres/branch.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const plugin = resolve(root, '@supabase/api-emulator.mjs');
const port = process.env.SUPABASE_API_PORT ?? process.env.API_EMULATOR_PORT ?? '8787';
const shouldStartHttp = process.env.SUPABASE_START_HTTP !== '0';

await start();

const env = {
  SUPABASE_URL: `http://127.0.0.1:${port}`,
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${port}`,
  SUPABASE_SECRET_KEY: 'sb_secret_emulator',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_emulator',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_anon_emulator',
  SUPABASE_ANON_KEY: 'sb_anon_emulator',
};

console.log('');
console.log('Supabase emulator env:');
for (const [key, value] of Object.entries(env)) {
  console.log(`export ${key}="${value}"`);
}
console.log('');

if (!shouldStartHttp) {
  console.log(`HTTP emulator command: npx -p api-emulator api --plugin ${plugin} --service supabase --port ${port}`);
  process.exit(0);
}

const child = spawn('npx', ['-p', 'api-emulator', 'api', '--plugin', plugin, '--service', 'supabase', '--port', port], {
  stdio: 'inherit',
  env: { ...process.env, ...env },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
