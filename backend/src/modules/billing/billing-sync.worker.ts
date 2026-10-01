/**
 * Worker de sincronização com o provedor de cobrança.
 *
 * A notificação (webhook) do Mercado Pago não é garantida: em preapproval o
 * MP notifica a URL cadastrada na aplicação, uma só para a conta inteira da
 * Avila Ops. Sem esta varredura, um cliente que cadastrou o cartão poderia
 * ficar com o plano antigo, e uma cobrança recusada passaria despercebida.
 *
 * Cadência lenta (default 6h, mínimo 15min): cada tenant custa duas ou três
 * chamadas à API do provedor.
 */
export type BillingSyncWorkerOptions = {
  intervalMs: number;
  logger: { info: (...a: any[]) => void; error: (...a: any[]) => void };
  syncProviderSubscriptions: (limit?: number) => Promise<{ synced: number; failed: number; skipped?: boolean }>;
  batchSize?: number;
  /** Atraso do primeiro ciclo depois do start (default: 1 minuto). */
  initialDelayMs?: number;
};

export function createBillingSyncWorker(options: BillingSyncWorkerOptions) {
  const { intervalMs, logger, syncProviderSubscriptions, batchSize = 200 } = options;
  const initialDelayMs = options.initialDelayMs ?? 60_000;
  let timer: NodeJS.Timeout | null = null;
  let initialTimer: NodeJS.Timeout | null = null;
  let running = false;
  let lastRunAt: Date | null = null;
  let lastResult: { synced: number; failed: number; skipped?: boolean } | null = null;

  async function sweep() {
    if (running) return { synced: 0, failed: 0 };
    running = true;
    try {
      const result = await syncProviderSubscriptions(batchSize);
      lastRunAt = new Date();
      lastResult = result;
      if (result.synced > 0 || result.failed > 0) {
        logger.info({ synced: result.synced, failed: result.failed }, '[billing-sync] sweep complete');
      }
      return result;
    } finally {
      running = false;
    }
  }

  function start() {
    if (timer) return;
    logger.info(`[billing-sync] worker started (interval=${intervalMs}ms, batch=${batchSize})`);
    initialTimer = setTimeout(() => {
      sweep().catch((err) => logger.error({ err }, '[billing-sync] initial sweep error'));
    }, initialDelayMs);
    timer = setInterval(() => {
      sweep().catch((err) => logger.error({ err }, '[billing-sync] sweep error'));
    }, intervalMs);
  }

  function stop() {
    if (initialTimer) {
      clearTimeout(initialTimer);
      initialTimer = null;
    }
    if (timer) {
      clearInterval(timer);
      timer = null;
      logger.info('[billing-sync] worker stopped');
    }
  }

  return {
    start,
    stop,
    sweep,
    isRunning: () => running,
    getStatus: () => ({
      started: timer !== null,
      running,
      intervalMs,
      batchSize,
      lastRunAt: lastRunAt?.toISOString() ?? null,
      lastResult,
    }),
  };
}
