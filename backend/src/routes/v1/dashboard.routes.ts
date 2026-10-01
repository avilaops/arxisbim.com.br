import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { db } from '../../shared/database/db.js';
import { projects, models, modelVersions } from '../../shared/database/schema/projects.js';
import { virtualMeetingRooms } from '../../shared/database/schema/virtual-meetings.js';
import { auditLogs } from '../../shared/database/schema/observability.js';
import { eq, and, isNull, desc, count, ne } from 'drizzle-orm';
import type { UserContext } from '../../core/tenancy/context.js';

export async function dashboardRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  fastify.get('/dashboard', auth, async (request, reply) => {
    const user = (request as any).user as UserContext;
    const tenantId = user.tenantId;

    try {
      // Active projects count
      const [activeProjectsResult] = await db
        .select({ count: count() })
        .from(projects)
        .where(
          and(
            eq(projects.tenantId, tenantId),
            eq(projects.status, 'active'),
            isNull(projects.deletedAt),
          ),
        );

      // Processed models count (model_versions with status 'ready', scoped by tenant)
      const [processedModelsResult] = await db
        .select({ count: count() })
        .from(modelVersions)
        .innerJoin(models, eq(modelVersions.modelId, models.id))
        .innerJoin(projects, eq(models.projectId, projects.id))
        .where(
          and(
            eq(projects.tenantId, tenantId),
            eq(modelVersions.status, 'ready'),
            isNull(projects.deletedAt),
            isNull(models.deletedAt),
          ),
        );

      // XR meetings count (all rooms from tenant projects)
      const [xrMeetingsResult] = await db
        .select({ count: count() })
        .from(virtualMeetingRooms)
        .innerJoin(projects, eq(virtualMeetingRooms.projectId, projects.id))
        .where(
          and(
            eq(projects.tenantId, tenantId),
            isNull(projects.deletedAt),
          ),
        );

      // Recent projects (up to 5, ordered by updated_at DESC)
      const recentProjects = await db
        .select({
          id: projects.id,
          name: projects.name,
          status: projects.status,
          updatedAt: projects.updatedAt,
        })
        .from(projects)
        .where(
          and(
            eq(projects.tenantId, tenantId),
            isNull(projects.deletedAt),
          ),
        )
        .orderBy(desc(projects.updatedAt))
        .limit(5);

      // Recent activities from audit_logs (exclude noise like api.request)
      const recentActivities = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resource: auditLogs.resource,
          resourceId: auditLogs.resourceId,
          timestamp: auditLogs.timestamp,
          userId: auditLogs.userId,
        })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, tenantId),
            ne(auditLogs.resource, 'api.request'),
          ),
        )
        .orderBy(desc(auditLogs.timestamp))
        .limit(5);

      return reply.send({
        activeProjects: activeProjectsResult?.count ?? 0,
        processedModels: processedModelsResult?.count ?? 0,
        xrMeetings: xrMeetingsResult?.count ?? 0,
        recentProjects: recentProjects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          updatedAt: p.updatedAt.toISOString(),
        })),
        recentActivities: recentActivities.map((a) => ({
          id: a.id,
          action: a.action,
          resource: a.resource,
          resourceId: a.resourceId,
          timestamp: a.timestamp.toISOString(),
          userId: a.userId,
        })),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch dashboard data' });
    }
  });
}
