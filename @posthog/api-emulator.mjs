import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'posthog',
  source: 'PostHog OpenAPI endpoint specs',
  docs: 'https://posthog.com/docs/api',
  scope: ['capture', 'batch', 'persons', 'groups', 'identify', 'alias', 'feature-flags', 'decide', 'experiments'],
  fidelity: 'resource-model-subset',
};

export const plugin = {
  name: 'posthog',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export const label = 'PostHog API emulator';
export const endpoints = 'capture, batch, e, decide, flags, persons, groups, feature flags';
export const capabilities = contract.scope;
export const initConfig = {
  posthog: {
    host: 'same emulator origin',
    apiKey: 'posthog-emulator-key',
  },
};
