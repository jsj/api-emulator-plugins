import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'tiktok',
  label: 'TikTok Ads',
  docs: 'https://business-api.tiktok.com/portal/docs',
  source: 'TikTok Business API OpenAPI-compatible surface',
});

export const { plugin, contract, label, endpoints, capabilities, initConfig, seedFromConfig } = mod;
export default plugin;
