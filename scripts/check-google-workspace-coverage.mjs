import { contract } from '../@google/api-emulator.mjs';

const expectedServices = [
  'drive',
  'sheets',
  'gmail',
  'calendar',
  'docs',
  'slides',
  'tasks',
  'people',
  'chat',
  'vault',
  'groupssettings',
  'reseller',
  'licensing',
  'script',
  'admin',
  'reports',
  'classroom',
  'cloudidentity',
  'alertcenter',
  'forms',
  'keep',
  'meet',
  'workspaceevents',
  'pubsub',
];

const failures = [];

for (const service of expectedServices) {
  if (!contract.scope.includes(service)) {
    failures.push(`missing Google Workspace service coverage: ${service}`);
  }
}

for (const prefix of ['/:service/:version/*', '/upload/:service/:version/*', '/$discovery/rest']) {
  if (!contract.adapterRoutePrefixes.includes(prefix)) {
    failures.push(`missing Workspace adapter route prefix: ${prefix}`);
  }
}

if (contract.discoveryServiceCount !== expectedServices.length) {
  failures.push(`discoveryServiceCount ${contract.discoveryServiceCount} does not match expected ${expectedServices.length}`);
}

if (!contract.fidelity.includes('generic-fallback')) {
  failures.push('contract fidelity must declare generic fallback coverage');
}

if (failures.length) {
  console.error('Google Workspace coverage check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`google workspace coverage ok (${expectedServices.length} services, generic Discovery/OpenAPI adapter)`);
