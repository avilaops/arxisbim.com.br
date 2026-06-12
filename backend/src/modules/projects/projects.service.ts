import { eq, and, isNull, desc, sql, count } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { projects } from '../../shared/database/schema/projects.js';
import { incrementProjectCount } from '../../core/billing/usage-tracker.js';
import type { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from './projects.schemas.js';

/** Slugify: "Torre A — Fase 2" → "torre-a-fase-2" */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'projeto';
}

export class ProjectsService {
  // Repository rule (S03): toda query de listagem/leitura filtra deleted_at IS NULL aqui,
  // nunca no controller.
  private notDeleted(tenantId: string) {
    return and(eq(projects.tenantId, tenantId), isNull(projects.deletedAt));
  }

  async list(tenantId: string, query?: ListProjectsQuery) {
    const page = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;

    const where = this.notDeleted(tenantId);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(projects)
        .where(where)
        .orderBy(desc(projects.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(projects).where(where),
    ]);

    return { items, page, pageSize, total: Number(total) };
  }

  async get(id: string, tenantId: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), this.notDeleted(tenantId)))
      .limit(1);

    if (!project) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
    return project;
  }

  /** Lookup por slug — URL amigável /projects/torre-a (decisão S03). */
  async getBySlug(slug: string, tenantId: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.slug, slug), this.notDeleted(tenantId)))
      .limit(1);

    if (!project) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
    return project;
  }

  async create(tenantId: string, input: CreateProjectInput) {
    const base = slugify(input.name);

    // Slug único por tenant: tenta o slug puro, senão acrescenta sufixo numérico
    let slug = base;
    for (let attempt = 0; attempt < 50; attempt++) {
      const [existing] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.tenantId, tenantId), eq(projects.slug, slug), isNull(projects.deletedAt)))
        .limit(1);
      if (!existing) break;
      slug = `${base}-${attempt + 2}`;
    }

    const [project] = await db.insert(projects).values({
      tenantId,
      companyId: input.companyId ?? null,
      slug,
      projectCode: input.projectCode ?? null,
      name: input.name,
      description: input.description,
      location: input.location,
      status: 'empty', // cache derivado da versão ativa; sem modelo = empty
    }).returning();

    await incrementProjectCount(tenantId);
    return project;
  }

  async update(id: string, tenantId: string, input: UpdateProjectInput) {
    const [project] = await db.update(projects)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(projects.id, id), this.notDeleted(tenantId)))
      .returning();

    if (!project) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
    return project;
  }

  /** Soft-delete: marca deleted_at; linha permanece no banco para auditoria. */
  async delete(id: string, tenantId: string) {
    const [deleted] = await db.update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(projects.id, id), this.notDeleted(tenantId)))
      .returning({ id: projects.id });

    if (!deleted) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }
  }

  /** Recalcula o status cacheado do projeto a partir da versão ativa (chamado pelo models service). */
  async refreshStatus(projectId: string, status: string) {
    await db.update(projects)
      .set({ status, updatedAt: new Date() })
      .where(eq(projects.id, projectId));
  }
}
