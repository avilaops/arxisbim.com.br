import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackendAnalyticsProvider } from './BackendAnalyticsProvider';
import type { AnalyticsEvent } from './Analytics';

function ev(name: string, extra: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return { name, timestamp: 123, ...extra };
}

let fetchSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  fetchSpy = vi.fn(() => Promise.resolve({ ok: true } as Response));
  vi.stubGlobal('fetch', fetchSpy);
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('BackendAnalyticsProvider', () => {
  it('flushes a batch via fetch to /api/v1/track after interval', () => {
    const p = new BackendAnalyticsProvider({ baseUrl: 'http://api.test', flushIntervalMs: 1000 });
    p.track(ev('register_completed'));
    expect(fetchSpy).not.toHaveBeenCalled(); // batched
    vi.advanceTimersByTime(1000);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/track');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.events[0].name).toBe('register_completed');
    expect(body.events[0].anonId).toBeTruthy(); // anon id estável gerado
    expect((init as RequestInit).keepalive).toBe(true);
  });

  it('does not duplicate /api/v1 when baseUrl already versioned', () => {
    const p = new BackendAnalyticsProvider({ baseUrl: 'http://api.test/api/v1', flushIntervalMs: 10 });
    p.track(ev('project_created'));
    vi.advanceTimersByTime(10);
    expect(fetchSpy.mock.calls[0][0]).toBe('http://api.test/api/v1/track');
  });

  it('flushes immediately when batchSize reached and attaches Bearer when token present', () => {
    const p = new BackendAnalyticsProvider({ baseUrl: 'http://api.test', batchSize: 2, getToken: () => 'jwt123' });
    p.track(ev('upload_started'));
    expect(fetchSpy).not.toHaveBeenCalled();
    p.track(ev('upload_finished'));
    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jwt123');
    expect(JSON.parse(init.body as string).events).toHaveLength(2);
  });

  it('uses sendBeacon on flush(useBeacon)', () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon: beacon });
    const p = new BackendAnalyticsProvider({ baseUrl: 'http://api.test' });
    p.track(ev('upload_finished'));
    p.flush(true);
    expect(beacon).toHaveBeenCalledOnce();
    expect(beacon.mock.calls[0][0]).toBe('http://api.test/api/v1/track');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('never throws when transport missing', () => {
    vi.stubGlobal('fetch', undefined);
    vi.stubGlobal('navigator', {});
    const p = new BackendAnalyticsProvider({ baseUrl: 'http://api.test' });
    expect(() => { p.track(ev('register_completed')); p.flush(); }).not.toThrow();
  });
});
