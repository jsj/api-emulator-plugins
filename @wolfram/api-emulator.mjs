function initialState(config = {}) {
  return {
    answers: {
      '2+2': {
        short: '4',
        spoken: 'The answer is 4.',
        datatypes: 'Math',
        pods: [
          pod('Input interpretation', 'Input', '2 + 2', false),
          pod('Result', 'Result', '4', true),
          pod('Number line', 'NumberLine', 'number line showing 4', false),
        ],
      },
      'capital of france': {
        short: 'Paris, France',
        spoken: 'The capital of France is Paris.',
        datatypes: 'City',
        pods: [
          pod('Input interpretation', 'Input', 'capital of France', false),
          pod('Result', 'Result', 'Paris, France', true),
          pod('Location', 'Data', '48.8567° N, 2.3522° E', false),
        ],
      },
    },
    ...config,
  };
}

function pod(title, scanner, plaintext, primary) {
  const id = title.toLowerCase().replaceAll(' ', '');
  return {
    title,
    scanner,
    id,
    position: primary ? 200 : 100,
    error: false,
    numsubpods: 1,
    primary,
    subpods: [{ title: '', plaintext }],
  };
}

function state(store) {
  const current = store.getData?.('wolfram:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('wolfram:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('wolfram:state', next);
}

function normalize(input) {
  return decodeURIComponent(String(input ?? '')).trim().toLowerCase();
}

function answerFor(store, input) {
  return state(store).answers[normalize(input)];
}

function splitParam(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function queryValues(c, name) {
  const values = c.req.queries?.(name) ?? [];
  const single = c.req.query(name);
  return [...values, single].flatMap(splitParam);
}

function filterPods(c, pods) {
  const includeIds = queryValues(c, 'includepodid');
  const excludeIds = queryValues(c, 'excludepodid');
  const podTitles = queryValues(c, 'podtitle');
  const scanners = queryValues(c, 'scanner');
  return pods.filter((podItem) => {
    const id = podItem.id.toLowerCase();
    const title = podItem.title.toLowerCase();
    const scanner = podItem.scanner.toLowerCase();
    if (includeIds.length && !includeIds.includes(id)) return false;
    if (excludeIds.includes(id)) return false;
    if (podTitles.length && !podTitles.some((podTitle) => title.includes(podTitle))) return false;
    if (scanners.length && !scanners.includes(scanner)) return false;
    return true;
  });
}

function formatPods(c, pods) {
  const formats = queryValues(c, 'format');
  if (!formats.includes('image')) return pods;
  return pods.map((podItem) => ({
    ...podItem,
    subpods: podItem.subpods.map((subpod) => ({
      ...subpod,
      img: {
        src: `https://api.wolframalpha.com/v2/plot.png?id=emulator-${podItem.id}`,
        alt: subpod.plaintext,
        title: subpod.plaintext,
        width: 300,
        height: 80,
      },
    })),
  }));
}

function queryResult(c, input, answer) {
  const pods = formatPods(c, filterPods(c, answer?.pods ?? []));
  return {
    queryresult: {
      success: Boolean(answer),
      error: false,
      numpods: pods.length,
      datatypes: answer?.datatypes ?? '',
      timedout: '',
      timedoutpods: '',
      timing: 0.01,
      parsetiming: 0.001,
      parsetimedout: false,
      recalculate: '',
      id: `emulator-${Buffer.from(String(input ?? '')).toString('base64url')}`,
      host: 'https://api.wolframalpha.com',
      server: 'emulator',
      related: '',
      version: '2.6',
      inputstring: String(input ?? ''),
      pods,
    },
  };
}

export const contract = {
  provider: 'wolfram',
  source: 'Wolfram|Alpha Results API compatible subset',
  docs: 'https://products.wolframalpha.com/api',
  baseUrl: 'https://api.wolframalpha.com',
  scope: ['short_answers', 'full_results', 'spoken_results', 'llm_api'],
  fidelity: 'deterministic-subset',
};

export const plugin = {
  name: 'wolfram',
  register(app, store) {
    app.get('/v1/result', (c) => {
      const answer = answerFor(store, c.req.query('i') ?? c.req.query('input'));
      return answer
        ? c.text(answer.short)
        : c.text('Wolfram|Alpha did not understand your input', 501);
    });

    app.get('/v1/spoken', (c) => {
      const answer = answerFor(store, c.req.query('i') ?? c.req.query('input'));
      return answer
        ? c.text(answer.spoken)
        : c.text('Wolfram|Alpha did not understand your input', 501);
    });

    app.get('/v1/simple', (c) => {
      const answer = answerFor(store, c.req.query('i') ?? c.req.query('input'));
      return answer
        ? c.body(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><text x="10" y="45">${answer.short}</text></svg>`, 200, { 'content-type': 'image/svg+xml' })
        : c.text('Wolfram|Alpha did not understand your input', 501);
    });

    app.get('/v2/query', (c) => {
      const input = c.req.query('input') ?? c.req.query('i');
      return c.json(queryResult(c, input, answerFor(store, input)));
    });

    app.get('/api/v1/llm-api', (c) => {
      const input = c.req.query('input') ?? c.req.query('i');
      const answer = answerFor(store, input);
      return answer
        ? c.text(`Input: ${input}\nAnswer: ${answer.short}`)
        : c.text(`No Wolfram|Alpha result found for: ${input}`, 200);
    });

    app.get('/wolfram/inspect/contract', (c) => c.json(contract));
    app.get('/wolfram/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Wolfram API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { wolfram: initialState() };

export default plugin;
