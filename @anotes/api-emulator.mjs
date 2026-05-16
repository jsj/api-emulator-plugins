const STATE_KEY = 'anotes:state';

function now() {
  return new Date().toISOString();
}

function initialState(config = {}) {
  return {
    accounts: config.accounts ?? [
      { id: 1, name: 'iCloud', identifier: 'icloud-emulator' },
    ],
    folders: config.folders ?? [
      {
        id: 10,
        identifier: 'folder-inbox',
        name: 'Inbox',
        parentId: null,
        accountId: 1,
        sortOrder: 1,
        isHidden: false,
        isMarkedForDeletion: false,
      },
      {
        id: 11,
        identifier: 'folder-projects',
        name: 'Projects',
        parentId: null,
        accountId: 1,
        sortOrder: 2,
        isHidden: false,
        isMarkedForDeletion: false,
      },
    ],
    notes: config.notes ?? [
      {
        id: 100,
        identifier: 'note-seed-1',
        title: 'Welcome to anotes',
        snippet: 'Seed Apple Notes content from the emulator.',
        body: 'Seed Apple Notes content from the emulator.',
        folderId: 10,
        accountId: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        modifiedAt: '2026-01-01T00:00:00.000Z',
        isPinned: true,
        isPasswordProtected: false,
        isMarkedForDeletion: false,
      },
      {
        id: 101,
        identifier: 'note-seed-2',
        title: 'Project checklist',
        snippet: 'Ship JSON-RPC, search, folders, and smoke tests.',
        body: '- JSON-RPC\n- Search\n- Folders\n- Smoke tests',
        folderId: 11,
        accountId: 1,
        createdAt: '2026-01-01T00:05:00.000Z',
        modifiedAt: '2026-01-01T00:06:00.000Z',
        isPinned: false,
        isPasswordProtected: false,
        isMarkedForDeletion: false,
      },
    ],
    nextNote: config.nextNote ?? 102,
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

async function body(c) {
  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function accountFor(s, accountId) {
  return s.accounts.find((account) => Number(account.id) === Number(accountId));
}

function folderFor(s, folderId) {
  return s.folders.find((folder) => Number(folder.id) === Number(folderId));
}

function folderPayload(s, folder) {
  return {
    id: folder.id,
    identifier: folder.identifier,
    name: folder.name,
    parent_id: folder.parentId,
    account_name: accountFor(s, folder.accountId)?.name ?? null,
    sort_order: folder.sortOrder,
    is_hidden: Boolean(folder.isHidden),
    is_marked_for_deletion: Boolean(folder.isMarkedForDeletion),
  };
}

function notePayload(s, note) {
  const folder = folderFor(s, note.folderId);
  return {
    id: note.id,
    identifier: note.identifier,
    title: note.title,
    snippet: note.snippet,
    body: note.body,
    folder_id: note.folderId,
    folder_name: folder?.name ?? null,
    account_name: accountFor(s, note.accountId)?.name ?? null,
    created_at: note.createdAt,
    modified_at: note.modifiedAt,
    is_pinned: Boolean(note.isPinned),
    is_password_protected: Boolean(note.isPasswordProtected),
    is_marked_for_deletion: Boolean(note.isMarkedForDeletion),
  };
}

function limitFrom(c, fallback = 50) {
  const raw = Number(c.req.query?.('limit') ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function visibleNotes(s) {
  return s.notes.filter((note) => !note.isMarkedForDeletion);
}

function searchNotes(s, query) {
  const needle = String(query ?? '').toLowerCase();
  return visibleNotes(s).filter((note) => (
    String(note.title ?? '').toLowerCase().includes(needle)
    || String(note.snippet ?? '').toLowerCase().includes(needle)
    || String(note.body ?? '').toLowerCase().includes(needle)
  ));
}

function createNote(s, input = {}) {
  const timestamp = now();
  const note = {
    id: s.nextNote++,
    identifier: input.identifier ?? `note-emulator-${Date.now()}`,
    title: input.title ?? 'Untitled',
    snippet: input.snippet ?? input.body ?? '',
    body: input.body ?? input.text ?? input.snippet ?? '',
    folderId: Number(input.folder_id ?? input.folderId ?? s.folders[0]?.id ?? 10),
    accountId: Number(input.account_id ?? input.accountId ?? s.accounts[0]?.id ?? 1),
    createdAt: timestamp,
    modifiedAt: timestamp,
    isPinned: Boolean(input.is_pinned ?? input.isPinned),
    isPasswordProtected: Boolean(input.is_password_protected ?? input.isPasswordProtected),
    isMarkedForDeletion: false,
  };
  s.notes.push(note);
  return note;
}

function sqlString(value) {
  return value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
}

function sqlInteger(value) {
  return value == null ? 'NULL' : String(Number(value) || 0);
}

function coreDataTimestamp(value) {
  if (!value) return 'NULL';
  return String((Date.parse(value) / 1000) - 978_307_200);
}

function noteStoreSql(s) {
  const lines = [
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;',
    `CREATE TABLE ZICCLOUDSYNCINGOBJECT (
      Z_PK INTEGER PRIMARY KEY,
      Z_ENT INTEGER,
      ZIDENTIFIER VARCHAR,
      ZTITLE VARCHAR,
      ZTITLE1 VARCHAR,
      ZTITLE2 VARCHAR,
      ZFALLBACKTITLE VARCHAR,
      ZSNIPPET VARCHAR,
      ZSUMMARY VARCHAR,
      ZFALLBACKSUBTITLEMAC VARCHAR,
      ZFALLBACKSUBTITLEIOS VARCHAR,
      ZFOLDER INTEGER,
      ZACCOUNT7 INTEGER,
      ZACCOUNT8 INTEGER,
      ZACCOUNT INTEGER,
      ZPARENT INTEGER,
      ZSORTORDER INTEGER,
      ZISHIDDENNOTECONTAINER INTEGER,
      ZCREATIONDATE1 TIMESTAMP,
      ZMODIFICATIONDATE1 TIMESTAMP,
      ZISPINNED INTEGER,
      ZISPASSWORDPROTECTED INTEGER,
      ZMARKEDFORDELETION INTEGER,
      ZNAME VARCHAR
    );`,
    'CREATE TABLE ZICNOTEDATA (Z_PK INTEGER PRIMARY KEY, ZNOTE INTEGER, ZDATA BLOB);',
  ];

  for (const account of s.accounts) {
    lines.push(`INSERT INTO ZICCLOUDSYNCINGOBJECT (Z_PK, Z_ENT, ZIDENTIFIER, ZNAME, ZMARKEDFORDELETION) VALUES (${sqlInteger(account.id)}, 14, ${sqlString(account.identifier)}, ${sqlString(account.name)}, 0);`);
  }

  for (const folder of s.folders) {
    lines.push(`INSERT INTO ZICCLOUDSYNCINGOBJECT (Z_PK, Z_ENT, ZIDENTIFIER, ZTITLE2, ZPARENT, ZACCOUNT8, ZSORTORDER, ZISHIDDENNOTECONTAINER, ZMARKEDFORDELETION) VALUES (${sqlInteger(folder.id)}, 15, ${sqlString(folder.identifier)}, ${sqlString(folder.name)}, ${sqlInteger(folder.parentId)}, ${sqlInteger(folder.accountId)}, ${sqlInteger(folder.sortOrder)}, ${folder.isHidden ? 1 : 0}, ${folder.isMarkedForDeletion ? 1 : 0});`);
  }

  for (const note of s.notes) {
    lines.push(`INSERT INTO ZICCLOUDSYNCINGOBJECT (Z_PK, Z_ENT, ZIDENTIFIER, ZTITLE1, ZSNIPPET, ZSUMMARY, ZFOLDER, ZACCOUNT7, ZCREATIONDATE1, ZMODIFICATIONDATE1, ZISPINNED, ZISPASSWORDPROTECTED, ZMARKEDFORDELETION) VALUES (${sqlInteger(note.id)}, 12, ${sqlString(note.identifier)}, ${sqlString(note.title)}, ${sqlString(note.snippet)}, ${sqlString(note.body)}, ${sqlInteger(note.folderId)}, ${sqlInteger(note.accountId)}, ${coreDataTimestamp(note.createdAt)}, ${coreDataTimestamp(note.modifiedAt)}, ${note.isPinned ? 1 : 0}, ${note.isPasswordProtected ? 1 : 0}, ${note.isMarkedForDeletion ? 1 : 0});`);
    lines.push(`INSERT INTO ZICNOTEDATA (Z_PK, ZNOTE, ZDATA) VALUES (${sqlInteger(note.id)}, ${sqlInteger(note.id)}, ${sqlString(note.body)});`);
  }

  lines.push('COMMIT;');
  return `${lines.join('\n')}\n`;
}

export const contract = {
  provider: 'anotes',
  source: 'Apple Notes NoteStore.sqlite schema fixture and anotes CLI JSON surface',
  docs: 'https://github.com/zmirror/anotes-cli',
  scope: ['notes-sqlite-fixture', 'note-bodies', 'notes', 'folders', 'search', 'create-note', 'json-rpc', 'state-inspection'],
  fidelity: 'stateful-rest-and-json-rpc-emulator',
};

export const plugin = {
  name: 'anotes',
  register(app, store) {
    app.get('/anotes/inspect/contract', (c) => c.json(contract));
    app.get('/anotes/inspect/state', (c) => c.json(state(store)));
    app.get('/anotes/fixtures/note-store.sql', (c) => c.text(noteStoreSql(state(store))));

    app.get('/anotes/status', (c) => {
      const s = state(store);
      return c.json({
        ok: true,
        database_path: '/Users/emulator/Library/Group Containers/group.com.apple.notes/NoteStore.sqlite',
        note_count: visibleNotes(s).length,
        folder_count: s.folders.filter((folder) => !folder.isMarkedForDeletion).length,
        rpc_methods: ['notes.list', 'notes.get', 'notes.search', 'notes.create', 'folders.list', 'watch.subscribe', 'watch.unsubscribe', 'status'],
      });
    });

    app.get('/anotes/folders', (c) => {
      const s = state(store);
      return c.json(s.folders.filter((folder) => !folder.isMarkedForDeletion).map((folder) => folderPayload(s, folder)));
    });

    app.get('/anotes/notes', (c) => {
      const s = state(store);
      return c.json(visibleNotes(s).slice(0, limitFrom(c)).map((note) => notePayload(s, note)));
    });

    app.get('/anotes/notes/:noteId', (c) => {
      const s = state(store);
      const note = visibleNotes(s).find((item) => Number(item.id) === Number(c.req.param('noteId')));
      if (!note) return c.json({ error: { message: 'note not found' } }, 404);
      return c.json(notePayload(s, note));
    });

    app.get('/anotes/search', (c) => {
      const s = state(store);
      return c.json(searchNotes(s, c.req.query?.('query')).slice(0, limitFrom(c)).map((note) => notePayload(s, note)));
    });

    app.post('/anotes/notes', async (c) => {
      const s = state(store);
      const note = createNote(s, await body(c));
      saveState(store, s);
      return c.json(notePayload(s, note), 201);
    });

    app.post('/anotes/rpc', async (c) => {
      const s = state(store);
      const request = await body(c);
      const params = request.params ?? {};
      const id = request.id ?? null;
      const response = (result) => c.json({ jsonrpc: '2.0', id, result });
      const error = (code, message) => c.json({ jsonrpc: '2.0', id, error: { code, message } });

      switch (request.method) {
        case 'notes.list':
          return response(visibleNotes(s).slice(0, Number(params.limit ?? 50)).map((note) => notePayload(s, note)));
        case 'notes.get': {
          const note = visibleNotes(s).find((item) => Number(item.id) === Number(params.id));
          return note ? response(notePayload(s, note)) : error(-32602, 'note not found');
        }
        case 'notes.search':
          return response(searchNotes(s, params.query).slice(0, Number(params.limit ?? 50)).map((note) => notePayload(s, note)));
        case 'notes.create': {
          const note = createNote(s, params);
          saveState(store, s);
          return response(notePayload(s, note));
        }
        case 'folders.list':
          return response(s.folders.filter((folder) => !folder.isMarkedForDeletion).map((folder) => folderPayload(s, folder)));
        case 'status':
          return response({
            note_count: visibleNotes(s).length,
            folder_count: s.folders.filter((folder) => !folder.isMarkedForDeletion).length,
            rpc_methods: ['notes.list', 'notes.get', 'notes.search', 'notes.create', 'folders.list', 'status'],
          });
        default:
          return error(-32601, `method not found: ${request.method}`);
      }
    });
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config.anotes ?? config));
}

export const label = 'anotes Apple Notes API and database fixture emulator';
export const endpoints = 'notes, folders, search, create note, JSON-RPC, deterministic NoteStore.sqlite SQL fixture, and inspector';
export const capabilities = contract.scope;
export const initConfig = { anotes: initialState() };
export default plugin;
