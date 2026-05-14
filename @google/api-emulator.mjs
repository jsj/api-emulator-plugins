const WORKSPACE_SERVICES = [
  { alias: 'drive', api: 'drive', version: 'v3', serviceId: 'drive.googleapis.com' },
  { alias: 'sheets', api: 'sheets', version: 'v4', serviceId: 'sheets.googleapis.com' },
  { alias: 'gmail', api: 'gmail', version: 'v1', serviceId: 'gmail.googleapis.com' },
  { alias: 'calendar', api: 'calendar', version: 'v3', serviceId: 'calendar-json.googleapis.com' },
  { alias: 'docs', api: 'docs', version: 'v1', serviceId: 'docs.googleapis.com' },
  { alias: 'slides', api: 'slides', version: 'v1', serviceId: 'slides.googleapis.com' },
  { alias: 'tasks', api: 'tasks', version: 'v1', serviceId: 'tasks.googleapis.com' },
  { alias: 'people', api: 'people', version: 'v1', serviceId: 'people.googleapis.com' },
  { alias: 'chat', api: 'chat', version: 'v1', serviceId: 'chat.googleapis.com' },
  { alias: 'vault', api: 'vault', version: 'v1', serviceId: 'vault.googleapis.com' },
  { alias: 'groupssettings', api: 'groupssettings', version: 'v1', serviceId: 'groupssettings.googleapis.com' },
  { alias: 'reseller', api: 'reseller', version: 'v1', serviceId: 'reseller.googleapis.com' },
  { alias: 'licensing', api: 'licensing', version: 'v1', serviceId: 'licensing.googleapis.com' },
  { alias: 'script', api: 'script', version: 'v1', serviceId: 'script.googleapis.com' },
  { alias: 'admin', api: 'admin', version: 'directory_v1', serviceId: 'admin.googleapis.com' },
  { alias: 'reports', api: 'admin', version: 'reports_v1', serviceId: 'admin.googleapis.com' },
  { alias: 'classroom', api: 'classroom', version: 'v1', serviceId: 'classroom.googleapis.com' },
  { alias: 'cloudidentity', api: 'cloudidentity', version: 'v1', serviceId: 'cloudidentity.googleapis.com' },
  { alias: 'alertcenter', api: 'alertcenter', version: 'v1beta1', serviceId: 'alertcenter.googleapis.com' },
  { alias: 'forms', api: 'forms', version: 'v1', serviceId: 'forms.googleapis.com' },
  { alias: 'keep', api: 'keep', version: 'v1', serviceId: 'keep.googleapis.com' },
  { alias: 'meet', api: 'meet', version: 'v2', serviceId: 'meet.googleapis.com' },
  { alias: 'workspaceevents', api: 'workspaceevents', version: 'v1', serviceId: 'workspaceevents.googleapis.com' },
  { alias: 'pubsub', api: 'pubsub', version: 'v1', serviceId: 'pubsub.googleapis.com' },
];

export const contract = {
  provider: 'google',
  source: 'Google Workspace Discovery documents surfaced through an OpenAPI-compatible adapter',
  docs: 'https://developers.google.com/workspace',
  scope: WORKSPACE_SERVICES.map((service) => service.alias),
  fidelity: 'stateful-core-plus-discovery-openapi-compatible-generic-fallback',
  discoveryServiceCount: WORKSPACE_SERVICES.length,
  serviceIds: WORKSPACE_SERVICES.map((service) => service.serviceId),
  adapterRoutePrefixes: ['/:service/:version/*', '/upload/:service/:version/*', '/$discovery/rest'],
};

function now() {
  return new Date().toISOString();
}

function state(store) {
  const current = store.getData?.('google:workspace-state');
  if (current) return current;
  const initial = {
    driveFiles: [
      {
        id: 'file_emulator_seed',
        name: 'Emulator Seed Doc',
        mimeType: 'application/vnd.google-apps.document',
        parents: ['root'],
        createdTime: now(),
        modifiedTime: now(),
      },
    ],
    gmailMessages: [
      {
        id: 'msg_emulator_seed',
        threadId: 'thread_emulator_seed',
        labelIds: ['INBOX'],
        snippet: 'Finance team: Q2 budget review is due by Friday and needs your approval',
        internalDate: String(Date.now() - 60 * 60 * 1000),
      },
      {
        id: 'msg_emulator_flight',
        threadId: 'thread_emulator_flight',
        labelIds: ['INBOX', 'CATEGORY_UPDATES'],
        snippet: 'Travel desk: Your SFO to NYC itinerary changed, new departure is 8:10 AM',
        internalDate: String(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: 'msg_emulator_security',
        threadId: 'thread_emulator_security',
        labelIds: ['INBOX', 'IMPORTANT'],
        snippet: 'Security digest: Two new sign-ins were detected for the staging workspace',
        internalDate: String(Date.now()),
      },
    ],
    calendarEvents: [
      {
        id: 'event_emulator_seed',
        status: 'confirmed',
        summary: 'Workspace emulator event',
        start: { dateTime: now() },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      },
    ],
    spreadsheets: {},
    docs: {},
    generic: {},
    hits: [],
  };
  store.setData?.('google:workspace-state', initial);
  return initial;
}

function saveState(store, next) {
  store.setData?.('google:workspace-state', next);
}

function hit(store, surface) {
  const next = state(store);
  next.hits.push({ surface, at: now() });
  saveState(store, next);
}

async function body(c) {
  return c.req.json().catch(() => ({}));
}

function query(c, key, fallback) {
  return c.req.query?.(key) ?? fallback;
}

function param(c, key, fallback) {
  return c.req.param?.(key) ?? fallback;
}

function jsonError(c, status, message, reason = 'notFound') {
  return c.json({ error: { code: status, message, errors: [{ message, domain: 'global', reason }] } }, status);
}

function filteredFields(resource, fields) {
  if (!fields || fields === '*') return resource;
  if (fields.includes('files(')) return resource;
  if (fields.includes('messages(')) return resource;
  if (fields.includes('items(')) return resource;
  const wanted = new Set(fields.split(',').map((field) => field.trim()).filter(Boolean));
  return Object.fromEntries(Object.entries(resource).filter(([key]) => wanted.has(key)));
}

function listPage(items, c, collectionKey) {
  const max = Number(query(c, 'pageSize', query(c, 'maxResults', items.length)));
  const limited = items.slice(0, Number.isFinite(max) && max > 0 ? max : items.length);
  return filteredFields({ kind: 'google#list', [collectionKey]: limited }, query(c, 'fields'));
}

function parseGenericPath(c) {
  let path = param(c, '*');
  if (!path && c.req.url) path = new URL(c.req.url).pathname.replace(/^\/+/, '');
  const parts = String(path ?? '').split('/').filter(Boolean);
  const upload = parts[0] === 'upload';
  if (upload) parts.shift();
  return {
    upload,
    service: parts.shift() ?? param(c, 'service', 'google'),
    version: parts.shift() ?? param(c, 'version', 'v1'),
    resourcePath: parts.join('/'),
  };
}

function genericKey(service, version, resourcePath) {
  return `${service}/${version}/${resourcePath || 'root'}`;
}

function genericResponse(c, store) {
  const next = state(store);
  const parsed = parseGenericPath(c);
  const key = genericKey(parsed.service, parsed.version, parsed.resourcePath);
  next.generic[key] ??= [];

  const method = c.req.method ?? 'GET';
  if (method === 'GET') {
    const id = parsed.resourcePath.split('/').filter(Boolean).at(-1) ?? `${parsed.service}_emulator_resource`;
    const items = next.generic[key].length ? next.generic[key] : [{ id, name: id, kind: `${parsed.service}#resource` }];
    saveState(store, next);
    return {
      kind: `${parsed.service}#${parsed.resourcePath || 'resource'}`,
      items,
      resources: items,
      nextPageToken: null,
    };
  }

  if (method === 'DELETE') {
    saveState(store, next);
    return { id: parsed.resourcePath.split('/').at(-1), deleted: true };
  }

  const resource = {
    id: crypto.randomUUID(),
    kind: `${parsed.service}#resource`,
    status: method === 'POST' ? 'created' : 'updated',
    updated: now(),
  };
  next.generic[key].push(resource);
  saveState(store, next);
  return resource;
}

function discoveryDoc(c) {
  const service = query(c, 'service', 'drive');
  const version = query(c, 'version', WORKSPACE_SERVICES.find((item) => item.api === service || item.alias === service)?.version ?? 'v1');
  return {
    kind: 'discovery#restDescription',
    discoveryVersion: 'v1',
    name: service,
    version,
    title: `Google ${service} API`,
    rootUrl: 'https://www.googleapis.com/',
    servicePath: `${service}/${version}/`,
    resources: {},
  };
}

function registerGenericWorkspaceAdapter(app, store) {
  const handler = async (c) => {
    hit(store, 'workspace.generic');
    return c.json(genericResponse(c, store));
  };

  if (app.all) {
    app.all('/:service/:version/*', handler);
    app.all('/upload/:service/:version/*', handler);
    return;
  }

  for (const path of ['/:service/:version/*', '/upload/:service/:version/*']) {
    app.get?.(path, handler);
    app.post(path, handler);
    app.put?.(path, handler);
    app.patch?.(path, handler);
    app.delete?.(path, handler);
  }
}

export const plugin = {
  name: 'google',
  register(app, store) {
    app.get('/$discovery/rest', (c) => c.json(discoveryDoc(c)));

    app.get('/drive/v3/files', (c) => {
      hit(store, 'drive.files.list');
      return c.json(listPage(state(store).driveFiles, c, 'files'));
    });
    app.post('/drive/v3/files', async (c) => {
      hit(store, 'drive.files.create');
      const next = state(store);
      const input = await body(c);
      const file = {
        id: input.id ?? `file_${crypto.randomUUID()}`,
        name: input.name ?? 'Untitled',
        mimeType: input.mimeType ?? 'application/octet-stream',
        parents: input.parents ?? [],
        createdTime: now(),
        modifiedTime: now(),
      };
      next.driveFiles.push(file);
      saveState(store, next);
      return c.json(file, 200);
    });
    app.get('/drive/v3/files/:fileId', (c) => {
      hit(store, 'drive.files.get');
      const file = state(store).driveFiles.find((item) => item.id === param(c, 'fileId'));
      if (!file) return jsonError(c, 404, 'File not found');
      return c.json(filteredFields(file, query(c, 'fields')));
    });
    app.patch('/drive/v3/files/:fileId', async (c) => {
      hit(store, 'drive.files.update');
      const next = state(store);
      const file = next.driveFiles.find((item) => item.id === param(c, 'fileId'));
      if (!file) return jsonError(c, 404, 'File not found');
      Object.assign(file, await body(c), { modifiedTime: now() });
      saveState(store, next);
      return c.json(file);
    });
    app.delete('/drive/v3/files/:fileId', (c) => {
      hit(store, 'drive.files.delete');
      const next = state(store);
      next.driveFiles = next.driveFiles.filter((item) => item.id !== param(c, 'fileId'));
      saveState(store, next);
      return new Response(null, { status: 204 });
    });

    app.get('/gmail/v1/users/:userId/messages', (c) => {
      hit(store, 'gmail.users.messages.list');
      return c.json(listPage(state(store).gmailMessages, c, 'messages'));
    });
    app.post('/gmail/v1/users/:userId/messages/send', async (c) => {
      hit(store, 'gmail.users.messages.send');
      const next = state(store);
      const input = await body(c);
      const message = {
        id: `msg_${crypto.randomUUID()}`,
        threadId: input.threadId ?? `thread_${crypto.randomUUID()}`,
        labelIds: ['SENT'],
        raw: input.raw,
        snippet: input.snippet ?? 'Sent by emulator',
        internalDate: String(Date.now()),
      };
      next.gmailMessages.push(message);
      saveState(store, next);
      return c.json(message);
    });
    app.get('/gmail/v1/users/:userId/messages/:messageId', (c) => {
      hit(store, 'gmail.users.messages.get');
      const message = state(store).gmailMessages.find((item) => item.id === param(c, 'messageId'));
      if (!message) return jsonError(c, 404, 'Message not found');
      return c.json(message);
    });

    app.get('/calendar/v3/calendars/:calendarId/events', (c) => {
      hit(store, 'calendar.events.list');
      return c.json(listPage(state(store).calendarEvents, c, 'items'));
    });
    app.post('/calendar/v3/calendars/:calendarId/events', async (c) => {
      hit(store, 'calendar.events.insert');
      const next = state(store);
      const input = await body(c);
      const event = {
        id: input.id ?? `event_${crypto.randomUUID()}`,
        status: input.status ?? 'confirmed',
        summary: input.summary ?? 'Untitled event',
        start: input.start ?? { dateTime: now() },
        end: input.end ?? { dateTime: new Date(Date.now() + 3600000).toISOString() },
      };
      next.calendarEvents.push(event);
      saveState(store, next);
      return c.json(event);
    });

    app.post('/sheets/v4/spreadsheets', async (c) => {
      hit(store, 'sheets.spreadsheets.create');
      const next = state(store);
      const input = await body(c);
      const spreadsheetId = input.spreadsheetId ?? `sheet_${crypto.randomUUID()}`;
      const spreadsheet = {
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        properties: input.properties ?? { title: 'Untitled spreadsheet' },
        sheets: input.sheets ?? [],
      };
      next.spreadsheets[spreadsheetId] = spreadsheet;
      saveState(store, next);
      return c.json(spreadsheet);
    });
    app.get('/sheets/v4/spreadsheets/:spreadsheetId', (c) => {
      hit(store, 'sheets.spreadsheets.get');
      const spreadsheet = state(store).spreadsheets[param(c, 'spreadsheetId')];
      if (!spreadsheet) return jsonError(c, 404, 'Spreadsheet not found');
      return c.json(spreadsheet);
    });
    app.post('/sheets/v4/spreadsheets/:spreadsheetId/values/:range:append', async (c) => {
      hit(store, 'sheets.values.append');
      return c.json({
        spreadsheetId: param(c, 'spreadsheetId'),
        tableRange: param(c, 'range'),
        updates: { updatedRows: (await body(c)).values?.length ?? 0 },
      });
    });

    app.post('/docs/v1/documents', async (c) => {
      hit(store, 'docs.documents.create');
      const next = state(store);
      const input = await body(c);
      const documentId = input.documentId ?? `doc_${crypto.randomUUID()}`;
      const doc = { documentId, title: input.title ?? 'Untitled document', body: { content: [] } };
      next.docs[documentId] = doc;
      saveState(store, next);
      return c.json(doc);
    });
    app.get('/docs/v1/documents/:documentId', (c) => {
      hit(store, 'docs.documents.get');
      const doc = state(store).docs[param(c, 'documentId')];
      if (!doc) return jsonError(c, 404, 'Document not found');
      return c.json(doc);
    });

    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
    app.get('/inspect/hits', (c) => c.json(state(store).hits));
    app.post('/inspect/reset', (c) => {
      store.setData?.('google:workspace-state', null);
      state(store);
      return c.json({ ok: true });
    });

    registerGenericWorkspaceAdapter(app, store);
  },
};

export const label = 'Google Workspace API emulator';
export const endpoints = 'Drive, Gmail, Calendar, Sheets, Docs, Discovery, and generic Workspace API adapter';
export const capabilities = contract.scope;
export const initConfig = {
  google: {
    apiBaseUrl: 'same emulator origin',
    services: WORKSPACE_SERVICES.map((service) => `${service.api}:${service.version}`),
  },
};

export function seedFromConfig(store, baseUrl, config = {}) {
  const next = state(store);
  if (Array.isArray(config.driveFiles)) next.driveFiles = config.driveFiles;
  if (Array.isArray(config.gmailMessages)) next.gmailMessages = config.gmailMessages;
  if (Array.isArray(config.calendarEvents)) next.calendarEvents = config.calendarEvents;
  saveState(store, next);
}

export default plugin;
