function initialState(config = {}) {
  return {
    users: [
      {
        username: 'emulator_teacher',
        account_type: 'teacher',
        profile_image: 'https://quizlet.com/a/i/animals/01.png',
        id: 1001,
      },
    ],
    sets: [
      {
        id: 2001,
        url: 'https://quizlet.com/2001/emulator-biology-flash-cards/',
        title: 'Emulator Biology',
        created_by: 'emulator_teacher',
        term_count: 2,
        has_images: false,
        created_date: 1778846400,
        modified_date: 1778846400,
        published_date: 1778846400,
        lang_terms: 'en',
        lang_definitions: 'en',
        visibility: 'public',
        editable: 'only_me',
        terms: [
          { id: 3001, term: 'cell', definition: 'The basic unit of life', image: null, rank: 0 },
          { id: 3002, term: 'osmosis', definition: 'Movement of water across a membrane', image: null, rank: 1 },
        ],
      },
    ],
    nextSetId: 2002,
    nextTermId: 3003,
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('quizlet:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('quizlet:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('quizlet:state', next);
}

function quizletError(c, status, error, title, description) {
  return c.json({ error, error_title: title, error_description: description }, status);
}

function parseList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function publicSet(set) {
  return {
    ...set,
    term_count: set.terms.length,
  };
}

function termsFromBody(body, s, existingTerms = []) {
  const terms = Array.isArray(body.terms) ? body.terms : parseList(body.terms);
  const definitions = Array.isArray(body.definitions) ? body.definitions : parseList(body.definitions);
  if (terms.length === 0 && definitions.length === 0) return existingTerms;
  if (terms.length === 0 || terms.length !== definitions.length) return null;
  return terms.map((term, index) => ({
    id: existingTerms[index]?.id ?? s.nextTermId++,
    term: String(term),
    definition: String(definitions[index]),
    image: existingTerms[index]?.image ?? null,
    rank: index,
  }));
}

async function parsedBody(c) {
  const contentType = c.req.header?.('content-type') ?? '';
  if (contentType.includes('application/json')) return c.req.json().catch(() => ({}));
  return c.req.parseBody?.().catch(() => ({})) ?? {};
}

export const contract = {
  provider: 'quizlet',
  source: 'Quizlet API 2.0 compatible REST subset',
  docs: 'https://quizlet.com/api/2.0/docs',
  baseUrl: 'https://api.quizlet.com/2.0',
  scope: ['users', 'sets', 'terms', 'search'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'quizlet',
  register(app, store) {
    app.get('/2.0/users/:username', (c) => {
      const user = state(store).users.find((item) => item.username === c.req.param('username'));
      return user ? c.json(user) : quizletError(c, 404, 'not_found', 'Not found', 'User not found');
    });

    app.get('/2.0/users/:username/sets', (c) => {
      const sets = state(store).sets.filter((set) => set.created_by === c.req.param('username')).map(publicSet);
      return c.json(sets);
    });

    app.get('/2.0/search/sets', (c) => {
      const q = String(c.req.query('q') ?? '').toLowerCase();
      const creator = c.req.query('creator');
      const page = Math.max(Number(c.req.query('page') ?? 1), 1);
      const perPage = Math.max(Number(c.req.query('per_page') ?? 20), 1);
      const rows = state(store).sets
        .filter((set) => !creator || set.created_by === creator)
        .filter((set) => {
          if (!q) return true;
          return [set.title, ...set.terms.flatMap((term) => [term.term, term.definition])]
            .some((value) => String(value).toLowerCase().includes(q));
        })
        .map(publicSet);
      const start = (page - 1) * perPage;
      return c.json(rows.slice(start, start + perPage));
    });

    app.get('/2.0/sets/:id', (c) => {
      const set = state(store).sets.find((item) => String(item.id) === String(c.req.param('id')));
      return set ? c.json(publicSet(set)) : quizletError(c, 404, 'not_found', 'Not found', 'Set not found');
    });

    app.get('/2.0/sets/:id/terms', (c) => {
      const set = state(store).sets.find((item) => String(item.id) === String(c.req.param('id')));
      return set ? c.json(set.terms) : quizletError(c, 404, 'not_found', 'Not found', 'Set not found');
    });

    app.get('/2.0/sets', (c) => {
      const ids = parseList(c.req.query('set_ids'));
      const sets = ids.length
        ? state(store).sets.filter((set) => ids.includes(String(set.id)))
        : state(store).sets;
      return c.json(sets.map(publicSet));
    });

    app.post('/2.0/sets', async (c) => {
      const s = state(store);
      const body = await parsedBody(c);
      const terms = termsFromBody(body, s);
      if (!body.title || !terms || terms.length === 0) {
        return quizletError(c, 400, 'invalid_request', 'Invalid request', 'title and matching terms/definitions are required');
      }
      const set = {
        id: s.nextSetId++,
        url: `https://quizlet.com/${s.nextSetId - 1}/${String(body.title).toLowerCase().replaceAll(' ', '-')}-flash-cards/`,
        title: String(body.title),
        created_by: body.created_by ?? s.users[0].username,
        created_date: 1778846400,
        modified_date: 1778846400,
        published_date: 1778846400,
        lang_terms: body.lang_terms ?? 'en',
        lang_definitions: body.lang_definitions ?? 'en',
        visibility: body.visibility ?? 'public',
        editable: body.editable ?? 'only_me',
        has_images: false,
        terms,
      };
      s.sets.push(set);
      saveState(store, s);
      return c.json(publicSet(set), 201);
    });

    app.put('/2.0/sets/:id', async (c) => {
      const s = state(store);
      const set = s.sets.find((item) => String(item.id) === String(c.req.param('id')));
      if (!set) return quizletError(c, 404, 'not_found', 'Not found', 'Set not found');
      const body = await parsedBody(c);
      const terms = termsFromBody(body, s, set.terms);
      if (!terms) {
        return quizletError(c, 400, 'invalid_request', 'Invalid request', 'terms and definitions must have matching lengths');
      }
      Object.assign(set, {
        title: body.title ? String(body.title) : set.title,
        lang_terms: body.lang_terms ?? set.lang_terms,
        lang_definitions: body.lang_definitions ?? set.lang_definitions,
        visibility: body.visibility ?? set.visibility,
        editable: body.editable ?? set.editable,
        modified_date: 1778846500,
        terms,
      });
      saveState(store, s);
      return c.json(publicSet(set));
    });

    app.delete('/2.0/sets/:id', (c) => {
      const s = state(store);
      const index = s.sets.findIndex((item) => String(item.id) === String(c.req.param('id')));
      if (index === -1) return quizletError(c, 404, 'not_found', 'Not found', 'Set not found');
      s.sets.splice(index, 1);
      saveState(store, s);
      return c.body?.(null, 204) ?? c.json(null, 204);
    });

    app.get('/quizlet/inspect/contract', (c) => c.json(contract));
    app.get('/quizlet/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Quizlet API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { quizlet: initialState() };

export default plugin;
