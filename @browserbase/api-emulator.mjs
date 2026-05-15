import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "browserbase",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "projects",
    "sessions",
    "contexts"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'browserbase',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'Browserbase cloud browser emulator';
export const endpoints = 'projects, sessions, contexts, inspect';
export const capabilities = contract.scope;
export const initConfig = { browserbase: {} };
export default plugin;
