type WorkersAiInput = {
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
  text?: string[];
};

type VectorizeVector = {
  id: string;
  values?: number[];
  vector?: number[];
  metadata?: Record<string, unknown>;
  namespace?: string;
};

type VectorizeQueryInput = {
  vector?: number[];
  topK?: number;
  returnValues?: boolean;
  returnMetadata?: boolean | "none" | "indexed" | "all";
  filter?: Record<string, unknown>;
  namespace?: string;
};

type VectorizeMatch = {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, unknown>;
  namespace?: string;
};

type AppLike = {
  post(
    path: string,
    handler: (context: any) => Promise<Response> | Response,
  ): void;
  put?(
    path: string,
    handler: (context: any) => Promise<Response> | Response,
  ): void;
  patch?(
    path: string,
    handler: (context: any) => Promise<Response> | Response,
  ): void;
  delete?(
    path: string,
    handler: (context: any) => Promise<Response> | Response,
  ): void;
  get?(
    path: string,
    handler: (context: any) => Promise<Response> | Response,
  ): void;
  all?(
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
    "vectorize",
  ],
  fidelity: "binding-resource-model-subset",
} as const;

type D1Row = Record<string, unknown>;
type QueueMessageRecord = {
  id: string;
  body: unknown;
  options?: Record<string, unknown>;
  sentAt: string;
  leaseId?: string;
  attempts: number;
};
type WorkflowInstanceRecord = {
  id: string;
  params?: unknown;
  createdAt: string;
  modifiedAt: string;
  status: "running" | "complete" | "paused" | "terminated" | "errored";
  events: Array<{ type: string; payload: unknown; sentAt: string }>;
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
  vectorizeIndexes?: string[];
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
  schema?: string[];
  tables?: Record<string, D1Row[]>;
};
type D1ColumnInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
};
type D1ForeignKeyInfo = {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
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
const d1Databases = new Map<string, MemoryD1Database>();
const kvNamespaces = new Map<string, MemoryKVNamespace>();
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
      if (Array.isArray(input.text)) {
        return { data: input.text.map(deterministicEmbedding) };
      }

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

function deterministicEmbedding(text: string): number[] {
  const value = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, index) => ((value + index * 17) % 100) / 100);
}

const vectorizeIndexes = new Map<string, MemoryVectorizeIndex>();

function vectorizeIndex(name: string): MemoryVectorizeIndex {
  if (!vectorizeIndexes.has(name)) vectorizeIndexes.set(name, new MemoryVectorizeIndex(name));
  return vectorizeIndexes.get(name)!;
}

function matchesFilter(metadata: Record<string, unknown> | undefined, filter?: Record<string, unknown>): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.entries(filter).every(([key, expected]) => metadata?.[key] === expected);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let aMagnitude = 0;
  let bMagnitude = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    aMagnitude += a[i] * a[i];
    bMagnitude += b[i] * b[i];
  }
  if (aMagnitude === 0 || bMagnitude === 0) return 0;
  return dot / (Math.sqrt(aMagnitude) * Math.sqrt(bMagnitude));
}

function normalizeVector(vector: VectorizeVector): Required<Pick<VectorizeVector, "id" | "values">> & Omit<VectorizeVector, "id" | "values" | "vector"> {
  return {
    id: String(vector.id),
    values: vector.values ?? vector.vector ?? [],
    metadata: vector.metadata,
    namespace: vector.namespace,
  };
}

class MemoryVectorizeIndex {
  private readonly vectors = new Map<string, ReturnType<typeof normalizeVector>>();

  constructor(readonly name: string) {}

  async upsert(vectors: VectorizeVector[]) {
    for (const vector of vectors) {
      const normalized = normalizeVector(vector);
      this.vectors.set(normalized.id, normalized);
    }
    return {
      mutationId: `emu-vectorize-${this.name}-${Date.now()}`,
      count: vectors.length,
    };
  }

  async query(vector: number[], options: Omit<VectorizeQueryInput, "vector"> = {}) {
    const topK = Math.max(0, Math.min(Number(options.topK ?? 5), 100));
    const returnMetadata = options.returnMetadata === true || options.returnMetadata === "all" || options.returnMetadata === "indexed";
    const matches = Array.from(this.vectors.values())
      .filter((item) => !options.namespace || item.namespace === options.namespace)
      .filter((item) => matchesFilter(item.metadata, options.filter))
      .map((item): VectorizeMatch => ({
        id: item.id,
        score: cosineSimilarity(vector, item.values),
        ...(options.returnValues ? { values: item.values } : {}),
        ...(returnMetadata ? { metadata: item.metadata ?? {} } : {}),
        ...(item.namespace ? { namespace: item.namespace } : {}),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return { count: matches.length, matches };
  }

  async getByIds(ids: string[]) {
    return ids.map((id) => this.vectors.get(id)).filter(Boolean);
  }

  async deleteByIds(ids: string[]) {
    let count = 0;
    for (const id of ids) if (this.vectors.delete(id)) count += 1;
    return { mutationId: `emu-vectorize-${this.name}-${Date.now()}`, count };
  }

  list() {
    return Array.from(this.vectors.values());
  }
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
    if (Array.isArray(input.text)) {
      return c.json({
        success: true,
        errors: [],
        messages: [],
        result: { data: input.text.map(deterministicEmbedding) },
      });
    }

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

function vectorizeRoutes(app: AppLike): void {
  app.post("/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/query", async (c: any) => {
    const input = (await c.req.json().catch(() => ({}))) as VectorizeQueryInput;
    const result = await vectorizeIndex(c.req.param("indexName")).query(input.vector ?? [], input);
    return c.json({ success: true, errors: [], messages: [], result });
  });

  app.post("/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/upsert", async (c: any) => {
    const body = (await c.req.json().catch(() => ({}))) as { vectors?: VectorizeVector[] } | VectorizeVector[];
    const vectors = Array.isArray(body) ? body : body.vectors ?? [];
    const result = await vectorizeIndex(c.req.param("indexName")).upsert(vectors);
    return c.json({ success: true, errors: [], messages: [], result });
  });

  app.post("/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/get_by_ids", async (c: any) => {
    const body = (await c.req.json().catch(() => ({}))) as { ids?: string[] };
    const vectors = await vectorizeIndex(c.req.param("indexName")).getByIds(body.ids ?? []);
    return c.json({ success: true, errors: [], messages: [], result: { vectors } });
  });

  app.post("/client/v4/accounts/:accountId/vectorize/v2/indexes/:indexName/delete_by_ids", async (c: any) => {
    const body = (await c.req.json().catch(() => ({}))) as { ids?: string[] };
    const result = await vectorizeIndex(c.req.param("indexName")).deleteByIds(body.ids ?? []);
    return c.json({ success: true, errors: [], messages: [], result });
  });

  app.get?.("/inspect/vectorize", (c: any) =>
    c.json(Object.fromEntries(Array.from(vectorizeIndexes.entries()).map(([name, index]) => [name, index.list()]))),
  );
}

function d1Routes(app: AppLike): void {
  const database = (id: string) => {
    if (!d1Databases.has(id)) d1Databases.set(id, new MemoryD1Database());
    return d1Databases.get(id)!;
  };
  const serializeDatabase = (id: string) => ({
    uuid: id,
    name: id,
    created_at: "2026-01-01T00:00:00.000Z",
    version: "production",
  });

  app.get?.("/client/v4/accounts/:accountId/d1/database", (c: any) =>
    c.json(cloudflareEnvelope(Array.from(d1Databases.keys()).map(serializeDatabase))),
  );
  app.post("/client/v4/accounts/:accountId/d1/database", async (c: any) => {
    const body = await contextJson(c);
    const id = String(body?.name ?? body?.uuid ?? crypto.randomUUID());
    database(id);
    return c.json(cloudflareEnvelope(serializeDatabase(id)));
  });
  app.get?.("/client/v4/accounts/:accountId/d1/database/:databaseId", (c: any) =>
    c.json(cloudflareEnvelope(serializeDatabase(c.req.param("databaseId")))),
  );
  app.delete?.("/client/v4/accounts/:accountId/d1/database/:databaseId", (c: any) => {
    const id = c.req.param("databaseId");
    d1Databases.delete(id);
    return c.json(cloudflareEnvelope({ uuid: id, deleted: true }));
  });
  app.post("/client/v4/accounts/:accountId/d1/database/:databaseId/query", async (c: any) => {
    const body = await contextJson(c);
    const statements = Array.isArray(body) ? body : [body];
    const result = statements.map((statement) =>
      database(c.req.param("databaseId")).execute(String(statement.sql ?? ""), statement.params ?? []),
    );
    return c.json(cloudflareEnvelope(result));
  });
  app.post("/client/v4/accounts/:accountId/d1/database/:databaseId/raw", async (c: any) => {
    const body = await contextJson(c);
    const statements = Array.isArray(body) ? body : [body];
    const result = statements.map((statement) => {
      const prepared = database(c.req.param("databaseId")).prepare(String(statement.sql ?? "")).bind(...(statement.params ?? []));
      return prepared.raw();
    });
    return c.json(cloudflareEnvelope(await Promise.all(result)));
  });
  app.post("/client/v4/accounts/:accountId/d1/database/:databaseId/export", (c: any) =>
    c.json(cloudflareEnvelope({
      filename: `${c.req.param("databaseId")}.sql`,
      sql: database(c.req.param("databaseId")).exportSql(),
    })),
  );
  app.post("/client/v4/accounts/:accountId/d1/database/:databaseId/import", async (c: any) => {
    const body = await contextJson(c);
    await database(c.req.param("databaseId")).exec(String(body?.sql ?? ""));
    return c.json(cloudflareEnvelope({ success: true }));
  });
}

function kvRoutes(app: AppLike): void {
  const namespace = (id: string) => {
    if (!kvNamespaces.has(id)) kvNamespaces.set(id, new MemoryKVNamespace());
    return kvNamespaces.get(id)!;
  };
  const serializeNamespace = (id: string) => ({ id, title: id, supports_url_encoding: true });

  app.get?.("/client/v4/accounts/:accountId/storage/kv/namespaces", (c: any) =>
    c.json(cloudflareEnvelope(Array.from(kvNamespaces.keys()).map(serializeNamespace))),
  );
  app.post("/client/v4/accounts/:accountId/storage/kv/namespaces", async (c: any) => {
    const body = await contextJson(c);
    const id = String(body?.title ?? body?.id ?? crypto.randomUUID());
    namespace(id);
    return c.json(cloudflareEnvelope(serializeNamespace(id)));
  });
  app.get?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId", (c: any) =>
    c.json(cloudflareEnvelope(serializeNamespace(c.req.param("namespaceId")))),
  );
  app.put?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId", async (c: any) => {
    const body = await contextJson(c);
    return c.json(cloudflareEnvelope({ ...serializeNamespace(c.req.param("namespaceId")), title: body?.title ?? c.req.param("namespaceId") }));
  });
  app.delete?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId", (c: any) => {
    const id = c.req.param("namespaceId");
    kvNamespaces.delete(id);
    return c.json(cloudflareEnvelope({ id, deleted: true }));
  });
  app.get?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/keys", async (c: any) => {
    const url = new URL(c.req.url);
    const result = await namespace(c.req.param("namespaceId")).list({
      prefix: url.searchParams.get("prefix") ?? undefined,
      limit: Number(url.searchParams.get("limit") ?? 1000),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    return c.json(cloudflareEnvelope(result));
  });
  app.get?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/metadata/:keyName", (c: any) =>
    c.json(cloudflareEnvelope(namespace(c.req.param("namespaceId")).metadata(c.req.param("keyName")))),
  );
  app.get?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/values/:keyName", (c: any) => {
    const value = namespace(c.req.param("namespaceId")).rawValue(c.req.param("keyName"));
    return new Response(value ?? "", { status: value === null ? 404 : 200 });
  });
  app.put?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/values/:keyName", async (c: any) => {
    const url = new URL(c.req.url);
    await namespace(c.req.param("namespaceId")).put(c.req.param("keyName"), await contextText(c), {
      expiration: numericParam(url, "expiration"),
      expirationTtl: numericParam(url, "expiration_ttl"),
    });
    return c.json(cloudflareEnvelope({ key: c.req.param("keyName"), written: true }));
  });
  app.delete?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/values/:keyName", async (c: any) => {
    await namespace(c.req.param("namespaceId")).delete(c.req.param("keyName"));
    return c.json(cloudflareEnvelope({ key: c.req.param("keyName"), deleted: true }));
  });
  app.put?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/bulk", async (c: any) => {
    await namespace(c.req.param("namespaceId")).bulkPut(await contextJson(c) as Array<{ key: string; value: unknown }>);
    return c.json(cloudflareEnvelope({ written: true }));
  });
  app.post("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/bulk/get", async (c: any) => {
    const body = await contextJson(c);
    const keys = Array.isArray(body) ? body : body?.keys ?? [];
    const result = Object.fromEntries(await Promise.all(keys.map(async (key: string) => [key, await namespace(c.req.param("namespaceId")).get(key)])));
    return c.json(cloudflareEnvelope(result));
  });
  app.delete?.("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/bulk", async (c: any) => {
    const body = await contextJson(c);
    await namespace(c.req.param("namespaceId")).bulkDelete(Array.isArray(body) ? body : body?.keys ?? []);
    return c.json(cloudflareEnvelope({ deleted: true }));
  });
  app.post("/client/v4/accounts/:accountId/storage/kv/namespaces/:namespaceId/bulk/delete", async (c: any) => {
    const body = await contextJson(c);
    await namespace(c.req.param("namespaceId")).bulkDelete(Array.isArray(body) ? body : body?.keys ?? []);
    return c.json(cloudflareEnvelope({ deleted: true }));
  });
}

function queueRoutes(app: AppLike): void {
  const queue = (id: string) => new MemoryQueue(id);
  const serializeQueue = (id: string) => ({ queue_id: id, queue_name: id, created_on: "2026-01-01T00:00:00.000Z" });

  app.get?.("/client/v4/accounts/:accountId/queues", (c: any) =>
    c.json(cloudflareEnvelope(Array.from(queueMessages.keys()).map(serializeQueue))),
  );
  app.post("/client/v4/accounts/:accountId/queues", async (c: any) => {
    const body = await contextJson(c);
    const id = String(body?.queue_name ?? body?.queue_id ?? crypto.randomUUID());
    queue(id);
    return c.json(cloudflareEnvelope(serializeQueue(id)));
  });
  app.get?.("/client/v4/accounts/:accountId/queues/:queueId", (c: any) =>
    c.json(cloudflareEnvelope(serializeQueue(c.req.param("queueId")))),
  );
  app.delete?.("/client/v4/accounts/:accountId/queues/:queueId", (c: any) => {
    const id = c.req.param("queueId");
    queueMessages.delete(id);
    return c.json(cloudflareEnvelope({ queue_id: id, deleted: true }));
  });
  app.post("/client/v4/accounts/:accountId/queues/:queueId/messages", async (c: any) => {
    const body = await contextJson(c);
    return c.json(cloudflareEnvelope(await queue(c.req.param("queueId")).send(body?.body ?? body, body?.options)));
  });
  app.post("/client/v4/accounts/:accountId/queues/:queueId/messages/batch", async (c: any) => {
    const body = await contextJson(c);
    return c.json(cloudflareEnvelope(await queue(c.req.param("queueId")).sendBatch(body?.messages ?? body ?? [])));
  });
  app.post("/client/v4/accounts/:accountId/queues/:queueId/messages/pull", async (c: any) => {
    const body = await contextJson(c);
    return c.json(cloudflareEnvelope({ messages: queue(c.req.param("queueId")).pull(Number(body?.batch_size ?? body?.max_messages ?? 1)) }));
  });
  app.post("/client/v4/accounts/:accountId/queues/:queueId/messages/preview", async (c: any) => {
    const body = await contextJson(c);
    return c.json(cloudflareEnvelope({ messages: queue(c.req.param("queueId")).messages().slice(0, Number(body?.batch_size ?? 1)) }));
  });
  app.post("/client/v4/accounts/:accountId/queues/:queueId/messages/ack", async (c: any) => {
    const body = await contextJson(c);
    const ids = body?.acks?.map((item: any) => item.lease_id ?? item.id) ?? body?.ids ?? [];
    return c.json(cloudflareEnvelope({ acked: queue(c.req.param("queueId")).ack(ids) }));
  });
  app.post("/client/v4/accounts/:accountId/queues/:queueId/messages/preview/ack", async (c: any) => {
    const body = await contextJson(c);
    return c.json(cloudflareEnvelope({ acked: queue(c.req.param("queueId")).ack(body?.ids ?? []) }));
  });
  app.get?.("/client/v4/accounts/:accountId/queues/:queueId/metrics", (c: any) =>
    c.json(cloudflareEnvelope(queue(c.req.param("queueId")).metrics())),
  );
  app.post("/client/v4/accounts/:accountId/queues/:queueId/purge", (c: any) =>
    c.json(cloudflareEnvelope({ purged: queue(c.req.param("queueId")).purge() })),
  );
  app.get?.("/client/v4/accounts/:accountId/queues/:queueId/purge", (c: any) =>
    c.json(cloudflareEnvelope({ completed: true, queue_id: c.req.param("queueId") })),
  );
}

function workflowRoutes(app: AppLike): void {
  const workflow = (name: string) => new MemoryWorkflowBinding(name);
  const serializeWorkflow = (name: string) => ({ id: name, name, created_on: "2026-01-01T00:00:00.000Z" });

  app.get?.("/client/v4/accounts/:accountId/workflows", (c: any) =>
    c.json(cloudflareEnvelope(Array.from(workflowInstances.keys()).map(serializeWorkflow))),
  );
  app.get?.("/client/v4/accounts/:accountId/workflows/:workflowName", (c: any) =>
    c.json(cloudflareEnvelope(serializeWorkflow(c.req.param("workflowName")))),
  );
  app.put?.("/client/v4/accounts/:accountId/workflows/:workflowName", (c: any) => {
    workflow(c.req.param("workflowName"));
    return c.json(cloudflareEnvelope(serializeWorkflow(c.req.param("workflowName"))));
  });
  app.delete?.("/client/v4/accounts/:accountId/workflows/:workflowName", (c: any) => {
    const name = c.req.param("workflowName");
    workflowInstances.delete(name);
    return c.json(cloudflareEnvelope({ id: name, deleted: true }));
  });
  app.get?.("/client/v4/accounts/:accountId/workflows/:workflowName/instances", (c: any) =>
    c.json(cloudflareEnvelope(workflow(c.req.param("workflowName")).list())),
  );
  app.post("/client/v4/accounts/:accountId/workflows/:workflowName/instances", async (c: any) => {
    const body = await contextJson(c);
    const instance = await workflow(c.req.param("workflowName")).create({ id: body?.id, params: body?.params });
    return c.json(cloudflareEnvelope(await instance.status()));
  });
  app.post("/client/v4/accounts/:accountId/workflows/:workflowName/instances/batch", async (c: any) => {
    const body = await contextJson(c);
    const items = body?.instances ?? body ?? [];
    const instances = [];
    for (const item of items) {
      const instance = await workflow(c.req.param("workflowName")).create({ id: item.id, params: item.params });
      instances.push(await instance.status());
    }
    return c.json(cloudflareEnvelope(instances));
  });
  app.get?.("/client/v4/accounts/:accountId/workflows/:workflowName/instances/:instanceId", async (c: any) => {
    const instance = await workflow(c.req.param("workflowName")).get(c.req.param("instanceId"));
    return c.json(cloudflareEnvelope(instance ? await instance.status() : null));
  });
  app.patch?.("/client/v4/accounts/:accountId/workflows/:workflowName/instances/:instanceId/status", async (c: any) => {
    const body = await contextJson(c);
    const instance = await workflow(c.req.param("workflowName")).get(c.req.param("instanceId"));
    if (!instance) return c.json(cloudflareEnvelope(null));
    if (body?.status === "terminated") return c.json(cloudflareEnvelope(await instance.terminate()));
    if (body?.status === "paused") return c.json(cloudflareEnvelope(await instance.pause()));
    return c.json(cloudflareEnvelope(await instance.resume()));
  });
  app.post("/client/v4/accounts/:accountId/workflows/:workflowName/instances/:instanceId/events/:eventType", async (c: any) => {
    const record = workflowInstances.get(c.req.param("workflowName"))?.find((item) => item.id === c.req.param("instanceId"));
    if (record) {
      record.events.push({ type: c.req.param("eventType"), payload: await contextJson(c), sentAt: new Date().toISOString() });
      record.modifiedAt = new Date().toISOString();
    }
    return c.json(cloudflareEnvelope(record ?? null));
  });
  app.post("/client/v4/accounts/:accountId/workflows/:workflowName/instances/batch/terminate", async (c: any) => {
    const body = await contextJson(c);
    const ids = body?.ids ?? [];
    let terminated = 0;
    for (const id of ids) {
      const instance = await workflow(c.req.param("workflowName")).get(id);
      if (instance) {
        await instance.terminate();
        terminated++;
      }
    }
    return c.json(cloudflareEnvelope({ terminated }));
  });
  app.get?.("/client/v4/accounts/:accountId/workflows/:workflowName/versions", (c: any) =>
    c.json(cloudflareEnvelope([{ id: "latest", workflow_name: c.req.param("workflowName"), created_on: "2026-01-01T00:00:00.000Z" }])),
  );
  app.get?.("/client/v4/accounts/:accountId/workflows/:workflowName/versions/:versionId", (c: any) =>
    c.json(cloudflareEnvelope({ id: c.req.param("versionId"), workflow_name: c.req.param("workflowName") })),
  );
  app.get?.("/client/v4/accounts/:accountId/workflows/:workflowName/versions/:versionId/dag", (c: any) =>
    c.json(cloudflareEnvelope({ nodes: [], edges: [] })),
  );
  app.get?.("/client/v4/accounts/:accountId/workflows/:workflowName/versions/:versionId/graph", (c: any) =>
    c.json(cloudflareEnvelope({ nodes: [], edges: [] })),
  );
}

function cloudflareEnvelope(result: unknown) {
  return {
    success: true,
    errors: [],
    messages: [],
    result,
  };
}

function routeParamValue(c: any, name: string): string | undefined {
  return c.req.param?.(name);
}

function genericResourceId(c: any): string {
  const path = new URL(c.req.url).pathname;
  const parts = path.split("/").filter(Boolean);
  return parts.at(-1) ?? "emulator-resource";
}

function genericCollectionKey(c: any): string {
  const id = genericResourceId(c).replace(/[-_](\w)/g, (_, char) => String(char).toUpperCase());
  if (id.endsWith("ies")) return id;
  if (id.endsWith("s")) return id;
  return `${id}s`;
}

function genericCloudflareResult(c: any): unknown {
  const method = c.req.method;
  const id = genericResourceId(c);
  const accountId = routeParamValue(c, "accountId");
  const zoneId = routeParamValue(c, "zoneId");

  if (method === "GET") {
    if (id === "info") {
      return {
        id: routeParamValue(c, "indexName") ?? "emulator-index",
        dimensions: 8,
        vector_count: vectorizeIndex(routeParamValue(c, "indexName") ?? "emulator-index").list().length,
      };
    }

    const item = {
      id: `${id}-emulator`,
      name: id,
      account_id: accountId,
      zone_id: zoneId,
      created_on: "2026-01-01T00:00:00.000Z",
      modified_on: "2026-01-01T00:00:00.000Z",
    };

    return {
      [genericCollectionKey(c)]: [item],
      result_info: {
        page: 1,
        per_page: 1,
        count: 1,
        total_count: 1,
      },
    };
  }

  if (method === "DELETE") return { id, deleted: true };

  return {
    id: `${id}-emulator`,
    account_id: accountId,
    zone_id: zoneId,
    status: method === "POST" ? "created" : "updated",
    created_on: "2026-01-01T00:00:00.000Z",
    modified_on: "2026-01-01T00:00:00.000Z",
  };
}

function registerCloudflareOpenApiAdapter(app: AppLike): void {
  const handler = (c: any) => c.json(cloudflareEnvelope(genericCloudflareResult(c)));

  if (app.all) {
    app.all("/client/v4/*", handler);
    return;
  }

  app.get?.("/client/v4/*", handler);
  app.post("/client/v4/*", handler);
  app.put?.("/client/v4/*", handler);
  app.patch?.("/client/v4/*", handler);
  app.delete?.("/client/v4/*", handler);
}

class MemoryD1Database {
  private readonly tables = new Map<string, D1Row[]>();
  private readonly schema = new Map<string, { sql: string; columns: D1ColumnInfo[]; foreignKeys: D1ForeignKeyInfo[] }>();
  private lastInserted: { table: string; row: D1Row } | null = null;

  constructor(seed?: D1SeedData) {
    if (seed?.schema || seed?.tables) {
      for (const statement of seed.schema ?? []) this.addTableSchema(statement);
      for (const [name, rows] of Object.entries(seed.tables ?? {})) {
        this.ensureTable(name);
        this.tables.set(name, rows.map((row) => ({ ...row })));
      }
    } else {
      this.tables.set("problems", [...(seed?.problems ?? [])]);
      this.tables.set("sessions", [...(seed?.sessions ?? [])]);
    }
  }

  prepare(sql: string) {
    return new MemoryD1PreparedStatement(this, sql);
  }

  async batch(statements: MemoryD1PreparedStatement[]) {
    return Promise.all(statements.map((statement) => statement.execute()));
  }

  select(sql: string, params: unknown[]): D1Row[] {
    const normalized = normalizeSql(sql);
    if (normalized.includes("from sqlite_master")) return this.sqliteMasterRows();
    if (normalized.startsWith("pragma table_info")) return this.tableInfoRows(sql);
    if (normalized.startsWith("pragma foreign_key_list")) return this.foreignKeyRows(sql);
    if (normalized.includes("last_insert_rowid()")) return this.selectLastInserted(sql);
    if (normalized.includes("from problems"))
      return this.selectProblems(normalized, params);
    if (normalized.includes("from sessions"))
      return this.selectSessions(normalized, params);
    if (normalized.startsWith("select")) return this.selectGeneric(sql, params);
    throw new Error(`Unsupported D1 query: ${sql}`);
  }

  mutate(sql: string, params: unknown[]) {
    const normalized = normalizeSql(sql);
    if (normalized.startsWith("create table")) {
      this.addTableSchema(sql);
      return d1Result([], 0);
    }
    if (normalized.startsWith("insert into")) return this.insertGeneric(sql, params);
    if (normalized.startsWith("update")) return this.updateGeneric(sql, params);
    if (normalized.startsWith("delete from")) return this.deleteGeneric(sql, params);
    if (["begin", "commit", "rollback"].includes(normalized)) return d1Result([], 0);
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
      return d1Result([], 1);
    }
    throw new Error(`Unsupported D1 mutation: ${sql}`);
  }

  async exec(sql: string) {
    const statements = sql.split(";").map((statement) => statement.trim()).filter(Boolean);
    let count = 0;
    let duration = 0;
    for (const statement of statements) {
      const started = performance.now();
      if (normalizeSql(statement).startsWith("select")) this.select(statement, []);
      else this.mutate(statement, []);
      duration += performance.now() - started;
      count++;
    }
    return { count, duration };
  }

  async dump(): Promise<ArrayBuffer> {
    const statements = [
      ...this.sqliteMasterRows().map((row) => row.sql).filter(Boolean),
      ...Array.from(this.tables.entries()).flatMap(([table, rows]) =>
        rows.map((row) => {
          const columns = Object.keys(row);
          const values = columns.map((column) => sqlLiteral(row[column])).join(", ");
          return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values});`;
        }),
      ),
    ];
    return encoder.encode(statements.join("\n")).buffer;
  }

  withSession() {
    return {
      prepare: (sql: string) => this.prepare(sql),
      batch: (statements: MemoryD1PreparedStatement[]) => this.batch(statements),
      getBookmark: () => `bookmark-${Date.now()}`,
    };
  }

  execute(sql: string, params: unknown[] = []) {
    const normalized = normalizeSql(sql);
    if (normalized.startsWith("select") || normalized.startsWith("pragma")) {
      return d1Result(this.select(sql, params), 0);
    }
    return this.mutate(sql, params);
  }

  exportSql(): string {
    const schema = this.sqliteMasterRows().map((row) => row.sql).filter(Boolean);
    return schema.join(";\n");
  }

  private addTableSchema(statement: string) {
    const match = statement.match(/create\s+table\s+["`]?(\w+)["`]?\s*\(([\s\S]+)\)/i);
    if (!match) return;

    const [, table, body] = match;
    const columns: D1ColumnInfo[] = [];
    const foreignKeys: D1ForeignKeyInfo[] = [];
    for (const part of body.split(",").map((value) => value.trim()).filter(Boolean)) {
      const columnMatch = part.match(/^["`]?(\w+)["`]?\s+([a-z0-9_()]+)/i);
      if (!columnMatch) continue;

      const [, name, type] = columnMatch;
      columns.push({
        cid: columns.length,
        name,
        type: type.toUpperCase(),
        notnull: /\bnot\s+null\b/i.test(part) ? 1 : 0,
        dflt_value: null,
        pk: /\bprimary\s+key\b/i.test(part) ? 1 : 0,
      });

      const reference = part.match(/\breferences\s+["`]?(\w+)["`]?\s*\(\s*["`]?(\w+)["`]?\s*\)/i);
      if (reference) {
        foreignKeys.push({
          id: foreignKeys.length,
          seq: 0,
          table: reference[1],
          from: name,
          to: reference[2],
        });
      }
    }

    this.schema.set(table, { sql: statement, columns, foreignKeys });
    this.ensureTable(table);
  }

  private ensureTable(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, []);
    if (!this.schema.has(name)) {
      const first = this.tables.get(name)?.[0] ?? {};
      this.schema.set(name, {
        sql: null as unknown as string,
        columns: Object.keys(first).map((column, index) => ({
          cid: index,
          name: column,
          type: "TEXT",
          notnull: 0,
          dflt_value: null,
          pk: column === "id" ? 1 : 0,
        })),
        foreignKeys: [],
      });
    }
  }

  private sqliteMasterRows(): D1Row[] {
    return [...this.schema.entries()].map(([name, info]) => ({ name, type: "table", sql: info.sql }));
  }

  private tableInfoRows(sql: string): D1Row[] {
    const table = sql.match(/pragma\s+table_info\(["`]?(\w+)["`]?\)/i)?.[1] ?? "";
    return this.schema.get(table)?.columns ?? [];
  }

  private foreignKeyRows(sql: string): D1Row[] {
    const table = sql.match(/pragma\s+foreign_key_list\(["`]?(\w+)["`]?\)/i)?.[1] ?? "";
    return this.schema.get(table)?.foreignKeys ?? [];
  }

  private selectLastInserted(sql: string): D1Row[] {
    const table = this.extractTable(sql);
    if (!this.lastInserted || this.lastInserted.table !== table) return [];
    return [{ ...this.lastInserted.row }];
  }

  private selectGeneric(sql: string, params: unknown[]): D1Row[] {
    const table = this.extractTable(sql);
    let rows = [...this.table(table)];
    const normalized = normalizeSql(sql);

    if (normalized.includes("count(*)")) return [{ count: rows.length }];

    const where = this.extractWhereColumn(sql);
    if (where) rows = rows.filter((row) => row[where] === params[0]);

    const limit = this.extractTrailingNumber(sql, "limit");
    const offset = this.extractTrailingNumber(sql, "offset") ?? 0;
    if (limit !== null) rows = rows.slice(offset, offset + limit);

    const projection = this.extractProjection(sql);
    return rows.map((row) => projectRow(row, projection));
  }

  private insertGeneric(sql: string, params: unknown[]) {
    const table = this.extractMutationTable(sql, "insert into");
    this.ensureTable(table);
    const columns = [...sql.matchAll(/\(\s*([^)]+)\s*\)/g)][0]?.[1]
      .split(",")
      .map(cleanIdentifier) ?? [];
    const row = Object.fromEntries(columns.map((column, index) => [column, params[index]]));
    this.table(table).push(row);
    this.lastInserted = { table, row };
    return d1Result([], 1);
  }

  private updateGeneric(sql: string, params: unknown[]) {
    const table = this.extractMutationTable(sql, "update");
    const setColumns = sql.match(/\bset\s+(.+?)\s+where\b/i)?.[1]
      .split(",")
      .map((part) => cleanIdentifier(part.split("=")[0])) ?? [];
    const where = this.extractWhereColumn(sql);
    if (!where) throw new Error(`Unsupported D1 mutation: ${sql}`);
    let changes = 0;
    for (const row of this.table(table)) {
      if (row[where] !== params[setColumns.length]) continue;
      setColumns.forEach((column, index) => row[column] = params[index]);
      changes++;
    }
    return d1Result([], changes);
  }

  private deleteGeneric(sql: string, params: unknown[]) {
    const table = this.extractMutationTable(sql, "delete from");
    const where = this.extractWhereColumn(sql);
    if (!where) throw new Error(`Unsupported D1 mutation: ${sql}`);
    const rows = this.table(table);
    const before = rows.length;
    this.tables.set(table, rows.filter((row) => row[where] !== params[0]));
    return d1Result([], before - this.table(table).length);
  }

  private extractTable(sql: string): string {
    const table = sql.match(/\bfrom\s+["`]?(\w+)["`]?/i)?.[1];
    if (!table) throw new Error(`Unsupported D1 query: ${sql}`);
    return table;
  }

  private extractMutationTable(sql: string, keyword: string): string {
    const pattern = new RegExp(`${keyword}\\s+["\\\`]?(\\w+)["\\\`]?`, "i");
    const table = sql.match(pattern)?.[1];
    if (!table) throw new Error(`Unsupported D1 mutation: ${sql}`);
    return table;
  }

  private extractWhereColumn(sql: string): string | null {
    return sql.match(/\bwhere\s+["`]?(\w+)["`]?\s*=/i)?.[1] ?? null;
  }

  private extractTrailingNumber(sql: string, keyword: "limit" | "offset"): number | null {
    const value = sql.match(new RegExp(`\\b${keyword}\\s+(\\d+)`, "i"))?.[1];
    return value ? Number(value) : null;
  }

  private extractProjection(sql: string): string[] | null {
    const projection = sql.match(/select\s+(.+?)\s+from/i)?.[1]?.trim();
    if (!projection || projection === "*" || /count\(\*\)/i.test(projection)) return null;
    return projection.split(",").map(cleanIdentifier);
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
    return this.db.mutate(this.sql, this.params);
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    return this.db.select(this.sql, this.params).map((row) => Object.values(row) as T);
  }

  async execute() {
    return this.db.execute(this.sql, this.params);
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
    key: string | string[],
    type?: "text" | "json" | "arrayBuffer" | "stream" | { type?: "text" | "json" | "arrayBuffer" | "stream"; cacheTtl?: number },
  ): Promise<T | null | Map<string, T | null>> {
    if (Array.isArray(key)) {
      const values = new Map<string, T | null>();
      for (const item of key) values.set(item, await this.get<T>(item, type) as T | null);
      return values;
    }
    const valueType = typeof type === "object" ? type.type : type;
    const entry = this.values.get(key);
    if (!entry || isExpired(entry.expiration)) return null;
    if (valueType === "json") return JSON.parse(entry.value) as T;
    if (valueType === "arrayBuffer")
      return encoder.encode(entry.value).buffer as T;
    if (valueType === "stream")
      return new Response(entry.value).body as T;
    return entry.value as T;
  }

  async getWithMetadata<T = string>(
    key: string | string[],
    type?: "text" | "json" | "arrayBuffer" | "stream" | { type?: "text" | "json" | "arrayBuffer" | "stream"; cacheTtl?: number },
  ): Promise<{ value: T | null; metadata: unknown } | Map<string, { value: T | null; metadata: unknown }>> {
    if (Array.isArray(key)) {
      const values = new Map<string, { value: T | null; metadata: unknown }>();
      for (const item of key) values.set(item, await this.getWithMetadata<T>(item, type) as { value: T | null; metadata: unknown });
      return values;
    }
    const entry = this.values.get(key);
    return {
      value: await this.get<T>(key, type) as T | null,
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

  async bulkPut(items: Array<{ key: string; value: unknown; metadata?: unknown; expiration?: number; expiration_ttl?: number }>) {
    for (const item of items) {
      await this.put(item.key, stringifyKvValue(item.value), {
        metadata: item.metadata,
        expiration: item.expiration,
        expirationTtl: item.expiration_ttl,
      });
    }
  }

  async bulkDelete(keys: string[]) {
    for (const key of keys) await this.delete(key);
  }

  metadata(key: string): unknown {
    const entry = this.values.get(key);
    if (!entry || isExpired(entry.expiration)) return null;
    return entry.metadata ?? null;
  }

  rawValue(key: string): string | null {
    const entry = this.values.get(key);
    if (!entry || isExpired(entry.expiration)) return null;
    return entry.value;
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }) {
    const keys = Array.from(this.values.entries())
      .filter(([key, entry]) => !isExpired(entry.expiration) && (!options?.prefix || key.startsWith(options.prefix)))
      .slice(0, options?.limit ?? 1000)
      .map(([name, entry]) => ({ name, metadata: entry.metadata, expiration: entry.expiration }));
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

  async send(body: unknown, options?: Record<string, unknown>) {
    queueMessages.get(this.name)?.push({
      id: crypto.randomUUID(),
      body,
      options,
      sentAt: new Date().toISOString(),
      attempts: 0,
    });
    return { outcome: "ok", messageCount: 1 };
  }

  async sendBatch(
    messages: Iterable<{ body: unknown; options?: Record<string, unknown> }>,
    options?: Record<string, unknown>,
  ) {
    let messageCount = 0;
    for (const message of messages) {
      await this.send(message.body, message.options ?? options);
      messageCount++;
    }
    return { outcome: "ok", messageCount };
  }

  pull(count = 1): QueueMessageRecord[] {
    const messages = queueMessages.get(this.name) ?? [];
    return messages.slice(0, count).map((message) => {
      message.attempts++;
      message.leaseId = crypto.randomUUID();
      return { ...message };
    });
  }

  ack(ids: string[]): number {
    const messages = queueMessages.get(this.name) ?? [];
    const before = messages.length;
    queueMessages.set(
      this.name,
      messages.filter((message) => !ids.includes(message.id) && !ids.includes(message.leaseId ?? "")),
    );
    return before - (queueMessages.get(this.name)?.length ?? 0);
  }

  purge(): number {
    const count = queueMessages.get(this.name)?.length ?? 0;
    this.clear();
    return count;
  }

  metrics() {
    const messages = queueMessages.get(this.name) ?? [];
    return {
      queue: this.name,
      messagesVisible: messages.length,
      oldestMessageAgeSec: messages.length
        ? Math.max(0, Math.floor((Date.now() - Date.parse(messages[0].sentAt)) / 1000))
        : 0,
      totalAttempts: messages.reduce((sum, message) => sum + message.attempts, 0),
    };
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

  async create(options: { id?: string; params?: unknown }) {
    const instance: WorkflowInstanceRecord = {
      id: options.id ?? crypto.randomUUID(),
      params: options.params,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      status: "running",
      events: [],
    };
    workflowInstances.get(this.name)?.push(instance);
    return this.wrap(instance);
  }

  async get(id: string) {
    const instance = workflowInstances.get(this.name)?.find((item) => item.id === id);
    return instance ? this.wrap(instance) : null;
  }

  list(): WorkflowInstanceRecord[] {
    return [...(workflowInstances.get(this.name) ?? [])];
  }

  private wrap(instance: WorkflowInstanceRecord) {
    const update = (status: WorkflowInstanceRecord["status"]) => {
      instance.status = status;
      instance.modifiedAt = new Date().toISOString();
      return { ...instance };
    };
    return {
      id: instance.id,
      params: instance.params,
      createdAt: instance.createdAt,
      status: async () => ({ ...instance }),
      pause: async () => update("paused"),
      resume: async () => update("running"),
      restart: async () => update("running"),
      terminate: async () => update("terminated"),
    };
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
  const d1Seed = resolveD1Seed(options.d1?.seed);
  const env: Record<string, unknown> = {
    AI: createAiBinding(),
    APP_DB: new MemoryD1Database(d1Seed),
    AUTH_DB: new MemoryD1Database(d1Seed),
    DB: new MemoryD1Database(d1Seed),
    LOADER: new MemoryWorkerLoader(options.loader),
    SANDBOX: createSandboxEmulator(options.sandbox),
    TRANSACTIONAL_EMAIL: new MemorySendEmail(options.sendEmail),
  };
  d1Databases.set("APP_DB", env.APP_DB as MemoryD1Database);
  d1Databases.set("AUTH_DB", env.AUTH_DB as MemoryD1Database);
  d1Databases.set("DB", env.DB as MemoryD1Database);

  for (const [binding, seed] of Object.entries(options.kv ?? {})) {
    const namespace = new MemoryKVNamespace(seed);
    env[binding] = namespace;
    kvNamespaces.set(binding, namespace);
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

  for (const indexName of options.vectorizeIndexes ?? ["VECTORIZE_INDEX"]) {
    env[indexName] = vectorizeIndex(indexName);
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

function cleanIdentifier(value: string): string {
  return value.trim().replace(/^[`"]|[`"]$/g, "");
}

function projectRow(row: D1Row, projection: string[] | null): D1Row {
  if (!projection) return { ...row };
  return Object.fromEntries(projection.map((column) => [column, row[column]]));
}

function d1Result(results: D1Row[], changes: number) {
  return {
    success: true,
    results,
    meta: {
      changes,
      rows_read: results.length,
      rows_written: changes,
      duration: 0,
      last_row_id: results.at(-1)?.id ?? null,
    },
  };
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replaceAll("'", "''")}'`;
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

async function contextJson(c: any): Promise<any> {
  return c.req.json?.().catch(() => ({})) ?? {};
}

async function contextText(c: any): Promise<string> {
  if (c.req.text) return c.req.text();
  const body = c.req.raw?.body;
  const parsed = await parseRequestBody(body);
  return typeof parsed === "string" ? parsed : JSON.stringify(parsed ?? "");
}

function numericParam(url: URL, name: string): number | undefined {
  const value = url.searchParams.get(name);
  return value === null ? undefined : Number(value);
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
    vectorizeRoutes(app);
    d1Routes(app);
    kvRoutes(app);
    queueRoutes(app);
    workflowRoutes(app);

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

    registerCloudflareOpenApiAdapter(app);
  },
};

export const plugin = cloudflarePlugin;
export const label = "Cloudflare API emulator";
export const endpoints =
  "Full Cloudflare OpenAPI /client/v4 generic adapter with deep Workers AI and Vectorize overrides, Send Email /email/send, D1, KV, R2, Queues, Workflows, Loader, Analytics Engine, Sandbox, Durable Objects";
export const manifest = {
  name: "cloudflare",
  label,
  endpoints,
  contract,
  compatibility: {
    apiEmulator: ">=0.5.1",
  },
};
export const capabilities = [...contract.scope];
export default cloudflarePlugin;
