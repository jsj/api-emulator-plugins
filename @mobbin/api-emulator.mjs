import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'mobbin:state';

function defaultState(baseUrl = 'https://api.mobbin.com') {
  const screens = [
    {
      id: '58585b72-748a-47b2-90c3-179e92a963d4',
      image_url: 'https://mobbin.com/api/mcp/short/IgrOOaPc',
      mobbin_url: 'https://mobbin.com/screens/58585b72-748a-47b2-90c3-179e92a963d4',
      app_name: 'Ghost',
      platform: 'web',
      title: 'Dark membership analytics dashboard',
      tags: ['dashboard', 'analytics', 'members', 'sources', 'chart', 'dark'],
      created_at: fixedNow,
    },
    {
      id: '44a18f7a-5e3c-469c-86fa-3adc37d038a9',
      image_url: 'https://mobbin.com/api/mcp/short/vOHFUxGr',
      mobbin_url: 'https://mobbin.com/screens/44a18f7a-5e3c-469c-86fa-3adc37d038a9',
      app_name: 'June',
      platform: 'web',
      title: 'Product analytics home dashboard',
      tags: ['dashboard', 'analytics', 'activation', 'retention', 'cohorts', 'users'],
      created_at: fixedNow,
    },
    {
      id: 'c9020d16-6244-4d8b-9462-0a5c1175cac9',
      image_url: 'https://mobbin.com/api/mcp/short/SzHizSP5',
      mobbin_url: 'https://mobbin.com/screens/c9020d16-6244-4d8b-9462-0a5c1175cac9',
      app_name: 'Teachable',
      platform: 'web',
      title: 'Creator school dashboard',
      tags: ['dashboard', 'sales', 'signups', 'education', 'live feed', 'products'],
      created_at: fixedNow,
    },
    {
      id: '67c02e2c-718f-4cf2-9458-45a85086e9e2',
      image_url: 'https://mobbin.com/api/mcp/short/5jbJ0dDC',
      mobbin_url: 'https://mobbin.com/screens/67c02e2c-718f-4cf2-9458-45a85086e9e2',
      app_name: 'Outseta',
      platform: 'web',
      title: 'CRM billing engagement dashboard',
      tags: ['dashboard', 'crm', 'billing', 'engagement', 'activity', 'support'],
      created_at: fixedNow,
    },
    {
      id: 'a0ec4af5-4fb1-495b-b308-98ec9d98295a',
      image_url: 'https://mobbin.com/api/mcp/short/8WLF2usd',
      mobbin_url: 'https://mobbin.com/screens/a0ec4af5-4fb1-495b-b308-98ec9d98295a',
      app_name: 'Mintlify',
      platform: 'web',
      title: 'Documentation analytics dashboard',
      tags: ['dashboard', 'analytics', 'documentation', 'visitors', 'referrals', 'search'],
      created_at: fixedNow,
    },
  ];
  return { baseUrl, screens };
}

function state(store) {
  return getState(store, STATE_KEY, () => defaultState());
}

export function seedFromConfig(store, baseUrl = 'https://api.mobbin.com', config = {}) {
  const seeded = defaultState(baseUrl);
  if (config.screens) seeded.screens = config.screens;
  return setState(store, STATE_KEY, seeded);
}

function screenPayload(screen) {
  return {
    id: screen.id,
    image_url: screen.image_url,
    mobbin_url: screen.mobbin_url,
    app_name: screen.app_name,
    platform: screen.platform,
  };
}

function searchScreens(s, body = {}) {
  const platform = body.platform;
  if (platform && !['ios', 'web'].includes(platform)) {
    return { error: { code: 'bad_request', message: 'platform must be ios or web' } };
  }
  const excluded = new Set(body.exclude_screen_ids ?? []);
  const query = String(body.query ?? '').toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const limit = Math.max(1, Math.min(Number(body.limit ?? 20), 30));
  const screens = s.screens
    .filter((screen) => !platform || screen.platform === platform)
    .filter((screen) => !excluded.has(screen.id))
    .filter((screen) => {
      if (terms.length === 0) return true;
      const haystack = `${screen.app_name} ${screen.title} ${screen.tags.join(' ')}`.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    })
    .slice(0, limit)
    .map(screenPayload);
  return { screens };
}

function protectedResourceMetadata() {
  return {
    resource: 'https://api.mobbin.com/mcp',
    authorization_servers: ['https://ujasntkfphywizsdaapi.supabase.co/auth/v1'],
    scopes_supported: ['openid'],
  };
}

function toolSchema() {
  return {
    name: 'search_screens',
    description: 'Search Mobbin screens using natural language.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language screen search query.' },
        platform: { type: 'string', enum: ['ios', 'web'] },
        mode: { type: 'string', enum: ['fast', 'deep'], default: 'fast' },
        limit: { type: 'integer', minimum: 1, maximum: 30, default: 20 },
        exclude_screen_ids: { type: 'array', items: { type: 'string' }, default: [] },
        image_format: { type: 'string', enum: ['webp', 'jpg'], default: 'webp' },
      },
      required: ['query', 'platform'],
      additionalProperties: false,
    },
  };
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleMcp(c, store) {
  const body = await readBody(c);
  const id = body.id ?? null;
  const method = body.method;
  if (method === 'initialize') {
    return c.json(rpcResult(id, {
      protocolVersion: body.params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'mobbin-api-emulator', version: '0.1.0' },
    }));
  }
  if (method === 'notifications/initialized') return c.json(rpcResult(id, {}));
  if (method === 'tools/list') return c.json(rpcResult(id, { tools: [toolSchema()] }));
  if (method === 'resources/list') return c.json(rpcResult(id, { resources: [] }));
  if (method === 'prompts/list') return c.json(rpcResult(id, { prompts: [] }));
  if (method === 'tools/call') {
    const name = body.params?.name;
    if (name !== 'search_screens') return c.json(rpcError(id, -32602, `Unknown tool: ${name}`));
    const result = searchScreens(state(store), body.params?.arguments ?? {});
    if (result.error) return c.json(rpcError(id, -32602, result.error.message));
    return c.json(rpcResult(id, {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result,
    }));
  }
  return c.json(rpcError(id, -32601, `Method not found: ${method}`));
}

export const contract = {
  provider: 'mobbin',
  source: 'Mobbin MCP endpoint and public Screens Search API behavior',
  docs: 'https://api.mobbin.com/mcp',
  baseUrl: 'https://api.mobbin.com',
  scope: ['mcp', 'screens.search', 'oauth-protected-resource'],
  fidelity: 'deterministic-mcp-and-rest-subset',
};

export const plugin = {
  name: 'mobbin',
  register(app, store) {
    app.get('/.well-known/oauth-protected-resource/mcp', (c) => c.json(protectedResourceMetadata()));
    app.post('/v1/screens/search', async (c) => {
      const result = searchScreens(state(store), await readBody(c));
      if (result.error) return routeError(c, result.error.message, 400, result.error.code);
      return c.json(result);
    });
    app.post('/mcp', (c) => handleMcp(c, store));
    app.get('/mobbin/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Mobbin MCP and Screens API emulator';
export const endpoints = 'mcp, screens search, oauth metadata';
export const initConfig = { mobbin: { apiKey: 'mobbin_emulator_key' } };

export default plugin;
