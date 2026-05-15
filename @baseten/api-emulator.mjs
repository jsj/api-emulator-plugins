import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'baseten',
  label: 'Baseten API emulator',
  source: 'Baseten inference and management API documented subset',
  docs: 'https://docs.baseten.co/api-reference/overview',
  baseUrl: 'https://api.baseten.co',
  scope: ["models","deployments","inference"],
  endpoints: 'models, deployments, inference',
  initConfig: { baseten: { apiKey: 'baseten-emulator-key', modelId: 'model_emulator' } },
  collections: { models: [{ id: 'model_emulator', name: 'emulator-ranker', status: 'ACTIVE', created_at: fixedNow }], deployments: [{ id: 'deployment_001', model_id: 'model_emulator', status: 'ACTIVE', version: '1' }], asyncRequests: [{ id: 'async_req_001', status: 'succeeded', output: { label: 'emulator', score: 0.99 } }] },
  routes: [
      { method: 'GET', path: '/v1/models', collection: 'models', action: 'list' },
      { method: 'GET', path: '/v1/models/:id', collection: 'models', action: 'get', param: 'id' },
      { method: 'POST', path: '/v1/models/:id/predict', response: (c) => ({ model_id: c.req.param('id'), output: { label: 'emulator', score: 0.99 }, request_id: 'req_emulator' }) },
      { method: 'POST', path: '/v1/chat/completions', response: () => ({ id: 'chatcmpl_emulator', object: 'chat.completion', created: 1767225600, model: 'baseten-emulator', choices: [{ index: 0, message: { role: 'assistant', content: 'Baseten emulator response' }, finish_reason: 'stop' }] }) },
      { method: 'GET', path: '/v1/deployments', collection: 'deployments', action: 'list' },
      { method: 'POST', path: '/production/predict', response: () => ({ output: { label: 'emulator', score: 0.99 } }) },
      { method: 'POST', path: '/development/predict', response: () => ({ output: { label: 'emulator', score: 0.98 } }) },
      { method: 'POST', path: '/:deployment/predict', response: (c) => ({ deployment_id: c.req.param('deployment'), output: { label: 'emulator', score: 0.99 } }) },
      { method: 'POST', path: '/production/async_predict', response: () => ({ request_id: 'async_req_001' }) },
      { method: 'GET', path: '/async_request/:id', collection: 'asyncRequests', action: 'get', param: 'id' },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
