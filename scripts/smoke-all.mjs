import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const smokeFiles = [
  '@posthog/smoke.mjs',
  '@github/smoke.mjs',
  '@apple/smoke.mjs',
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

console.log('plugin smoke tests ok');
