import { createSaasProvider, fixedNow } from '../scripts/saas-emulator-kit.mjs';

const config = {
  name: 'clay',
  label: 'Clay API emulator',
  source: 'Clay API and HTTP API integration documented subset',
  docs: 'https://university.clay.com/docs/http-api-integration-overview',
  baseUrl: 'https://api.clay.com',
  scope: ["workspaces","tables","rows","webhooks"],
  endpoints: 'workspaces, tables, rows, webhooks',
  initConfig: { clay: { apiKey: 'clay-emulator-key', workspaceId: 'ws_emulator' } },
  collections: { workspaces: [{ id: 'ws_emulator', name: 'Emulator Workspace' }], tables: [{ id: 'tbl_001', workspace_id: 'ws_emulator', name: 'Prospects' }], rows: [{ id: 'row_001', table_id: 'tbl_001', cells: { name: 'Ada Lovelace', company: 'Analytical Engines' }, created_at: fixedNow }] },
  routes: [
      { method: 'GET', path: '/v1/workspaces', collection: 'workspaces', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/v1/tables', collection: 'tables', action: 'list', envelope: 'data' },
      { method: 'GET', path: '/v1/tables/:id/rows', response: (c, state) => ({ data: state.collections.rows.filter((row) => row.table_id === c.req.param('id')) }) },
      { method: 'POST', path: '/v1/tables/:id/rows', collection: 'rows', action: 'create', idPrefix: 'row', status: 201, envelope: 'data', defaults: { created_at: fixedNow }, mutate: (c, body) => ({ table_id: c.req.param('id'), cells: body.cells ?? body }) },
      { method: 'POST', path: '/v1/enrichments/run', response: () => ({ id: 'enrich_001', status: 'completed', credits_used: 1 }) },
    ],
};

export const { contract, plugin, seedFromConfig, label, endpoints, initConfig } = createSaasProvider(config);

export default plugin;
