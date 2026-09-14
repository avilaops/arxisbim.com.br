import crypto from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { parse as parseFlatted } from "flatted";
import pg from "pg";
import { parseConfigValue, validateVariable } from "./config.js";
import { appendAudit, DEFAULT_ORGANIZATION_ID, ensureFoundation, hydrateActor, verifyAuditChain, type SessionActor } from "./foundation.js";

const { Pool } = pg;
const port = Number(process.env.PORT || 5679);
const n8nOrigin = process.env.N8N_INTERNAL_URL || "http://n8n:5678";
const ssoSessionUrl = process.env.SSO_SESSION_URL || "https://auth.avilaops.com/api/session";
const internalToken = process.env.AVILA_MODULES_INTERNAL_TOKEN || "";

const pool = new Pool({
  host: process.env.DB_POSTGRESDB_HOST,
  port: Number(process.env.DB_POSTGRESDB_PORT || 5432),
  database: process.env.DB_POSTGRESDB_DATABASE,
  user: process.env.DB_POSTGRESDB_USER,
  password: process.env.DB_POSTGRESDB_PASSWORD,
  max: 4,
});

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  next();
});
app.use(express.static("public", { maxAge: "5m", immutable: false }));
app.use(express.json({ limit: "32kb" }));

async function ensureSchema() {
  await pool.query(`
    CREATE SCHEMA IF NOT EXISTS avila_control;

    CREATE TABLE IF NOT EXISTS avila_control.config_entries (
      id uuid PRIMARY KEY,
      name varchar(80) NOT NULL CHECK (name ~ '^[A-Z][A-Z0-9_]*$'),
      value text NOT NULL,
      kind varchar(16) NOT NULL DEFAULT 'text' CHECK (kind IN ('text','number','boolean','json')),
      description varchar(240) NOT NULL DEFAULT '',
      scope_type varchar(16) NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global','space','environment')),
      scope_key varchar(80) NOT NULL DEFAULT 'global',
      sensitivity varchar(16) NOT NULL DEFAULT 'internal' CHECK (sensitivity IN ('low','internal','confidential')),
      owner_name varchar(120) NOT NULL DEFAULT '',
      schema_json jsonb,
      expires_at timestamptz,
      version integer NOT NULL DEFAULT 1 CHECK (version > 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      deleted_at timestamptz
    );

    CREATE UNIQUE INDEX IF NOT EXISTS config_entries_active_scope_name
      ON avila_control.config_entries (name, scope_type, scope_key)
      WHERE deleted_at IS NULL;

    CREATE TABLE IF NOT EXISTS avila_control.config_versions (
      id bigserial PRIMARY KEY,
      config_id uuid NOT NULL REFERENCES avila_control.config_entries(id),
      version integer NOT NULL,
      value text NOT NULL,
      kind varchar(16) NOT NULL,
      description varchar(240) NOT NULL,
      scope_type varchar(16) NOT NULL,
      scope_key varchar(80) NOT NULL,
      sensitivity varchar(16) NOT NULL,
      owner_name varchar(120) NOT NULL,
      schema_json jsonb,
      expires_at timestamptz,
      change_type varchar(16) NOT NULL CHECK (change_type IN ('created','updated','rollback','deleted')),
      actor_id varchar(120) NOT NULL,
      actor_email varchar(240) NOT NULL DEFAULT '',
      changed_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(config_id, version)
    );

    CREATE TABLE IF NOT EXISTS avila_control.audit_events (
      id uuid PRIMARY KEY,
      actor_id varchar(120) NOT NULL,
      actor_email varchar(240) NOT NULL DEFAULT '',
      action varchar(80) NOT NULL,
      resource_type varchar(80) NOT NULL,
      resource_id varchar(120) NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      occurred_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

async function requireSession(req: Request, res: Response, next: NextFunction) {
  const cookie = req.headers.cookie || "";
  let validationUnavailable = false;

  try {
    const response = await fetch(ssoSessionUrl, {
      headers: {
        cookie,
        accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const body = await response.json() as {
        autenticado?: boolean;
        sessao?: { sub?: string; email?: string; nome?: string; papel?: string };
      };
      if (body.autenticado && body.sessao?.papel === "ADMIN" && body.sessao.sub) {
        try {
          res.locals.actor = await hydrateActor(pool, {
            sub: body.sessao.sub,
            email: body.sessao.email || "",
            nome: body.sessao.nome || body.sessao.email || "Equipe Ávila Ops",
            papel: body.sessao.papel,
          });
          return next();
        } catch {
          return res.status(503).json({ error: "A fundação de identidade está indisponível" });
        }
      }
      if (body.autenticado) {
        return res.status(403).json({ error: "Acesso restrito à equipe Ávila Ops" });
      }
    } else if (response.status >= 500) {
      validationUnavailable = true;
    }
  } catch {
    validationUnavailable = true;
  }

  // Compatibilidade de emergência com uma sessão nativa ainda válida do n8n.
  try {
    const browserId = req.header("browser-id") || "";
    const response = await fetch(`${n8nOrigin}/rest/login`, {
      headers: {
        cookie,
        ...(browserId ? { "browser-id": browserId } : {}),
        accept: "application/json",
        host: "n8n.avilaops.com",
        "x-forwarded-host": "n8n.avilaops.com",
        "x-forwarded-proto": "https",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const user = await response.json() as {
        id?: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        role?: string | { slug?: string };
      };
      if (!user.id) throw new Error("Resposta do n8n sem identificador de usuário");
      const role = typeof user.role === "string" ? user.role : user.role?.slug;
      const actor = {
        sub: user.id,
        email: user.email || "",
        nome: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Equipe Ávila Ops",
        papel: role || "",
      };
      try {
        res.locals.actor = await hydrateActor(pool, actor);
        return next();
      } catch {
        return res.status(503).json({ error: "A fundação de identidade está indisponível" });
      }
    }
  } catch {
    validationUnavailable = true;
  }

  console.warn("session-rejected", {
    validationUnavailable,
    hasAvilaSso: /(?:^|;\s*)avila_sso=/.test(cookie),
    hasN8nAuth: /(?:^|;\s*)n8n-auth=/.test(cookie),
  });
  return res.status(validationUnavailable ? 503 : 401).json({
    error: validationUnavailable ? "Não foi possível validar a sessão" : "Sessão expirada",
  });
}

/** Autenticação de máquina: valida a própria chave na API pública do n8n. */
async function requireN8nApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("x-n8n-api-key") || "";
  if (!apiKey) return res.status(401).json({ error: "Chave da API do n8n ausente" });
  try {
    const response = await fetch(`${n8nOrigin}/api/v1/workflows?limit=1&excludePinnedData=true`, {
      headers: { "x-n8n-api-key": apiKey, accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return res.status(response.status === 401 ? 401 : 403).json({ error: "Chave da API do n8n inválida" });
    const fingerprint = crypto.createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
    res.locals.n8nApiKey = apiKey;
    res.locals.actor = {
      sub: `n8n-api:${fingerprint}`,
      email: "",
      nome: "Conector n8n da Ávila Ops",
      papel: "global:owner",
    } satisfies SessionActor;
    next();
  } catch {
    return res.status(503).json({ error: "Não foi possível validar a chave na API do n8n" });
  }
}

async function n8nRest(req: Request, path: string) {
  const browserId = req.header("browser-id") || "";
  const response = await fetch(`${n8nOrigin}/rest${path}`, {
    headers: {
      cookie: req.headers.cookie || "",
      ...(browserId ? { "browser-id": browserId } : {}),
      accept: "application/json",
      host: "n8n.avilaops.com",
      "x-forwarded-host": "n8n.avilaops.com",
      "x-forwarded-proto": "https",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`O n8n recusou a consulta da execução (${response.status})`);
  return response.json() as Promise<Record<string, unknown>>;
}

function requireSameOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.header("origin");
  if (origin && origin !== "https://n8n.avilaops.com") {
    return res.status(403).json({ error: "Origem não autorizada" });
  }
  next();
}

function requireCapability(capability: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const actor = res.locals.actor as SessionActor | undefined;
    if (!actor?.capabilities?.includes(capability)) {
      return res.status(403).json({ error: "Ação não permitida", capability });
    }
    next();
  };
}

type Actor = { sub?: string; nome?: string; email?: string; papel?: string };

function actorFrom(res: Response): Required<Pick<Actor, "sub" | "email">> {
  const actor = res.locals.actor as Actor | undefined;
  return { sub: actor?.sub || "unknown", email: actor?.email || "" };
}

async function recordVersion(client: pg.PoolClient, row: Record<string, unknown>, changeType: string, actor: Required<Pick<Actor, "sub" | "email">>) {
  await client.query(`INSERT INTO avila_control.config_versions
    (config_id,version,value,kind,description,scope_type,scope_key,sensitivity,owner_name,schema_json,expires_at,change_type,actor_id,actor_email)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [
    row.id, row.version, row.value, row.kind, row.description, row.scope_type, row.scope_key,
    row.sensitivity, row.owner_name, row.schema_json, row.expires_at, changeType, actor.sub, actor.email,
  ]);
  await client.query(`INSERT INTO avila_control.audit_events
    (id,actor_id,actor_email,action,resource_type,resource_id,details)
    VALUES ($1,$2,$3,$4,'config',$5,$6)`, [
    crypto.randomUUID(), actor.sub, actor.email, `config.${changeType}`, row.id,
    JSON.stringify({ name: row.name, version: row.version, scopeType: row.scope_type, scopeKey: row.scope_key }),
  ]);
  await appendAudit(client, {
    actorId: actor.sub,
    actorEmail: actor.email,
    action: `config.${changeType}`,
    resourceType: "config",
    resourceId: String(row.id),
    details: { name: row.name, version: row.version, scopeType: row.scope_type, scopeKey: row.scope_key },
  });
}

app.get("/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, service: "n8n-avila-modules" });
});

app.get("/ready", async (_req, res) => {
  const result = await pool.query(`SELECT
    to_regclass('avila_control.principals') IS NOT NULL AS identity_ready,
    to_regclass('avila_control.audit_chain') IS NOT NULL AS audit_ready`);
  const ready = Boolean(result.rows[0]?.identity_ready && result.rows[0]?.audit_ready);
  res.status(ready ? 200 : 503).json({ ok: ready, service: "n8n-avila-modules", foundation: result.rows[0] });
});

app.get(["/api/me", "/api/v1/me"], requireSession, (_req, res) => {
  const actor = res.locals.actor as { sub?: string; nome?: string; email?: string; papel?: string } | undefined;
  res.set("Cache-Control", "private, no-store").json({
    id: actor?.sub,
    name: actor?.nome || actor?.email || "Equipe Ávila Ops",
    nome: actor?.nome || actor?.email || "Equipe Ávila Ops",
    email: actor?.email || "",
    role: actor?.papel || "",
    principalId: (actor as SessionActor | undefined)?.principalId,
    capabilities: (actor as SessionActor | undefined)?.capabilities || [],
  });
});

app.get("/api/session", requireSession, (_req, res) => {
  const actor = res.locals.actor as { sub?: string; nome?: string; email?: string; papel?: string } | undefined;
  res.set("Cache-Control", "private, no-store").json({
    id: actor?.sub,
    name: actor?.nome || actor?.email || "Equipe Ávila Ops",
    email: actor?.email || "",
    role: actor?.papel || "",
    capabilities: (actor as SessionActor | undefined)?.capabilities || [],
  });
});

app.get("/api/v1/openapi.json", requireSession, (_req, res) => {
  res.set("Cache-Control", "private, no-store").json({
    openapi: "3.1.0",
    info: { title: "API dos Módulos Ávila no n8n", version: "1.1.0" },
    servers: [{ url: "https://n8n.avilaops.com/api/v1" }],
    paths: {
      "/me": { get: { summary: "Identidade e capacidades efetivas" } },
      "/insights": { get: { summary: "Métricas reais de execução" } },
      "/insights/workflows/{id}": { get: { summary: "Execuções de um workflow" } },
      "/insights/executions/{id}": { get: { summary: "Causa reduzida de uma execução, sem payloads" } },
      "/config": { get: { summary: "Lista configurações" }, post: { summary: "Cria configuração" } },
      "/config/{id}": { put: { summary: "Atualiza configuração" }, delete: { summary: "Remove configuração" } },
      "/config/{id}/versions": { get: { summary: "Histórico da configuração" } },
      "/config/{id}/rollback": { post: { summary: "Restaura uma versão" } },
      "/mcp/v1/config": { get: { summary: "Configurações para o conector MCP, autenticado pela API do n8n" } },
      "/mcp/v1/config/{name}": { put: { summary: "Cria ou atualiza uma configuração" }, delete: { summary: "Remove logicamente uma configuração" } },
      "/mcp/v1/spaces": { get: { summary: "Lista Espaços Ávila" } },
      "/mcp/v1/spaces/{spaceId}/resources/{type}/{resourceId}": { put: { summary: "Atribui workflow ou credencial a um espaço" } },
      "/audit": { get: { summary: "Eventos encadeados de auditoria" } },
      "/audit/verify": { get: { summary: "Verifica a integridade da cadeia" } },
    },
  });
});

app.get("/api/v1/audit", requireSession, requireCapability("audit.read"), async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
  const values: unknown[] = [limit];
  const clauses = ["organization_id='00000000-0000-4000-8000-000000000001'::uuid"];
  for (const [queryKey, column] of [["action", "action"], ["resourceType", "resource_type"], ["actorId", "actor_id"]] as const) {
    const value = String(req.query[queryKey] || "").trim();
    if (value) {
      values.push(value);
      clauses.push(`${column}=$${values.length}`);
    }
  }
  const result = await pool.query(`SELECT sequence,event_id,actor_id,actor_email,action,resource_type,
    resource_id,details,occurred_at,previous_hash,event_hash FROM avila_control.audit_chain
    WHERE ${clauses.join(" AND ")} ORDER BY sequence DESC LIMIT $1`, values);
  res.set("Cache-Control", "private, no-store").json({ events: result.rows });
});

app.get("/api/v1/audit/verify", requireSession, requireCapability("audit.read"), async (_req, res) => {
  const result = await verifyAuditChain(pool);
  res.status(result.valid ? 200 : 409).set("Cache-Control", "private, no-store").json(result);
});

app.get(["/api/insights", "/api/v1/insights"], requireSession, requireCapability("insights.read"), async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days || 7)));
  const params = [`${days} days`];
  const totals = await pool.query(`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE e.status = 'success')::int AS success,
      count(*) FILTER (WHERE e.status IN ('error','crashed'))::int AS failed,
      count(*) FILTER (WHERE e.status = 'running')::int AS running,
      coalesce(round(avg(extract(epoch FROM (e."stoppedAt" - e."startedAt")))::numeric, 3), 0) AS avg_seconds
    FROM execution_entity e
    WHERE e."startedAt" >= now() - $1::interval
      AND e.mode IN ('cli','error','retry','trigger','webhook','evaluation')
      AND e.status IN ('success','error','crashed') AND e."deletedAt" IS NULL
  `, params);
  const daily = await pool.query(`
    SELECT to_char(date_trunc('day', e."startedAt" AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS day,
      count(*)::int AS total,
      count(*) FILTER (WHERE e.status = 'success')::int AS success,
      count(*) FILTER (WHERE e.status IN ('error','crashed'))::int AS failed
    FROM execution_entity e
    WHERE e."startedAt" >= now() - $1::interval
      AND e.mode IN ('cli','error','retry','trigger','webhook','evaluation')
      AND e.status IN ('success','error','crashed') AND e."deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `, params);
  const workflows = await pool.query(`
    SELECT e."workflowId" AS id, coalesce(w.name, 'Workflow removido') AS name,
      count(*)::int AS total,
      count(*) FILTER (WHERE e.status = 'success')::int AS success,
      count(*) FILTER (WHERE e.status IN ('error','crashed'))::int AS failed,
      coalesce(round(avg(extract(epoch FROM (e."stoppedAt" - e."startedAt")))::numeric, 3), 0) AS avg_seconds,
      max(e."startedAt") AS last_run
    FROM execution_entity e LEFT JOIN workflow_entity w ON w.id = e."workflowId"
    WHERE e."startedAt" >= now() - $1::interval
      AND e.mode IN ('cli','error','retry','trigger','webhook','evaluation')
      AND e.status IN ('success','error','crashed') AND e."deletedAt" IS NULL
    GROUP BY e."workflowId", w.name
    HAVING count(*) FILTER (WHERE e.status IN ('error','crashed')) > 0
    ORDER BY failed DESC, total DESC LIMIT 30
  `, params);
  res.set("Cache-Control", "private, no-store").json({ days, totals: totals.rows[0], daily: daily.rows, workflows: workflows.rows });
});

app.get(["/api/insights/workflows/:id", "/api/v1/insights/workflows/:id"], requireSession, requireCapability("insights.read"), async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days || 7)));
  const workflow = await pool.query(`SELECT id,name,active,"updatedAt" AS updated_at
    FROM workflow_entity WHERE id=$1`, [req.params.id]);
  if (!workflow.rowCount) return res.status(404).json({ error: "Workflow não encontrado" });
  const totals = await pool.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status='success')::int AS success,
      count(*) FILTER (WHERE status IN ('error','crashed'))::int AS failed,
      count(*) FILTER (WHERE status='canceled')::int AS canceled,
      coalesce(round(avg(extract(epoch FROM ("stoppedAt" - "startedAt")))::numeric,3),0) AS avg_seconds,
      coalesce(round(percentile_cont(0.95) WITHIN GROUP (ORDER BY extract(epoch FROM ("stoppedAt" - "startedAt")))::numeric,3),0) AS p95_seconds
    FROM execution_entity WHERE "workflowId"=$1 AND "startedAt">=now()-$2::interval AND "deletedAt" IS NULL`,
    [req.params.id, `${days} days`]);
  const executions = await pool.query(`SELECT id,status,mode,"startedAt" AS started_at,"stoppedAt" AS stopped_at,
      "retryOf" AS retry_of,"retrySuccessId" AS retry_success_id
    FROM execution_entity WHERE "workflowId"=$1 AND "startedAt">=now()-$2::interval AND "deletedAt" IS NULL
    ORDER BY "startedAt" DESC LIMIT 40`, [req.params.id, `${days} days`]);
  res.set("Cache-Control", "private, no-store").json({
    days, workflow: workflow.rows[0], totals: totals.rows[0], executions: executions.rows,
  });
});

function remediationFor(message: string, node: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("credential with id") && normalized.includes("does not exist")) {
    return { category: "credential_missing", title: "Credencial ausente", steps: [
      `Abra o workflow e selecione o nó ${node || "com falha"}.`,
      "Escolha uma credencial existente do mesmo tipo ou recrie a conexão autorizada.",
      "Execute um teste controlado e confirme que o Handler Central também concluiu.",
    ] };
  }
  if (normalized.includes("data table") && normalized.includes("could not be found")) {
    return { category: "table_missing", title: "Data table não encontrada", steps: [
      `Abra o nó ${node || "com falha"} e confira a tabela selecionada.`,
      "Religue o nó a uma tabela existente ou restaure a tabela esperada pelo workflow.",
      "Teste com dados não sensíveis antes de reativar a agenda.",
    ] };
  }
  if (normalized.includes("authorization failed") || normalized.includes("forbidden") || normalized.includes("unauthorized")) {
    return { category: "authorization", title: "Autorização recusada", steps: [
      `Revise a credencial usada no nó ${node || "com falha"}.`,
      "Renove a autorização e confirme os escopos exigidos pelo serviço.",
      "Rode uma execução controlada e valide o retorno antes da próxima agenda.",
    ] };
  }
  if (normalized.includes("connection") && (normalized.includes("closed") || normalized.includes("offline") || normalized.includes("timeout"))) {
    return { category: "connection", title: "Destino indisponível", steps: [
      `Teste a disponibilidade do destino usado por ${node || "este nó"}.`,
      "Confirme DNS, TLS e tempo limite; aplique retry apenas se a operação for idempotente.",
      "Reexecute uma amostra e acompanhe a próxima execução agendada.",
    ] };
  }
  return { category: "generic", title: "Revisão manual necessária", steps: [
    `Abra a execução e examine o nó ${node || "onde o fluxo parou"}.`,
    "Valide entrada, configuração e resposta do serviço sem copiar dados sensíveis.",
    "Corrija em rascunho e teste antes de publicar a alteração.",
  ] };
}

app.get(["/api/insights/executions/:id", "/api/v1/insights/executions/:id"], requireSession, requireCapability("insights.read"), async (req, res) => {
  const executionId = String(req.params.id);
  if (!/^\d+$/.test(executionId)) return res.status(400).json({ error: "Execução inválida" });
  try {
    const responseBody = await n8nRest(req, `/executions/${executionId}`) as Record<string, unknown>;
    const execution = ((responseBody.data && typeof responseBody.data === "object") ? responseBody.data : responseBody) as {
      id?: string; status?: string; mode?: string; startedAt?: string; stoppedAt?: string; workflowId?: string;
      data?: string | { resultData?: { error?: { message?: string; description?: string; node?: { name?: string } }; lastNodeExecuted?: string; runData?: Record<string, Array<{ error?: { message?: string; description?: string } }>> } };
    };
    const executionData = typeof execution.data === "string" ? parseFlatted(execution.data) as Exclude<typeof execution.data, string> : execution.data;
    const result = executionData?.resultData;
    const failingRun = Object.entries(result?.runData || {}).reverse().find(([, runs]) => runs.some((run) => run.error));
    const failingNode = result?.error?.node?.name || failingRun?.[0] || result?.lastNodeExecuted || "";
    const runError = failingRun?.[1].find((run) => run.error)?.error;
    const message = result?.error?.message || runError?.message || (execution.status === "success" ? "Execução concluída com sucesso" : "A execução não informou uma mensagem de erro");
    const description = result?.error?.description || runError?.description || "";
    res.set("Cache-Control", "private, no-store").json({
      id: execution.id, status: execution.status, mode: execution.mode, workflowId: execution.workflowId,
      startedAt: execution.startedAt, stoppedAt: execution.stoppedAt, lastNode: result?.lastNodeExecuted || "",
      failingNode, message, description, remediation: remediationFor(message, failingNode),
      nativeUrl: `/workflow/${execution.workflowId}/executions/${execution.id}`,
    });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Não foi possível consultar a execução" });
  }
});

app.get(["/api/variables", "/api/v1/config"], requireSession, requireCapability("config.read"), async (_req, res) => {
  const result = await pool.query(`SELECT id,name,kind,description,value,scope_type,scope_key,sensitivity,
    owner_name,schema_json,expires_at,version,created_at,updated_at
    FROM avila_control.config_entries WHERE deleted_at IS NULL ORDER BY name,scope_type,scope_key`);
  const actor = res.locals.actor as SessionActor;
  const canReadConfidential = actor.capabilities?.includes("config.confidential.read");
  const variables = result.rows.map((row) => row.sensitivity === "confidential" && !canReadConfidential
    ? { ...row, value: null, value_masked: true }
    : { ...row, value_masked: false });
  res.set("Cache-Control", "private, no-store").json({ variables });
});

app.post(["/api/variables", "/api/v1/config"], requireSession, requireSameOrigin, requireCapability("config.write"), async (req, res) => {
  const client = await pool.connect();
  try {
    const input = validateVariable(req.body);
    const id = crypto.randomUUID();
    await client.query("BEGIN");
    const result = await client.query(`INSERT INTO avila_control.config_entries
      (id,name,value,kind,description,scope_type,scope_key,sensitivity,owner_name,schema_json,expires_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [
      id, input.name, input.value, input.kind, input.description, input.scopeType, input.scopeKey,
      input.sensitivity, input.ownerName, input.schemaJson, input.expiresAt,
    ]);
    await recordVersion(client, result.rows[0], "created", actorFrom(res));
    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    const duplicate = error instanceof Error && "code" in error && error.code === "23505";
    res.status(duplicate ? 409 : 400).json({ error: duplicate ? "Já existe uma variável com este nome e escopo" : error instanceof Error ? error.message : "Dados inválidos" });
  } finally {
    client.release();
  }
});

app.put(["/api/variables/:id", "/api/v1/config/:id"], requireSession, requireSameOrigin, requireCapability("config.write"), async (req, res) => {
  const client = await pool.connect();
  try {
    const input = validateVariable(req.body);
    await client.query("BEGIN");
    const result = await client.query(`UPDATE avila_control.config_entries SET
      name=$2,value=$3,kind=$4,description=$5,scope_type=$6,scope_key=$7,sensitivity=$8,
      owner_name=$9,schema_json=$10,expires_at=$11,version=version+1,updated_at=now()
      WHERE id=$1 AND deleted_at IS NULL RETURNING *`, [
      req.params.id, input.name, input.value, input.kind, input.description, input.scopeType, input.scopeKey,
      input.sensitivity, input.ownerName, input.schemaJson, input.expiresAt,
    ]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Variável não encontrada" });
    }
    await recordVersion(client, result.rows[0], "updated", actorFrom(res));
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    const duplicate = error instanceof Error && "code" in error && error.code === "23505";
    res.status(duplicate ? 409 : 400).json({ error: duplicate ? "Já existe uma variável com este nome e escopo" : error instanceof Error ? error.message : "Dados inválidos" });
  } finally {
    client.release();
  }
});

app.delete(["/api/variables/:id", "/api/v1/config/:id"], requireSession, requireSameOrigin, requireCapability("config.write"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`UPDATE avila_control.config_entries
      SET deleted_at=now(),updated_at=now(),version=version+1 WHERE id=$1 AND deleted_at IS NULL RETURNING *`, [req.params.id]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Variável não encontrada" });
    }
    await recordVersion(client, result.rows[0], "deleted", actorFrom(res));
    await client.query("COMMIT");
    res.status(204).end();
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível excluir" });
  } finally {
    client.release();
  }
});

app.get(["/api/variables/:id/versions", "/api/v1/config/:id/versions"], requireSession, requireCapability("config.read"), async (req, res) => {
  const result = await pool.query(`SELECT version,kind,description,scope_type,scope_key,sensitivity,owner_name,
    schema_json,expires_at,change_type,actor_email,changed_at
    FROM avila_control.config_versions WHERE config_id=$1 ORDER BY version DESC`, [req.params.id]);
  res.set("Cache-Control", "private, no-store").json({ versions: result.rows });
});

app.post(["/api/variables/:id/rollback", "/api/v1/config/:id/rollback"], requireSession, requireSameOrigin, requireCapability("config.write"), async (req, res) => {
  const targetVersion = Number(req.body?.version);
  if (!Number.isInteger(targetVersion) || targetVersion < 1) return res.status(400).json({ error: "Versão inválida" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const snapshot = await client.query(`SELECT * FROM avila_control.config_versions
      WHERE config_id=$1 AND version=$2 AND change_type <> 'deleted'`, [req.params.id, targetVersion]);
    if (!snapshot.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Versão não encontrada" });
    }
    const source = snapshot.rows[0];
    const result = await client.query(`UPDATE avila_control.config_entries SET
      value=$2,kind=$3,description=$4,scope_type=$5,scope_key=$6,sensitivity=$7,owner_name=$8,
      schema_json=$9,expires_at=$10,version=version+1,updated_at=now(),deleted_at=NULL
      WHERE id=$1 RETURNING *`, [
      req.params.id, source.value, source.kind, source.description, source.scope_type, source.scope_key,
      source.sensitivity, source.owner_name, source.schema_json, source.expires_at,
    ]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Variável não encontrada" });
    }
    await recordVersion(client, result.rows[0], "rollback", actorFrom(res));
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível restaurar" });
  } finally {
    client.release();
  }
});

// API de máquina usada pelo conector MCP. Continua no mesmo host do n8n e
// valida a N8N_API_KEY contra a API pública antes de tocar dados próprios.
app.get("/mcp/v1/config", requireN8nApiKey, async (_req, res) => {
  const result = await pool.query(`SELECT id,name,kind,description,value,scope_type,scope_key,sensitivity,
    owner_name,schema_json,expires_at,version,created_at,updated_at
    FROM avila_control.config_entries WHERE deleted_at IS NULL ORDER BY name,scope_type,scope_key`);
  res.set("Cache-Control", "private, no-store").json({ variables: result.rows });
});

app.put("/mcp/v1/config/:name", requireN8nApiKey, async (req, res) => {
  const client = await pool.connect();
  try {
    const input = validateVariable({ ...req.body, name: req.params.name });
    const actor = actorFrom(res);
    await client.query("BEGIN");
    const atual = await client.query(`SELECT id FROM avila_control.config_entries
      WHERE name=$1 AND scope_type=$2 AND scope_key=$3 AND deleted_at IS NULL FOR UPDATE`, [input.name, input.scopeType, input.scopeKey]);
    let result;
    let changeType: "created" | "updated";
    if (atual.rowCount) {
      result = await client.query(`UPDATE avila_control.config_entries SET
        value=$2,kind=$3,description=$4,sensitivity=$5,owner_name=$6,schema_json=$7,expires_at=$8,
        version=version+1,updated_at=now() WHERE id=$1 RETURNING *`, [
        atual.rows[0].id, input.value, input.kind, input.description, input.sensitivity,
        input.ownerName, input.schemaJson, input.expiresAt,
      ]);
      changeType = "updated";
    } else {
      result = await client.query(`INSERT INTO avila_control.config_entries
        (id,name,value,kind,description,scope_type,scope_key,sensitivity,owner_name,schema_json,expires_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [
        crypto.randomUUID(), input.name, input.value, input.kind, input.description, input.scopeType,
        input.scopeKey, input.sensitivity, input.ownerName, input.schemaJson, input.expiresAt,
      ]);
      changeType = "created";
    }
    await recordVersion(client, result.rows[0], changeType, actor);
    await client.query("COMMIT");
    res.status(changeType === "created" ? 201 : 200).json({ ...result.rows[0], action: changeType });
  } catch (error) {
    await client.query("ROLLBACK");
    const duplicate = error instanceof Error && "code" in error && error.code === "23505";
    res.status(duplicate ? 409 : 400).json({ error: duplicate ? "Já existe uma configuração com este nome e escopo" : error instanceof Error ? error.message : "Dados inválidos" });
  } finally {
    client.release();
  }
});

app.delete("/mcp/v1/config/:name", requireN8nApiKey, async (req, res) => {
  const scopeType = String(req.query.scopeType || "global");
  const scopeKey = scopeType === "global" ? "global" : String(req.query.scopeKey || "").trim().toLowerCase();
  const name = String(req.params.name).trim().toUpperCase();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`UPDATE avila_control.config_entries SET
      deleted_at=now(),updated_at=now(),version=version+1
      WHERE name=$1 AND scope_type=$2 AND scope_key=$3 AND deleted_at IS NULL RETURNING *`, [name, scopeType, scopeKey]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Configuração não encontrada" });
    }
    await recordVersion(client, result.rows[0], "deleted", actorFrom(res));
    await client.query("COMMIT");
    res.json({ deleted: name, id: result.rows[0].id });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível excluir" });
  } finally {
    client.release();
  }
});

app.get("/mcp/v1/spaces", requireN8nApiKey, async (_req, res) => {
  const result = await pool.query(`SELECT s.id,s.slug,s.name,s.description,s.created_at,s.updated_at,
      count(rs.resource_id) FILTER (WHERE rs.resource_type='workflow')::int AS workflows,
      count(rs.resource_id) FILTER (WHERE rs.resource_type='credential')::int AS credentials
    FROM avila_control.spaces s
    LEFT JOIN avila_control.resource_spaces rs ON rs.space_id=s.id AND rs.organization_id=s.organization_id
    WHERE s.organization_id=$1 AND s.archived_at IS NULL
    GROUP BY s.id ORDER BY s.name`, [DEFAULT_ORGANIZATION_ID]);
  res.set("Cache-Control", "private, no-store").json({ spaces: result.rows });
});

app.put("/mcp/v1/spaces/:spaceId/resources/:type/:resourceId", requireN8nApiKey, async (req, res) => {
  const resourceType = String(req.params.type).toLowerCase();
  const spaceId = String(req.params.spaceId);
  const resourceId = String(req.params.resourceId);
  if (!['workflow', 'credential'].includes(resourceType)) return res.status(400).json({ error: "Tipo deve ser workflow ou credential" });
  const space = await pool.query(`SELECT id,name,slug FROM avila_control.spaces
    WHERE id=$1 AND organization_id=$2 AND archived_at IS NULL`, [spaceId, DEFAULT_ORGANIZATION_ID]);
  if (!space.rowCount) return res.status(404).json({ error: "Espaço Ávila não encontrado" });
  const plural = resourceType === "workflow" ? "workflows" : "credentials";
  const verify = await fetch(`${n8nOrigin}/api/v1/${plural}/${encodeURIComponent(resourceId)}`, {
    headers: { "x-n8n-api-key": String(res.locals.n8nApiKey), accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!verify.ok) return res.status(verify.status === 404 ? 404 : 502).json({ error: `${resourceType === "workflow" ? "Workflow" : "Credencial"} não encontrado no n8n` });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const actor = actorFrom(res);
    await client.query(`INSERT INTO avila_control.resource_spaces
      (organization_id,resource_type,resource_id,space_id,assigned_by)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (organization_id,resource_type,resource_id) DO UPDATE SET
        space_id=excluded.space_id,assigned_by=excluded.assigned_by,assigned_at=now()`, [
      DEFAULT_ORGANIZATION_ID, resourceType, resourceId, spaceId, actor.sub,
    ]);
    await appendAudit(client, {
      actorId: actor.sub,
      action: "space.resource.assigned",
      resourceType,
      resourceId,
      details: { spaceId, space: space.rows[0].name },
    });
    await client.query("COMMIT");
    res.json({ moved: resourceId, type: resourceType, space: space.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(400).json({ error: error instanceof Error ? error.message : "Não foi possível atribuir o recurso" });
  } finally {
    client.release();
  }
});

app.get("/internal/variables/:name", async (req, res) => {
  if (!internalToken || req.header("x-avila-internal-token") !== internalToken) return res.status(401).json({ error: "Não autorizado" });
  const environment = String(req.query.environment || "").trim().toLowerCase();
  const space = String(req.query.space || "").trim().toLowerCase();
  const scopeType = String(req.query.scopeType || "global");
  const scopeKey = scopeType === "global" ? "global" : String(req.query.scopeKey || "").toLowerCase();
  const result = environment || space
    ? await pool.query(`SELECT name,value,kind,scope_type,scope_key,version,
        CASE WHEN scope_type='environment' THEN 3 WHEN scope_type='space' THEN 2 ELSE 1 END AS precedence
      FROM avila_control.config_entries
      WHERE name=$1 AND deleted_at IS NULL AND (expires_at IS NULL OR expires_at > now())
        AND ((scope_type='environment' AND scope_key=$2) OR (scope_type='space' AND scope_key=$3) OR (scope_type='global' AND scope_key='global'))
      ORDER BY precedence DESC LIMIT 1`, [req.params.name.toUpperCase(), environment, space])
    : await pool.query(`SELECT name,value,kind,scope_type,scope_key,version FROM avila_control.config_entries
      WHERE name=$1 AND scope_type=$2 AND scope_key=$3 AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > now()) LIMIT 1`, [req.params.name.toUpperCase(), scopeType, scopeKey]);
  if (!result.rowCount) return res.status(404).json({ error: "Variável não encontrada" });
  const row = result.rows[0];
  res.set("Cache-Control", "private, max-age=15").json({
    name: row.name, value: parseConfigValue(row.value, row.kind), kind: row.kind,
    scopeType: row.scope_type, scopeKey: row.scope_key, version: row.version,
    resolvedFrom: { scopeType: row.scope_type, scopeKey: row.scope_key },
  });
});

let server: ReturnType<typeof app.listen>;
ensureSchema()
  .then(() => ensureFoundation(pool))
  .then(() => {
    server = app.listen(port, "0.0.0.0", () => console.log(`n8n-avila-modules:${port}`));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function shutdown(signal: string) {
  console.log(`shutdown:${signal}`);
  server?.close();
  await pool.end();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
