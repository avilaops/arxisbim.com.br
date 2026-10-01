import crypto from "node:crypto";
import type pg from "pg";

export const DEFAULT_ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
export const DEFAULT_SPACE_ID = "20000000-0000-4000-8000-000000000001";

export type SessionActor = {
  sub: string;
  email: string;
  nome: string;
  papel: string;
  principalId?: string;
  capabilities?: string[];
};

type AuditInput = {
  actorId: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  occurredAt?: string;
};

const roleCapabilities: Record<string, string[]> = {
  platform_owner: ["platform.admin", "insights.read", "config.read", "config.confidential.read", "config.write", "audit.read"],
  platform_admin: ["insights.read", "config.read", "config.confidential.read", "config.write", "audit.read"],
  viewer: ["insights.read", "config.read"],
};

const roleIds: Record<string, string> = {
  platform_owner: "10000000-0000-4000-8000-000000000001",
  platform_admin: "10000000-0000-4000-8000-000000000002",
  viewer: "10000000-0000-4000-8000-000000000003",
};

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`)
    .join(",")}}`;
}

export function auditHash(previousHash: string, payload: Record<string, unknown>) {
  return crypto.createHash("sha256").update(`${previousHash}\n${canonicalize(payload)}`).digest("hex");
}

export async function ensureFoundation(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS avila_control.organizations (
      id uuid PRIMARY KEY,
      name varchar(120) NOT NULL,
      slug varchar(80) NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS avila_control.schema_migrations (
      version varchar(80) PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS avila_control.spaces (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES avila_control.organizations(id),
      slug varchar(80) NOT NULL,
      name varchar(120) NOT NULL,
      description varchar(240) NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      archived_at timestamptz,
      UNIQUE(organization_id, slug)
    );

    CREATE TABLE IF NOT EXISTS avila_control.resource_spaces (
      organization_id uuid NOT NULL REFERENCES avila_control.organizations(id),
      resource_type varchar(24) NOT NULL CHECK (resource_type IN ('workflow','credential')),
      resource_id varchar(160) NOT NULL,
      space_id uuid NOT NULL REFERENCES avila_control.spaces(id),
      assigned_by varchar(160) NOT NULL,
      assigned_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(organization_id, resource_type, resource_id)
    );

    CREATE INDEX IF NOT EXISTS resource_spaces_space_idx
      ON avila_control.resource_spaces (space_id, resource_type, resource_id);

    CREATE TABLE IF NOT EXISTS avila_control.principals (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES avila_control.organizations(id),
      source varchar(32) NOT NULL,
      source_id varchar(160) NOT NULL,
      email varchar(240) NOT NULL DEFAULT '',
      display_name varchar(160) NOT NULL DEFAULT '',
      source_role varchar(80) NOT NULL DEFAULT '',
      active boolean NOT NULL DEFAULT true,
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(organization_id, source, source_id)
    );

    CREATE TABLE IF NOT EXISTS avila_control.roles (
      id uuid PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES avila_control.organizations(id),
      slug varchar(80) NOT NULL,
      name varchar(120) NOT NULL,
      system_role boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(organization_id, slug)
    );

    CREATE TABLE IF NOT EXISTS avila_control.role_capabilities (
      role_id uuid NOT NULL REFERENCES avila_control.roles(id) ON DELETE CASCADE,
      capability varchar(120) NOT NULL,
      PRIMARY KEY(role_id, capability)
    );

    CREATE TABLE IF NOT EXISTS avila_control.principal_roles (
      principal_id uuid NOT NULL REFERENCES avila_control.principals(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES avila_control.roles(id) ON DELETE CASCADE,
      assignment_source varchar(40) NOT NULL DEFAULT 'manual',
      assigned_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(principal_id, role_id)
    );

    CREATE TABLE IF NOT EXISTS avila_control.audit_chain (
      sequence bigserial PRIMARY KEY,
      organization_id uuid NOT NULL REFERENCES avila_control.organizations(id),
      event_id uuid NOT NULL UNIQUE,
      actor_id varchar(160) NOT NULL,
      actor_email varchar(240) NOT NULL DEFAULT '',
      action varchar(120) NOT NULL,
      resource_type varchar(80) NOT NULL,
      resource_id varchar(160) NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      occurred_at timestamptz NOT NULL,
      previous_hash char(64) NOT NULL,
      event_hash char(64) NOT NULL UNIQUE
    );

    CREATE INDEX IF NOT EXISTS audit_chain_resource_idx
      ON avila_control.audit_chain (resource_type, resource_id, sequence DESC);
    CREATE INDEX IF NOT EXISTS audit_chain_actor_idx
      ON avila_control.audit_chain (actor_id, sequence DESC);
  `);

  await pool.query(`INSERT INTO avila_control.organizations (id,name,slug)
    VALUES ($1,'Ávila Ops','avila-ops') ON CONFLICT (id) DO NOTHING`, [DEFAULT_ORGANIZATION_ID]);
  await pool.query(`INSERT INTO avila_control.spaces (id,organization_id,slug,name,description)
    VALUES ($1,$2,'avila-ops','Ávila Ops','Espaço operacional padrão dos Módulos Ávila')
    ON CONFLICT (id) DO NOTHING`, [DEFAULT_SPACE_ID, DEFAULT_ORGANIZATION_ID]);

  for (const [slug, capabilities] of Object.entries(roleCapabilities)) {
    const roleId = roleIds[slug];
    await pool.query(`INSERT INTO avila_control.roles (id,organization_id,slug,name)
      VALUES ($1,$2,$3,$4) ON CONFLICT (organization_id,slug) DO UPDATE SET name=excluded.name`, [
      roleId, DEFAULT_ORGANIZATION_ID, slug,
      slug === "platform_owner" ? "Proprietário da plataforma" : slug === "platform_admin" ? "Administrador da plataforma" : "Visualizador",
    ]);
    for (const capability of capabilities) {
      await pool.query(`INSERT INTO avila_control.role_capabilities (role_id,capability)
        VALUES ($1,$2) ON CONFLICT DO NOTHING`, [roleId, capability]);
    }
  }

  const existingAudit = await pool.query(`SELECT 1 FROM avila_control.audit_chain
    WHERE organization_id=$1 LIMIT 1`, [DEFAULT_ORGANIZATION_ID]);
  if (!existingAudit.rowCount) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await appendAudit(client, {
        actorId: "system",
        action: "foundation.initialized",
        resourceType: "platform",
        resourceId: DEFAULT_ORGANIZATION_ID,
        details: { version: "1.0.0" },
      });
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  await pool.query(`INSERT INTO avila_control.schema_migrations (version)
    VALUES ('001_foundation') ON CONFLICT (version) DO NOTHING`);
}

function mappedRole(sourceRole: string) {
  if (sourceRole === "global:owner") return "platform_owner";
  if (sourceRole === "ADMIN" || sourceRole === "global:admin") return "platform_admin";
  return "viewer";
}

export async function hydrateActor(pool: pg.Pool, actor: SessionActor): Promise<SessionActor> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const principal = await client.query(`INSERT INTO avila_control.principals
      (id,organization_id,source,source_id,email,display_name,source_role)
      VALUES ($1,$2,'n8n',$3,$4,$5,$6)
      ON CONFLICT (organization_id,source,source_id) DO UPDATE SET
        email=excluded.email,display_name=excluded.display_name,source_role=excluded.source_role,
        active=true,last_seen_at=now(),updated_at=now()
      RETURNING id`, [crypto.randomUUID(), DEFAULT_ORGANIZATION_ID, actor.sub, actor.email, actor.nome, actor.papel]);
    const principalId = principal.rows[0].id as string;
    const roleSlug = mappedRole(actor.papel);
    await client.query(`DELETE FROM avila_control.principal_roles
      WHERE principal_id=$1 AND assignment_source='n8n_session'`, [principalId]);
    await client.query(`INSERT INTO avila_control.principal_roles (principal_id,role_id,assignment_source)
      SELECT $1,id,'n8n_session' FROM avila_control.roles WHERE organization_id=$2 AND slug=$3
      ON CONFLICT (principal_id,role_id) DO UPDATE SET assignment_source='n8n_session',assigned_at=now()`,
    [principalId, DEFAULT_ORGANIZATION_ID, roleSlug]);
    const capabilities = await client.query(`SELECT DISTINCT rc.capability
      FROM avila_control.principal_roles pr
      JOIN avila_control.role_capabilities rc ON rc.role_id=pr.role_id
      WHERE pr.principal_id=$1 ORDER BY rc.capability`, [principalId]);
    await client.query("COMMIT");
    return { ...actor, principalId, capabilities: capabilities.rows.map((row) => String(row.capability)) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function appendAudit(client: pg.PoolClient, input: AuditInput) {
  await client.query(`SELECT id FROM avila_control.organizations WHERE id=$1 FOR UPDATE`, [DEFAULT_ORGANIZATION_ID]);
  const last = await client.query(`SELECT event_hash FROM avila_control.audit_chain
    WHERE organization_id=$1 ORDER BY sequence DESC LIMIT 1`, [DEFAULT_ORGANIZATION_ID]);
  const previousHash = String(last.rows[0]?.event_hash || "0".repeat(64));
  const eventId = crypto.randomUUID();
  const occurredAt = input.occurredAt || new Date().toISOString();
  const details = input.details || {};
  const payload = {
    organizationId: DEFAULT_ORGANIZATION_ID,
    eventId,
    actorId: input.actorId,
    actorEmail: input.actorEmail || "",
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    details,
    occurredAt,
  };
  const eventHash = auditHash(previousHash, payload);
  await client.query(`INSERT INTO avila_control.audit_chain
    (organization_id,event_id,actor_id,actor_email,action,resource_type,resource_id,details,occurred_at,previous_hash,event_hash)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
    DEFAULT_ORGANIZATION_ID, eventId, input.actorId, input.actorEmail || "", input.action,
    input.resourceType, input.resourceId, JSON.stringify(details), occurredAt, previousHash, eventHash,
  ]);
  return { eventId, eventHash, previousHash, occurredAt };
}

export async function verifyAuditChain(pool: pg.Pool) {
  const rows = await pool.query(`SELECT event_id,actor_id,actor_email,action,resource_type,resource_id,
    details,occurred_at,previous_hash,event_hash FROM avila_control.audit_chain
    WHERE organization_id=$1 ORDER BY sequence`, [DEFAULT_ORGANIZATION_ID]);
  let previousHash = "0".repeat(64);
  for (let index = 0; index < rows.rows.length; index += 1) {
    const row = rows.rows[index];
    const payload = {
      organizationId: DEFAULT_ORGANIZATION_ID,
      eventId: row.event_id,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      details: row.details,
      occurredAt: new Date(row.occurred_at).toISOString(),
    };
    const expected = auditHash(previousHash, payload);
    if (row.previous_hash !== previousHash || row.event_hash !== expected) {
      return { valid: false, events: rows.rowCount || 0, brokenAt: index + 1, eventId: row.event_id };
    }
    previousHash = row.event_hash;
  }
  return { valid: true, events: rows.rowCount || 0, head: previousHash };
}
