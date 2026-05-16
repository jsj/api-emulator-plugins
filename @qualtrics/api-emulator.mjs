const timestamp = '2026-01-01T00:00:00Z';

function initialState(config = {}) {
  return {
    user: config.user ?? {
      userId: 'UR_emulator',
      firstName: 'Ada',
      lastName: 'Researcher',
      email: 'ada@example.com',
      brandId: 'emulator',
      accountType: 'UT',
    },
    surveys: config.surveys ?? [
      {
        id: 'SV_emulator',
        name: 'XM Emulator Study',
        ownerId: 'UR_emulator',
        organizationId: 'emulator',
        isActive: true,
        creationDate: timestamp,
        lastModified: timestamp,
        questions: {
          QID1: { questionId: 'QID1', questionText: 'How satisfied are you?', questionType: { type: 'MC', selector: 'SAVR' } },
          QID2: { questionId: 'QID2', questionText: 'What should we improve?', questionType: { type: 'TE', selector: 'ESTB' } },
        },
      },
    ],
    responses: config.responses ?? {
      SV_emulator: [
        {
          responseId: 'R_emulator_1',
          surveyId: 'SV_emulator',
          recordedDate: timestamp,
          finished: true,
          values: { QID1: 5, QID2_TEXT: 'Keep the local emulator fast.' },
          labels: { QID1: 'Very satisfied' },
        },
      ],
    },
    exportProgress: {},
    nextSurvey: 2,
    nextResponse: 2,
  };
}

function state(store) {
  const current = store.getData?.('qualtrics:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('qualtrics:state', next);
  return next;
}

function save(store, next) {
  store.setData?.('qualtrics:state', next);
}

function envelope(result, meta = {}) {
  return { meta: { httpStatus: '200 - OK', requestId: 'qualtrics-emulator-request', ...meta }, result };
}

function notFound(c, message = 'The requested resource does not exist.') {
  return c.json({ meta: { httpStatus: '404 - Not Found', error: { errorCode: '404', errorMessage: message }, requestId: 'qualtrics-emulator-request' } }, 404);
}

function surveyDetails(survey) {
  return {
    ...survey,
    questions: survey.questions,
    flow: [{ id: 'FL_1', type: 'Block', blockId: 'BL_1' }],
    blocks: { BL_1: { id: 'BL_1', type: 'Default', description: 'Default Question Block', blockElements: Object.keys(survey.questions).map((questionId) => ({ type: 'Question', questionId })) } },
  };
}

export const contract = {
  provider: 'qualtrics',
  source: 'Qualtrics API v3 docs and Postman-style REST examples',
  docs: 'https://api.qualtrics.com/',
  baseUrl: 'https://{datacenterid}.qualtrics.com/API/v3',
  auth: 'X-API-TOKEN header',
  scope: ['whoami', 'surveys', 'survey-definitions', 'responses', 'response-exports'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'qualtrics',
  register(app, store) {
    app.get('/API/v3/whoami', (c) => c.json(envelope(state(store).user)));
    app.get('/API/v3/surveys', (c) => {
      const s = state(store);
      return c.json(envelope({ elements: s.surveys.map(({ questions, ...survey }) => survey), nextPage: null }));
    });
    app.post('/API/v3/surveys', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const id = `SV_created_${s.nextSurvey++}`;
      const survey = {
        id,
        name: body.name ?? body.SurveyName ?? 'Created XM Survey',
        ownerId: s.user.userId,
        organizationId: s.user.brandId,
        isActive: false,
        creationDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        questions: {},
      };
      s.surveys.push(survey);
      s.responses[id] = [];
      save(store, s);
      return c.json({ meta: { httpStatus: '200 - OK', requestId: 'qualtrics-emulator-request' }, result: { id } });
    });
    app.get('/API/v3/surveys/:surveyId', (c) => {
      const survey = state(store).surveys.find((item) => item.id === c.req.param('surveyId'));
      if (!survey) return notFound(c, 'Survey not found');
      const { questions, ...summary } = survey;
      return c.json(envelope(summary));
    });
    app.get('/API/v3/survey-definitions/:surveyId', (c) => {
      const survey = state(store).surveys.find((item) => item.id === c.req.param('surveyId'));
      if (!survey) return notFound(c, 'Survey definition not found');
      return c.json(envelope(surveyDetails(survey)));
    });
    app.get('/API/v3/surveys/:surveyId/responses', (c) => {
      const rows = state(store).responses[c.req.param('surveyId')];
      if (!rows) return notFound(c, 'Survey responses not found');
      return c.json(envelope({ elements: rows, nextPage: null }));
    });
    app.post('/API/v3/surveys/:surveyId/responses', async (c) => {
      const s = state(store);
      if (!s.responses[c.req.param('surveyId')]) return notFound(c, 'Survey not found');
      const body = await c.req.json().catch(() => ({}));
      const response = {
        responseId: `R_created_${s.nextResponse++}`,
        surveyId: c.req.param('surveyId'),
        recordedDate: new Date().toISOString(),
        finished: body.finished ?? true,
        values: body.values ?? body,
        labels: body.labels ?? {},
      };
      s.responses[c.req.param('surveyId')].push(response);
      save(store, s);
      return c.json(envelope(response), 201);
    });
    app.post('/API/v3/surveys/:surveyId/export-responses', (c) => {
      if (!state(store).responses[c.req.param('surveyId')]) return notFound(c, 'Survey not found');
      const progressId = `ES_${c.req.param('surveyId')}`;
      return c.json(envelope({ progressId, percentComplete: 100, status: 'complete' }));
    });
    app.get('/API/v3/surveys/:surveyId/export-responses/:progressId', (c) => c.json(envelope({ percentComplete: 100, status: 'complete', fileId: `file_${c.req.param('surveyId')}` })));
    app.get('/API/v3/surveys/:surveyId/export-responses/:fileId/file', (c) => c.json({ responses: state(store).responses[c.req.param('surveyId')] ?? [] }));
    app.get('/qualtrics/inspect/contract', (c) => c.json(contract));
    app.get('/qualtrics/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  save(store, initialState(config));
}

export const label = 'Qualtrics XM API emulator';
export const endpoints = 'whoami, surveys, survey definitions, responses, response exports';
export const capabilities = contract.scope;
export const initConfig = { qualtrics: initialState() };
export default plugin;
