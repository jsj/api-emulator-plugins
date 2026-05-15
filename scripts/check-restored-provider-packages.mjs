import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const providers = [
  'apple',
  'aws',
  'clerk',
  'github',
  'google',
  'microsoft',
  'mongoatlas',
  'okta',
  'resend',
  'slack',
  'stripe',
  'vercel',
];

const catalog = JSON.parse(readFileSync('api-emulator.catalog.json', 'utf8'));

function packageEntry(pkg) {
  if (typeof pkg.exports === 'string') return pkg.exports;
  if (typeof pkg.exports?.['.'] === 'string') return pkg.exports['.'];
  if (typeof pkg.exports?.['.']?.import === 'string') return pkg.exports['.'].import;
  return pkg.main;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

for (const provider of providers) {
  const packageRoot = join(`@${provider}`, 'api-emulator');
  const packagePath = join(packageRoot, 'package.json');
  assert.ok(existsSync(packagePath), `missing ${packagePath}`);

  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  assert.deepEqual(catalog.plugins?.[provider], {
    kind: 'package',
    packageName: `@api-emulator/${provider}`,
    specifier: `./@${provider}/api-emulator/src/index.ts`,
    description: catalog.plugins[provider].description,
  });
  assert.equal(pkg.name, `@api-emulator/${provider}`);
  assert.equal(pkg.private, true);
  assert.equal(pkg.dependencies?.['@emulators/core'], undefined);
  assert.equal(pkg.dependencies?.['@api-emulator/core'], '^0.6.0');
  assert.equal(pkg.peerDependencies?.['api-emulator'], '>=0.6.0');

  const entry = packageEntry(pkg);
  assert.equal(entry, './src/index.ts');
  assert.ok(existsSync(join(packageRoot, entry.slice(2))), `missing entry for ${provider}`);

  await run('bun', [
    'build',
    join(packageRoot, 'src/index.ts'),
    '--packages',
    'external',
    '--outdir',
    join('/tmp/api-emulator-restored-provider-smoke', provider),
  ]);
}

console.log('restored provider package smoke ok');
