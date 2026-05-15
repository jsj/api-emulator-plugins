import { createToken, fixedNow, getState, readBody, routeError, setState } from './provider-plugin-kit.mjs';

function shape(value, envelope) {
  if (!envelope) return value;
  return { [envelope]: value };
}

function nextId(prefix, count) {
  return createToken(prefix, count + 1).replace('_', '_');
}

export function createSaasProvider(config) {
  const stateKey = `${config.name}:state`;
  function defaultState(baseUrl = config.baseUrl) {
    return { baseUrl, collections: structuredClone(config.collections) };
  }
  function state(store) {
    return getState(store, stateKey, () => defaultState());
  }
  function seedFromConfig(store, baseUrl = config.baseUrl, seed = {}) {
    const seeded = defaultState(baseUrl);
    for (const [key, value] of Object.entries(seed.collections ?? {})) seeded.collections[key] = value;
    return setState(store, stateKey, { ...seeded, ...seed, collections: { ...seeded.collections, ...(seed.collections ?? {}) } });
  }
  const contract = { provider: config.name, source: config.source, docs: config.docs, baseUrl: config.baseUrl, scope: config.scope, fidelity: 'deterministic-subset' };
  const plugin = {
    name: config.name,
    register(app, store) {
      for (const route of config.routes) {
        app[route.method.toLowerCase()](route.path, async (c) => {
          const current = state(store);
          if (route.response && !route.action) return c.json(route.response(c, current));
          const collection = current.collections[route.collection] ?? [];
          if (route.action === 'list') return c.json(shape(collection, route.envelope));
          if (route.action === 'get') {
            const item = collection.find((entry) => entry.id === c.req.param(route.param ?? 'id') || entry.name === c.req.param(route.param ?? 'id'));
            if (!item) return routeError(c, 'Resource not found', 404, 'not_found');
            return c.json(shape(item, route.envelope));
          }
          if (route.action === 'create') {
            const body = await readBody(c);
            const patch = route.mutate ? route.mutate(c, body, current) : body;
            const item = { id: nextId(route.idPrefix ?? route.collection, collection.length), ...(route.defaults ?? {}), ...patch };
            collection.push(item);
            current.collections[route.collection] = collection;
            const payload = route.response ? route.response(c, item, current) : shape(item, route.envelope);
            return c.json(payload, route.status ?? 201);
          }
          return c.json(route.response ? route.response(c, current) : {});
        });
      }
      app.get(`/${config.name}/inspect/state`, (c) => c.json(state(store)));
    },
  };
  return { contract, plugin, seedFromConfig, label: config.label, endpoints: config.endpoints, initConfig: config.initConfig };
}

export { fixedNow };
