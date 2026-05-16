const now = '2026-01-01T00:00:00.000Z';

function initialState(config = {}) {
  return {
    forms: config.forms ?? [
      {
        formId: 'form_emulator',
        info: { title: 'Google Forms Emulator Study', documentTitle: 'Google Forms Emulator Study' },
        responderUri: 'https://docs.google.com/forms/d/e/form_emulator/viewform',
        revisionId: '00000001',
        settings: { quizSettings: { isQuiz: false } },
        items: [
          { itemId: 'item_satisfaction', title: 'How satisfied are you?', questionItem: { question: { questionId: 'q_satisfaction', required: true, choiceQuestion: { type: 'RADIO', options: [{ value: 'Very satisfied' }, { value: 'Neutral' }] } } } },
          { itemId: 'item_improve', title: 'What should we improve?', questionItem: { question: { questionId: 'q_improve', textQuestion: { paragraph: true } } } },
        ],
      },
    ],
    responses: config.responses ?? {
      form_emulator: [
        {
          responseId: 'response_emulator_1',
          createTime: now,
          lastSubmittedTime: now,
          answers: {
            q_satisfaction: { questionId: 'q_satisfaction', textAnswers: { answers: [{ value: 'Very satisfied' }] } },
            q_improve: { questionId: 'q_improve', textAnswers: { answers: [{ value: 'Keep local API tests hermetic.' }] } },
          },
        },
      ],
    },
    nextForm: 2,
    nextResponse: 2,
  };
}

function state(store) {
  const current = store.getData?.('google-forms:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('google-forms:state', next);
  return next;
}

function save(store, next) {
  store.setData?.('google-forms:state', next);
}

function notFound(c, message) {
  return c.json({ error: { code: 404, message, status: 'NOT_FOUND' } }, 404);
}

function originFrom(c) {
  if (!c.req.url) return 'http://localhost';
  const requestUrl = new URL(c.req.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

function discovery(baseUrl) {
  const rootUrl = `${baseUrl.replace(/\/$/, '')}/`;
  const pathParam = { type: 'string', required: true, location: 'path' };
  return {
    kind: 'discovery#restDescription',
    discoveryVersion: 'v1',
    id: 'forms:v1',
    name: 'forms',
    version: 'v1',
    title: 'Google Forms API',
    description: 'Reads and writes Google Forms and responses.',
    rootUrl,
    servicePath: '',
    baseUrl: rootUrl,
    batchPath: 'batch',
    auth: { oauth2: { scopes: { 'https://www.googleapis.com/auth/forms.body': { description: 'See, edit, create, and delete all your Google Forms forms.' }, 'https://www.googleapis.com/auth/forms.responses.readonly': { description: 'See all responses to your Google Forms forms.' } } } },
    schemas: {
      Form: { id: 'Form', type: 'object', properties: { formId: { type: 'string' }, info: { type: 'object' }, items: { type: 'array', items: { type: 'object' } } } },
      FormResponse: { id: 'FormResponse', type: 'object', properties: { responseId: { type: 'string' }, answers: { type: 'object' } } },
      ListFormResponsesResponse: { id: 'ListFormResponsesResponse', type: 'object', properties: { responses: { type: 'array', items: { $ref: 'FormResponse' } }, nextPageToken: { type: 'string' } } },
      BatchUpdateFormRequest: { id: 'BatchUpdateFormRequest', type: 'object', properties: { requests: { type: 'array', items: { type: 'object' } } } },
      BatchUpdateFormResponse: { id: 'BatchUpdateFormResponse', type: 'object', properties: { form: { $ref: 'Form' }, replies: { type: 'array', items: { type: 'object' } } } },
    },
    resources: {
      forms: {
        methods: {
          create: { id: 'forms.forms.create', path: 'v1/forms', flatPath: 'v1/forms', httpMethod: 'POST', description: 'Create a new form.', request: { $ref: 'Form' }, response: { $ref: 'Form' }, scopes: ['https://www.googleapis.com/auth/forms.body'] },
          get: { id: 'forms.forms.get', path: 'v1/forms/{formId}', flatPath: 'v1/forms/{formId}', httpMethod: 'GET', description: 'Get a form.', parameters: { formId: pathParam }, parameterOrder: ['formId'], response: { $ref: 'Form' }, scopes: ['https://www.googleapis.com/auth/forms.body'] },
          batchUpdate: { id: 'forms.forms.batchUpdate', path: 'v1/forms/{formId}:batchUpdate', flatPath: 'v1/forms/{formId}:batchUpdate', httpMethod: 'POST', description: 'Change a form with a batch of updates.', parameters: { formId: pathParam }, parameterOrder: ['formId'], request: { $ref: 'BatchUpdateFormRequest' }, response: { $ref: 'BatchUpdateFormResponse' }, scopes: ['https://www.googleapis.com/auth/forms.body'] },
        },
        resources: {
          responses: {
            methods: {
              list: { id: 'forms.forms.responses.list', path: 'v1/forms/{formId}/responses', flatPath: 'v1/forms/{formId}/responses', httpMethod: 'GET', description: "List a form's responses.", parameters: { formId: pathParam, pageSize: { type: 'integer', location: 'query' }, pageToken: { type: 'string', location: 'query' } }, parameterOrder: ['formId'], response: { $ref: 'ListFormResponsesResponse' }, scopes: ['https://www.googleapis.com/auth/forms.responses.readonly'] },
              get: { id: 'forms.forms.responses.get', path: 'v1/forms/{formId}/responses/{responseId}', flatPath: 'v1/forms/{formId}/responses/{responseId}', httpMethod: 'GET', description: 'Get one form response.', parameters: { formId: pathParam, responseId: pathParam }, parameterOrder: ['formId', 'responseId'], response: { $ref: 'FormResponse' }, scopes: ['https://www.googleapis.com/auth/forms.responses.readonly'] },
            },
          },
        },
      },
    },
  };
}

export const contract = {
  provider: 'google-forms',
  source: 'Google Forms API v1 REST discovery docs',
  docs: 'https://developers.google.com/workspace/forms/api/reference/rest',
  baseUrl: 'https://forms.googleapis.com/',
  auth: 'OAuth2 bearer token',
  scope: ['discovery', 'forms-create-get-batchUpdate', 'responses-list-get'],
  fidelity: 'stateful-rest-emulator-with-discovery',
};

export const plugin = {
  name: 'google-forms',
  register(app, store) {
    app.get('/$discovery/rest', (c) => {
      return c.json(discovery(originFrom(c)));
    });
    app.get('/discovery/v1/apis/forms/v1/rest', (c) => {
      return c.json(discovery(originFrom(c)));
    });
    app.post('/v1/forms', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const formId = `form_created_${s.nextForm++}`;
      const form = {
        formId,
        info: { title: body.info?.title ?? 'Created Emulator Form', documentTitle: body.info?.documentTitle ?? body.info?.document_title ?? body.info?.title ?? 'Created Emulator Form' },
        responderUri: `https://docs.google.com/forms/d/e/${formId}/viewform`,
        revisionId: '00000001',
        settings: { quizSettings: { isQuiz: false } },
        items: [],
      };
      s.forms.push(form);
      s.responses[formId] = [];
      save(store, s);
      return c.json(form);
    });
    app.get('/v1/forms/:formId', (c) => {
      const form = state(store).forms.find((item) => item.formId === c.req.param('formId'));
      if (!form) return notFound(c, 'Form not found.');
      return c.json(form);
    });
    app.post('/v1/forms/:formId:batchUpdate', async (c) => {
      const s = state(store);
      const formId = c.req.param('formId') ?? c.req.param('formId:batchUpdate')?.replace(/:batchUpdate$/, '');
      const form = s.forms.find((item) => item.formId === formId);
      if (!form) return notFound(c, 'Form not found.');
      const body = await c.req.json().catch(() => ({}));
      const replies = [];
      for (const request of body.requests ?? []) {
        if (request.createItem?.item) {
          const item = { itemId: `item_${form.items.length + 1}`, ...request.createItem.item };
          form.items.splice(request.createItem.location?.index ?? form.items.length, 0, item);
          replies.push({ createItem: { itemId: item.itemId, questionId: item.questionItem?.question?.questionId } });
        } else if (request.updateFormInfo?.info) {
          form.info = { ...form.info, ...request.updateFormInfo.info };
          replies.push({ updateFormInfo: {} });
        } else {
          replies.push({});
        }
      }
      form.revisionId = String(Number(form.revisionId) + 1).padStart(8, '0');
      save(store, s);
      return c.json({ form, replies, writeControl: { requiredRevisionId: form.revisionId } });
    });
    app.get('/v1/forms/:formId/responses', (c) => {
      const rows = state(store).responses[c.req.param('formId')];
      if (!rows) return notFound(c, 'Form responses not found.');
      return c.json({ responses: rows, nextPageToken: '' });
    });
    app.get('/v1/forms/:formId/responses/:responseId', (c) => {
      const response = (state(store).responses[c.req.param('formId')] ?? []).find((item) => item.responseId === c.req.param('responseId'));
      if (!response) return notFound(c, 'Form response not found.');
      return c.json(response);
    });
    app.get('/google-forms/inspect/contract', (c) => c.json(contract));
    app.get('/google-forms/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  save(store, initialState(config));
}

export const label = 'Google Forms API emulator';
export const endpoints = 'Forms discovery, create, get, batchUpdate, and responses list/get';
export const capabilities = contract.scope;
export const initConfig = { googleForms: initialState() };
export default plugin;
