type WorkersAiInput = {
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
};

type AppLike = {
  post(
    path: string,
    handler: (context: any) => Promise<Response> | Response,
  ): void;
  get?(
    path: string,
    handler: (context: any) => Promise<Response> | Response,
  ): void;
};

type ServicePlugin = {
  name: string;
  register(app: AppLike): void;
  seed?(store: unknown, baseUrl: string): void;
};

export const contract = {
  provider: "cloudflare",
  source: "cloudflare/api-schemas OpenAPI plus Workers binding documentation",
  docs: "https://developers.cloudflare.com/workers/runtime-apis/bindings/",
  scope: [
    "workers-ai",
    "send-email",
    "d1",
    "kv",
    "r2",
    "queues",
    "workflows",
    "worker-loader",
    "analytics-engine",
    "sandbox",
    "durable-objects",
  ],
  fidelity: "binding-resource-model-subset",
} as const;

type D1Row = Record<string, unknown>;
type QueueMessageRecord = {
  id: string;
  body: unknown;
  options?: Record<string, unknown>;
  sentAt: string;
};
type WorkflowInstanceRecord = {
  id: string;
  params?: unknown;
  createdAt: string;
  status: "running" | "complete" | "terminated";
};

type CloudflarePlatformOptions = {
  d1?: {
    seed?: "monaco-pad" | D1SeedData;
  };
  sendEmail?: {
    fail?: boolean | { message?: string };
  };
  kv?: Record<string, Record<string, unknown>>;
  queues?: string[];
  workflows?: string[];
  analyticsDatasets?: string[];
  loader?: Partial<LoaderEmulator>;
  r2Buckets?: string[];
  durableObjects?: Record<
    string,
    new (
      state: unknown,
      env: Record<string, unknown>,
    ) => { fetch(request: Request): Promise<Response> | Response }
  >;
  sandbox?: Partial<SandboxEmulator>;
};

type D1SeedData = {
  problems?: D1Row[];
  sessions?: D1Row[];
};

type SendEmailInput = {
  from?: unknown;
  to?: unknown;
  subject?: unknown;
  html?: unknown;
  text?: unknown;
  headers?: unknown;
};

type SentEmailRecord = {
  id: string;
  from: unknown;
  to: unknown;
  subject: string | null;
  html: string | null;
  text: string | null;
  headers: unknown;
  sentAt: string;
};

type LoaderEntrypoint = {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> | Response;
};

type LoaderEmulator = {
  get(id: string, buildSource?: () => string): { getEntrypoint(): LoaderEntrypoint };
};

type SandboxRunInput = {
  language?: string;
  action?: string;
  files?: Array<{ path: string; content: string }>;
  command?: string;
};

type SandboxResult = {
  status: "success" | "error";
  output: string;
  error?: string;
  exitCode?: number;
};

type SandboxEmulator = {
  run(input: SandboxRunInput): Promise<SandboxResult>;
  exec(
    command: string,
    args?: string[],
    options?: Record<string, unknown>,
  ): Promise<SandboxResult>;
};

const encoder = new TextEncoder();
const sentEmails: SentEmailRecord[] = [];
const queueMessages = new Map<string, QueueMessageRecord[]>();
const workflowInstances = new Map<string, WorkflowInstanceRecord[]>();
const analyticsEvents = new Map<string, unknown[]>();
const workersAiModels = [
  {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout",
    description:
      "Large instruction model for broad coding interview assistance.",
    task: "Text Generation",
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B",
    description: "Higher-capacity chat model for deeper reasoning.",
    task: "Text Generation",
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    label: "DeepSeek R1 Distill 32B",
    description:
      "Reasoning-oriented model for debugging and stepwise analysis.",
    task: "Text Generation",
  },
  {
    id: "@cf/qwen/qwen1.5-14b-chat-awq",
    label: "Qwen 1.5 14B",
    description: "Fast general chat model for short guidance.",
    task: "Text Generation",
  },
];

function extractUserText(input: WorkersAiInput): string {
  return (
    input.messages?.findLast((message) => message.role === "user")?.content ??
    ""
  );
}

function generateAiText(userText: string): string {
  const sleepResponse = generateSleepCoachResponse(userText);
  if (sleepResponse) return JSON.stringify(sleepResponse);

  if (userText.includes("Excalidraw") || userText.includes("canvas")) {
    return "This diagram appears to show a structured technical sketch. The emulator identified shapes, labels, and relationships from the supplied scene data.";
  }

  return `Cloudflare emulator response: ${userText || "ready"}`;
}

function generateSleepCoachResponse(userText: string) {
  if (userText.includes("Evaluate whether Sleep Coach should intervene")) {
    const context = extractContext(userText);
    const alarmEnabled =
      context?.alarm?.wakeAlarmEnabled ??
      context?.sleepGoal?.wakeAlarmEnabled ??
      context?.schedule?.wakeAlarmEnabled;

    if (alarmEnabled === false) {
      return {
        status: "at_risk",
        primaryPattern: "Wake alarm is disabled.",
        confidence: "high",
        evidence: ["Wake alarm is disabled for the sleep goal."],
        message: "Your wake goal is unprotected. Want me to enable the alarm?",
        recommendedAction: "enable_alarm",
        shouldReachOut: true,
      };
    }

    return {
      status: "watch",
      primaryPattern: "No urgent sleep risk found.",
      confidence: "low",
      evidence: [],
      message: "No useful protective outreach is needed right now.",
      recommendedAction: "none",
      shouldReachOut: false,
    };
  }

  if (userText.includes("Generate a sleep coach plan")) {
    return {
      title: "Protect Tomorrow",
      summary:
        "Your current plan should protect the wake goal without overfitting one signal.",
      steps: [
        "Keep the wake time steady.",
        "Get morning light soon after waking.",
        "Make the final hour before bed calm and low-stimulation.",
      ],
      note: null,
      source: "foundationModel",
    };
  }

  return null;
}

function extractContext(userText: string) {
  const marker = "Context:";
  const index = userText.lastIndexOf(marker);
  if (index < 0) return null;

  try {
    return JSON.parse(userText.slice(index + marker.length).trim()) as {
      alarm?: { wakeAlarmEnabled?: boolean };
      sleepGoal?: { wakeAlarmEnabled?: boolean };
      schedule?: { wakeAlarmEnabled?: boolean };
      snooze?: { snoozesLast7Days?: number };
      screenTime?: { minutesUsedInLastHourBeforeBed?: number };
    };
  } catch {
    return null;
  }
}

function createAiBinding() {
  return {
    async run(_model: string, input: WorkersAiInput) {
      const response = generateAiText(extractUserText(input));
      if (!input.stream) return { response };

      return new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ response })}\n\n`),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
    },
  };
}

function workersAiRoutes(app: AppLike): void {
  const modelCatalogHandler = (c: any) =>
    c.json({
      success: true,
      errors: [],
      messages: [],
      result: workersAiModels,
    });

  app.get?.(
    "/client/v4/accounts/:accountId/ai/models/search",
    modelCatalogHandler,
  );
  app.get?.("/client/v4/accounts/:accountId/ai/models", modelCatalogHandler);

  app.post("/client/v4/accounts/:accountId/ai/run/*", async (c: any) => {
    const input = (await c.req.json().catch(() => ({}))) as WorkersAiInput;
    const response = generateAiText(extractUserText(input));

    return c.json({
      success: true,
      errors: [],
      messages: [],
      result: {
        response,
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
        },
      },
    });
  });
}

class MemoryD1Database {
  private readonly tables = new Map<string, D1Row[]>();

  constructor(seed?: D1SeedData) {
    this.tables.set("problems", [...(seed?.problems ?? [])]);
    this.tables.set("sessions", [...(seed?.sessions ?? [])]);
  }

  prepare(sql: string) {
    return new MemoryD1PreparedStatement(this, sql);
  }

  select(sql: string, params: unknown[]): D1Row[] {
    const normalized = normalizeSql(sql);
    if (normalized.includes("from problems"))
      return this.selectProblems(normalized, params);
    if (normalized.includes("from sessions"))
      return this.selectSessions(normalized, params);
    throw new Error(`Unsupported D1 query: ${sql}`);
  }

  insert(sql: string, params: unknown[]) {
    const normalized = normalizeSql(sql);
    if (normalized.startsWith("insert into sessions")) {
      const [id, problem_id, title, language, instructions, starter_files] =
        params;
      this.table("sessions").push({
        id,
        problem_id,
        title,
        language,
        instructions,
        starter_files,
        created_at: new Date().toISOString(),
        is_active: 1,
      });
      return { success: true, meta: { changes: 1 }, results: [] };
    }
    throw new Error(`Unsupported D1 mutation: ${sql}`);
  }

  private selectProblems(sql: string, params: unknown[]): D1Row[] {
    let rows = [...this.table("problems")];
    let paramIndex = 0;

    if (sql.includes("id = ?")) {
      const id = params[paramIndex++];
      rows = rows.filter((row) => row.id === id);
    }
    if (sql.includes("difficulty = ?")) {
      const difficulty = params[paramIndex++];
      rows = rows.filter((row) => row.difficulty === difficulty);
    }
    if (sql.includes("language = ?")) {
      const language = params[paramIndex++];
      rows = rows.filter((row) => row.language === language);
    }
    if (sql.includes("order by created_at desc")) {
      rows.sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at)),
      );
    }

    return rows;
  }

  private selectSessions(sql: string, params: unknown[]): D1Row[] {
    let rows = [...this.table("sessions")];
    if (sql.includes("id = ?")) {
      rows = rows.filter((row) => row.id === params[0]);
    }
    return rows;
  }

  private table(name: string): D1Row[] {
    const table = this.tables.get(name);
    if (!table) throw new Error(`No such table: ${name}`);
    return table;
  }
}

class MemoryD1PreparedStatement {
  private params: unknown[] = [];

  constructor(
    private readonly db: MemoryD1Database,
    private readonly sql: string,
  ) {}

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async first<T = D1Row>(): Promise<T | null> {
    return (this.db.select(this.sql, this.params)[0] as T | undefined) ?? null;
  }

  async all<T = D1Row>(): Promise<{
    results: T[];
    success: true;
    meta: Record<string, unknown>;
  }> {
    return {
      results: this.db.select(this.sql, this.params) as T[],
      success: true,
      meta: {},
    };
  }

  async run() {
    return this.db.insert(this.sql, this.params);
  }
}

class MemoryKVNamespace {
  private readonly values = new Map<
    string,
    { value: string; metadata?: unknown; expiration?: number }
  >();

  constructor(seed: Record<string, unknown> = {}) {
    for (const [key, value] of Object.entries(seed)) {
      this.values.set(key, { value: stringifyKvValue(value) });
    }
  }

  async get<T = string>(
    key: string,
    type?: "text" | "json" | "arrayBuffer" | "stream",
  ): Promise<T | null> {
    const entry = this.values.get(key);
    if (!entry || isExpired(entry.expiration)) return null;
    if (type === "json") return JSON.parse(entry.value) as T;
    if (type === "arrayBuffer")
      return encoder.encode(entry.value).buffer as T;
    if (type === "stream")
      return new Response(entry.value).body as T;
    return entry.value as T;
  }

  async getWithMetadata<T = string>(
    key: string,
    type?: "text" | "json" | "arrayBuffer" | "stream",
  ): Promise<{ value: T | null; metadata: unknown }> {
    const entry = this.values.get(key);
    return {
      value: await this.get<T>(key, type),
      metadata: entry?.metadata ?? null,
    };
  }

  async put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: { metadata?: unknown; expiration?: number; expirationTtl?: number },
  ): Promise<void> {
    const expiration =
      options?.expiration ??
      (options?.expirationTtl ? Math.floor(Date.now() / 1000) + options.expirationTtl : undefined);
    this.values.set(key, {
      value: await stringifyKvPutValue(value),
      metadata: options?.metadata,
      expiration,
    });
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
    const keys = Array.from(this.values.entries())
      .filter(([key, entry]) => !isExpired(entry.expiration) && (!options?.prefix || key.startsWith(options.prefix)))
      .slice(0, options?.limit ?? 1000)
      .map(([name, entry]) => ({ name, metadata: entry.metadata }));
    return { keys, list_complete: true, cursor: "" };
  }
}

class MemoryR2Bucket {
  private readonly objects = new Map<
    string,
    { body: Uint8Array; metadata?: Record<string, string> }
  >();

  async put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | Blob,
    options?: { customMetadata?: Record<string, string> },
  ) {
    this.objects.set(key, {
      body: await toBytes(value),
      metadata: options?.customMetadata,
    });
    return {
      key,
      version: crypto.randomUUID(),
      uploaded: new Date(),
      size: this.objects.get(key)?.body.length ?? 0,
    };
  }

  async get(key: string) {
    const object = this.objects.get(key);
    if (!object) return null;
    const body = object.body;
    return {
      key,
      size: body.length,
      customMetadata: object.metadata,
      arrayBuffer: async () =>
        body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      text: async () => new TextDecoder().decode(body),
      json: async () => JSON.parse(new TextDecoder().decode(body)),
    };
  }

  async head(key: string) {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      key,
      size: object.body.length,
      customMetadata: object.metadata,
      uploaded: new Date(),
    };
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number }) {
    const keys = Array.from(this.objects.keys())
      .filter((key) => !options?.prefix || key.startsWith(options.prefix))
      .slice(0, options?.limit ?? 1000);
    return {
      objects: keys.map((key) => ({
        key,
        size: this.objects.get(key)?.body.length ?? 0,
      })),
      truncated: false,
    };
  }
}

class MemorySendEmail {
  constructor(
    private readonly options: CloudflarePlatformOptions["sendEmail"] = {},
    private readonly sink: SentEmailRecord[] = sentEmails,
  ) {}

  async send(message: SendEmailInput): Promise<{ id: string; success: true }> {
    if (this.options?.fail) {
      const message =
        typeof this.options.fail === "object"
          ? (this.options.fail.message ?? "Cloudflare Send Email emulator failure")
          : "Cloudflare Send Email emulator failure";
      throw new Error(message);
    }

    const record: SentEmailRecord = {
      id: crypto.randomUUID(),
      from: message.from ?? null,
      to: message.to ?? null,
      subject: typeof message.subject === "string" ? message.subject : null,
      html: typeof message.html === "string" ? message.html : null,
      text: typeof message.text === "string" ? message.text : null,
      headers: message.headers ?? null,
      sentAt: new Date().toISOString(),
    };
    this.sink.push(record);
    return { id: record.id, success: true };
  }

  list(): SentEmailRecord[] {
    return [...this.sink];
  }

  clear(): void {
    this.sink.length = 0;
  }
}

class MemoryQueue {
  constructor(private readonly name: string) {
    if (!queueMessages.has(name)) queueMessages.set(name, []);
  }

  async send(body: unknown, options?: Record<string, unknown>): Promise<void> {
    queueMessages.get(this.name)?.push({
      id: crypto.randomUUID(),
      body,
      options,
      sentAt: new Date().toISOString(),
    });
  }

  async sendBatch(
    messages: Iterable<{ body: unknown; options?: Record<string, unknown> }>,
    options?: Record<string, unknown>,
  ): Promise<void> {
    for (const message of messages) {
      await this.send(message.body, message.options ?? options);
    }
  }

  messages(): QueueMessageRecord[] {
    return [...(queueMessages.get(this.name) ?? [])];
  }

  clear(): void {
    queueMessages.set(this.name, []);
  }
}

class MemoryWorkflowBinding {
  constructor(private readonly name: string) {
    if (!workflowInstances.has(name)) workflowInstances.set(name, []);
  }

  async create(options: { id?: string; params?: unknown }): Promise<WorkflowInstanceRecord> {
    const instance: WorkflowInstanceRecord = {
      id: options.id ?? crypto.randomUUID(),
      params: options.params,
      createdAt: new Date().toISOString(),
      status: "running",
    };
    workflowInstances.get(this.name)?.push(instance);
    return instance;
  }

  async get(id: string): Promise<WorkflowInstanceRecord | null> {
    return workflowInstances.get(this.name)?.find((instance) => instance.id === id) ?? null;
  }
}

class MemoryAnalyticsEngineDataset {
  constructor(private readonly name: string) {
    if (!analyticsEvents.has(name)) analyticsEvents.set(name, []);
  }

  writeDataPoint(event: unknown): void {
    analyticsEvents.get(this.name)?.push({
      event,
      writtenAt: new Date().toISOString(),
    });
  }
}

class MemoryWorkerLoader implements LoaderEmulator {
  private readonly workers = new Map<string, { source?: string; entrypoint: LoaderEntrypoint }>();

  constructor(private readonly overrides: Partial<LoaderEmulator> = {}) {}

  get(id: string, buildSource?: () => string): { getEntrypoint(): LoaderEntrypoint } {
    if (this.overrides.get) return this.overrides.get(id, buildSource);

    if (!this.workers.has(id)) {
      const source = buildSource?.();
      this.workers.set(id, {
        source,
        entrypoint: {
          async fetch(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
            const body = await parseRequestBody(init?.body);
            return jsonResponse({
              ok: true,
              runtimeId: id,
              sourceBytes: source?.length ?? 0,
              request: body,
            });
          },
        },
      });
    }

    const worker = this.workers.get(id);
    return {
      getEntrypoint() {
        return worker?.entrypoint ?? { fetch: () => jsonResponse({ ok: false }, 500) };
      },
    };
  }
}

function createSandboxEmulator(
  overrides?: Partial<SandboxEmulator>,
): SandboxEmulator {
  return {
    async run(input: SandboxRunInput) {
      if (overrides?.run) return overrides.run(input);
      const language = input.language ?? "Plain Text";
      const action = input.action ?? input.command ?? "Run Main";
      return {
        status: "success",
        output: `Cloudflare Sandbox emulator\nLanguage: ${language}\nAction: ${action}\nProcess exited with code 0`,
        exitCode: 0,
      };
    },
    async exec(
      command: string,
      args: string[] = [],
      options?: Record<string, unknown>,
    ) {
      if (overrides?.exec) return overrides.exec(command, args, options);
      return {
        status: "success",
        output: `$ ${[command, ...args].join(" ")}\nCloudflare Sandbox emulator completed.`,
        exitCode: 0,
      };
    },
  };
}

function createDurableObjectNamespace(
  DurableObjectClass: new (
    state: unknown,
    env: Record<string, unknown>,
  ) => { fetch(request: Request): Promise<Response> | Response },
  env: Record<string, unknown>,
) {
  const instances = new Map<
    string,
    { fetch(request: Request): Promise<Response> | Response }
  >();
  return {
    idFromName(name: string) {
      return { name, toString: () => name };
    },
    get(id: { name?: string; toString(): string }) {
      const key = id.name ?? id.toString();
      if (!instances.has(key)) {
        instances.set(key, new DurableObjectClass({ id, storage: {} }, env));
      }
      return instances.get(key);
    },
  };
}

export function createCloudflareBindings(
  options: CloudflarePlatformOptions = {},
) {
  const env: Record<string, unknown> = {
    AI: createAiBinding(),
    APP_DB: new MemoryD1Database(resolveD1Seed(options.d1?.seed)),
    AUTH_DB: new MemoryD1Database(resolveD1Seed(options.d1?.seed)),
    DB: new MemoryD1Database(resolveD1Seed(options.d1?.seed)),
    LOADER: new MemoryWorkerLoader(options.loader),
    SANDBOX: createSandboxEmulator(options.sandbox),
    TRANSACTIONAL_EMAIL: new MemorySendEmail(options.sendEmail),
  };

  for (const [binding, seed] of Object.entries(options.kv ?? {})) {
    env[binding] = new MemoryKVNamespace(seed);
  }

  for (const queueName of options.queues ?? ["AbandonedPaywallQueue", "BackgroundJobsQueue"]) {
    env[queueName] = new MemoryQueue(queueName);
  }

  for (const workflowName of options.workflows ?? ["BotPipeline"]) {
    env[workflowName] = new MemoryWorkflowBinding(workflowName);
  }

  for (const datasetName of options.analyticsDatasets ?? ["BOT_REWARDS"]) {
    env[datasetName] = new MemoryAnalyticsEngineDataset(datasetName);
  }

  for (const bucketName of options.r2Buckets ?? ["R2"]) {
    env[bucketName] = new MemoryR2Bucket();
  }

  for (const [binding, DurableObjectClass] of Object.entries(
    options.durableObjects ?? {},
  )) {
    env[binding] = createDurableObjectNamespace(DurableObjectClass, env);
  }

  return env;
}

export function createCloudflarePlatform(
  options: CloudflarePlatformOptions = {},
) {
  return {
    env: createCloudflareBindings(options),
    ctx: {
      waitUntil: () => undefined,
      passThroughOnException: () => undefined,
      props: {},
    },
    caches: globalThis.caches,
  };
}

function resolveD1Seed(
  seed?: "monaco-pad" | D1SeedData,
): D1SeedData | undefined {
  if (seed === "monaco-pad") return monacoPadSeed();
  return seed;
}

function monacoPadSeed(): D1SeedData {
  return {
    problems: [
      {
        id: "two-sum",
        title: "Two Sum",
        description:
          "Given an array of integers, return indices of two numbers that add up to the target.",
        difficulty: "easy",
        language: "python",
        starter_files: JSON.stringify([
          {
            path: "main.py",
            content: "def two_sum(nums, target):\n    pass\n",
          },
        ]),
        test_cases: JSON.stringify([
          { input: "nums=[2,7,11,15], target=9", expected: "[0,1]" },
        ]),
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "reverse-string",
        title: "Reverse String",
        description: "Reverse a string in place.",
        difficulty: "easy",
        language: "javascript",
        starter_files: JSON.stringify([
          {
            path: "main.js",
            content:
              "export function reverseString(value) {\n  return value;\n}\n",
          },
        ]),
        test_cases: JSON.stringify([{ input: "hello", expected: "olleh" }]),
        created_at: "2026-01-02T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      },
    ],
    sessions: [],
  };
}

function normalizeSql(sql: string): string {
  return sql.toLowerCase().replace(/\s+/g, " ").trim();
}

async function toBytes(
  value: string | ArrayBuffer | ArrayBufferView | Blob,
): Promise<Uint8Array> {
  if (typeof value === "string") return encoder.encode(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value))
    return new Uint8Array(
      value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
    );
  return new Uint8Array(await value.arrayBuffer());
}

function stringifyKvValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function stringifyKvPutValue(
  value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
): Promise<string> {
  if (typeof value === "string") return value;
  if (value instanceof ReadableStream) return new Response(value).text();
  return new TextDecoder().decode(await toBytes(value));
}

function isExpired(expiration?: number): boolean {
  return typeof expiration === "number" && expiration <= Math.floor(Date.now() / 1000);
}

async function parseRequestBody(body: BodyInit | null | undefined): Promise<unknown> {
  if (!body) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (body instanceof URLSearchParams) return Object.fromEntries(body);
  if (body instanceof FormData) return Object.fromEntries(body);
  if (body instanceof ReadableStream) return new Response(body).text();
  if (body instanceof Blob) return body.text();
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return new TextDecoder().decode(await toBytes(body));
  }
  return String(body);
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const cloudflarePlugin: ServicePlugin = {
  name: "cloudflare",
  register(app: AppLike) {
    workersAiRoutes(app);

    app.post("/email/send", async (c: any) => {
      const input = (await c.req.json().catch(() => ({}))) as SendEmailInput;
      const binding = new MemorySendEmail();
      const result = await binding.send(input);
      return c.json({ success: true, result });
    });

    app.get?.("/inspect/email/sent", (c: any) => c.json(sentEmails));
    app.get?.(
      "/inspect/email/last",
      (c: any) => c.json(sentEmails.at(-1) ?? null),
    );
    app.post("/inspect/email/reset", (c: any) => {
      sentEmails.length = 0;
      return c.json({ success: true });
    });

    app.get?.("/inspect/contract", (c: any) => c.json(contract));
    app.get?.("/inspect/queues", (c: any) =>
      c.json(Object.fromEntries(Array.from(queueMessages.entries()))),
    );
    app.get?.("/inspect/queues/:name", (c: any) =>
      c.json(queueMessages.get(c.req.param("name")) ?? []),
    );
    app.post("/inspect/queues/reset", (c: any) => {
      queueMessages.clear();
      return c.json({ success: true });
    });

    app.get?.("/inspect/workflows", (c: any) =>
      c.json(Object.fromEntries(Array.from(workflowInstances.entries()))),
    );
    app.post("/inspect/workflows/reset", (c: any) => {
      workflowInstances.clear();
      return c.json({ success: true });
    });

    app.get?.("/inspect/analytics", (c: any) =>
      c.json(Object.fromEntries(Array.from(analyticsEvents.entries()))),
    );
    app.post("/inspect/analytics/reset", (c: any) => {
      analyticsEvents.clear();
      return c.json({ success: true });
    });
  },
};

export const plugin = cloudflarePlugin;
export const label = "Cloudflare API emulator";
export const endpoints =
  "Workers AI /client/v4/accounts/:accountId/ai/models/search and /ai/run/*, Send Email /email/send, D1, KV, R2, Queues, Workflows, Loader, Analytics Engine, Sandbox, Durable Objects";
export const capabilities = [...contract.scope];
export default cloudflarePlugin;
