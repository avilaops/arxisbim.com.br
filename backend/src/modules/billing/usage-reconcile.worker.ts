/**
 * Worker de reconciliação de uso (tenant_usage).
 *
 * Cadência lenta (default 24h): recalcula os counters de uso de todos os tenants
 * a partir das tabelas-fonte, corrigindo drift acumulado pelos incrementos. Full
 * scan — por isso roda raramente, separado do sweep de retry (que roda por minuto).
 */
export type UsageReconcileWorkerOptions = {
  intervalMs: number;
  logger: { info: (...a: any[]) => void; error: (...a: any[]) => void };
  reconcileAllUsage: (limit?: number) => Promise<{ reconciled: number }>;
  batchSize?: number;
};

export function createUsageReconcileWorker(options: UsageReconcileWorkerOptions) {
  const { intervalMs, logger, reconcileAllUsage, batchSize = 500 } = options;
  let timer: NodeJS.Timeout | null = null;
  let running = false;

  async function sweep(): Promise<{ reconciled: number }> {
    if (running) return { reconciled: 0 };
    running = true;
    try {
      const result = await reconcileAllUsage(batchSize);
      if (result.reconciled > 0) {
        logger.info('[usage-reconcile] sweep complete', { reconciled: result.reconciled });
      }
      return result;
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) return;
    logger.info(`[usage-reconcile] worker started (interval=${intervalMs}ms, batch=${batchSize})`);
    timer = setInterval(() => {
      sweep().catch(err => logger.error('[usage-reconcile] sweep error:', err));
    }, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      logger.info('[usage-reconcile] worker stopped');
    }
  }

  return { start, stop, sweep, isRunning: () => running };
}
