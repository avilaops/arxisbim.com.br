import type { FastifyInstance, FastifyRequest } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql as drizzleSql, desc, eq, and, gte } from 'drizzle-orm';
import {
  auditLogs,
  metrics,
  errorLogs,
  performanceMetrics,
  userSessions,
} from '../../../shared/database/schema/observability.js';
import { users } from '../../../shared/database/schema/tenants.js';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

interface MetricsQuery {
  tenantId?: string;
  hours?: number;
}

export async function observabilityRoutes(server: FastifyInstance) {
  /**
   * GET /dashboard
   * Retorna métricas consolidadas para o dashboard
   */
  server.get<{ Querystring: MetricsQuery }>(
    '/dashboard',
    {
      preHandler: [server.authenticate],
    },
    async (request, reply) => {
      const { tenantId, hours = 24 } = request.query;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      try {
        // 1. Total de usuários ativos
        const totalUsersQuery = tenantId
          ? db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(users)
              .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
          : db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(users)
              .where(eq(users.isActive, true));

        const [{ count: totalUsers }] = await totalUsersQuery;

        // 2. Total de requests (últimas X horas)
        const requestsQuery = tenantId
          ? db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(auditLogs)
              .where(
                and(
                  eq(auditLogs.tenantId, tenantId),
                  gte(auditLogs.timestamp, since)
                )
              )
          : db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(auditLogs)
              .where(gte(auditLogs.timestamp, since));

        const [{ count: totalRequests }] = await requestsQuery;

        // 3. Total de erros (últimas X horas)
        const errorsQuery = tenantId
          ? db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(errorLogs)
              .where(
                and(
                  eq(errorLogs.tenantId, tenantId),
                  gte(errorLogs.timestamp, since)
                )
              )
          : db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(errorLogs)
              .where(gte(errorLogs.timestamp, since));

        const [{ count: totalErrors }] = await errorsQuery;

        // 4. Performance média (últimas X horas)
        const avgPerformanceQuery = tenantId
          ? db.select({
              avgDuration: drizzleSql<number>`AVG(duration)::numeric`,
              p50: drizzleSql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration)::numeric`,
              p95: drizzleSql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration)::numeric`,
              p99: drizzleSql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration)::numeric`,
            })
            .from(performanceMetrics)
            .where(
              and(
                eq(performanceMetrics.tenantId, tenantId),
                gte(performanceMetrics.timestamp, since)
              )
            )
          : db.select({
              avgDuration: drizzleSql<number>`AVG(duration)::numeric`,
              p50: drizzleSql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration)::numeric`,
              p95: drizzleSql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration)::numeric`,
              p99: drizzleSql<number>`PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration)::numeric`,
            })
            .from(performanceMetrics)
            .where(gte(performanceMetrics.timestamp, since));

        const [performanceStats] = await avgPerformanceQuery;

        // 5. Sessões ativas
        const activeSessionsQuery = tenantId
          ? db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(userSessions)
              .where(
                and(
                  eq(userSessions.tenantId, tenantId),
                  eq(userSessions.isRevoked, false),
                  gte(userSessions.expiresAt, new Date())
                )
              )
          : db.select({ count: drizzleSql<number>`count(*)::int` })
              .from(userSessions)
              .where(
                and(
                  eq(userSessions.isRevoked, false),
                  gte(userSessions.expiresAt, new Date())
                )
              );

        const [{ count: activeSessions }] = await activeSessionsQuery;

        // 6. Últimas ações (audit log)
        const recentActionsQuery = tenantId
          ? db.select()
              .from(auditLogs)
              .where(
                and(
                  eq(auditLogs.tenantId, tenantId),
                  gte(auditLogs.timestamp, since)
                )
              )
              .orderBy(desc(auditLogs.timestamp))
              .limit(10)
          : db.select()
              .from(auditLogs)
              .where(gte(auditLogs.timestamp, since))
              .orderBy(desc(auditLogs.timestamp))
              .limit(10);

        const recentActions = await recentActionsQuery;

        // 7. Últimos erros
        const recentErrorsQuery = tenantId
          ? db.select()
              .from(errorLogs)
              .where(
                and(
                  eq(errorLogs.tenantId, tenantId),
                  gte(errorLogs.timestamp, since)
                )
              )
              .orderBy(desc(errorLogs.timestamp))
              .limit(10)
          : db.select()
              .from(errorLogs)
              .where(gte(errorLogs.timestamp, since))
              .orderBy(desc(errorLogs.timestamp))
              .limit(10);

        const recentErrors = await recentErrorsQuery;

        // 8. Métricas por hora (últimas 24h)
        const hourlyMetricsQuery = tenantId
          ? drizzleSql<{ hour: string; requests: number; errors: number }>`
              SELECT 
                DATE_TRUNC('hour', timestamp) as hour,
                COUNT(*) as requests,
                0 as errors
              FROM audit_logs
              WHERE tenant_id = ${tenantId}
                AND timestamp >= ${since}
              GROUP BY hour
              ORDER BY hour DESC
              LIMIT 24
            `
          : drizzleSql<{ hour: string; requests: number; errors: number }>`
              SELECT 
                DATE_TRUNC('hour', timestamp) as hour,
                COUNT(*) as requests,
                0 as errors
              FROM audit_logs
              WHERE timestamp >= ${since}
              GROUP BY hour
              ORDER BY hour DESC
              LIMIT 24
            `;

        const hourlyMetrics = await db.execute(hourlyMetricsQuery);

        return reply.send({
          success: true,
          data: {
            summary: {
              totalUsers: Number(totalUsers),
              totalRequests: Number(totalRequests),
              totalErrors: Number(totalErrors),
              activeSessions: Number(activeSessions),
              errorRate: totalRequests > 0 ? (Number(totalErrors) / Number(totalRequests)) * 100 : 0,
            },
            performance: {
              avgDuration: performanceStats?.avgDuration ? Number(performanceStats.avgDuration) : 0,
              p50: performanceStats?.p50 ? Number(performanceStats.p50) : 0,
              p95: performanceStats?.p95 ? Number(performanceStats.p95) : 0,
              p99: performanceStats?.p99 ? Number(performanceStats.p99) : 0,
            },
            recentActions: recentActions.map(action => ({
              id: action.id,
              action: action.action,
              resource: action.resource,
              timestamp: action.timestamp,
              userId: action.userId,
              metadata: action.metadata,
            })),
            recentErrors: recentErrors.map(error => ({
              id: error.id,
              errorCode: error.errorCode,
              errorMessage: error.errorMessage,
              severity: error.severity,
              timestamp: error.timestamp,
              resolved: error.resolved,
            })),
            hourlyMetrics,
          },
          timeRange: {
            since: since.toISOString(),
            hours,
          },
        });
      } catch (error) {
        server.log.error({ err: error }, 'Failed to fetch dashboard metrics');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch metrics',
        });
      }
    }
  );

  /**
   * GET /metrics/:metricName
   * Retorna dados de uma métrica específica
   */
  server.get<{ Params: { metricName: string }; Querystring: MetricsQuery }>(
    '/metrics/:metricName',
    {
      preHandler: [server.authenticate],
    },
    async (request, reply) => {
      const { metricName } = request.params;
      const { tenantId, hours = 24 } = request.query;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      try {
        const metricsQuery = tenantId
          ? db.select()
              .from(metrics)
              .where(
                and(
                  eq(metrics.metricName, metricName),
                  eq(metrics.tenantId, tenantId),
                  gte(metrics.timestamp, since)
                )
              )
              .orderBy(desc(metrics.timestamp))
              .limit(100)
          : db.select()
              .from(metrics)
              .where(
                and(
                  eq(metrics.metricName, metricName),
                  gte(metrics.timestamp, since)
                )
              )
              .orderBy(desc(metrics.timestamp))
              .limit(100);

        const metricData = await metricsQuery;

        return reply.send({
          success: true,
          data: {
            metricName,
            dataPoints: metricData.map(m => ({
              timestamp: m.timestamp,
              value: m.value,
              type: m.metricType,
              labels: m.labels,
            })),
          },
        });
      } catch (error) {
        server.log.error({ err: error }, 'Failed to fetch metric');
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch metric',
        });
      }
    }
  );

  /**
   * GET /health
   * Health check de observabilidade
   */
  server.get('/health', async (request, reply) => {
    try {
      // Verificar se consegue consultar as tabelas
      await db.select({ count: drizzleSql<number>`1` }).from(auditLogs).limit(1);

      return reply.send({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        status: 'unhealthy',
        error: 'Database connection failed',
      });
    }
  });
}
