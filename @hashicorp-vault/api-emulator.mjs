const fixedNow = '2026-05-15T12:00:00.000000000Z';

function initialState(config = {}) {
  return {
    sealed: false,
    initialized: true,
    mounts: {
      'secret/': {
        accessor: 'kv_emulator_accessor',
        config: { default_lease_ttl: 0, max_lease_ttl: 0, force_no_cache: false },
        description: 'KV v2 secrets engine mounted by the emulator',
        external_entropy_access: false,
        local: false,
        options: { version: '2' },
        seal_wrap: false,
        type: 'kv',
        uuid: '00000000-0000-4000-8000-000000000001',
      },
    },
    kv: {
      secret: {
        'my-secret': [
          {
            version: 1,
            data: { foo: 'bar' },
            metadata: { created_time: fixedNow, deletion_time: '', destroyed: false, version: 1 },
          },
        ],
      },
    },
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('hashicorp-vault:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('hashicorp-vault:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('hashicorp-vault:state', next);
}

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function error(c, message, status = 404) {
  return c.json({ errors: message ? [message] : [] }, status);
}

function normalizeMount(path = 'secret') {
  return path.replace(/^\/+|\/+$/g, '') || 'secret';
}

function normalizePath(path = '') {
  return path.replace(/^\/+|\/+$/g, '');
}

function mountConfig(current, mount) {
  return current.mounts[`${mount}/`];
}

function latestVersion(versions = []) {
  return versions[versions.length - 1];
}

function metadataFor(path, versions) {
  const latest = latestVersion(versions);
  return {
    cas_required: false,
    created_time: versions[0]?.metadata.created_time ?? fixedNow,
    current_version: latest?.version ?? 0,
    custom_metadata: null,
    delete_version_after: '0s',
    max_versions: 0,
    oldest_version: versions[0]?.version ?? 0,
    updated_time: latest?.metadata.created_time ?? fixedNow,
    versions: Object.fromEntries(
      versions.map((entry) => [
        entry.version,
        {
          created_time: entry.metadata.created_time,
          deletion_time: entry.metadata.deletion_time,
          destroyed: entry.metadata.destroyed,
        },
      ]),
    ),
    path,
  };
}

function listKeys(entries, prefix = '') {
  const normalized = prefix.replace(/^\/+|\/+$/g, '');
  const keys = new Set();
  for (const path of Object.keys(entries)) {
    if (normalized && path !== normalized && !path.startsWith(`${normalized}/`)) continue;
    const remainder = normalized ? path.slice(normalized.length).replace(/^\/+/, '') : path;
    if (!remainder) continue;
    const [head, ...rest] = remainder.split('/');
    keys.add(rest.length ? `${head}/` : head);
  }
  return [...keys].sort();
}

export const contract = {
  provider: 'hashicorp-vault',
  source: 'HashiCorp Vault HTTP API and official CLI-compatible KV v2 subset',
  docs: 'https://developer.hashicorp.com/vault/api-docs',
  baseUrl: 'http://127.0.0.1:8200/v1',
  scope: ['sys-health', 'sys-seal-status', 'sys-mounts', 'kv-v2-read-write-list', 'inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'hashicorp-vault',
  register(app, store) {
    app.get('/v1/sys/seal-status', (c) => {
      const current = state(store);
      return c.json({
        type: 'shamir',
        initialized: current.initialized,
        sealed: current.sealed,
        t: 1,
        n: 1,
        progress: 0,
        nonce: '',
        version: '1.17.0',
        build_date: '2026-05-15T00:00:00Z',
        migration: false,
        cluster_name: 'vault-emulator',
        cluster_id: '00000000-0000-4000-8000-000000000002',
        recovery_seal: false,
        storage_type: 'inmem',
      });
    });

    app.get('/v1/sys/health', (c) => c.json({ initialized: true, sealed: false, standby: false, performance_standby: false, replication_performance_mode: 'disabled', replication_dr_mode: 'disabled', server_time_utc: 1778846400, version: '1.17.0', cluster_name: 'vault-emulator', cluster_id: '00000000-0000-4000-8000-000000000002' }));

    app.get('/v1/sys/mounts', (c) => c.json({ data: state(store).mounts }));

    app.post('/v1/sys/mounts/:path', async (c) => {
      const current = state(store);
      const body = await json(c);
      const path = `${normalizeMount(c.req.param('path'))}/`;
      current.mounts[path] = {
        accessor: `${path.replace(/\W/g, '_')}accessor`,
        config: { default_lease_ttl: 0, max_lease_ttl: 0, force_no_cache: false },
        description: body.description ?? '',
        external_entropy_access: false,
        local: false,
        options: body.options ?? (body.type === 'kv-v2' ? { version: '2' } : {}),
        seal_wrap: false,
        type: body.type === 'kv-v2' ? 'kv' : body.type ?? 'kv',
        uuid: `vault_mount_${Object.keys(current.mounts).length + 1}`,
      };
      saveState(store, current);
      return c.json({}, 204);
    });

    app.get('/v1/sys/internal/ui/mounts/:path{.+}', (c) => {
      const current = state(store);
      const [mount] = normalizeMount(c.req.param('path')).split('/');
      const config = mountConfig(current, mount);
      if (!config) return error(c, 'no handler for route', 404);
      return c.json({ data: { path: `${mount}/`, type: config.type, options: config.options, description: config.description } });
    });

    app.post('/v1/:mount/data/:path{.+}', async (c) => {
      const current = state(store);
      const mount = normalizeMount(c.req.param('mount'));
      if (!mountConfig(current, mount)) return error(c, 'no handler for route', 404);
      const path = normalizePath(c.req.param('path'));
      const body = await json(c);
      current.kv[mount] ??= {};
      const versions = current.kv[mount][path] ?? [];
      const version = versions.length + 1;
      const metadata = { created_time: fixedNow, deletion_time: '', destroyed: false, version };
      versions.push({ version, data: body.data ?? {}, metadata });
      current.kv[mount][path] = versions;
      saveState(store, current);
      return c.json({ data: metadata });
    });

    app.get('/v1/:mount/data/:path{.+}', (c) => {
      const mount = normalizeMount(c.req.param('mount'));
      const path = normalizePath(c.req.param('path'));
      const versions = state(store).kv[mount]?.[path];
      if (!versions?.length) return error(c, 'secret not found', 404);
      const requested = Number(c.req.query('version') ?? versions.length);
      const entry = versions.find((item) => item.version === requested) ?? latestVersion(versions);
      return c.json({ data: { data: entry.data, metadata: entry.metadata } });
    });

    app.get('/v1/:mount/metadata/:path{.+}', (c) => {
      const mount = normalizeMount(c.req.param('mount'));
      const path = normalizePath(c.req.param('path'));
      const entries = state(store).kv[mount] ?? {};
      if (c.req.query('list') === 'true') return c.json({ data: { keys: listKeys(entries, path) } });
      const versions = entries[path];
      if (!versions?.length) return error(c, 'metadata not found', 404);
      return c.json({ data: metadataFor(path, versions) });
    });

    app.get('/v1/:mount/metadata', (c) => {
      const mount = normalizeMount(c.req.param('mount'));
      return c.json({ data: { keys: listKeys(state(store).kv[mount] ?? {}) } });
    });

    if (typeof app.on === 'function') {
      app.on('LIST', '/v1/:mount/metadata/:path{.+}', (c) => {
        const mount = normalizeMount(c.req.param('mount'));
        const path = normalizePath(c.req.param('path'));
        return c.json({ data: { keys: listKeys(state(store).kv[mount] ?? {}, path) } });
      });
      app.on('LIST', '/v1/:mount/metadata', (c) => {
        const mount = normalizeMount(c.req.param('mount'));
        return c.json({ data: { keys: listKeys(state(store).kv[mount] ?? {}) } });
      });
    }

    app.get('/hashicorp-vault/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'HashiCorp Vault API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { 'hashicorp-vault': initialState() };
export default plugin;
