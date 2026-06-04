/**
 * B1 — Token Expiry Monitor
 * Decodes the JWT exp claim, warns the user 2 min before expiry,
 * and auto-refreshes if the user is active.
 */

type OnWarnCallback = (secondsLeft: number) => void;
type OnExpiredCallback = () => void;
type OnRefreshedCallback = (newTokens: { accessToken: string; refreshToken: string }) => void;

interface TokenExpiryMonitorOptions {
  /** Called when < warnBeforeMs left. Show modal/banner. */
  onWarn: OnWarnCallback;
  /** Called when token is expired and user is idle (no auto-refresh). */
  onExpired: OnExpiredCallback;
  /** Called after a successful silent refresh. */
  onRefreshed: OnRefreshedCallback;
  /** How many ms before expiry to warn. Default 120_000 (2 min). */
  warnBeforeMs?: number;
  /** Refresh endpoint URL. Default '/api/v1/auth/refresh'. */
  refreshUrl?: string;
  /** Storage key for token pair. Default 'auth_tokens'. */
  storageKey?: string;
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null; // ms
  } catch {
    return null;
  }
}

export class TokenExpiryMonitor {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private lastActivity = Date.now();
  private readonly opts: Required<TokenExpiryMonitorOptions>;

  constructor(opts: TokenExpiryMonitorOptions) {
    this.opts = {
      warnBeforeMs: 120_000,
      refreshUrl: '/api/v1/auth/refresh',
      storageKey: 'auth_tokens',
      ...opts,
    };
    // Track user activity for idle detection
    const mark = () => { this.lastActivity = Date.now(); };
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(e =>
      window.addEventListener(e, mark, { passive: true }),
    );
  }

  /** Start monitoring the current token in storage. */
  start(): void {
    this.active = true;
    this.schedule();
  }

  stop(): void {
    this.active = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  /** Call after login or token refresh to reset the timer. */
  reset(): void {
    if (this.active) this.schedule();
  }

  private getTokens(): { accessToken: string; refreshToken: string } | null {
    try {
      const raw = localStorage.getItem(this.opts.storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    const tokens = this.getTokens();
    if (!tokens?.accessToken) return;

    const exp = decodeJwtExp(tokens.accessToken);
    if (!exp) return;

    const now = Date.now();
    const msLeft = exp - now;

    if (msLeft <= 0) {
      this.opts.onExpired();
      return;
    }

    // Schedule warn or expiry check
    const fireAt = msLeft > this.opts.warnBeforeMs
      ? msLeft - this.opts.warnBeforeMs
      : 0;

    this.timer = setTimeout(() => this.handleNearExpiry(exp, tokens), fireAt);
  }

  private async handleNearExpiry(exp: number, tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    if (!this.active) return;

    const msLeft = exp - Date.now();
    const idleMs = Date.now() - this.lastActivity;
    const isIdle = idleMs > this.opts.warnBeforeMs;

    if (isIdle) {
      // User inactive — warn, don't auto-refresh
      this.opts.onWarn(Math.max(0, Math.round(msLeft / 1000)));
      // Schedule expiry callback
      if (msLeft > 0) {
        this.timer = setTimeout(() => this.opts.onExpired(), msLeft);
      } else {
        this.opts.onExpired();
      }
      return;
    }

    // User active — silent refresh
    try {
      const res = await fetch(this.opts.refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!res.ok) throw new Error(`refresh failed: ${res.status}`);

      const data = await res.json() as { token?: string; refreshToken?: string; accessToken?: string };
      const newAccess = data.token ?? data.accessToken ?? '';
      const newRefresh = data.refreshToken ?? tokens.refreshToken;

      if (newAccess) {
        const updated = { accessToken: newAccess, refreshToken: newRefresh };
        localStorage.setItem(this.opts.storageKey, JSON.stringify(updated));
        this.opts.onRefreshed(updated);
        this.schedule(); // reschedule with new expiry
      }
    } catch {
      this.opts.onWarn(Math.max(0, Math.round((exp - Date.now()) / 1000)));
    }
  }
}
