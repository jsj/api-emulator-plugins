const IMAGE_BYTES = Buffer.from('fal-emulator-image');
const VIDEO_BYTES = Buffer.from('fal-emulator-video');
const FILE_BYTES = Buffer.from('fal-emulator-file');

const STATE_KEY = 'fal:state';

const DEFAULT_MODELS = [
  {
    endpoint_id: 'fal-ai/flux/dev',
    metadata: {
      name: 'FLUX.1 [dev]',
      tags: ['image-to-image', 'text-to-image'],
      category: 'image',
      description: 'Deterministic fal emulator image generation model.',
    },
  },
  {
    endpoint_id: 'fal-ai/fast-sdxl',
    metadata: {
      name: 'Fast SDXL',
      tags: ['text-to-image'],
      category: 'image',
      description: 'Deterministic fal emulator image model.',
    },
  },
  {
    endpoint_id: 'bytedance/seedance-2.0/fast/text-to-video',
    metadata: {
      name: 'Seedance 2.0 Fast Text to Video',
      tags: ['text-to-video', 'video'],
      category: 'video',
      description: 'Deterministic fal emulator video model.',
    },
  },
];

function nowIso() {
  return new Date().toISOString();
}

function state(store) {
  const existing = store.getData?.(STATE_KEY);
  if (existing) return existing;
  const initial = {
    models: DEFAULT_MODELS,
    requests: {},
    submissions: [],
    keys: [{ key_id: 'key_emu_fal_default', name: 'Default emulator key', created_at: nowIso() }],
    instances: [],
    files: [
      {
        path: 'outputs/fal-emulator-image.png',
        name: 'fal-emulator-image.png',
        size: IMAGE_BYTES.length,
        created_time: nowIso(),
        is_dir: false,
      },
    ],
    workflows: [
      {
        name: 'emulator-workflow',
        title: 'Emulator Workflow',
        username: 'fal-emulator',
        description: 'Deterministic workflow fixture.',
      },
    ],
  };
  store.setData?.(STATE_KEY, initial);
  return initial;
}

function saveState(store, nextState) {
  store.setData?.(STATE_KEY, nextState);
}

async function jsonBody(c) {
  return c.req.json().catch(() => ({}));
}

function paged(key, items) {
  return { next_cursor: null, has_more: false, [key]: items };
}

function origin(c) {
  return new URL(c.req.url).origin;
}

function requestPath(c) {
  return new URL(c.req.url).pathname;
}

function cleanQueuePath(pathname) {
  return pathname.replace(/^\/+/, '').replace(/\/+$/, '');
}

function endpointOutput(baseOrigin, endpointId) {
  if (endpointId.includes('video')) {
    return {
      seed: 42,
      video: {
        url: `${baseOrigin}/assets/video.mp4`,
        content_type: 'video/mp4',
        file_name: 'fal-emulator-video.mp4',
        file_size: VIDEO_BYTES.length,
      },
    };
  }
  return {
    seed: 42,
    images: [
      {
        url: `${baseOrigin}/assets/image.png`,
        content_type: 'image/png',
        file_name: 'fal-emulator-image.png',
        width: 1024,
        height: 1024,
        file_size: IMAGE_BYTES.length,
      },
    ],
  };
}

function queueRequestPayload(baseOrigin, endpointId, requestId, body = {}) {
  return {
    request_id: requestId,
    status: 'COMPLETED',
    response_url: `${baseOrigin}/${endpointId}/requests/${requestId}`,
    status_url: `${baseOrigin}/${endpointId}/requests/${requestId}/status`,
    cancel_url: `${baseOrigin}/${endpointId}/requests/${requestId}/cancel`,
    queue_position: 0,
    logs: [{ message: 'fal emulator completed request', timestamp: nowIso() }],
    metrics: { inference_time: 0.01 },
    input: body,
    output: endpointOutput(baseOrigin, endpointId),
  };
}

function queueStatus(request) {
  return {
    status: request.status,
    request_id: request.request_id,
    response_url: request.response_url,
    status_url: request.status_url,
    cancel_url: request.cancel_url,
    queue_position: request.queue_position,
    logs: request.logs,
    metrics: request.metrics,
  };
}

function modelRequestItem(request) {
  return {
    request_id: request.request_id,
    endpoint_id: request.endpoint_id,
    status: request.status,
    created_at: request.created_at,
    updated_at: request.updated_at,
    started_at: request.created_at,
    completed_at: request.updated_at,
    billable_units: 1,
  };
}

function noContent(c) {
  return c.body ? c.body(null, 204) : c.json({}, 204);
}

export function registerRoutes(app, store) {
  app.get('/models', (c) => c.json({ models: state(store).models }));

  app.get('/models/pricing', (c) => c.json(paged('prices', state(store).models.map((model) => ({
    endpoint_id: model.endpoint_id,
    price: 0.001,
    currency: 'USD',
    unit: 'request',
  })))));

  app.post('/models/pricing/estimate', async (c) => {
    const body = await jsonBody(c);
    return c.json({
      estimate_type: body.endpoint_id ? 'unit_price' : 'historical_api_price',
      total_cost: 0.001,
      currency: 'USD',
      items: [{ endpoint_id: body.endpoint_id ?? 'fal-ai/flux/dev', cost: 0.001, currency: 'USD' }],
    });
  });

  app.get('/models/usage', (c) => c.json(paged('time_series', [
    { timestamp: nowIso(), endpoint_id: 'fal-ai/flux/dev', requests: Object.keys(state(store).requests).length, billable_units: 1 },
  ])));

  app.get('/models/analytics', (c) => c.json(paged('time_series', [
    { timestamp: nowIso(), endpoint_id: 'fal-ai/flux/dev', requests: Object.keys(state(store).requests).length, latency_ms: 10 },
  ])));

  app.get('/models/billing-events', (c) => c.json(paged('billing_events', Object.values(state(store).requests).map((request) => ({
    request_id: request.request_id,
    endpoint_id: request.endpoint_id,
    amount: 0.001,
    currency: 'USD',
    created_at: request.created_at,
  })))));

  app.delete('/models/requests/:request_id/payloads', (c) => {
    const current = state(store);
    const request = current.requests[c.req.param('request_id')];
    if (request) request.output = {};
    saveState(store, current);
    return c.json({ cdn_delete_results: [{ link: `${origin(c)}/assets/image.png`, exception: null }] });
  });

  app.get('/models/requests/by-endpoint', (c) => c.json(paged('items', Object.values(state(store).requests).map(modelRequestItem))));
  app.get('/models/requests/search', (c) => c.json(paged('results', Object.values(state(store).requests).map(modelRequestItem))));

  app.get('/workflows', (c) => c.json({ workflows: state(store).workflows }));
  app.get('/workflows/:username/:workflow_name', (c) => {
    const workflow = state(store).workflows.find((item) => item.username === c.req.param('username') && item.name === c.req.param('workflow_name'))
      ?? { username: c.req.param('username'), name: c.req.param('workflow_name'), title: c.req.param('workflow_name') };
    return c.json({ workflow });
  });

  app.get('/serverless/analytics', (c) => c.json(paged('time_series', [
    { timestamp: nowIso(), requests: Object.keys(state(store).requests).length, errors: 0 },
  ])));

  app.get('/serverless/apps/:owner/:name/queue', (c) => c.json({ queue_size: 0 }));
  app.delete('/serverless/apps/:owner/:name/queue', (c) => noContent(c));

  app.get('/serverless/files/list', (c) => c.json(state(store).files));
  app.get('/serverless/files/list/:dir', (c) => {
    const dir = c.req.param('dir');
    return c.json(state(store).files.filter((file) => file.path.startsWith(dir)));
  });
  app.get('/serverless/files/file/:file', () => new Response(FILE_BYTES, { headers: { 'Content-Type': 'application/octet-stream' } }));
  app.post('/serverless/files/file/url/:file', async (c) => {
    const current = state(store);
    current.files.push({ path: c.req.param('file'), name: c.req.param('file').split('/').pop(), size: 0, created_time: nowIso(), is_dir: false });
    saveState(store, current);
    return c.json(true);
  });
  app.post('/serverless/files/file/local/:target_path', async (c) => {
    const current = state(store);
    current.files.push({ path: c.req.param('target_path'), name: c.req.param('target_path').split('/').pop(), size: 0, created_time: nowIso(), is_dir: false });
    saveState(store, current);
    return c.json(true);
  });

  app.get('/serverless/metrics', (c) => c.json({ requests: Object.keys(state(store).requests).length, errors: 0, queue_size: 0 }));
  app.post('/serverless/logs/history', (c) => c.json(paged('items', [{ timestamp: nowIso(), level: 'info', message: 'fal emulator log entry' }])));
  app.post('/serverless/logs/stream', () => new Response('data: {"message":"fal emulator log entry"}\n\n', { headers: { 'Content-Type': 'text/event-stream' } }));
  app.get('/serverless/requests/by-endpoint', (c) => c.json(paged('items', Object.values(state(store).requests).map(modelRequestItem))));

  app.get('/compute/instances', (c) => c.json(paged('instances', state(store).instances)));
  app.post('/compute/instances', async (c) => {
    const body = await jsonBody(c);
    const instance = {
      id: `inst_emu_fal_${state(store).instances.length + 1}`,
      instance_type: body.instance_type ?? 'gpu_1x_h100_sxm5',
      status: 'running',
      created_at: nowIso(),
    };
    const current = state(store);
    current.instances.push(instance);
    saveState(store, current);
    return c.json(instance);
  });
  app.get('/compute/instances/:id', (c) => {
    const instance = state(store).instances.find((item) => item.id === c.req.param('id'))
      ?? { id: c.req.param('id'), instance_type: 'gpu_1x_h100_sxm5', status: 'running', created_at: nowIso() };
    return c.json(instance);
  });
  app.delete('/compute/instances/:id', (c) => {
    const current = state(store);
    current.instances = current.instances.filter((item) => item.id !== c.req.param('id'));
    saveState(store, current);
    return noContent(c);
  });

  app.get('/keys', (c) => c.json(paged('keys', state(store).keys)));
  app.post('/keys', async (c) => {
    const body = await jsonBody(c);
    const key = {
      key_id: `key_emu_fal_${state(store).keys.length + 1}`,
      key_secret: 'fal-emulator-secret',
      name: body.name ?? 'Emulator key',
      created_at: nowIso(),
    };
    const current = state(store);
    current.keys.push({ key_id: key.key_id, name: key.name, created_at: key.created_at });
    saveState(store, current);
    return c.json(key);
  });
  app.delete('/keys/:key_id', (c) => {
    const current = state(store);
    current.keys = current.keys.filter((key) => key.key_id !== c.req.param('key_id'));
    saveState(store, current);
    return noContent(c);
  });

  app.get('/account/billing', (c) => c.json({
    username: 'fal-emulator',
    credits: { current_balance: 100, currency: 'USD' },
    payment_method: { type: 'emulator' },
  }));
  app.get('/account/focus', (c) => c.json({ enabled: false, limits: [] }));
  app.get('/account/model-access-controls', (c) => c.json({ enabled: false, controls: [] }));
  app.get('/meta', (c) => c.json({ webhook_ip_ranges: ['127.0.0.1/32'] }));

  app.post('/bytedance/seedance-2.0/fast/text-to-video', async (c) => {
    const body = await c.req.json();
    store.setData('fal:last-submit', body);
    const request = queueRequestPayload(origin(c), 'bytedance/seedance-2.0/fast/text-to-video', 'emu_fal_request_123', body);
    return c.json(queueStatus(request));
  });

  app.get('/bytedance/seedance-2.0/fast/text-to-video/requests/:request_id/status', (c) => c.json({
    status: 'COMPLETED',
    request_id: c.req.param('request_id'),
  }));

  app.get('/bytedance/seedance-2.0/fast/text-to-video/requests/:request_id', (c) => c.json({
    seed: 42,
    video: { url: `${new URL(c.req.url).origin}/assets/video.mp4` },
  }));

  app.post('/*', async (c) => {
    const body = await jsonBody(c);
    const endpointId = cleanQueuePath(requestPath(c));
    const current = state(store);
    const requestId = `emu_fal_request_${Object.keys(current.requests).length + 1}`;
    const request = {
      ...queueRequestPayload(origin(c), endpointId, requestId, body),
      endpoint_id: endpointId,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    current.requests[requestId] = request;
    current.submissions.push({ endpoint_id: endpointId, request_id: requestId, body, submitted_at: request.created_at });
    saveState(store, current);
    store.setData('fal:last-submit', { endpoint_id: endpointId, body });
    return c.json(queueStatus(request));
  });

  app.get('/*', (c) => {
    if (requestPath(c) === '/assets/video.mp4') return new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } });
    if (requestPath(c) === '/assets/image.png') return new Response(IMAGE_BYTES, { headers: { 'Content-Type': 'image/png' } });
    if (requestPath(c) === '/inspect/last-submit') return c.json(store.getData('fal:last-submit') ?? null);
    if (requestPath(c) === '/inspect/state') return c.json(state(store));
    const match = cleanQueuePath(requestPath(c)).match(/^(.*)\/requests\/([^/]+)(?:\/(status|status\/stream))?$/);
    if (!match) return c.json({ error: { message: 'Not found', type: 'not_found' } }, 404);
    const [, endpointId, requestId, action] = match;
    const request = state(store).requests[requestId] ?? {
      ...queueRequestPayload(origin(c), endpointId, requestId),
      endpoint_id: endpointId,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    if (action === 'status/stream') {
      return new Response(`data: ${JSON.stringify(queueStatus(request))}\n\ndata: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } });
    }
    if (action === 'status') return c.json(queueStatus(request));
    return c.json(request.output);
  });

  app.put('/*', (c) => {
    const match = cleanQueuePath(requestPath(c)).match(/^(.*)\/requests\/([^/]+)\/cancel$/);
    if (!match) return c.json({ error: { message: 'Not found', type: 'not_found' } }, 404);
    const [, endpointId, requestId] = match;
    const current = state(store);
    const request = current.requests[requestId] ?? {
      ...queueRequestPayload(origin(c), endpointId, requestId),
      endpoint_id: endpointId,
      created_at: nowIso(),
    };
    request.status = 'CANCELLED';
    request.updated_at = nowIso();
    current.requests[requestId] = request;
    saveState(store, current);
    return c.json(queueStatus(request));
  });

  app.get('/assets/video.mp4', () => new Response(VIDEO_BYTES, { headers: { 'Content-Type': 'video/mp4' } }));
  app.get('/assets/image.png', () => new Response(IMAGE_BYTES, { headers: { 'Content-Type': 'image/png' } }));
  app.get('/inspect/last-submit', (c) => c.json(store.getData('fal:last-submit') ?? null));
  app.get('/inspect/state', (c) => c.json(state(store)));
}
