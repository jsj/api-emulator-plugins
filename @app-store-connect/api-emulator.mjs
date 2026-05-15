import {
  ascCapabilities,
  ascPlugin,
  getASCStore,
  seedFromConfig as seedASCFromConfig,
} from '../@apple/api-emulator.mjs';

export const contract = {
  provider: 'app-store-connect',
  source: 'App Store Connect API JSON:API conventions',
  docs: 'https://developer.apple.com/documentation/appstoreconnectapi',
  scope: ascCapabilities,
  fidelity: 'resource-model-subset',
};

export const plugin = {
  name: 'app-store-connect',
  register: ascPlugin.register,
  seed: ascPlugin.seed,
};

export function seedFromConfig(store, baseUrl, config = {}) {
  seedASCFromConfig(store, baseUrl, config);
}

export const label = 'App Store Connect API emulator';
export const endpoints = 'apps, builds, versions, reviewSubmissions, users, ciProducts, betaGroups, betaTesters, uploads, analytics, localizations, reviewDetails, certificates, profiles, screenshots, devices, subscriptions, and gameCenter';
export const capabilities = contract.scope;
export const initConfig = {
  'app-store-connect': {
    emulatorBaseUrl: 'same emulator origin',
    ascBaseUrlEnv: 'ASC_API_BASE_URL',
    apps: [{ id: '1234567890', name: 'My App', bundle_id: 'com.example.app' }],
    review_scenario: 'approve',
  },
};

export { getASCStore };
export default plugin;
