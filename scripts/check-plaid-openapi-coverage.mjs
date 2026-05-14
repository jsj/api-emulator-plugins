import { readFile } from 'node:fs/promises';

const OPENAPI_URL = 'https://raw.githubusercontent.com/plaid/plaid-openapi/master/2020-09-14.yml';
const PLUGIN_SOURCE = new URL('../@plaid/api-emulator/src/index.ts', import.meta.url);

const deepRoutes = [
  '/link/token/create',
  '/link/token/get',
  '/sandbox/public_token/create',
  '/item/public_token/exchange',
  '/item/get',
  '/accounts/get',
  '/accounts/balance/get',
  '/auth/get',
  '/identity/get',
  '/transactions/get',
  '/transactions/sync',
  '/institutions/get',
  '/institutions/search',
  '/institutions/get_by_id',
  '/transfer/authorization/create',
  '/transfer/create',
];

async function loadOpenApi() {
  if (process.env.PLAID_OPENAPI_PATH) {
    return readFile(process.env.PLAID_OPENAPI_PATH, 'utf8');
  }

  const response = await fetch(OPENAPI_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Plaid OpenAPI schema: ${response.status}`);
  }
  return response.text();
}

function parseOpenApiOperations(openapi) {
  const operations = [];
  let currentPath = null;

  for (const line of openapi.split('\n')) {
    const pathMatch = line.match(/^  (\/[^:]+):$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }

    const methodMatch = line.match(/^    (get|post|put|patch|delete|head|options):$/);
    if (currentPath && methodMatch) {
      operations.push({ method: methodMatch[1], path: currentPath });
    }
  }

  return operations;
}

function routeLiteral(path) {
  return `app.post("${path}"`;
}

const [openapi, pluginSource] = await Promise.all([
  loadOpenApi(),
  readFile(PLUGIN_SOURCE, 'utf8'),
]);

const operations = parseOpenApiOperations(openapi);
const failures = [];
const fallbackPresent =
  pluginSource.includes('function registerFallbackRoutes') &&
  pluginSource.includes('app.post("*", fallback)') &&
  pluginSource.includes('app.post("/*", fallback)') &&
  pluginSource.includes('app.get?.("*", fallback)') &&
  pluginSource.includes('app.get?.("/*", fallback)');

if (operations.length < 300) {
  failures.push(`Plaid OpenAPI parse found too few operations: ${operations.length}`);
}

const unsupportedOperations = operations.filter((operation) => !['post', 'get'].includes(operation.method));
if (unsupportedOperations.length > 0) {
  failures.push(`Plaid OpenAPI contains unsupported methods not covered by current fallback: ${unsupportedOperations.length}`);
}

if (!fallbackPresent) {
  failures.push('missing Plaid generic POST fallback Adapter');
}

for (const path of deepRoutes) {
  if (!operations.some((operation) => operation.path === path)) {
    failures.push(`deep Plaid route not present in OpenAPI: ${path}`);
  }
  if (!pluginSource.includes(routeLiteral(path))) {
    failures.push(`deep Plaid route not implemented: ${path}`);
  }
}

const contractCountMatch = pluginSource.match(/openapiRouteCount:\s*(\d+)/);
const declaredCount = contractCountMatch ? Number(contractCountMatch[1]) : null;
if (declaredCount !== operations.length) {
  failures.push(`contract openapiRouteCount ${declaredCount ?? 'missing'} does not match spec operation count ${operations.length}`);
}

if (failures.length > 0) {
  console.error('Plaid OpenAPI coverage check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`plaid openapi coverage ok (${operations.length} operations, ${deepRoutes.length} deep overrides)`);
