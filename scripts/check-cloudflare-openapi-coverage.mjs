import { readFile } from 'node:fs/promises';

const OPENAPI_URL = 'https://raw.githubusercontent.com/cloudflare/api-schemas/main/openapi.yaml';
const PLUGIN_SOURCE = new URL('../@cloudflare/api-emulator/src/index.ts', import.meta.url);

const requiredOperations = [
  {
    name: 'Workers AI model search',
    method: 'get',
    openapiPath: '/accounts/{account_id}/ai/models/search',
    pluginRoute: '/client/v4/accounts/:accountId/ai/models/search',
  },
  {
    name: 'Workers AI model run',
    method: 'post',
    openapiPath: '/accounts/{account_id}/ai/run/{model_name}',
    pluginRoute: '/client/v4/accounts/:accountId/ai/run/*',
  },
  {
    name: 'Vectorize query vectors',
    method: 'post',
    openapiPath: '/accounts/{account_id}/vectorize/v2/indexes/{index_name}/query',
    pluginRoute: '/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/query',
  },
  {
    name: 'Vectorize upsert vectors',
    method: 'post',
    openapiPath: '/accounts/{account_id}/vectorize/v2/indexes/{index_name}/upsert',
    pluginRoute: '/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/upsert',
  },
  {
    name: 'Vectorize get vectors by ID',
    method: 'post',
    openapiPath: '/accounts/{account_id}/vectorize/v2/indexes/{index_name}/get_by_ids',
    pluginRoute: '/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/get_by_ids',
  },
  {
    name: 'Vectorize delete vectors by ID',
    method: 'post',
    openapiPath: '/accounts/{account_id}/vectorize/v2/indexes/{index_name}/delete_by_ids',
    pluginRoute: '/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/delete_by_ids',
  },
];

async function loadOpenApi() {
  if (process.env.CLOUDFLARE_OPENAPI_PATH) {
    return readFile(process.env.CLOUDFLARE_OPENAPI_PATH, 'utf8');
  }

  const response = await fetch(OPENAPI_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Cloudflare OpenAPI schema: ${response.status}`);
  }
  return response.text();
}

function hasOpenApiOperation(openapi, operation) {
  const pathIndex = openapi.indexOf(`    ${operation.openapiPath}:`);
  if (pathIndex < 0) return false;
  const nextPathIndex = openapi.indexOf('\n    /', pathIndex + 1);
  const pathBlock = openapi.slice(pathIndex, nextPathIndex > pathIndex ? nextPathIndex : undefined);
  return pathBlock.includes(`        ${operation.method}:`);
}

const [openapi, pluginSource] = await Promise.all([
  loadOpenApi(),
  readFile(PLUGIN_SOURCE, 'utf8'),
]);

const failures = [];

for (const operation of requiredOperations) {
  if (!hasOpenApiOperation(openapi, operation)) {
    failures.push(`${operation.name}: missing ${operation.method.toUpperCase()} ${operation.openapiPath} in Cloudflare OpenAPI`);
  }
  if (!pluginSource.includes(operation.pluginRoute)) {
    failures.push(`${operation.name}: missing emulator route ${operation.pluginRoute}`);
  }
}

if (failures.length > 0) {
  console.error('Cloudflare OpenAPI coverage check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`cloudflare openapi coverage ok (${requiredOperations.length} operations)`);
