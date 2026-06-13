/**
 * BackendAnalyticsProvider (S05) — persiste eventos no backend (`POST /api/v1/track`).
 *
 * Sem este provider o funil de onboarding (register/project/upload) só ia para
 * Console/LocalStorage — cego em produção, exatamente o risco que o spec S05
 * aponta ("sem medição o funil fica cego"). O endpoint é optionalAuth: anônimo
 * é aceito; com Bearer, o backend associa userId/tenantId.
 *
 * Robustez: batch + flush por timer; flush em `visibilitychange`/`pagehide` via
 * `sendBeacon` (sobrevive à navegação — crítico p/ `upload_finished`). Nunca lança:
 * telemetria não pode quebrar o fluxo do usuário.
 */
import type { AnalyticsEvent, AnalyticsProvider } from './Analytics';

const ANON_ID_KEY = 'arxis_anon_id';

export interface BackendAnalyticsOptions {
  /** Base da API. Default: VITE_API_URL ou http://localhost:3001. */
  baseUrl?: string;
  /** Getter do JWT atual (opcional). Sem token o evento entra anônimo. */
  getToken?: () => string | null;
  flushIntervalMs?: number;
  batchSize?: number;
}

interface WirePayloadEvent {
  name: string;
  category?: string;
  path?: string;
  props?: Record<string, unknown>;
  anonId?: string;
  sessionId?: string;
  ts?: number;
}

function resolveTrackUrl(baseUrl?: string): string {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || undefined;
  let base = (baseUrl || env || 'http://localhost:3001').replace(/\/$/, '');
  // base pode já vir com /api/v1 — evita /api/v1/api/v1/track.
  if (base.endsWith('/api/v1')) return `${base}/track`;
  return `${base}/api/v1/track`;
}

function getAnonId(): string | undefined {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = (globalThis.crypto?.randomUUID?.() ?? `anon-${Date.now()}-${Math.floor(Math.random() * 1e9)}`);
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return undefined; // SSR/sem storage: segue anônimo sem id estável
  }
}

export class BackendAnalyticsProvider implements AnalyticsProvider {
  public readonly name = 'backend';
  private readonly url: string;
  private readonly getToken?: () => string | null;
  private readonly flushIntervalMs: number;
  private readonly batchSize: number;
  private queue: WirePayloadEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listenersBound = false;

  constructor(opts: BackendAnalyticsOptions = {}) {
    this.url = resolveTrackUrl(opts.baseUrl);
    this.getToken = opts.getToken;
    this.flushIntervalMs = opts.flushIntervalMs ?? 2000;
    this.batchSize = opts.batchSize ?? 20;
    this.bindLifecycle();
  }

  track(event: AnalyticsEvent): void {
    this.queue.push({
      name: event.name,
      category: event.category,
      path: typeof location !== 'undefined' ? location.pathname : undefined,
      props: event.properties,
      anonId: getAnonId(),
      sessionId: event.sessionId,
      ts: event.timestamp,
    });
    if (this.queue.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), this.flushIntervalMs);
  }

  /** Envia a fila. `useBeacon` no unload (fetch não é confiável saindo da página). */
  flush(useBeacon = false): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (!this.queue.length) return;
    const events = this.queue.splice(0, this.queue.length);
    const payload = JSON.stringify({ events });

    try {
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(this.url, new Blob([payload], { type: 'application/json' }));
        return;
      }
      const token = this.getToken?.() ?? null;
      void fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: payload,
        keepalive: true, // sobrevive a navegações curtas
      }).catch(() => {
        // Telemetria nunca quebra o fluxo — descarta silenciosamente.
      });
    } catch {
      // sendBeacon/fetch indisponível: descarta.
    }
  }

  private bindLifecycle(): void {
    if (this.listenersBound || typeof window === 'undefined') return;
    this.listenersBound = true;
    const onHide = () => this.flush(true);
    window.addEventListener('pagehide', onHide);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    });
  }
}
