import { createToken, fixedNow, getState, readBody, setState } from '../scripts/provider-plugin-kit.mjs';

const STATE_KEY = 'pinterest:state';

function initialState(config = {}) {
  return {
    user: { username: 'emulator', account_type: 'BUSINESS', profile_image: 'https://i.pinimg.com/emulator.png', website_url: 'https://example.com' },
    boards: [{ id: 'board_emulator', name: 'Emulator Board', description: 'Local API test board', privacy: 'PUBLIC', owner: { username: 'emulator' }, created_at: fixedNow }],
    pins: [{ id: 'pin_emulator_1', board_id: 'board_emulator', title: 'Emulator Pin', description: 'A deterministic pin', media: { media_type: 'image', images: {} }, link: 'https://example.com', created_at: fixedNow }],
    adAccounts: [{ id: 'ad_account_emulator', name: 'Emulator Ads', owner: { username: 'emulator' }, country: 'US', currency: 'USD' }],
    catalogs: [{ id: 'catalog_emulator', name: 'Emulator Catalog', catalog_type: 'RETAIL', created_at: fixedNow }],
    nextBoard: 2,
    nextPin: 2,
    ...config,
  };
}

const state = (store) => getState(store, STATE_KEY, () => initialState());
const save = (store, next) => setState(store, STATE_KEY, next);
const page = (items) => ({ items, bookmark: null });
const error = (c, message, status = 400) => c.json({ code: status, message }, status);

export function seedFromConfig(store, _baseUrl, config = {}) {
  return save(store, initialState(config));
}

export const contract = {
  provider: 'pinterest',
  source: 'Pinterest REST API v5 OpenAPI/documented subset',
  docs: 'https://developers.pinterest.com/docs/api/v5/',
  baseUrl: 'https://api.pinterest.com/v5',
  scope: ['user_account', 'boards', 'board_update_delete', 'pins', 'pin_update_delete', 'ad_accounts', 'catalogs'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'pinterest',
  register(app, store) {
    app.get('/v5/user_account', (c) => c.json(state(store).user));
    app.get('/v5/boards', (c) => c.json(page(state(store).boards)));
    app.post('/v5/boards', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      const board = { id: createToken('board_emulator', current.nextBoard++), name: body.name ?? 'Untitled board', description: body.description ?? '', privacy: body.privacy ?? 'PUBLIC', owner: { username: current.user.username }, created_at: fixedNow };
      current.boards.push(board);
      save(store, current);
      return c.json(board, 201);
    });
    app.get('/v5/boards/:id', (c) => {
      const board = state(store).boards.find((item) => item.id === c.req.param('id'));
      return board ? c.json(board) : error(c, 'Board not found', 404);
    });
    app.patch('/v5/boards/:id', async (c) => {
      const current = state(store);
      const board = current.boards.find((item) => item.id === c.req.param('id'));
      if (!board) return error(c, 'Board not found', 404);
      Object.assign(board, await readBody(c));
      save(store, current);
      return c.json(board);
    });
    app.delete('/v5/boards/:id', (c) => {
      const current = state(store);
      const before = current.boards.length;
      current.boards = current.boards.filter((item) => item.id !== c.req.param('id'));
      current.pins = current.pins.filter((pin) => pin.board_id !== c.req.param('id'));
      if (current.boards.length === before) return error(c, 'Board not found', 404);
      save(store, current);
      return c.json({ id: c.req.param('id'), deleted: true });
    });
    app.get('/v5/boards/:id/pins', (c) => c.json(page(state(store).pins.filter((pin) => pin.board_id === c.req.param('id')))));
    app.get('/v5/pins', (c) => c.json(page(state(store).pins)));
    app.post('/v5/pins', async (c) => {
      const current = state(store);
      const body = await readBody(c);
      if (!body.board_id) return error(c, 'board_id is required');
      const pin = {
        id: createToken('pin_emulator', current.nextPin++),
        board_id: body.board_id,
        title: body.title ?? '',
        description: body.description ?? '',
        link: body.link ?? null,
        media_source: body.media_source ?? {},
        media: { media_type: 'image', images: {} },
        created_at: fixedNow,
      };
      current.pins.unshift(pin);
      save(store, current);
      return c.json(pin, 201);
    });
    app.get('/v5/pins/:id', (c) => {
      const pin = state(store).pins.find((item) => item.id === c.req.param('id'));
      return pin ? c.json(pin) : error(c, 'Pin not found', 404);
    });
    app.patch('/v5/pins/:id', async (c) => {
      const current = state(store);
      const pin = current.pins.find((item) => item.id === c.req.param('id'));
      if (!pin) return error(c, 'Pin not found', 404);
      Object.assign(pin, await readBody(c));
      save(store, current);
      return c.json(pin);
    });
    app.delete('/v5/pins/:id', (c) => {
      const current = state(store);
      const before = current.pins.length;
      current.pins = current.pins.filter((item) => item.id !== c.req.param('id'));
      if (current.pins.length === before) return error(c, 'Pin not found', 404);
      save(store, current);
      return c.json({ id: c.req.param('id'), deleted: true });
    });
    app.get('/v5/ad_accounts', (c) => c.json(page(state(store).adAccounts)));
    app.get('/v5/catalogs', (c) => c.json(page(state(store).catalogs)));
    app.get('/pinterest/inspect/state', (c) => c.json(state(store)));
  },
};

export const label = 'Pinterest API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { pinterest: initialState() };
export default plugin;
