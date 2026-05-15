const NOW = '2026-01-20T12:00:00Z';

function initialState(config = {}) {
  return {
    courses: [
      {
        id: 'course-101',
        name: 'Emulator Computer Science',
        section: 'Period 1',
        descriptionHeading: 'API Emulator Lab',
        description: 'A deterministic course for local Google Classroom client tests.',
        room: 'Room 204',
        ownerId: 'teacher-1',
        creationTime: '2026-01-10T09:00:00Z',
        updateTime: NOW,
        enrollmentCode: 'emu101',
        courseState: 'ACTIVE',
        alternateLink: 'https://classroom.google.com/c/course-101',
        teacherGroupEmail: 'Emulator_Computer_Science_teachers@example.edu',
        courseGroupEmail: 'Emulator_Computer_Science@example.edu',
      },
    ],
    teachers: [
      {
        courseId: 'course-101',
        userId: 'teacher-1',
        profile: {
          id: 'teacher-1',
          name: { givenName: 'Ada', familyName: 'Lovelace', fullName: 'Ada Lovelace' },
          emailAddress: 'ada@example.edu',
          photoUrl: 'https://classroom.example.test/photos/teacher-1.png',
        },
      },
    ],
    students: [
      {
        courseId: 'course-101',
        userId: 'student-1',
        profile: {
          id: 'student-1',
          name: { givenName: 'Grace', familyName: 'Hopper', fullName: 'Grace Hopper' },
          emailAddress: 'grace@example.edu',
          photoUrl: 'https://classroom.example.test/photos/student-1.png',
        },
        studentWorkFolder: { id: 'folder-student-1', title: 'Grace Hopper Classroom Folder', alternateLink: 'https://drive.example.test/folders/folder-student-1' },
      },
    ],
    courseWork: [
      {
        courseId: 'course-101',
        id: 'work-1',
        title: 'Build an emulator',
        description: 'Create a local emulator and validate it with route smoke tests.',
        state: 'PUBLISHED',
        alternateLink: 'https://classroom.google.com/c/course-101/a/work-1',
        creationTime: '2026-01-12T09:00:00Z',
        updateTime: NOW,
        dueDate: { year: 2026, month: 2, day: 1 },
        maxPoints: 100,
        workType: 'ASSIGNMENT',
      },
    ],
    nextCourseId: 102,
    requests: [],
    ...config,
  };
}

function state(store) {
  const current = store.getData?.('google-classroom:state');
  if (current) return current;
  const next = initialState();
  store.setData?.('google-classroom:state', next);
  return next;
}

function saveState(store, next) {
  store.setData?.('google-classroom:state', next);
}

function googleError(c, code, status, message) {
  return c.json({ error: { code, message, status } }, code);
}

function listPage(rows, c, key) {
  const pageSize = Math.max(1, Math.min(Number(c.req.query('pageSize') ?? 30) || 30, 100));
  const offset = Number(c.req.query('pageToken') ?? 0) || 0;
  const page = rows.slice(offset, offset + pageSize);
  const next = offset + pageSize < rows.length ? String(offset + pageSize) : undefined;
  return { [key]: page, ...(next ? { nextPageToken: next } : {}) };
}

function courseById(s, id) {
  return s.courses.find((course) => course.id === id);
}

function discoveryDocument(c) {
  const rootUrl = `${c.req.header?.('x-forwarded-proto') ?? 'http'}://${c.req.header?.('host') ?? 'localhost'}/`;
  return {
    kind: 'discovery#restDescription',
    discoveryVersion: 'v1',
    id: 'classroom:v1',
    name: 'classroom',
    version: 'v1',
    title: 'Google Classroom API',
    rootUrl,
    servicePath: '',
    batchPath: 'batch',
    resources: {
      courses: {
        methods: {
          list: { id: 'classroom.courses.list', path: 'v1/courses', httpMethod: 'GET', response: { $ref: 'ListCoursesResponse' } },
          get: { id: 'classroom.courses.get', path: 'v1/courses/{id}', httpMethod: 'GET', response: { $ref: 'Course' } },
          create: { id: 'classroom.courses.create', path: 'v1/courses', httpMethod: 'POST', request: { $ref: 'Course' }, response: { $ref: 'Course' } },
        },
      },
    },
  };
}

export const contract = {
  provider: 'google-classroom',
  source: 'Google Classroom REST Discovery document compatible subset',
  docs: 'https://developers.google.com/workspace/classroom/reference/rest',
  baseUrl: 'https://classroom.googleapis.com',
  scope: ['courses', 'teachers', 'students', 'courseWork', 'discovery'],
  fidelity: 'stateful-google-json-rest',
  compatibilityOracle: 'official googleapis SDK supports rootUrl override',
};

export const plugin = {
  name: 'google-classroom',
  register(app, store) {
    app.get('/$discovery/rest', (c) => c.json(discoveryDocument(c)));

    app.get('/v1/courses', (c) => {
      const s = state(store);
      s.requests.push({ method: 'GET', path: '/v1/courses' });
      saveState(store, s);
      return c.json(listPage(s.courses, c, 'courses'));
    });

    app.post('/v1/courses', async (c) => {
      const s = state(store);
      const body = await c.req.json().catch(() => ({}));
      const id = body.id ?? `course-${s.nextCourseId++}`;
      const course = {
        id,
        name: body.name ?? 'Untitled Course',
        section: body.section ?? '',
        descriptionHeading: body.descriptionHeading ?? '',
        description: body.description ?? '',
        room: body.room ?? '',
        ownerId: body.ownerId ?? 'teacher-1',
        creationTime: NOW,
        updateTime: NOW,
        enrollmentCode: body.enrollmentCode ?? `emu${id.replace(/\D/g, '') || s.nextCourseId}`,
        courseState: body.courseState ?? 'PROVISIONED',
        alternateLink: `https://classroom.google.com/c/${id}`,
        teacherGroupEmail: body.teacherGroupEmail ?? `${id}_teachers@example.edu`,
        courseGroupEmail: body.courseGroupEmail ?? `${id}@example.edu`,
      };
      s.courses.push(course);
      saveState(store, s);
      return c.json(course, 200);
    });

    app.get('/v1/courses/:id', (c) => {
      const course = courseById(state(store), c.req.param('id'));
      return course ? c.json(course) : googleError(c, 404, 'NOT_FOUND', 'Requested course not found.');
    });

    app.get('/v1/courses/:courseId/teachers', (c) => {
      const s = state(store);
      if (!courseById(s, c.req.param('courseId'))) return googleError(c, 404, 'NOT_FOUND', 'Requested course not found.');
      return c.json(listPage(s.teachers.filter((teacher) => teacher.courseId === c.req.param('courseId')), c, 'teachers'));
    });

    app.get('/v1/courses/:courseId/students', (c) => {
      const s = state(store);
      if (!courseById(s, c.req.param('courseId'))) return googleError(c, 404, 'NOT_FOUND', 'Requested course not found.');
      return c.json(listPage(s.students.filter((student) => student.courseId === c.req.param('courseId')), c, 'students'));
    });

    app.get('/v1/courses/:courseId/courseWork', (c) => {
      const s = state(store);
      if (!courseById(s, c.req.param('courseId'))) return googleError(c, 404, 'NOT_FOUND', 'Requested course not found.');
      return c.json(listPage(s.courseWork.filter((work) => work.courseId === c.req.param('courseId')), c, 'courseWork'));
    });

    app.get('/google-classroom/inspect/contract', (c) => c.json(contract));
    app.get('/google-classroom/inspect/state', (c) => c.json(state(store)));
  },
};

export function seedFromConfig(store, _baseUrl, config = {}) {
  saveState(store, initialState(config));
}

export const label = 'Google Classroom API emulator';
export const endpoints = contract.scope.join(', ');
export const capabilities = contract.scope;
export const initConfig = { googleClassroom: initialState() };

export default plugin;
