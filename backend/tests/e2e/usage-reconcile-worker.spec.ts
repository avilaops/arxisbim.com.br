import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUsageReconcileWorker } from '../../src/modules/billing/usage-reconcile.worker.js';

function logger() {
  return { info: vi.fn(), error: vi.fn() };
}

describe('usage reconcile worker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('runs reconcileAllUsage on each interval tick', async () => {
    vi.useFakeTimers();
    const reconcileAllUsage = vi.fn().mockResolvedValue({ reconciled: 3 });
    const worker = createUsageReconcileWorker({ intervalMs: 1000, logger: logger(), reconcileAllUsage, batchSize: 50 });

    worker.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(reconcileAllUsage).toHaveBeenCalledWith(50);

    await vi.advanceTimersByTimeAsync(1000);
    expect(reconcileAllUsage).toHaveBeenCalledTimes(2);
    worker.stop();
  });

  it('sweep is reentrancy-guarded', async () => {
    let resolveFn: () => void = () => {};
    const reconcileAllUsage = vi.fn().mockImplementation(
      () => new Promise<{ reconciled: number }>((res) => { resolveFn = () => res({ reconciled: 0 }); }),
    );
    const worker = createUsageReconcileWorker({ intervalMs: 1000, logger: logger(), reconcileAllUsage });

    const first = worker.sweep();
    const second = await worker.sweep(); // blocked while first is in flight
    expect(second).toEqual({ reconciled: 0 });
    expect(reconcileAllUsage).toHaveBeenCalledTimes(1);
    resolveFn();
    await first;
  });
});
