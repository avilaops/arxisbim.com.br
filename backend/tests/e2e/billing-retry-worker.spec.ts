import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBillingRetryWorker } from '../../src/modules/billing/billing-retry.worker.js';

function createLogger() {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

describe('billing retry worker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('runs immediately and on interval when enabled', async () => {
    vi.useFakeTimers();

    const onSweepSuccess = vi.fn();
    const processDueStripeRetries = vi.fn().mockResolvedValue({
      processed: 1,
      succeeded: 1,
      failed: 0,
    });
    const logger = createLogger();

    const worker = createBillingRetryWorker({
      enabled: true,
      intervalMs: 1000,
      batchSize: 7,
      logger,
      processDueStripeRetries,
      onSweepSuccess,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(processDueStripeRetries).toHaveBeenCalledTimes(1);
    expect(processDueStripeRetries).toHaveBeenLastCalledWith(undefined, 7);
    expect(onSweepSuccess).toHaveBeenCalledTimes(1);

    const statusAfterFirstRun = worker.getStatus();
    expect(statusAfterFirstRun.enabled).toBe(true);
    expect(statusAfterFirstRun.started).toBe(true);
    expect(statusAfterFirstRun.stats.totalRuns).toBe(1);
    expect(statusAfterFirstRun.stats.totalProcessed).toBe(1);
    expect(statusAfterFirstRun.stats.lastSuccessAt).not.toBeNull();

    await vi.advanceTimersByTimeAsync(1000);

    expect(processDueStripeRetries).toHaveBeenCalledTimes(2);
    expect(worker.isStarted()).toBe(true);

    worker.stop();
    expect(worker.isStarted()).toBe(false);
    expect(worker.getStatus().started).toBe(false);
  });

  it('does not overlap runs while previous sweep is in progress', async () => {
    vi.useFakeTimers();

    let resolveFirstRun: (() => void) | null = null;
    const firstRunPromise = new Promise<void>((resolve) => {
      resolveFirstRun = resolve;
    });

    const processDueStripeRetries = vi
      .fn()
      .mockReturnValueOnce(firstRunPromise)
      .mockResolvedValue({ processed: 0, succeeded: 0, failed: 0 });

    const logger = createLogger();

    const worker = createBillingRetryWorker({
      enabled: true,
      intervalMs: 1000,
      batchSize: 5,
      logger,
      processDueStripeRetries,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(processDueStripeRetries).toHaveBeenCalledTimes(1);
    expect(worker.isRunning()).toBe(true);

    await vi.advanceTimersByTimeAsync(3000);

    // still one call because first run has not resolved yet
    expect(processDueStripeRetries).toHaveBeenCalledTimes(1);

    resolveFirstRun?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(worker.isRunning()).toBe(false);

    await vi.advanceTimersByTimeAsync(1000);
    expect(processDueStripeRetries).toHaveBeenCalledTimes(2);

    worker.stop();
  });

  it('stays idle when disabled', async () => {
    vi.useFakeTimers();

    const processDueStripeRetries = vi.fn().mockResolvedValue({
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
    const logger = createLogger();

    const worker = createBillingRetryWorker({
      enabled: false,
      intervalMs: 1000,
      batchSize: 3,
      logger,
      processDueStripeRetries,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(5000);

    expect(processDueStripeRetries).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Billing retry worker disabled by env');
    expect(worker.isStarted()).toBe(false);
  });

  it('tracks errors and calls onSweepError hook', async () => {
    vi.useFakeTimers();

    const onSweepError = vi.fn();
    const processDueStripeRetries = vi.fn().mockRejectedValue(new Error('retry boom'));
    const logger = createLogger();

    const worker = createBillingRetryWorker({
      enabled: true,
      intervalMs: 1000,
      batchSize: 3,
      logger,
      processDueStripeRetries,
      onSweepError,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(onSweepError).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();

    const status = worker.getStatus();
    expect(status.stats.totalRuns).toBe(1);
    expect(status.stats.lastErrorAt).not.toBeNull();
    expect(status.stats.lastErrorMessage).toBe('retry boom');
    expect(status.stats.consecutiveFailures).toBe(1);

    worker.stop();
  });
});
