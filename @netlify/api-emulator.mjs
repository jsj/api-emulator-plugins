import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "netlify",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "sites",
    "deploys",
    "functions",
    "env"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'netlify',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'Netlify project deployment emulator';
export const endpoints = 'sites, deploys, functions, environment variables';
export const capabilities = contract.scope;
export const initConfig = { netlify: {} };
export default plugin;
