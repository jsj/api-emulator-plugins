const STATE_KEY = 'mintlify:state';
const NOW = '2026-05-15T12:00:00.000Z';

function initialState(config = {}) {
  const baseUrl = config.baseUrl ?? 'https://api.mintlify.com';
  return {
    baseUrl,
    projects: [
      {
        id: 'proj_emulator',
        subdomain: 'emulator',
        deploymentBranch: 'main',
      },
    ],
    updates: [],
    agentJobs: [],
    pages: [
      {
        path: '/quickstart',
        title: 'Quickstart',
        content: 'Get started with the emulator documentation project by installing the SDK and making your first request.',
        metadata: { tag: 'guide', version: 'latest', language: 'en' },
      },
      {
        path: '/api/reference',
        title: 'API reference',
        content: 'Use API keys, deployments, previews, search, and page content endpoints to automate documentation workflows.',
        metadata: { tag: 'api', version: 'latest', language: 'en' },
      },
    ],
    conversations: [],
    analytics: {
      feedback: [{ id: 'fb_1', page: '/quickstart', sentiment: 'positive', createdAt: NOW }],
      searches: [{ query: 'quickstart', count: 3, createdAt: NOW }],
      views: [{ path: '/quickstart', views: 42, date: '2026-05-15' }],
      visitors: [{ path: '/quickstart', visitors: 7, date: '2026-05-15' }],
    },
    nextId: 1,
    ...config,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const seeded = initialState();
  store.setData?.(STATE_KEY, seeded);
  return seeded;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

async function readJson(c) {
  return c.req.json().catch(() => ({}));
}

function mintError(c, message, status = 400) {
  return c.json({ error: message }, status);
}

function projectFor(s, projectId) {
  return s.projects.find((project) => project.id === projectId) ?? {
    id: projectId,
    subdomain: 'emulator',
    deploymentBranch: 'main',
  };
}

function makeUpdate(s, projectId, patch = {}) {
  const project = projectFor(s, projectId);
  const statusId = patch.statusId ?? `upd_${String(s.nextId++).padStart(6, '0')}`;
  const update = {
    _id: statusId,
    projectId,
    createdAt: NOW,
    endedAt: NOW,
    status: 'success',
    summary: patch.summary ?? 'Deployment completed successfully.',
    logs: patch.logs ?? ['Queued deployment', 'Built documentation', 'Published site'],
    subdomain: project.subdomain,
    screenshot: `${s.baseUrl}/screenshots/${statusId}.png`,
    screenshotLight: `${s.baseUrl}/screenshots/${statusId}-light.png`,
    screenshotDark: `${s.baseUrl}/screenshots/${statusId}-dark.png`,
    author: { name: 'Mintlify Emulator', avatarUrl: `${s.baseUrl}/avatar.png`, githubUserId: 1001 },
    commit: {
      sha: '0123456789abcdef0123456789abcdef01234567',
      ref: project.deploymentBranch,
      message: 'Update documentation',
      filesChanged: { added: [], modified: ['docs.json', 'quickstart.mdx'], removed: [] },
    },
    source: 'api',
    ...patch,
  };
  s.updates.unshift(update);
  return update;
}

function makeAgentJob(s, projectId, prompt, patch = {}) {
  const project = projectFor(s, projectId);
  const id = patch.id ?? `job_${String(s.nextId++).padStart(6, '0')}`;
  const slug = String(prompt ?? 'documentation update')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || 'documentation-update';
  const job = {
    id,
    status: 'completed',
    source: {
      repository: `https://github.com/emulator/${project.subdomain}-docs`,
      ref: `mintlify-agent/${slug}`,
    },
    model: patch.model ?? 'sonnet',
    prLink: `https://github.com/emulator/${project.subdomain}-docs/pull/${s.nextId}`,
    createdAt: NOW,
    archivedAt: null,
    messages: [{ role: 'user', content: prompt }],
    ...patch,
  };
  s.agentJobs.unshift(job);
  return job;
}

function v1AgentJob(job, projectId) {
  return {
    sessionId: job.id,
    subdomain: projectId,
    branch: job.source.ref,
    haulted: job.status !== 'active',
    haultReason: job.status === 'completed' ? 'completed' : job.status === 'failed' ? 'error' : 'processing',
    pullRequestLink: job.prLink,
    messageToUser: job.status === 'completed' ? 'Documentation changes are ready for review.' : 'Agent job is processing.',
    todos: [
      { id: `${job.id}_todo_1`, content: job.messages.at(-1)?.content ?? 'Update documentation', status: 'completed', priority: 'medium' },
    ],
    userId: 'usr_emulator',
    title: 'Documentation update',
    createdAt: job.createdAt,
  };
}

function searchPages(s, body) {
  const query = String(body.query ?? '').toLowerCase();
  const limit = Math.min(Math.max(Number(body.pageSize ?? 10), 1), 50);
  const threshold = Number(body.scoreThreshold ?? 0);
  return s.pages
    .map((page) => {
      const haystack = `${page.title} ${page.content} ${page.path}`.toLowerCase();
      const score = !query || haystack.includes(query) ? 0.92 : 0.35;
      return { ...page, score };
    })
    .filter((page) => page.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((page) => ({
      content: page.content,
      path: page.path,
      metadata: { ...page.metadata, title: page.title, score: page.score },
    }));
}

function lastUserText(messages = []) {
  const message = [...messages].reverse().find((item) => item.role === 'user') ?? {};
  if (typeof message.content === 'string') return message.content;
  const part = message.parts?.find((item) => item.type === 'text');
  return part?.text ?? 'How can I use this documentation?';
}

function aiSdkV5Response(threadId, prompt) {
  return {
    id: `msg_${threadId}`,
    role: 'assistant',
    parts: [
      { type: 'text', text: `Emulator answer for: ${prompt}` },
      { type: 'source-url', sourceId: 'src_quickstart', url: 'https://emulator.mintlify.app/quickstart', title: 'Quickstart' },
    ],
    metadata: { threadId },
  };
}

function aiSdkV4Response(threadId, prompt) {
  return {
    id: `msg_${threadId}`,
    role: 'assistant',
    content: `Emulator answer for: ${prompt}`,
    parts: [
      { type: 'text', text: `Emulator answer for: ${prompt}` },
      { type: 'source', source: { sourceType: 'url', id: 'src_quickstart', url: 'https://emulator.mintlify.app/quickstart', title: 'Quickstart' } },
    ],
    annotations: [{ type: 'thread', threadId }],
  };
}

function registerBoth(app, method, paths, handler) {
  for (const path of paths) app[method](path, handler);
}

export const contract = {
  provider: 'mintlify',
  source: 'Mintlify official OpenAPI specs',
  docs: 'https://www.mintlify.com/docs/api/introduction',
  baseUrl: 'https://api.mintlify.com/v1',
  discoveryBaseUrl: 'https://api.mintlify.com/discovery',
  scope: ['deployments', 'preview-deployments', 'agent-jobs', 'assistant', 'search', 'page-content', 'analytics'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'mintlify',
  register(app, store) {
    registerBoth(app, 'post', ['/v1/project/update/:projectId', '/project/update/:projectId'], (c) => {
      const s = state(store);
      const update = makeUpdate(s, c.req.param('projectId'));
      saveState(store, s);
      return c.json({ statusId: update._id }, 202);
    });

    registerBoth(app, 'get', ['/v1/project/update-status/:statusId', '/project/update-status/:statusId'], (c) => {
      const update = state(store).updates.find((item) => item._id === c.req.param('statusId'));
      return update ? c.json(update) : mintError(c, 'Update status not found', 404);
    });

    registerBoth(app, 'post', ['/v1/project/preview/:projectId', '/project/preview/:projectId'], async (c) => {
      const body = await readJson(c);
      if (!body.branch) return mintError(c, 'branch is required', 400);
      const s = state(store);
      const update = makeUpdate(s, c.req.param('projectId'), {
        summary: `Preview deployment for ${body.branch} completed successfully.`,
        commit: { sha: 'abcdef0123456789abcdef0123456789abcdef01', ref: body.branch, message: 'Preview documentation', filesChanged: { added: [], modified: [], removed: [] } },
      });
      saveState(store, s);
      return c.json({ statusId: update._id, previewUrl: `https://${projectFor(s, c.req.param('projectId')).subdomain}-${body.branch}.mintlify.app` }, 202);
    });

    registerBoth(app, 'post', ['/v2/agent/:projectId/job', '/v1/agent/:projectId/job'], async (c) => {
      const body = await readJson(c);
      const prompt = body.prompt ?? body.messages?.find?.((message) => message.role === 'user')?.content;
      if (!prompt) return mintError(c, 'prompt is required', 400);
      const s = state(store);
      const job = makeAgentJob(s, c.req.param('projectId'), prompt, { model: body.model ?? 'sonnet' });
      saveState(store, s);
      return c.json(c.req.url?.includes('/v1/') ? v1AgentJob(job, c.req.param('projectId')) : job, c.req.url?.includes('/v1/') ? 200 : 201);
    });

    registerBoth(app, 'get', ['/v2/agent/:projectId/job/:id', '/v1/agent/:projectId/job/:id'], (c) => {
      const job = state(store).agentJobs.find((item) => item.id === c.req.param('id'));
      if (!job) return mintError(c, 'Job not found', 404);
      return c.json(c.req.url?.includes('/v1/') ? v1AgentJob(job, c.req.param('projectId')) : job);
    });

    app.get('/v1/agent/:projectId/jobs', (c) => {
      const s = state(store);
      const skip = Number(c.req.query?.('skip') ?? 0);
      const take = Math.min(Number(c.req.query?.('take') ?? 12), 100);
      return c.json({ allSessions: s.agentJobs.slice(skip, skip + take).map((job) => v1AgentJob(job, c.req.param('projectId'))) });
    });

    app.post('/v2/agent/:projectId/job/:id/message', async (c) => {
      const body = await readJson(c);
      if (!body.prompt) return mintError(c, 'prompt is required', 400);
      const s = state(store);
      const job = s.agentJobs.find((item) => item.id === c.req.param('id'));
      if (!job) return mintError(c, 'Job not found', 404);
      job.messages.push({ role: 'user', content: body.prompt });
      job.status = 'completed';
      saveState(store, s);
      return c.json(job);
    });

    registerBoth(app, 'post', ['/discovery/v1/search/:domain', '/v1/search/:domain'], async (c) => {
      const body = await readJson(c);
      if (!body.query) return mintError(c, 'query is required', 400);
      return c.json(searchPages(state(store), body));
    });

    registerBoth(app, 'post', ['/discovery/v1/page/:domain', '/v1/page/:domain'], async (c) => {
      const body = await readJson(c);
      const page = state(store).pages.find((item) => item.path === body.path || item.path.replace(/^\//, '') === body.path);
      return page ? c.json({ path: page.path, content: page.content }) : c.json({ message: 'Page not found or no search index available' }, 404);
    });

    registerBoth(app, 'post', ['/discovery/v1/assistant/:domain/message', '/v1/assistant/:domain/message'], async (c) => {
      const body = await readJson(c);
      const s = state(store);
      const threadId = body.threadId ?? `thread_${String(s.nextId++).padStart(6, '0')}`;
      const prompt = lastUserText(body.messages);
      s.conversations.push({ threadId, domain: c.req.param('domain'), prompt, createdAt: NOW });
      saveState(store, s);
      return c.json(aiSdkV4Response(threadId, prompt));
    });

    registerBoth(app, 'post', ['/discovery/v2/assistant/:domain/message', '/v2/assistant/:domain/message'], async (c) => {
      const body = await readJson(c);
      const s = state(store);
      const threadId = body.threadId ?? `thread_${String(s.nextId++).padStart(6, '0')}`;
      const prompt = lastUserText(body.messages);
      s.conversations.push({ threadId, domain: c.req.param('domain'), prompt, createdAt: NOW });
      saveState(store, s);
      return c.json(aiSdkV5Response(threadId, prompt));
    });

    app.get('/v1/analytics/feedback', (c) => c.json({ data: state(store).analytics.feedback }));
    app.get('/v1/analytics/feedback-by-page', (c) => c.json({ data: state(store).analytics.feedback }));
    app.get('/v1/analytics/assistant-conversations', (c) => c.json({ data: state(store).conversations }));
    app.get('/v1/analytics/assistant-caller-stats', (c) => c.json({ data: [{ caller: 'emulator', requests: state(store).conversations.length }] }));
    app.get('/v1/analytics/searches', (c) => c.json({ data: state(store).analytics.searches }));
    app.get('/v1/analytics/views', (c) => c.json({ data: state(store).analytics.views }));
    app.get('/v1/analytics/visitors', (c) => c.json({ data: state(store).analytics.visitors }));
    app.get('/mintlify/inspect/contract', (c) => c.json(contract));
    app.get('/mintlify/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, baseUrl, config = {}) {
  saveState(store, initialState({ baseUrl, ...config }));
}

export const label = 'Mintlify API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { mintlify: initialState() };
