import { registerRoutes } from './src/routes/http.mjs';
import { now, saveState, sentryState } from './src/store.mjs';

export const contract = {
  provider: 'sentry',
  source: 'Sentry Integration Platform webhook docs',
  docs: 'https://docs.sentry.io/organization/integrations/integration-platform/webhooks/',
  scope: ['issue-webhook-delivery', 'issue-alert-webhook-delivery', 'inspection'],
  fidelity: 'webhook-producer-subset',
};

export const plugin = {
  name: 'sentry',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export function seedFromConfig(store, _baseUrl, config) {
  const state = sentryState(store);
  for (const target of config.targets ?? []) {
    if (target.url) state.targets.push({ id: target.id ?? crypto.randomUUID(), url: target.url, secret: target.secret ?? null, createdAt: now() });
  }
  saveState(store, state);
}

export const label = 'Sentry webhook emulator';
export const endpoints = 'control issue webhook delivery and inspect deliveries';
export const capabilities = contract.scope;
export const initConfig = {
  sentry: {
    targets: [{ url: 'http://127.0.0.1:8787/v1/webhooks/sentry/crash', secret: 'sentry-emulator-secret' }],
  },
};
