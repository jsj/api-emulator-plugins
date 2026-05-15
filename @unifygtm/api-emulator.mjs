import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'unifygtm',
  label: 'Unify GTM API emulator',
  source: 'Unify Data API documented subset',
  docs: 'https://docs.unifygtm.com/developers/api/data/overview',
  baseUrl: 'https://api.unifygtm.com',
  scope: ["objects","attributes","records"],
  endpoints: 'objects, attributes, records',
  initConfig: { unifygtm: { apiKey: 'unify-emulator-key', workspaceId: 'ws_emulator' } },
  collections: { objects: [{ id: 'object_company', api_name: 'companies', singular_api_name: 'company', label: 'Company' }], attributes: [{ id: 'attr_domain', object_api_name: 'companies', api_name: 'domain', type: 'text' }], records: [{ id: 'rec_001', object_api_name: 'companies', values: { name: 'Emulator Inc', domain: 'example.test' }, created_at: fixedNow, updated_at: fixedNow }] },
  routes: [
      { method: 'GET', path: '/data/v1/objects', collection: 'objects', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/data/v1/objects/:object/attributes', response: (c, state) => ({ data: state.collections.attributes.filter((item) => item.object_api_name === c.req.param('object')) }) },
      { method: 'GET', path: '/data/v1/objects/:object/records', response: (c, state) => ({ data: state.collections.records.filter((item) => item.object_api_name === c.req.param('object')), next_cursor: null }) },
      { method: 'GET', path: '/data/v1/objects/:object/records/:id', response: (c, state) => ({ data: state.collections.records.find((item) => item.object_api_name === c.req.param('object') && item.id === c.req.param('id')) }) },
      { method: 'POST', path: '/data/v1/objects/:object/records', collection: 'records', action: 'create', idPrefix: 'rec', status: 201, envelope: 'data', defaults: { created_at: fixedNow, updated_at: fixedNow }, mutate: (c, body) => ({ object_api_name: c.req.param('object'), values: body.values ?? body }) },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
