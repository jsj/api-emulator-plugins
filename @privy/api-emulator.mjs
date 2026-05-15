import { registerRoutes } from './src/routes/http.mjs';

export const contract = {
  provider: 'privy',
  source: 'Privy auth and wallet API patterns',
  docs: 'https://docs.privy.io/',
  scope: ['users', 'sessions', 'email-otp', 'siwe', 'linked-accounts', 'embedded-wallets'],
  fidelity: 'resource-model-subset',
};

export const plugin = {
  name: 'privy',
  register(app, store) {
    registerRoutes(app, store, contract);
  },
};

export const label = 'Privy auth and wallet emulator';
export const endpoints = 'Privy users, sessions, email OTP, SIWE, linked accounts, embedded wallets, and inspector';
export const capabilities = contract.scope;
export const initConfig = { privy: {} };

export default plugin;
