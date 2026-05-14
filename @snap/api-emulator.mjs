import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'snap',
  label: 'Snap Ads',
  docs: 'https://marketingapi.snapchat.com/docs',
  source: 'Snap Marketing API OpenAPI-compatible surface',
});

export const { plugin, contract, label, endpoints, capabilities, initConfig, seedFromConfig } = mod;
export default plugin;
