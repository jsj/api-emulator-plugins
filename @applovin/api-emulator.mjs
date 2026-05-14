import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'applovin',
  label: 'AppLovin',
  docs: 'https://developers.applovin.com',
  source: 'AppLovin marketing API OpenAPI-compatible surface',
});

export const { plugin, contract, label, endpoints, capabilities, initConfig, seedFromConfig } = mod;
export default plugin;
