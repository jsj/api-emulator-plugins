import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "planetscale",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "databases",
    "branches",
    "passwords",
    "deploy-requests"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'planetscale',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'PlanetScale database control-plane emulator';
export const endpoints = 'organizations, databases, branches, passwords, deploy requests';
export const capabilities = contract.scope;
export const initConfig = { planetscale: {} };
export default plugin;
