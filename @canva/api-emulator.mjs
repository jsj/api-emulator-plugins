import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'canva',
  label: 'Canva Connect API emulator',
  source: 'Canva Connect API documented subset',
  docs: 'https://www.canva.dev/docs/connect/',
  baseUrl: 'https://api.canva.com',
  scope: ["users","designs","assets","exports"],
  endpoints: 'users, designs, assets, exports',
  initConfig: { canva: { accessToken: 'canva-emulator-token', designId: 'design_001' } },
  collections: {
      designs: [{ id: 'design_001', title: 'Launch Brief', design_type: 'presentation', thumbnail: { url: 'https://example.test/canva/thumb.png' }, created_at: fixedNow, updated_at: fixedNow }],
      assets: [{ id: 'asset_001', name: 'logo.png', tags: ['emulator'], created_at: fixedNow }],
      exports: [{ id: 'export_001', design_id: 'design_001', status: 'success', result: { type: 'url', urls: ['https://example.test/export.pdf'] } }],
    },
  routes: [
      { method: 'GET', path: '/rest/v1/users/me', response: () => ({ user: { id: 'user_emulator', display_name: 'Canva Emulator' } }) },
      { method: 'GET', path: '/rest/v1/designs', response: (c, state) => ({ items: state.collections.designs, continuation: null }) },
      { method: 'GET', path: '/rest/v1/designs/:id', collection: 'designs', action: 'get', param: 'id', envelope: 'design' },
      { method: 'POST', path: '/rest/v1/designs/:id/exports', collection: 'exports', action: 'create', idPrefix: 'export', status: 202, envelope: 'job', mutate: (c, body) => ({ design_id: c.req.param('id'), status: 'in_progress', export_format: body.export_format ?? body.format ?? { type: 'pdf' }, result: null }) },
      { method: 'GET', path: '/rest/v1/exports/:id', collection: 'exports', action: 'get', param: 'id', envelope: 'job' },
      { method: 'GET', path: '/rest/v1/asset-uploads/:id', collection: 'assets', action: 'get', param: 'id', envelope: 'asset' },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
