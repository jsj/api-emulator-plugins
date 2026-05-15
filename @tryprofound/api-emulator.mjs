function initialState(config = {}) {
  return {
    organizations: config.organizations ?? [{ id: 'org_emulator', name: 'Emulator Organization', slug: 'emulator' }],
    domains: config.domains ?? [{ id: 'domain_emulator', organization_id: 'org_emulator', domain: 'example.com' }],
    personas: config.personas ?? [{ id: 'persona_emulator', organization_id: 'org_emulator', name: 'Emulator Persona' }],
    assets: config.assets ?? [{ id: 'asset_emulator', organization_id: 'org_emulator', name: 'Example Asset', domain: 'example.com' }],
    models: config.models ?? [{ id: 'model_gpt_4o', name: 'GPT-4o', provider: 'openai' }],
    regions: config.regions ?? [{ id: 'region_us', name: 'United States', code: 'US' }],
    categories: config.categories ?? [{ id: 'category_emulator', organization_id: 'org_emulator', name: 'Emulator Category' }],
    tags: config.tags ?? [{ id: 'tag_emulator', name: 'Emulator Tag' }],
    topics: config.topics ?? [{ id: 'topic_emulator', name: 'Emulator Topic' }],
    prompts: config.prompts ?? [{
      id: 'prompt_emulator',
      category_id: 'category_emulator',
      prompt: 'Which brands are most visible for developer tools?',
      language: 'en',
      platforms: ['chatgpt'],
      regions: ['US'],
      topic: 'Emulator Topic',
      status: 'active',
      analysis_types: ['visibility'],
      tags: ['Emulator Tag'],
    }],
    agents: config.agents ?? [{ id: 'agent_emulator', name: 'Emulator Agent', status: 'active', version: 1 }],
    runs: config.runs ?? [],
    knowledgeBases: config.knowledgeBases ?? [{ id: 'kb_emulator', organization_id: 'org_emulator', name: 'Emulator Knowledge Base' }],
    documents: config.documents ?? [{ knowledge_base_id: 'kb_emulator', name: 'intro.txt', text: 'Profound emulator document', folder: '/' }],
    folders: config.folders ?? [{ knowledge_base_id: 'kb_emulator', path: '/' }],
    content: config.content ?? [{ id: 'content_emulator', asset_id: 'asset_emulator', title: 'Improve example.com visibility', status: 'ready' }],
    nextPrompt: 2,
    nextRun: 1,
  };
}

function state(store) {
  const current = store.getData?.('tryprofound:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('tryprofound:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('tryprofound:state', next);
}

function limitRows(c, rows) {
  const limit = Number(c.req.query?.('limit') ?? 100);
  return rows.slice(0, Number.isFinite(limit) ? limit : 100);
}

function listResponse(rows) {
  return { data: rows };
}

function reportResponse(kind, body = {}) {
  const dimensions = Object.fromEntries((body.dimensions ?? ['category_id']).map((name) => [name, body[name] ?? `${name}_emulator`]));
  const metrics = Object.fromEntries((body.metrics ?? ['value']).map((name) => [name, name.includes('rate') ? 0.42 : 42]));
  return { data: [{ dimensions, metrics, report_type: kind }], info: { total_rows: 1, query: body } };
}

function streamReport(c, kind, body) {
  const payload = JSON.stringify(reportResponse(kind, body));
  return c.text?.(`event: data\ndata: ${payload}\n\nevent: done\ndata: {}\n\n`) ?? c.json(reportResponse(kind, body));
}

function organizationFiltered(c, rows) {
  const ids = c.req.query?.('organization_ids')?.split(',').filter(Boolean);
  if (!ids?.length) return rows;
  return rows.filter((row) => ids.includes(row.organization_id ?? row.id));
}

async function jsonBody(c) {
  return c.req.json().catch(() => ({}));
}

export const apiMdRoutes = [
  ['GET', '/v1/org'],
  ['GET', '/v1/org/domains'],
  ['GET', '/v1/org/personas'],
  ['GET', '/v1/org/assets'],
  ['GET', '/v1/org/models'],
  ['GET', '/v1/org/regions'],
  ['GET', '/v1/org/categories'],
  ['GET', '/v1/org/categories/:categoryId/assets'],
  ['POST', '/v1/org/categories/:categoryId/prompts'],
  ['GET', '/v1/org/categories/:categoryId/personas'],
  ['GET', '/v1/org/categories/:categoryId/prompts'],
  ['GET', '/v1/org/categories/:categoryId/tags'],
  ['GET', '/v1/org/categories/:categoryId/topics'],
  ['PATCH', '/v1/org/categories/:categoryId/prompts/status'],
  ['PATCH', '/v1/org/categories/:categoryId/prompts'],
  ['POST', '/v1/prompts/answers'],
  ['POST', '/v1/reports/citations'],
  ['POST', '/v1/reports/bots'],
  ['POST', '/v2/reports/bots'],
  ['POST', '/v1/reports/referrals'],
  ['POST', '/v2/reports/referrals'],
  ['POST', '/v1/reports/query-fanouts'],
  ['POST', '/v1/reports/sentiment'],
  ['POST', '/v1/reports/citations/stream'],
  ['POST', '/v1/reports/sentiment/stream'],
  ['POST', '/v1/reports/visibility/stream'],
  ['POST', '/v1/reports/visibility'],
  ['POST', '/v1/logs/raw/bots'],
  ['POST', '/v1/logs/raw'],
  ['GET', '/v1/content/:assetId/optimization/:contentId'],
  ['GET', '/v1/content/:assetId/optimization'],
  ['GET', '/v1/agents/:agentId'],
  ['GET', '/v1/agents'],
  ['POST', '/v1/agents/:agentId/runs'],
  ['GET', '/v1/agents/:agentId/runs/:runId'],
  ['GET', '/v1/knowledge-bases'],
  ['POST', '/v1/knowledge-bases/:knowledgeBaseId/search'],
  ['POST', '/v1/knowledge-bases/:knowledgeBaseId/documents'],
  ['PUT', '/v1/knowledge-bases/:knowledgeBaseId/documents'],
  ['DELETE', '/v1/knowledge-bases/:knowledgeBaseId/documents'],
  ['POST', '/v1/knowledge-bases/:knowledgeBaseId/folders'],
  ['DELETE', '/v1/knowledge-bases/:knowledgeBaseId/folders'],
].map(([method, path]) => ({ method, path }));

export const contract = {
  provider: 'tryprofound',
  source: 'Profound TypeScript SDK api.md',
  docs: 'https://docs.tryprofound.com',
  scope: ['organizations', 'categories', 'prompts', 'reports', 'streaming-reports', 'content-optimization', 'agents', 'agent-runs', 'knowledge-bases', 'knowledge-base-documents', 'knowledge-base-folders', 'logs', 'inspection'],
  coverage: { source: 'api.md', routeCount: apiMdRoutes.length, routes: apiMdRoutes },
  fidelity: 'api-md-route-complete-stateful-rest-emulator',
};

export const plugin = {
  name: 'tryprofound',
  register(app, store) {
    app.get('/v1/org', (c) => c.json(listResponse(state(store).organizations)));
    app.get('/v1/org/domains', (c) => c.json(listResponse(organizationFiltered(c, state(store).domains))));
    app.get('/v1/org/personas', (c) => c.json(listResponse(organizationFiltered(c, state(store).personas))));
    app.get('/v1/org/assets', (c) => c.json(listResponse(organizationFiltered(c, state(store).assets))));
    app.get('/v1/org/models', (c) => c.json(listResponse(state(store).models)));
    app.get('/v1/org/regions', (c) => c.json(listResponse(state(store).regions)));
    app.get('/v1/org/categories', (c) => c.json(listResponse(organizationFiltered(c, state(store).categories))));

    app.get('/v1/org/categories/:categoryId/assets', (c) => c.json(listResponse(state(store).assets.filter((asset) => asset.category_id === c.req.param('categoryId') || !asset.category_id))));
    app.get('/v1/org/categories/:categoryId/personas', (c) => c.json(listResponse(state(store).personas)));
    app.get('/v1/org/categories/:categoryId/prompts', (c) => {
      const rows = state(store).prompts.filter((prompt) => prompt.category_id === c.req.param('categoryId'));
      return c.json({ data: limitRows(c, rows), next_cursor: null });
    });
    app.get('/v1/org/categories/:categoryId/tags', (c) => c.json(listResponse(state(store).tags)));
    app.get('/v1/org/categories/:categoryId/topics', (c) => c.json(listResponse(state(store).topics)));
    app.post('/v1/org/categories/:categoryId/prompts', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const prompts = (body.prompts ?? []).map((prompt) => ({ id: `prompt_${s.nextPrompt++}`, category_id: c.req.param('categoryId'), status: 'active', ...prompt }));
      if (!body.dry_run) {
        s.prompts.push(...prompts);
        saveState(store, s);
      }
      return c.json({ data: prompts, dry_run: Boolean(body.dry_run) }, 201);
    });
    app.patch('/v1/org/categories/:categoryId/prompts/status', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const ids = new Set(body.prompt_ids ?? []);
      const updated = s.prompts.filter((prompt) => prompt.category_id === c.req.param('categoryId') && ids.has(prompt.id));
      if (!body.dry_run) {
        for (const prompt of updated) prompt.status = body.status ?? prompt.status;
        saveState(store, s);
      }
      return c.json({ data: updated, dry_run: Boolean(body.dry_run) });
    });
    app.patch('/v1/org/categories/:categoryId/prompts', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const updated = [];
      for (const patch of body.prompts ?? []) {
        const prompt = s.prompts.find((item) => item.id === patch.id && item.category_id === c.req.param('categoryId'));
        if (!prompt) continue;
        const next = { ...prompt, ...patch };
        updated.push(next);
        if (!body.dry_run) Object.assign(prompt, patch);
      }
      if (!body.dry_run) saveState(store, s);
      return c.json({ data: updated, dry_run: Boolean(body.dry_run) });
    });

    app.post('/v1/prompts/answers', async (c) => {
      const body = await jsonBody(c);
      const prompts = state(store).prompts.filter((prompt) => !body.category_id || prompt.category_id === body.category_id);
      return c.json({ data: prompts.map((prompt) => ({ prompt_id: prompt.id, answer: 'Emulator answer for Profound SDK tests.', citations: ['https://example.com'] })), info: { total_rows: prompts.length } });
    });

    for (const [path, kind] of [
      ['/v1/reports/citations', 'citations'],
      ['/v1/reports/visibility', 'visibility'],
      ['/v1/reports/sentiment', 'sentiment'],
      ['/v1/reports/query-fanouts', 'query-fanouts'],
      ['/v1/reports/bots', 'bots'],
      ['/v2/reports/bots', 'bots-v2'],
      ['/v1/reports/referrals', 'referrals'],
      ['/v2/reports/referrals', 'referrals-v2'],
      ['/v1/logs/raw/bots', 'raw-bots'],
      ['/v1/logs/raw', 'raw-logs'],
    ]) {
      app.post(path, async (c) => c.json(reportResponse(kind, await jsonBody(c))));
    }
    for (const [path, kind] of [
      ['/v1/reports/citations/stream', 'citations'],
      ['/v1/reports/visibility/stream', 'visibility'],
      ['/v1/reports/sentiment/stream', 'sentiment'],
    ]) {
      app.post(path, async (c) => streamReport(c, kind, await jsonBody(c)));
    }

    app.get('/v1/content/:assetId/optimization', (c) => c.json(listResponse(limitRows(c, state(store).content.filter((item) => item.asset_id === c.req.param('assetId'))))));
    app.get('/v1/content/:assetId/optimization/:contentId', (c) => {
      const item = state(store).content.find((row) => row.asset_id === c.req.param('assetId') && row.id === c.req.param('contentId'));
      if (!item) return c.json({ error: { message: 'Content optimization not found' } }, 404);
      return c.json(item);
    });

    app.get('/v1/agents', (c) => c.json({ data: limitRows(c, state(store).agents), next_cursor: null }));
    app.get('/v1/agents/:agentId', (c) => {
      const agent = state(store).agents.find((item) => item.id === c.req.param('agentId'));
      if (!agent) return c.json({ error: { message: 'Agent not found' } }, 404);
      return c.json(agent);
    });
    app.post('/v1/agents/:agentId/runs', async (c) => {
      const s = state(store);
      const agent = s.agents.find((item) => item.id === c.req.param('agentId'));
      if (!agent) return c.json({ error: { message: 'Agent not found' } }, 404);
      const body = await jsonBody(c);
      const run = { id: `run_${s.nextRun++}`, agent_id: agent.id, status: 'completed', inputs: body.inputs ?? {}, outputs: { result: 'Emulator agent run completed' } };
      s.runs.push(run);
      saveState(store, s);
      return c.json(run, 201);
    });
    app.get('/v1/agents/:agentId/runs/:runId', (c) => {
      const run = state(store).runs.find((item) => item.agent_id === c.req.param('agentId') && item.id === c.req.param('runId'));
      if (!run) return c.json({ error: { message: 'Run not found' } }, 404);
      return c.json(run);
    });

    app.get('/v1/knowledge-bases', (c) => c.json(listResponse(organizationFiltered(c, state(store).knowledgeBases))));
    app.post('/v1/knowledge-bases/:knowledgeBaseId/search', async (c) => {
      const body = await jsonBody(c);
      const rows = state(store).documents.filter((doc) => doc.knowledge_base_id === c.req.param('knowledgeBaseId') && (!body.query || doc.text.toLowerCase().includes(String(body.query).toLowerCase())));
      return c.json({ data: rows.slice(0, body.top_k ?? 10).map((doc) => ({ document_name: doc.name, text: body.return_full_page ? doc.text : doc.text.slice(0, 160), score: 0.99 })) });
    });
    app.post('/v1/knowledge-bases/:knowledgeBaseId/documents', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const doc = { knowledge_base_id: c.req.param('knowledgeBaseId'), name: body.name, text: body.text ?? '', folder: body.folder ?? '/' };
      s.documents.push(doc);
      saveState(store, s);
      return c.json(doc, 201);
    });
    app.put('/v1/knowledge-bases/:knowledgeBaseId/documents', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      let doc = s.documents.find((item) => item.knowledge_base_id === c.req.param('knowledgeBaseId') && item.name === body.name);
      if (!doc) {
        doc = { knowledge_base_id: c.req.param('knowledgeBaseId'), name: body.name, text: '', folder: body.folder ?? '/' };
        s.documents.push(doc);
      }
      doc.text = body.text ?? doc.text;
      doc.folder = body.folder ?? doc.folder;
      saveState(store, s);
      return c.json(doc);
    });
    app.delete('/v1/knowledge-bases/:knowledgeBaseId/documents', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const before = s.documents.length;
      s.documents = s.documents.filter((item) => item.knowledge_base_id !== c.req.param('knowledgeBaseId') || item.name !== body.name);
      saveState(store, s);
      return c.json({ deleted: before - s.documents.length });
    });
    app.post('/v1/knowledge-bases/:knowledgeBaseId/folders', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      const folder = { knowledge_base_id: c.req.param('knowledgeBaseId'), path: body.path };
      s.folders.push(folder);
      saveState(store, s);
      return c.json(folder, 201);
    });
    app.delete('/v1/knowledge-bases/:knowledgeBaseId/folders', async (c) => {
      const s = state(store);
      const body = await jsonBody(c);
      s.folders = s.folders.filter((item) => item.knowledge_base_id !== c.req.param('knowledgeBaseId') || item.path !== body.path);
      saveState(store, s);
      return c.json({ deleted: true, recursive: Boolean(body.recursive) });
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'TryProfound API emulator';
export const endpoints = 'Organizations, categories/prompts, reports, content optimization, agents, knowledge bases, logs, and inspection';
export const capabilities = contract.scope;
export const initConfig = { tryprofound: initialState() };
export default plugin;
