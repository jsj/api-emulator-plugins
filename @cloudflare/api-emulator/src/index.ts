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
    return Promise.all(statements.map((statement) => statement.run()));
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
    if (normalized.startsWith("insert into")) return this.insertGeneric(sql, params);
    if (normalized.startsWith("update")) return this.updateGeneric(sql, params);
    if (normalized.startsWith("delete from")) return this.deleteGeneric(sql, params);
    if (["begin", "commit", "rollback"].includes(normalized)) return { success: true, meta: { changes: 0 }, results: [] };
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

  async exec(sql: string) {
    return this.mutate(sql, []);
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
    const columns = [...sql.matchAll(/\(\s*([^)]+)\s*\)/g)][0]?.[1]
      .split(",")
      .map(cleanIdentifier) ?? [];
    const row = Object.fromEntries(columns.map((column, index) => [column, params[index]]));
    this.table(table).push(row);
    this.lastInserted = { table, row };
    return { success: true, meta: { changes: 1 }, results: [] };
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
    return { success: true, meta: { changes }, results: [] };
  }

  private deleteGeneric(sql: string, params: unknown[]) {
    const table = this.extractMutationTable(sql, "delete from");
    const where = this.extractWhereColumn(sql);
    if (!where) throw new Error(`Unsupported D1 mutation: ${sql}`);
    const rows = this.table(table);
    const before = rows.length;
    this.tables.set(table, rows.filter((row) => row[where] !== params[0]));
    return { success: true, meta: { changes: before - this.table(table).length }, results: [] };
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
    vectorizeRoutes(app);

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
  "Workers AI /client/v4/accounts/:accountId/ai/models/search and /ai/run/*, Vectorize v2 /query and /upsert, Send Email /email/send, D1, KV, R2, Queues, Workflows, Loader, Analytics Engine, Sandbox, Durable Objects";
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
