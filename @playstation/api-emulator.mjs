const STATE_KEY = 'playstation:state';
const FIXED_TIME = '2026-05-15T12:00:00Z';

function initialState(config = {}) {
  const concepts = config.concepts ?? [
    {
      conceptId: 'concept_seed',
      name: 'Emulator Quest',
      status: 'approved',
      partnerId: 'spid_seed',
      createdDate: FIXED_TIME,
      updatedDate: FIXED_TIME,
    },
  ];
  const products = config.products ?? [
    {
      productId: 'PPSA00001_00',
      conceptId: 'concept_seed',
      titleName: 'Emulator Quest',
      platform: 'PS5',
      contentType: 'Game',
      status: 'active',
      variants: [{ variantId: 'variant_seed', territory: 'US', language: 'en-US', metadataStatus: 'complete' }],
    },
  ];
  return {
    concepts,
    products,
    assets: config.assets ?? [
      {
        assetId: 'asset_seed',
        productId: 'PPSA00001_00',
        assetType: 'package',
        fileName: 'emulator-quest.pkg',
        status: 'validated',
        createdDate: FIXED_TIME,
      },
    ],
    publishHistory: config.publishHistory ?? [
      {
        publishId: 'publish_seed',
        productId: 'PPSA00001_00',
        environment: 'production',
        status: 'published',
        publishedDate: FIXED_TIME,
      },
    ],
    nextConceptId: 2,
    nextProductId: 2,
    nextPublishId: 2,
  };
}

function state(store) {
  const current = store.getData?.(STATE_KEY);
  if (current) return current;
  const next = initialState();
  store.setData?.(STATE_KEY, next);
  return next;
}

function saveState(store, next) {
  store.setData?.(STATE_KEY, next);
}

function page(items, c) {
  const offset = Number(c.req.query('offset') ?? 0) || 0;
  const limit = Number(c.req.query('limit') ?? items.length) || items.length;
  return {
    total: items.length,
    offset,
    limit,
    items: items.slice(offset, offset + limit),
  };
}

function error(c, code, message, status = 404) {
  return c.json({ errorCode: code, message, timestamp: FIXED_TIME, path: new URL(c.req.url).pathname }, status);
}

export const contract = {
  provider: 'playstation',
  source: 'PlayStation Partners and Sony Content Pipeline publishing-compatible surface',
  docs: 'https://partners.playstation.net/',
  baseUrls: ['https://publish.playstation.net/api/v1', 'https://partners.playstation.net/api/v1'],
  scope: ['concepts', 'products', 'variants', 'metadata', 'assets', 'publish-info', 'publish-history'],
  fidelity: 'stateful-rest-emulator',
  note: 'Public PlayStation publishing documentation is gated; this models the visible Partners/Content Pipeline API shape for local tool compatibility.',
};

export const plugin = {
  name: 'playstation',
  register(app, store) {
    app.get('/api/v1/concepts/count', (c) => c.json({ count: state(store).concepts.length }));
    app.get('/api/v1/concepts', (c) => c.json(page(state(store).concepts, c)));

    app.post('/api/v1/create/concepts/products', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const concept = {
        conceptId: body.conceptId ?? `concept_${s.nextConceptId++}`,
        name: body.name ?? body.titleName ?? 'Untitled PlayStation Concept',
        status: 'draft',
        partnerId: body.partnerId ?? 'spid_seed',
        createdDate: FIXED_TIME,
        updatedDate: FIXED_TIME,
      };
      const product = {
        productId: body.productId ?? `PPSA${String(s.nextProductId++).padStart(5, '0')}_00`,
        conceptId: concept.conceptId,
        titleName: body.titleName ?? concept.name,
        platform: body.platform ?? 'PS5',
        contentType: body.contentType ?? 'Game',
        status: 'draft',
        variants: [],
      };
      s.concepts.push(concept);
      s.products.push(product);
      saveState(store, s);
      return c.json({ concept, product }, 201);
    });

    app.get('/api/v1/concepts/:conceptId', (c) => {
      const concept = state(store).concepts.find((item) => item.conceptId === c.req.param('conceptId'));
      if (!concept) return error(c, 'CONCEPT_NOT_FOUND', 'Concept was not found.');
      return c.json(concept);
    });

    app.get('/api/v1/concepts/:conceptId/products', (c) => {
      const items = state(store).products.filter((item) => item.conceptId === c.req.param('conceptId'));
      return c.json(page(items, c));
    });

    app.post('/api/v1/create/concepts/products/add', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const conceptId = body.conceptId ?? 'concept_seed';
      if (!s.concepts.some((item) => item.conceptId === conceptId)) return error(c, 'CONCEPT_NOT_FOUND', 'Concept was not found.');
      const product = {
        productId: body.productId ?? `PPSA${String(s.nextProductId++).padStart(5, '0')}_00`,
        conceptId,
        titleName: body.titleName ?? 'PlayStation Emulator Product',
        platform: body.platform ?? 'PS5',
        contentType: body.contentType ?? 'Game',
        status: 'draft',
        variants: [],
      };
      s.products.push(product);
      saveState(store, s);
      return c.json(product, 201);
    });

    app.get('/api/v1/concepts/products/:productId', (c) => {
      const product = state(store).products.find((item) => item.productId === c.req.param('productId'));
      if (!product) return error(c, 'PRODUCT_NOT_FOUND', 'Product was not found.');
      return c.json(product);
    });

    app.get('/api/v1/products/count', (c) => c.json({ count: state(store).products.length }));
    app.get('/api/v1/products/details', (c) => c.json(page(state(store).products, c)));

    app.post('/api/v1/create/concepts/products/variant', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const product = s.products.find((item) => item.productId === (body.productId ?? 'PPSA00001_00'));
      if (!product) return error(c, 'PRODUCT_NOT_FOUND', 'Product was not found.');
      const variant = {
        variantId: body.variantId ?? `variant_${product.variants.length + 1}`,
        territory: body.territory ?? 'US',
        language: body.language ?? 'en-US',
        metadataStatus: 'draft',
      };
      product.variants.push(variant);
      saveState(store, s);
      return c.json(variant, 201);
    });

    app.post('/api/v1/create/concepts/products/variant/metadata', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const product = s.products.find((item) => item.productId === (body.productId ?? 'PPSA00001_00'));
      if (!product) return error(c, 'PRODUCT_NOT_FOUND', 'Product was not found.');
      const variant = product.variants.find((item) => item.variantId === (body.variantId ?? 'variant_seed'));
      if (!variant) return error(c, 'VARIANT_NOT_FOUND', 'Variant was not found.');
      variant.metadata = body.metadata ?? { title: product.titleName, shortDescription: 'Updated by emulator smoke.' };
      variant.metadataStatus = 'complete';
      saveState(store, s);
      return c.json(variant);
    });

    app.get('/api/v1/concepts/:conceptId/products/:productId/variant/:variantId/metadata', (c) => {
      const product = state(store).products.find((item) => item.conceptId === c.req.param('conceptId') && item.productId === c.req.param('productId'));
      const variant = product?.variants.find((item) => item.variantId === c.req.param('variantId'));
      if (!variant) return error(c, 'VARIANT_NOT_FOUND', 'Variant was not found.');
      return c.json({ productId: product.productId, variantId: variant.variantId, metadata: variant.metadata ?? { title: product.titleName } });
    });

    app.get('/api/v1/concepts/:conceptId/products/:productId/variant/:variantId/preview', (c) => {
      const product = state(store).products.find((item) => item.conceptId === c.req.param('conceptId') && item.productId === c.req.param('productId'));
      const variant = product?.variants.find((item) => item.variantId === c.req.param('variantId'));
      if (!variant) return error(c, 'VARIANT_NOT_FOUND', 'Variant was not found.');
      return c.json({ previewUrl: `https://publish.playstation.net/preview/${product.productId}/${variant.variantId}`, status: variant.metadataStatus });
    });

    app.get('/api/v1/assets', (c) => c.json(page(state(store).assets, c)));
    app.get('/api/v1/assets/statuses', (c) => c.json({ statuses: ['uploaded', 'validating', 'validated', 'rejected'] }));
    app.get('/api/v1/assets/:assetId', (c) => {
      const asset = state(store).assets.find((item) => item.assetId === c.req.param('assetId'));
      if (!asset) return error(c, 'ASSET_NOT_FOUND', 'Asset was not found.');
      return c.json(asset);
    });

    app.get('/api/v1/contentservice/publishinfo/search', (c) => {
      const productId = c.req.query('productId');
      const items = state(store).products
        .filter((item) => !productId || item.productId === productId)
        .map((item) => ({ productId: item.productId, titleName: item.titleName, status: item.status, environments: ['qa', 'production'] }));
      return c.json(page(items, c));
    });

    app.post('/api/v1/contentservice/publish', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const publish = {
        publishId: `publish_${s.nextPublishId++}`,
        productId: body.productId ?? 'PPSA00001_00',
        environment: c.req.query('env') ?? body.environment ?? 'production',
        status: 'submitted',
        submittedDate: FIXED_TIME,
      };
      s.publishHistory.unshift(publish);
      saveState(store, s);
      return c.json(publish, 202);
    });

    app.get('/api/v1/publishHistory', (c) => c.json(page(state(store).publishHistory, c)));
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'PlayStation Publishing API emulator';
export const endpoints = 'concepts, products, variants, metadata, assets, publish info, and publish history';
export const capabilities = contract.scope;
export const initConfig = { playstation: initialState() };
export default plugin;
