import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { projects } from '../../shared/database/schema/projects.js';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas.js';

export class ProjectsService {
  private db;

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr';
    const client = postgres(connectionString);
    this.db = drizzle(client, { schema: { projects } });
  }

  async list(tenantId: string) {
    return await this.db.select().from(projects).where(eq(projects.tenantId, tenantId));
  }

  async get(id: string, tenantId: string) {
    const [project] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);
    
    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  async create(tenantId: string, input: CreateProjectInput) {
    const [project] = await this.db.insert(projects).values({
      tenantId,
      companyId: input.companyId,
      name: input.name,
      description: input.description,
      location: input.location,
      status: 'active',
    }).returning();

    return project;
  }

  async update(id: string, tenantId: string, input: UpdateProjectInput) {
    const [project] = await this.db.update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)))
      .returning();

    if (!project) {
      throw new Error('Project not found');
    }

    return project;
  }

  async delete(id: string, tenantId: string) {
    await this.db.delete(projects).where(and(eq(projects.id, id), eq(projects.tenantId, tenantId)));
  }
}
