import { readFile } from 'node:fs/promises';

const OPENAPI_URL = 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json';
const PLUGIN_SOURCE = new URL('../@github/api-emulator.mjs', import.meta.url);
const ROUTES_SOURCE = new URL('../@github/src/routes/http.mjs', import.meta.url);

const deepRoutes = [
  {
    name: 'Authenticated user',
    method: 'get',
    openapiPath: '/user',
    pluginRoute: "app.get('/user'",
  },
  {
    name: 'User organizations',
    method: 'get',
    openapiPath: '/user/orgs',
    pluginRoute: "app.get('/user/orgs'",
  },
  {
    name: 'User repositories',
    method: 'get',
    openapiPath: '/user/repos',
    pluginRoute: "app.get('/user/repos'",
  },
  {
    name: 'Repository search',
    method: 'get',
    openapiPath: '/search/repositories',
    pluginRoute: "app.get('/search/repositories'",
  },
  {
    name: 'Repository contents',
    method: 'get',
    openapiPath: '/repos/{owner}/{repo}/contents/{path}',
    pluginRoute: "app.get('/repos/:owner/:repo/contents/:path{.*}'",
  },
  {
    name: 'Git tree',
    method: 'get',
    openapiPath: '/repos/{owner}/{repo}/git/trees/{tree_sha}',
    pluginRoute: "app.get('/repos/:owner/:repo/git/trees/:treeSha'",
  },
];

async function loadOpenApi() {
  if (process.env.GITHUB_OPENAPI_PATH) {
    return JSON.parse(await readFile(process.env.GITHUB_OPENAPI_PATH, 'utf8'));
  }

  const response = await fetch(OPENAPI_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub OpenAPI schema: ${response.status}`);
  }
  return response.json();
}

function parseOpenApiOperations(openapi) {
  const operations = [];
  for (const [path, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const method of Object.keys(pathItem)) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        operations.push({ method, path });
      }
    }
  }
  return operations;
}

const [openapi, pluginSource, routesSource] = await Promise.all([
  loadOpenApi(),
  readFile(PLUGIN_SOURCE, 'utf8'),
  readFile(ROUTES_SOURCE, 'utf8'),
]);

const operations = parseOpenApiOperations(openapi);
const failures = [];
const fallbackPresent =
  pluginSource.includes('stateful-core-plus-openapi-compatible-generic-fallback') &&
  routesSource.includes('function genericOpenApiPayload') &&
  routesSource.includes("app.get('*', fallback)") &&
  routesSource.includes("app.post('*', fallback)");

if (operations.length < 1000) {
  failures.push(`GitHub OpenAPI parse found too few operations: ${operations.length}`);
}

if (!fallbackPresent) {
  failures.push('missing GitHub generic OpenAPI fallback adapter');
}

for (const route of deepRoutes) {
  const operation = operations.find((candidate) => candidate.method === route.method && candidate.path === route.openapiPath);
  if (!operation) {
    failures.push(`${route.name}: missing ${route.method.toUpperCase()} ${route.openapiPath} in GitHub OpenAPI`);
  }
  if (!routesSource.includes(route.pluginRoute)) {
    failures.push(`${route.name}: missing emulator route ${route.pluginRoute}`);
  }
}

const contractCountMatch = pluginSource.match(/openapiRouteCount:\s*(\d+)/);
const declaredCount = contractCountMatch ? Number(contractCountMatch[1]) : null;
if (declaredCount !== operations.length) {
  failures.push(`contract openapiRouteCount ${declaredCount ?? 'missing'} does not match spec operation count ${operations.length}`);
}

const contractVersionMatch = pluginSource.match(/openapiVersion:\s*'([^']+)'/);
const declaredVersion = contractVersionMatch?.[1];
if (declaredVersion !== openapi.info?.version) {
  failures.push(`contract openapiVersion ${declaredVersion ?? 'missing'} does not match spec version ${openapi.info?.version ?? 'missing'}`);
}

if (failures.length > 0) {
  console.error('GitHub OpenAPI coverage check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`github openapi coverage ok (${operations.length} operations, ${deepRoutes.length} deep overrides)`);
