import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  "provider": "adyen",
  "source": "Provider API docs",
  "docs": "",
  "scope": [
    "payments",
    "captures",
    "refunds",
    "webhooks"
  ],
  "fidelity": "resource-model-subset"
};

export const plugin = {
  name: 'adyen',
  register(app, store) { registerRoutes(app, store, contract); },
};

export const label = 'Adyen payments emulator';
export const endpoints = 'payments, captures, refunds, webhooks, inspection';
export const capabilities = contract.scope;
export const initConfig = { adyen: {} };
export default plugin;
