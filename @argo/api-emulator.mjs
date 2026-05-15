const STATE_KEY = 'argo:state';
const NOW = '2026-01-01T00:00:00Z';

function workflow(name, namespace = 'default', spec = {}) {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Workflow',
    metadata: {
      name,
      namespace,
      uid: `${namespace}-${name}-uid`,
      resourceVersion: '1',
      creationTimestamp: NOW,
      labels: { 'workflows.argoproj.io/completed': 'false' },
    },
    spec: {
      entrypoint: 'main',
      templates: [
        {
          name: 'main',
          container: {
            image: 'alpine:3.19',
            command: ['sh', '-c'],
            args: ['echo hello from argo emulator'],
          },
        },
      ],
      ...spec,
    },
    status: {
      phase: 'Running',
      startedAt: NOW,
      nodes: {},
    },
  };
}

function initialState(config = {}) {
  return {
    namespaces: ['default', 'argo', ...(config.namespaces ?? [])],
    workflows: [
      workflow('hello-world-emulator', 'default'),
      ...(config.workflows ?? []),
    ],
    nextId: 1,
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

async function json(c) {
  return c.req.json().catch(() => ({}));
}

function argoError(message, code = 5) {
  return { code, message, error: message, details: [] };
}

function listWorkflows(store, namespace) {
  return state(store).workflows.filter((item) => item.metadata?.namespace === namespace);
}

function findWorkflow(store, namespace, name) {
  return listWorkflows(store, namespace).find((item) => item.metadata?.name === name);
}

function workflowList(store, namespace) {
  const items = listWorkflows(store, namespace);
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'WorkflowList',
    metadata: {
      resourceVersion: String(state(store).nextId),
      continue: '',
    },
    items,
  };
}

function normalizeWorkflow(store, namespace, body) {
  const requested = body.workflow ?? body;
  const metadata = requested.metadata ?? {};
  const generatedName = metadata.generateName ? `${metadata.generateName}${state(store).nextId++}` : undefined;
  const name = metadata.name ?? generatedName ?? `workflow-${state(store).nextId++}`;
  return {
    ...workflow(name, namespace, requested.spec ?? {}),
    ...requested,
    apiVersion: requested.apiVersion ?? 'argoproj.io/v1alpha1',
    kind: requested.kind ?? 'Workflow',
    metadata: {
      ...workflow(name, namespace).metadata,
      ...metadata,
      name,
      namespace: metadata.namespace ?? namespace,
      uid: metadata.uid ?? `${namespace}-${name}-uid`,
      creationTimestamp: metadata.creationTimestamp ?? NOW,
    },
    status: requested.status ?? {
      phase: 'Pending',
      startedAt: NOW,
      nodes: {},
    },
  };
}

export const contract = {
  provider: 'argo',
  source: 'Argo Workflows official OpenAPI swagger and Argo CLI-compatible REST subset',
  docs: 'https://argo-workflows.readthedocs.io/en/latest/swagger/',
  baseUrl: 'http://localhost:2746/api/v1',
  scope: ['info', 'list-workflows', 'create-workflow', 'submit-workflow', 'get-workflow', 'delete-workflow', 'inspection'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'argo',
  register(app, store) {
    app.get('/api/v1/info', (c) =>
      c.json({
        managedNamespace: '',
        links: [],
        modals: {},
        navColor: '#0d9488',
        columns: [],
      }),
    );
    app.get('/api/v1/userinfo', (c) => c.json({ issuer: 'argo-emulator', subject: 'emulator', groups: [] }));
    app.get('/api/v1/workflows/:namespace', (c) => c.json(workflowList(store, c.req.param('namespace'))));
    app.post('/api/v1/workflows/:namespace', async (c) => {
      const s = state(store);
      const created = normalizeWorkflow(store, c.req.param('namespace'), await json(c));
      s.workflows = s.workflows.filter((item) => item.metadata?.namespace !== created.metadata.namespace || item.metadata?.name !== created.metadata.name);
      s.workflows.push(created);
      saveState(store, s);
      return c.json(created, 200);
    });
    app.post('/api/v1/workflows/:namespace/submit', async (c) => {
      const body = await json(c);
      const resourceName = body.resourceName ?? `submitted-${state(store).nextId}`;
      const created = normalizeWorkflow(store, c.req.param('namespace'), {
        metadata: { generateName: `${resourceName}-` },
        spec: body.submitOptions?.parameters ? { arguments: { parameters: body.submitOptions.parameters } } : {},
      });
      const s = state(store);
      s.workflows.push(created);
      saveState(store, s);
      return c.json(created, 200);
    });
    app.get('/api/v1/workflows/:namespace/:name', (c) => {
      const row = findWorkflow(store, c.req.param('namespace'), c.req.param('name'));
      return row ? c.json(row) : c.json(argoError(`workflows.argoproj.io "${c.req.param('name')}" not found`), 404);
    });
    app.delete('/api/v1/workflows/:namespace/:name', (c) => {
      const s = state(store);
      const before = s.workflows.length;
      s.workflows = s.workflows.filter((item) => item.metadata?.namespace !== c.req.param('namespace') || item.metadata?.name !== c.req.param('name'));
      saveState(store, s);
      return before === s.workflows.length ? c.json(argoError(`workflows.argoproj.io "${c.req.param('name')}" not found`), 404) : c.json({});
    });
    app.get('/inspect/contract', (c) => c.json(contract));
    app.get('/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Argo Workflows API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { argo: initialState() };
export default plugin;
