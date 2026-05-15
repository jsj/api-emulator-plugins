import { registerRoutes, seedFromConfigState } from './src/routes/http.mjs';
import { WORKSPACE_SERVICES } from './src/spec/services.mjs';

export const contract = {
  provider: 'google',
  source: 'Google Workspace Discovery documents surfaced through an OpenAPI-compatible adapter',
  docs: 'https://developers.google.com/workspace',
  scope: WORKSPACE_SERVICES.map((service) => service.alias),
  fidelity: 'stateful-core-plus-discovery-openapi-compatible-generic-fallback',
  discoveryServiceCount: WORKSPACE_SERVICES.length,
  serviceIds: WORKSPACE_SERVICES.map((service) => service.serviceId),
  adapterRoutePrefixes: ['/:service/:version/*', '/upload/:service/:version/*', '/$discovery/rest'],
};

export const plugin = {
  name: 'google',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export const label = 'Google Workspace API emulator';
export const endpoints = 'Drive, Gmail, Calendar, Sheets, Docs, Discovery, and generic Workspace API adapter';
export const capabilities = contract.scope;
export const initConfig = {
  google: {
    apiBaseUrl: 'same emulator origin',
    services: WORKSPACE_SERVICES.map((service) => `${service.api}:${service.version}`),
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  seedFromConfigState(store, config);
}

export default plugin;
