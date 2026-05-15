import { registerRoutes, seedFromConfig } from './src/routes/http.mjs';

export const contract = {
  provider: 'github',
  source: 'github/rest-api-description OpenAPI',
  docs: 'https://docs.github.com/en/rest',
  scope: ['apps', 'users', 'orgs', 'repos', 'search', 'git-refs', 'git-trees', 'contents', 'issues', 'pulls', 'actions-workflows', 'actions-runs', 'checks'],
  fidelity: 'stateful-core-plus-openapi-compatible-generic-fallback',
  openapiVersion: '1.1.4',
  openapiRouteCount: 1184,
};

export const plugin = {
  name: 'github',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export { seedFromConfig };

export const label = 'GitHub API emulator';
export const endpoints = 'user, orgs, search, repositories, refs, trees, contents, issues, pulls, workflow dispatches/runs, check runs, and generic GitHub OpenAPI fallback';
export const capabilities = contract.scope;
export const initConfig = {
  github: {
    apiBaseUrl: 'same emulator origin',
  },
};

export default plugin;
