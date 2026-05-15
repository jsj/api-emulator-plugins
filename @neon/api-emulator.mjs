import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "neon",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "projects",
    "branches",
    "databases",
    "roles"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'neon',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'Neon Postgres control-plane emulator';
export const endpoints = 'projects, branches, databases, roles, connection URIs';
export const capabilities = contract.scope;
export const initConfig = { neon: {} };
export default plugin;
