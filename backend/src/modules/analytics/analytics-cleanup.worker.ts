import postgres from 'postgres';

export type AnalyticsCleanupWorkerOptions = {
  intervalMs: number;
  logger: { info: (...a: any[]) => void; error: (...a: any[]) => void };
  retentionDays?: number;
};

export function createAnalyticsCleanupWorker(options: AnalyticsCleanupWorkerOptions) {
  const {
    intervalMs,
    logger,
    retentionDays = 90,
  } = options;

  let timer: NodeJS.Timeout | null = null;

  async function sweep(): Promise<{ eventsDeleted: number }> {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      const [result] = await sql`
        WITH deleted AS (
          DELETE FROM analytics_events
          WHERE timestamp < NOW() - (${retentionDays} || ' days')::INTERVAL
          RETURNING id
        )
        SELECT COUNT(*)::int AS n FROM deleted
      `;

      const eventsDeleted = result.n ?? 0;
      if (eventsDeleted > 0) {
        logger.info('[analytics-cleanup] sweep complete', { eventsDeleted });
      }

      return { eventsDeleted };
    } finally {
      await sql.end();
    }
  }

  function start() {
    if (timer) return;
    logger.info(`[analytics-cleanup] worker started (interval=${intervalMs}ms, retention=${retentionDays} days)`);
    timer = setInterval(() => {
      sweep().catch(err => logger.error('[analytics-cleanup] sweep error:', err));
    }, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      logger.info('[analytics-cleanup] worker stopped');
    }
  }

  return { start, stop, sweep };
}
