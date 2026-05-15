function initialState(config = {}) {
  return {
    users: [
      {
        id: 101,
        name: 'Ada Lovelace',
        sortable_name: 'Lovelace, Ada',
        short_name: 'Ada',
        avatar_url: 'https://canvas.example.test/images/messages/avatar-101.png',
        locale: 'en',
        email: 'ada@example.edu',
        permissions: { can_update_name: false, can_update_avatar: false },
      },
    ],
    courses: [
      {
        id: 201,
        name: 'Emulator Computer Science',
        course_code: 'EMU-CS101',
        workflow_state: 'available',
        start_at: '2026-01-12T08:00:00Z',
        end_at: '2026-05-20T18:00:00Z',
      },
    ],
    assignments: [
      {
        id: 301,
        course_id: 201,
        name: 'API Emulator Lab',
        description: 'Build a deterministic local API client test.',
        due_at: '2026-02-01T23:59:00Z',
        points_possible: 10,
        submission_types: ['online_text_entry'],
        workflow_state: 'published',
        html_url: 'https://canvas.example.test/courses/201/assignments/301',
      },
    ],
    submissions: [
      {
        id: 401,
        user_id: 101,
        assignment_id: 301,
        course_id: 201,
        submitted_at: '2026-01-20T16:30:00Z',
        workflow_state: 'submitted',
        submission_type: 'online_text_entry',
        body: 'My emulator lab response',
        url: null,
        score: 9,
        grade: '9',
        attempt: 1,
      },
    ],
    nextAssignmentId: 302,
    nextSubmissionId: 402,
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('canvas:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('canvas:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('canvas:state', next);
}

function notFound(c, message = 'The specified resource does not exist.') {
  return c.json({ errors: [{ message }] }, 404);
}

function canvasHeaders(c, path, rows) {
  const perPage = Number(c.req.query('per_page') ?? 10);
  const base = path.startsWith('http') ? path : `https://canvas.example.test${path}`;
  const link = [`<${base}?page=1&per_page=${perPage}>; rel="current"`, `<${base}?page=1&per_page=${perPage}>; rel="first"`, `<${base}?page=1&per_page=${perPage}>; rel="last"`].join(',');
  return {
    Link: rows.length > perPage ? `${link},<${base}?page=2&per_page=${perPage}>; rel="next"` : link,
  };
}

function listResponse(c, path, rows) {
  return c.json(rows, 200, canvasHeaders(c, path, rows));
}

function canvasId(c, value) {
  return c.req.header?.('accept')?.includes('application/json+canvas-string-ids') ? String(value) : value;
}

function courseFor(c, course) {
  return { ...course, id: canvasId(c, course.id) };
}

function assignmentFor(c, assignment) {
  return { ...assignment, id: canvasId(c, assignment.id), course_id: canvasId(c, assignment.course_id) };
}

function submissionFor(c, submission) {
  return {
    ...submission,
    id: canvasId(c, submission.id),
    user_id: canvasId(c, submission.user_id),
    assignment_id: canvasId(c, submission.assignment_id),
    course_id: canvasId(c, submission.course_id),
  };
}

function findCourseAssignment(s, courseId, assignmentId) {
  const course = s.courses.find((item) => String(item.id) === String(courseId));
  if (!course) return {};
  const assignment = s.assignments.find((item) => String(item.course_id) === String(course.id) && String(item.id) === String(assignmentId));
  return { course, assignment };
}

export const contract = {
  provider: 'canvas',
  source: 'Canvas LMS REST API v1 compatible subset',
  docs: 'https://developerdocs.instructure.com/services/canvas',
  baseUrl: 'https://canvas.example.test/api/v1',
  scope: ['users', 'courses', 'assignments', 'submissions'],
  fidelity: 'stateful-rest-emulator',
};

export const plugin = {
  name: 'canvas',
  register(app, store) {
    app.get('/api/v1/users/self', (c) => c.json({ ...state(store).users[0], id: canvasId(c, state(store).users[0].id) }));

    app.get('/api/v1/users/:id', (c) => {
      const id = c.req.param('id');
      const user = id === 'self' ? state(store).users[0] : state(store).users.find((item) => String(item.id) === String(id));
      return user ? c.json({ ...user, id: canvasId(c, user.id) }) : notFound(c, 'User not found');
    });

    app.get('/api/v1/courses', (c) => listResponse(c, '/api/v1/courses', state(store).courses.map((course) => courseFor(c, course))));

    app.get('/api/v1/courses/:course_id', (c) => {
      const course = state(store).courses.find((item) => String(item.id) === String(c.req.param('course_id')));
      return course ? c.json(courseFor(c, course)) : notFound(c, 'Course not found');
    });

    app.get('/api/v1/courses/:course_id/assignments', (c) => {
      const course = state(store).courses.find((item) => String(item.id) === String(c.req.param('course_id')));
      if (!course) return notFound(c, 'Course not found');
      const rows = state(store).assignments.filter((item) => String(item.course_id) === String(course.id)).map((assignment) => assignmentFor(c, assignment));
      return listResponse(c, `/api/v1/courses/${course.id}/assignments`, rows);
    });

    app.get('/api/v1/courses/:course_id/assignments/:id', (c) => {
      const assignment = state(store).assignments.find((item) => String(item.course_id) === String(c.req.param('course_id')) && String(item.id) === String(c.req.param('id')));
      return assignment ? c.json(assignmentFor(c, assignment)) : notFound(c, 'Assignment not found');
    });

    app.post('/api/v1/courses/:course_id/assignments', async (c) => {
      const s = state(store);
      const course = s.courses.find((item) => String(item.id) === String(c.req.param('course_id')));
      if (!course) return notFound(c, 'Course not found');
      const body = await c.req.json().catch(() => ({}));
      const input = body.assignment ?? body;
      const assignment = {
        id: s.nextAssignmentId++,
        course_id: course.id,
        name: input.name ?? 'Untitled Assignment',
        description: input.description ?? '',
        due_at: input.due_at ?? null,
        points_possible: input.points_possible ?? 0,
        submission_types: input.submission_types ?? ['online_text_entry'],
        workflow_state: input.published === false ? 'unpublished' : 'published',
        html_url: `https://canvas.example.test/courses/${course.id}/assignments/${s.nextAssignmentId - 1}`,
      };
      s.assignments.push(assignment);
      saveState(store, s);
      return c.json(assignmentFor(c, assignment), 201);
    });

    app.get('/api/v1/courses/:course_id/assignments/:assignment_id/submissions', (c) => {
      const s = state(store);
      const { course, assignment } = findCourseAssignment(s, c.req.param('course_id'), c.req.param('assignment_id'));
      if (!course) return notFound(c, 'Course not found');
      if (!assignment) return notFound(c, 'Assignment not found');
      const rows = s.submissions
        .filter((item) => String(item.course_id) === String(course.id) && String(item.assignment_id) === String(assignment.id))
        .map((submission) => submissionFor(c, submission));
      return listResponse(c, `/api/v1/courses/${course.id}/assignments/${assignment.id}/submissions`, rows);
    });

    app.get('/api/v1/courses/:course_id/assignments/:assignment_id/submissions/:user_id', (c) => {
      const s = state(store);
      const { course, assignment } = findCourseAssignment(s, c.req.param('course_id'), c.req.param('assignment_id'));
      if (!course) return notFound(c, 'Course not found');
      if (!assignment) return notFound(c, 'Assignment not found');
      const submission = s.submissions.find((item) =>
        String(item.course_id) === String(course.id)
        && String(item.assignment_id) === String(assignment.id)
        && String(item.user_id) === String(c.req.param('user_id')));
      return submission ? c.json(submissionFor(c, submission)) : notFound(c, 'Submission not found');
    });

    app.post('/api/v1/courses/:course_id/assignments/:assignment_id/submissions', async (c) => {
      const s = state(store);
      const { course, assignment } = findCourseAssignment(s, c.req.param('course_id'), c.req.param('assignment_id'));
      if (!course) return notFound(c, 'Course not found');
      if (!assignment) return notFound(c, 'Assignment not found');
      const body = await c.req.json().catch(() => ({}));
      const input = body.submission ?? body;
      const userId = input.user_id ?? body.user_id ?? s.users[0].id;
      let submission = s.submissions.find((item) =>
        String(item.course_id) === String(course.id)
        && String(item.assignment_id) === String(assignment.id)
        && String(item.user_id) === String(userId));
      const nextAttempt = (submission?.attempt ?? 0) + 1;
      const patch = {
        user_id: Number(userId),
        assignment_id: assignment.id,
        course_id: course.id,
        submitted_at: '2026-01-20T17:00:00Z',
        workflow_state: 'submitted',
        submission_type: input.submission_type ?? 'online_text_entry',
        body: input.body ?? null,
        url: input.url ?? null,
        score: input.score ?? submission?.score ?? null,
        grade: input.grade ?? submission?.grade ?? null,
        attempt: nextAttempt,
      };
      if (submission) Object.assign(submission, patch);
      else {
        submission = { id: s.nextSubmissionId++, ...patch };
        s.submissions.push(submission);
      }
      saveState(store, s);
      return c.json(submissionFor(c, submission), 201);
    });

    app.get('/canvas/inspect/contract', (c) => c.json(contract));
    app.get('/canvas/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Canvas LMS API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { canvas: initialState() };

export default plugin;
