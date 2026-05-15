const DEFAULT_PROBLEM = '2x+3=7';
const DEFAULT_ANSWER = 'x=2';

function initialState(config = {}) {
  return {
    problems: {
      [DEFAULT_PROBLEM]: {
        display: '$$2x+3=7$$',
        symbolabQuestion: `EQUATION#${DEFAULT_PROBLEM}`,
        subject: 'Algebra',
        topic: 'Equations',
        subTopic: 'Linear',
        answer: DEFAULT_ANSWER,
        similar: {
          display: '$$2x+8=3$$',
          symbolab_question: 'EQUATION#2x+8=3',
        },
        steps: [
          {
            type: 'interim',
            title: 'Move $$3$$ to the right side',
            input: DEFAULT_PROBLEM,
            result: '2x=4',
            locked: false,
            steps: [{ type: 'step', primary: 'Subtract $$3$$ from both sides', result: '2x=4' }],
          },
          {
            type: 'interim',
            title: 'Divide both sides by $$2$$',
            input: '2x=4',
            result: DEFAULT_ANSWER,
            locked: false,
            steps: [{ type: 'step', primary: 'Simplify', result: DEFAULT_ANSWER }],
          },
        ],
      },
    },
    requests: [],
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('symbolab:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('symbolab:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('symbolab:state', next);
}

function normalize(value) {
  return String(value ?? '')
    .replace(/^EQUATION#/i, '')
    .replace(/\s+/g, '')
    .trim();
}

function normalizedAnswer(value) {
  return normalize(value).toLowerCase();
}

async function form(c) {
  return c.req.parseBody ? c.req.parseBody() : Object.fromEntries(new URLSearchParams(await c.req.text()));
}

function problemFor(store, raw) {
  return state(store).problems[normalize(raw)];
}

function queryPayload(raw, problem) {
  const display = problem?.display ?? `$$${normalize(raw)}$$`;
  const symbolabQuestion = problem?.symbolabQuestion ?? `EQUATION#${normalize(raw)}`;
  return {
    display,
    symbolab_question: symbolabQuestion,
  };
}

function solutionPayload(raw, problem) {
  return {
    query: queryPayload(raw, problem),
    solution: {
      level: problem ? 'PERFORMED' : 'UNABLE_TO_SOLVE',
      subject: problem?.subject ?? 'Algebra',
      topic: problem?.topic ?? 'Equations',
      subTopic: problem?.subTopic ?? 'Linear',
      default: problem?.answer ?? '',
      meta: { showVerify: Boolean(problem) },
    },
    meta: {
      isFromCache: true,
      showVerify: Boolean(problem),
    },
  };
}

function stepsPayload(raw, problem) {
  return {
    type: 'interim',
    title: `${problem?.display ?? `$$${normalize(raw)}$$`}{\\quad:\\quad}${problem?.answer ?? ''}`,
    input: normalize(raw),
    steps: problem?.steps ?? [],
    meta: {
      solvingClass: problem?.topic ?? 'Equations',
      practiceLink: '/practice/linear-equations-practice',
      practiceTopic: 'Linear Equations',
    },
  };
}

function record(store, route, body) {
  const s = state(store);
  s.requests.push({ route, body });
  saveState(store, s);
}

function symbolabError(message, status = 400) {
  return [{ type: 'play.mvc.results.Error', message }, status];
}

export const contract = {
  provider: 'symbolab',
  source: 'Symbolab public web bridge API compatible subset',
  docs: 'https://www.symbolab.com/solver/step-by-step-calculator',
  baseUrl: 'https://www.symbolab.com',
  scope: ['bridge_solution', 'bridge_steps', 'bridge_verify', 'graph_plotting_info'],
  fidelity: 'deterministic-web-bridge-subset',
  compatibilityOracle: 'direct HTTP route smoke; no maintained official CLI or SDK with safe base URL control found',
};

export const plugin = {
  name: 'symbolab',
  register(app, store) {
    app.post('/pub_api/bridge/solution', async (c) => {
      const body = await form(c);
      const query = body.query ?? body.symbolabQuestion ?? body.problem;
      if (!query) {
        const [payload, status] = symbolabError('Missing query');
        return c.json(payload, status);
      }
      const problem = problemFor(store, query);
      record(store, 'solution', body);
      const solution = solutionPayload(query, problem);
      return c.json({
        mainAlternative: queryPayload(query, problem),
        alternatives: [],
        solution,
        related: [],
        similar: problem?.similar ?? null,
        queryDisplay: solution.query.display,
      });
    });

    app.post('/pub_api/bridge/steps', async (c) => {
      const body = await form(c);
      const query = body.symbolabQuestion ?? body.query ?? body.problem;
      if (!query) {
        const [payload, status] = symbolabError('Missing symbolabQuestion');
        return c.json(payload, status);
      }
      const problem = problemFor(store, query);
      record(store, 'steps', body);
      return c.json({
        solution: {
          ...solutionPayload(query, problem),
          steps: stepsPayload(query, problem),
        },
      });
    });

    app.post('/pub_api/bridge/verify', async (c) => {
      const body = await form(c);
      const query = body.symbolabQuestion ?? body.query ?? body.problem;
      const problem = problemFor(store, query);
      record(store, 'verify', body);
      return c.json({ correct: Boolean(problem && normalizedAnswer(body.answer) === normalizedAnswer(problem.answer)) });
    });

    app.post('/pub_api/bridge/verifyProblem', async (c) => {
      const body = await form(c);
      const query = body.problem ?? body.symbolabQuestion ?? body.query;
      const problem = problemFor(store, query);
      record(store, 'verifyProblem', body);
      return c.json({ correct: Boolean(problem && normalizedAnswer(body.answer) === normalizedAnswer(problem.answer)) });
    });

    app.post('/pub_api/graph/plottingInfo', async (c) => {
      const body = await form(c);
      record(store, 'plottingInfo', body);
      return c.json({
        variable: 'x',
        funcsToDraw: {
          funcs: [
            {
              evalFormula: 'y=x^{2}',
              displayFormula: 'y=x^{2}',
              derivativeFormula: '2x',
              attributes: {
                color: 'PURPLE',
                lineType: 'NORMAL',
                isAsymptote: false,
              },
              calculatePoints: true,
            },
          ],
        },
        graphCalcInputErrors: [null],
        isFromCache: true,
      });
    });

    app.get('/symbolab/inspect/contract', (c) => c.json(contract));
    app.get('/symbolab/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Symbolab API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { symbolab: initialState() };

export default plugin;
