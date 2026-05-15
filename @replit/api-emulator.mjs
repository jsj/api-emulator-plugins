import { fixedNow, getState, readBody, routeError, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'replit:state';

function defaultState(baseUrl = 'https://replit.com') {
  return {
    baseUrl,
    user: { id: 123456, username: 'emulator', displayName: 'Replit Emulator', image: 'https://replit.com/public/images/evalbot/evalbot_43.png' },
    repls: [
      {
        id: 'repl_ada_1',
        title: 'api-emulator-demo',
        slug: 'api-emulator-demo',
        url: 'https://replit.com/@emulator/api-emulator-demo',
        language: 'nodejs',
        timeCreated: fixedNow,
        timeUpdated: fixedNow,
        owner: { username: 'emulator', id: 123456 },
      },
    ],
    publicKeys: {
      emulator: '-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALocalReplitEmulatorKeyOnly\n-----END PUBLIC KEY-----',
    },
  };
}

const state = (store) => getState(store, STATE_KEY, () => defaultState());
const save = (store, next) => setState(store, STATE_KEY, next);

function graphQlError(c, message, status = 400) {
  return c.json({ data: null, errors: [{ message }] }, status);
}

function replResponse(repl) {
  return {
    id: repl.id,
    title: repl.title,
    slug: repl.slug,
    url: repl.url,
    language: repl.language,
    timeCreated: repl.timeCreated,
    timeUpdated: repl.timeUpdated,
    owner: repl.owner,
  };
}

async function handleGraphQl(c, store) {
  const body = await readBody(c);
  const query = String(body.query ?? '');
  const variables = body.variables ?? {};
  const s = state(store);

  if (/\bcurrentUser\b|\bviewer\b|\buser\s*\(/i.test(query)) {
    return c.json({
      data: {
        currentUser: s.user,
        viewer: s.user,
        user: variables.username || variables.id ? s.user : s.user,
      },
    });
  }
  if (/\brepl\s*\(/i.test(query)) {
    const repl = s.repls.find((item) => item.id === variables.id || item.slug === variables.slug || item.url === variables.url) ?? s.repls[0];
    return c.json({ data: { repl: replResponse(repl) } });
  }
  if (/\brepls\b/i.test(query)) {
    return c.json({ data: { repls: s.repls.map(replResponse) } });
  }
  return graphQlError(c, 'Unsupported Replit emulator GraphQL query');
}

export function seedFromConfig(store, baseUrl = 'https://replit.com', config = {}) {
  return save(store, { ...defaultState(baseUrl), ...config });
}

export const contract = {
  provider: 'replit',
  source: 'Replit Extensions Data API and GraphQL documentation-informed subset',
  docs: 'https://docs.replit.com/extensions/api/data',
  baseUrl: 'https://replit.com',
  scope: ['graphql-current-user', 'graphql-repls', 'extension-public-key'],
  fidelity: 'stateful-graphql-emulator',
  cliSmoke: { supported: false, reason: 'Official Extensions SDK is browser/runtime mediated and has no documented local base URL override.' },
};

export const plugin = {
  name: 'replit',
  register(app, store) {
    app.post('/graphql', (c) => handleGraphQl(c, store));
    app.get('/data/extensions/publicKey/:kid', (c) => {
      const key = state(store).publicKeys[c.req.param('kid')];
      return key ? c.text(key, 200, { 'content-type': 'text/plain' }) : routeError(c, 'Public key not found', 404, 'not_found');
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Replit API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { replit: { baseUrl: 'same emulator origin', token: 'replit-emulator-token' } };
export default plugin;
