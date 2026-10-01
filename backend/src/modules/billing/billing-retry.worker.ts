type RetryResult = {
  processed: number;
  succeeded: number;
  failed: number;
};

type RetryWorkerLogger = {
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

type RetryProcessor = (tenantId?: string, limit?: number) => Promise<RetryResult>;

export type BillingRetrySweepContext = {
  durationMs: number;
  timestamp: string;
};

type RetryWorkerHooks = {
  onSweepSuccess?: (result: RetryResult, context: BillingRetrySweepContext) => Promise<void> | void;
  onSweepError?: (error: unknown, context: BillingRetrySweepContext) => Promise<void> | void;
};

export type BillingRetryWorkerStatus = {
  enabled: boolean;
  started: boolean;
  running: boolean;
  intervalMs: number;
  batchSize: number;
  stats: {
    startedAt: string | null;
    lastRunStartedAt: string | null;
    lastRunFinishedAt: string | null;
    lastSuccessAt: string | null;
    lastErrorAt: string | null;
    lastErrorMessage: string | null;
    totalRuns: number;
    totalProcessed: number;
    totalSucceeded: number;
    totalFailed: number;
    consecutiveFailures: number;
  };
};

export type BillingRetryWorkerOptions = {
  enabled: boolean;
  intervalMs: number;
  batchSize: number;
  logger: RetryWorkerLogger;
  processDueRetries: RetryProcessor;
} & RetryWorkerHooks;

export function createBillingRetryWorker(options: BillingRetryWorkerOptions) {
  let timer: NodeJS.Timeout | null = null;
  let running = false;
  let startedAt: Date | null = null;
  let lastRunStartedAt: Date | null = null;
  let lastRunFinishedAt: Date | null = null;
  let lastSuccessAt: Date | null = null;
  let lastErrorAt: Date | null = null;
  let lastErrorMessage: string | null = null;
  let totalRuns = 0;
  let totalProcessed = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let consecutiveFailures = 0;

  const runSweep = async () => {
    if (!options.enabled || running) {
      return;
    }

    const runStartedAt = new Date();
    const runStartMs = Date.now();
    lastRunStartedAt = runStartedAt;
    running = true;
    totalRuns += 1;

    try {
      const result = await options.processDueRetries(undefined, options.batchSize);
      const durationMs = Date.now() - runStartMs;
      const context: BillingRetrySweepContext = {
        durationMs,
        timestamp: runStartedAt.toISOString(),
      };

      totalProcessed += result.processed;
      totalSucceeded += result.succeeded;
      totalFailed += result.failed;
      consecutiveFailures = result.failed > 0 ? consecutiveFailures + 1 : 0;
      lastSuccessAt = new Date();
      if (result.failed === 0) {
        lastErrorMessage = null;
      }

      if (options.onSweepSuccess) {
        await options.onSweepSuccess(result, context);
      }

      if (result.processed > 0 || result.failed > 0) {
        options.logger.info({
          processed: result.processed,
          succeeded: result.succeeded,
          failed: result.failed,
          durationMs,
        }, 'Billing retry worker processed due webhook events');
      }
    } catch (error) {
      const durationMs = Date.now() - runStartMs;
      const errorMessage = error instanceof Error ? error.message : String(error);

      lastErrorAt = new Date();
      lastErrorMessage = errorMessage;
      consecutiveFailures += 1;

      if (options.onSweepError) {
        await options.onSweepError(error, {
          durationMs,
          timestamp: runStartedAt.toISOString(),
        });
      }

      options.logger.error({ err: error }, 'Billing retry worker failed');
    } finally {
      lastRunFinishedAt = new Date();
      running = false;
    }
  };

  const start = () => {
    if (!options.enabled) {
      options.logger.info('Billing retry worker disabled by env');
      return;
    }

    if (timer) {
      return;
    }

    startedAt = new Date();

    runSweep().catch((error) => {
      options.logger.error({ err: error }, 'Initial billing retry sweep failed');
    });

    timer = setInterval(() => {
      runSweep().catch((error) => {
        options.logger.error({ err: error }, 'Scheduled billing retry sweep failed');
      });
    }, options.intervalMs);

    options.logger.info({
      intervalMs: options.intervalMs,
      batchSize: options.batchSize,
    }, 'Billing retry worker started');
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      options.logger.info('Billing retry worker stopped');
    }
  };

  return {
    start,
    stop,
    runSweep,
    getStatus: (): BillingRetryWorkerStatus => ({
      enabled: options.enabled,
      started: timer !== null,
      running,
      intervalMs: options.intervalMs,
      batchSize: options.batchSize,
      stats: {
        startedAt: startedAt?.toISOString() ?? null,
        lastRunStartedAt: lastRunStartedAt?.toISOString() ?? null,
        lastRunFinishedAt: lastRunFinishedAt?.toISOString() ?? null,
        lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
        lastErrorAt: lastErrorAt?.toISOString() ?? null,
        lastErrorMessage,
        totalRuns,
        totalProcessed,
        totalSucceeded,
        totalFailed,
        consecutiveFailures,
      },
    }),
    isRunning: () => running,
    isStarted: () => timer !== null,
  };
}
