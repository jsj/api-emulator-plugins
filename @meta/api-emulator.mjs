import { createAdPlatformPlugin } from '../scripts/ad-platform-plugin-factory.mjs';

const mod = createAdPlatformPlugin({
  provider: 'meta',
  label: 'Meta Ads',
  docs: 'https://developers.facebook.com/docs/marketing-apis',
  source: 'Meta Marketing API OpenAPI-compatible surface',
});

export const { plugin, contract, label, endpoints, capabilities, initConfig, seedFromConfig } = mod;
export default plugin;
