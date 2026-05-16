const createdAt = '2023-09-02T07:07:17.960725+00:00';

function initialState(config = {}) {
  return {
    studies: config.studies ?? [
      {
        id: '12345678-0000-0000-0000-000000000000',
        link_id: 'study-1',
        title: 'Listen Labs Emulator Study',
        created_at: createdAt,
        desc: 'Listen Labs Emulator Study (12 Responses)',
        status: 'launched',
        recruitment_method: 'direct_link',
        response_limit: 12,
        objectives: ['Understand demand for local XM API emulators', 'Identify integration friction for AI research workflows'],
      },
      {
        id: '23456789-0000-0000-0000-000000000000',
        link_id: 'study-2',
        title: 'Example study 2',
        created_at: '2023-09-01T07:07:17.960725+00:00',
        desc: 'Example study 2 (9 Responses)',
        status: 'analysis_ready',
        recruitment_method: 'panel',
        response_limit: 9,
        objectives: ['Evaluate concept comprehension'],
      },
    ],
    questions: config.questions ?? {
      '12345678-0000-0000-0000-000000000000': [
        { id: 'question_1', text: 'What problem are you trying to solve?', type: 'open_text' },
        { id: 'question_2', text: 'How would you rate the concept?', type: 'rating' },
      ],
    },
    responses: config.responses ?? {
      '12345678-0000-0000-0000-000000000000': [
        {
          id: 'response_1',
          study_id: '12345678-0000-0000-0000-000000000000',
          created_at: createdAt,
          participant: { id: 'participant_1', email: 'ada@example.com' },
          answers: [
            { question_id: 'question_1', answer: 'I need fast feedback without production API calls.' },
            { question_id: 'question_2', answer: '5' },
          ],
          transcript: 'Participant wants deterministic local research API tests.',
          summary: 'Strong positive feedback for emulator-driven XM testing.',
        },
      ],
    },
    insights: config.insights ?? {
      '12345678-0000-0000-0000-000000000000': {
        executive_summary: 'Participants want hermetic Listen Labs research API workflows with transcript, summary, and quality metadata.',
        themes: [{ name: 'Local-first integration testing', count: 8 }, { name: 'Fast AI-generated insight review', count: 5 }],
        quality_guard: { accepted: 12, rejected: 0, signals: ['response_depth', 'contradiction_check', 'repeat_respondent_check'] },
        research_agent_outputs: [{ type: 'deck', title: 'Main findings summary' }, { type: 'highlight_reel', title: 'Top participant quotes' }],
      },
    },
    nextResponse: 2,
  };
}

function state(store) {
  const current = store.getData?.('listenlabs:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('listenlabs:state', next);
  return next;
}

function save(store, next) {
  store.setData?.('listenlabs:state', next);
}

function studyIdFrom(c) {
  return c.req.query('study_id') ?? c.req.query('survey_id') ?? c.req.query('id') ?? '12345678-0000-0000-0000-000000000000';
}

function notFound(c, message) {
  return c.json({ error: message }, 404);
}

export const contract = {
  provider: 'listenlabs',
  source: 'Listen Labs Mintlify API docs',
  docs: 'https://docs.listenlabs.ai/get-started',
  baseUrl: 'https://listenlabs.ai/api/public',
  auth: 'x-api-key or x-id header',
  scope: ['list-studies', 'responses', 'single-response', 'study-questions', 'study-insights'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'listenlabs',
  register(app, store) {
    app.get('/api/public/list_surveys', (c) => c.json(state(store).studies));
    app.get('/api/public/list_studies', (c) => c.json(state(store).studies));
    app.get('/api/public/responses', (c) => {
      const rows = state(store).responses[studyIdFrom(c)];
      if (!rows) return notFound(c, 'Study responses not found');
      return c.json(rows);
    });
    app.post('/api/public/responses', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const studyId = body.study_id ?? studyIdFrom(c);
      if (!s.responses[studyId]) return notFound(c, 'Study not found');
      const response = {
        id: `response_${s.nextResponse++}`,
        study_id: studyId,
        created_at: new Date().toISOString(),
        participant: body.participant ?? { id: `participant_${s.nextResponse}` },
        answers: body.answers ?? [],
        transcript: body.transcript ?? '',
        summary: body.summary ?? '',
      };
      s.responses[studyId].push(response);
      save(store, s);
      return c.json(response, 201);
    });
    app.get('/api/public/responses/:responseId', (c) => {
      const response = Object.values(state(store).responses).flat().find((item) => item.id === c.req.param('responseId'));
      if (!response) return notFound(c, 'Response not found');
      return c.json(response);
    });
    app.get('/api/public/study_questions', (c) => {
      const rows = state(store).questions[studyIdFrom(c)];
      if (!rows) return notFound(c, 'Study questions not found');
      return c.json(rows);
    });
    app.get('/api/public/questions', (c) => {
      const rows = state(store).questions[studyIdFrom(c)];
      if (!rows) return notFound(c, 'Study questions not found');
      return c.json(rows);
    });
    app.get('/api/public/insights', (c) => {
      const insight = state(store).insights[studyIdFrom(c)];
      if (!insight) return notFound(c, 'Study insights not found');
      return c.json(insight);
    });
    app.get('/listenlabs/inspect/contract', (c) => c.json(contract));
    app.get('/listenlabs/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  save(store, initialState(config));
}

export const label = 'Listen Labs API emulator';
export const endpoints = 'list studies, responses, single response, and study questions';
export const capabilities = contract.scope;
export const initConfig = { listenlabs: initialState() };
export default plugin;
