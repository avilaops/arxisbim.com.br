import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  recordRequest, recordUpload, recordAuthFailure, recordDbQuery, emitMetric,
} from '../../src/core/observability/metrics.js';

let logSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => { logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { logSpy.mockRestore(); });

function lastMetrics(): any[] {
  return logSpy.mock.calls.map((c) => JSON.parse(c[0] as string)).filter((o) => o.message === 'metric');
}

describe('metrics', () => {
  it('recordRequest emits requests_total + requests_duration_ms', () => {
    recordRequest(42, { method: 'GET', route: '/api/v1/projects', status: 200 });
    const m = lastMetrics();
    expect(m.find((x) => x.metric === 'requests_total')?.value).toBe(1);
    const dur = m.find((x) => x.metric === 'requests_duration_ms');
    expect(dur?.value).toBe(42);
    expect(dur?.route).toBe('/api/v1/projects');
  });

  it('recordUpload emits uploads_failed only on failure', () => {
    recordUpload(true);
    expect(lastMetrics().some((x) => x.metric === 'uploads_failed')).toBe(false);
    logSpy.mockClear();
    recordUpload(false);
    expect(lastMetrics().some((x) => x.metric === 'uploads_failed')).toBe(true);
    expect(lastMetrics().some((x) => x.metric === 'uploads_total')).toBe(true);
  });

  it('recordAuthFailure + recordDbQuery emit named metrics', () => {
    recordAuthFailure('invalid_token', { route: '/x' });
    recordDbQuery(7, 'select_projects');
    const m = lastMetrics();
    expect(m.find((x) => x.metric === 'auth_failures')?.reason).toBe('invalid_token');
    expect(m.find((x) => x.metric === 'db_query_duration_ms')?.value).toBe(7);
  });

  it('emitMetric redacts sensitive labels', () => {
    emitMetric('requests_total', 1, { token: 'leak' } as any);
    expect(lastMetrics()[0].token).toBe('[REDACTED]');
  });
});
