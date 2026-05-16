const createdAt = '2026-01-01T00:00:00+00:00';

function initialState(config = {}) {
  return {
    user: config.user ?? {
      id: '123456789',
      username: 'emulator',
      first_name: 'Ada',
      last_name: 'Researcher',
      email: 'ada@example.com',
      date_created: createdAt,
    },
    surveys: config.surveys ?? [
      {
        id: '987654321',
        title: 'SurveyMonkey Emulator Study',
        nickname: 'XM local smoke',
        href: 'https://api.surveymonkey.com/v3/surveys/987654321',
        date_created: createdAt,
        date_modified: createdAt,
        language: 'en',
        pages: [
          {
            id: '111',
            title: 'Feedback',
            questions: [
              { id: '222', heading: 'How satisfied are you?', family: 'single_choice', subtype: 'vertical', answers: { choices: [{ id: '333', text: 'Very satisfied' }] } },
              { id: '444', heading: 'What should we improve?', family: 'open_ended', subtype: 'single' },
            ],
          },
        ],
      },
    ],
    responses: config.responses ?? {
      987654321: [
        {
          id: '555',
          survey_id: '987654321',
          collector_id: '666',
          date_created: createdAt,
          date_modified: createdAt,
          response_status: 'completed',
          pages: [{ id: '111', questions: [{ id: '222', answers: [{ choice_id: '333', text: 'Very satisfied' }] }, { id: '444', answers: [{ text: 'Keep it deterministic.' }] }] }],
        },
      ],
    },
    collectors: config.collectors ?? [{ id: '666', survey_id: '987654321', name: 'Web Link Collector', type: 'weblink', href: 'https://api.surveymonkey.com/v3/collectors/666' }],
    nextSurvey: 2,
    nextResponse: 2,
  };
}

function state(store) {
  const current = store.getData?.('surveymonkey:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('surveymonkey:state', next);
  return next;
}

function save(store, next) {
  store.setData?.('surveymonkey:state', next);
}

function page(data, pageNum = 1, perPage = 50) {
  return { data, page: Number(pageNum), per_page: Number(perPage), total: data.length, links: { self: 'emulator://self' } };
}

function error(c, status, message) {
  return c.json({ error: { id: `${status}`, name: status === 404 ? 'Resource Not Found' : 'Bad Request', docs: 'https://api.surveymonkey.com/v3/docs', message } }, status);
}

function surveySummary(survey) {
  const { pages, ...summary } = survey;
  return summary;
}

export const contract = {
  provider: 'surveymonkey',
  source: 'SurveyMonkey API v3 public docs',
  docs: 'https://api.surveymonkey.com/v3/docs',
  baseUrl: 'https://api.surveymonkey.com/v3',
  auth: 'OAuth2 bearer token',
  scope: ['users-me', 'surveys', 'survey-details', 'collectors', 'responses-bulk'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'surveymonkey',
  register(app, store) {
    app.get('/v3/users/me', (c) => c.json(state(store).user));
    app.get('/v3/surveys', (c) => c.json(page(state(store).surveys.map(surveySummary), c.req.query('page'), c.req.query('per_page'))));
    app.post('/v3/surveys', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const id = String(987654321 + s.nextSurvey++);
      const survey = {
        id,
        title: body.title ?? body.nickname ?? 'Created SurveyMonkey Study',
        nickname: body.nickname ?? body.title ?? 'Created Survey',
        href: `https://api.surveymonkey.com/v3/surveys/${id}`,
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString(),
        language: body.language ?? 'en',
        pages: [],
      };
      s.surveys.push(survey);
      s.responses[id] = [];
      save(store, s);
      return c.json(surveySummary(survey), 201);
    });
    app.get('/v3/surveys/:surveyId', (c) => {
      const survey = state(store).surveys.find((item) => item.id === c.req.param('surveyId'));
      if (!survey) return error(c, 404, 'Survey not found');
      return c.json(surveySummary(survey));
    });
    app.get('/v3/surveys/:surveyId/details', (c) => {
      const survey = state(store).surveys.find((item) => item.id === c.req.param('surveyId'));
      if (!survey) return error(c, 404, 'Survey not found');
      return c.json(survey);
    });
    app.get('/v3/surveys/:surveyId/collectors', (c) => c.json(page(state(store).collectors.filter((collector) => collector.survey_id === c.req.param('surveyId')))));
    app.get('/v3/surveys/:surveyId/responses/bulk', (c) => {
      const rows = state(store).responses[c.req.param('surveyId')];
      if (!rows) return error(c, 404, 'Survey responses not found');
      return c.json(page(rows, c.req.query('page'), c.req.query('per_page')));
    });
    app.get('/v3/surveys/:surveyId/responses/:responseId/details', (c) => {
      const response = (state(store).responses[c.req.param('surveyId')] ?? []).find((item) => item.id === c.req.param('responseId'));
      if (!response) return error(c, 404, 'Survey response not found');
      return c.json(response);
    });
    app.post('/v3/surveys/:surveyId/responses/bulk', async (c) => {
      const s = state(store);
      if (!s.responses[c.req.param('surveyId')]) return error(c, 404, 'Survey not found');
      const body = await c.req.json().catch(() => ({}));
      const response = { id: String(555 + s.nextResponse++), survey_id: c.req.param('surveyId'), date_created: new Date().toISOString(), date_modified: new Date().toISOString(), response_status: 'completed', pages: body.pages ?? [] };
      s.responses[c.req.param('surveyId')].push(response);
      save(store, s);
      return c.json(response, 201);
    });
    app.get('/surveymonkey/inspect/contract', (c) => c.json(contract));
    app.get('/surveymonkey/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  save(store, initialState(config));
}

export const label = 'SurveyMonkey API emulator';
export const endpoints = 'users/me, surveys, survey details, collectors, and response bulk APIs';
export const capabilities = contract.scope;
export const initConfig = { surveymonkey: initialState() };
export default plugin;
