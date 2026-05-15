import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "mixpanel",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "events",
    "profiles",
    "flags"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'mixpanel',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'Mixpanel analytics emulator';
export const endpoints = 'track, import, engage, decide, inspection';
export const capabilities = contract.scope;
export const initConfig = { mixpanel: {} };
export default plugin;
