/**
 * LoadingManager - Gerencia estados de carregamento com progresso e timeout
 */
export interface LoadingManagerOptions {
  timeoutDurationMs?: number;
  resetOnSameProgress?: boolean;
  onTimeout?: () => void;
  onComplete?: (elapsedMs: number) => void;
  debug?: boolean;
}

export class LoadingManager {
  private loadingEl: HTMLElement | null;
  private stageEl: HTMLElement | null;
  private detailEl: HTMLElement | null;
  private progressEl: HTMLElement | null;
  private recoveryEl: HTMLElement | null;

  private startTime: number;
  private timeoutId: number | null = null;
  private timeoutDurationMs: number;
  private completed = false;

  private lastStage = '';
  private lastDetail = '';
  private lastProgress = 0;

  private onTimeout?: () => void;
  private onComplete?: (elapsedMs: number) => void;
  private debug: boolean;
  private resetOnSameProgress: boolean;

  constructor(options: LoadingManagerOptions = {}) {
    this.loadingEl = document.getElementById('loading');
    this.stageEl = document.getElementById('loading-stage');
    this.detailEl = document.getElementById('loading-detail');
    this.progressEl = document.getElementById('loading-progress');
    this.recoveryEl = document.getElementById('loading-recovery');

    this.startTime = Date.now();
    this.timeoutDurationMs = options.timeoutDurationMs ?? 15000;
    this.onTimeout = options.onTimeout;
    this.onComplete = options.onComplete;
    this.debug = options.debug ?? false;
    this.resetOnSameProgress = options.resetOnSameProgress ?? false;

    // Se não existe container de loading, evita rodar lógica inútil
    if (!this.loadingEl) {
      console.warn('LoadingManager: #loading element not found, disabling');
      return;
    }

    // Marca como "carregando" (a11y)
    this.loadingEl.setAttribute('aria-busy', 'true');

    this.startTimeout();
  }

  /**
   * Atualiza estágio do carregamento
   */
  public setStage(stage: string, detail: string, progress: number): void {
    if (this.completed) return;
    if (!this.loadingEl) return;

    // Clamp progress 0-100
    const clamped = Math.max(0, Math.min(100, Math.round(progress)));

    if (this.stageEl) this.stageEl.textContent = stage;
    if (this.detailEl) this.detailEl.textContent = detail;

    if (this.progressEl) {
      this.progressEl.style.width = `${clamped}%`;
      this.progressEl.setAttribute('role', 'progressbar');
      this.progressEl.setAttribute('aria-valuemin', '0');
      this.progressEl.setAttribute('aria-valuemax', '100');
      this.progressEl.setAttribute('aria-valuenow', String(clamped));
    }

    const stageChanged = stage !== this.lastStage;
    const detailChanged = detail !== this.lastDetail;
    const progressIncreased = clamped > this.lastProgress;

    // Resetar timeout apenas quando houve avanço real
    if (progressIncreased || stageChanged || detailChanged || this.resetOnSameProgress) {
      this.resetTimeout();
    }

    this.lastStage = stage;
    this.lastDetail = detail;
    this.lastProgress = clamped;
  }

  /**
   * Completa carregamento e esconde
   */
  public complete(): void {
    if (this.completed) return;
    this.completed = true;

    if (!this.loadingEl) return;

    this.clearTimeout();

    const elapsed = Date.now() - this.startTime;

    // a11y
    this.loadingEl.setAttribute('aria-busy', 'false');

    // Oculta + remove após transição
    this.loadingEl.classList.add('hidden');

    const el = this.loadingEl;
    let removed = false;

    const cleanup = () => {
      if (removed) return;
      removed = true;
      el.removeEventListener('transitionend', cleanup);
      el.remove();
    };

    el.addEventListener('transitionend', cleanup, { once: true });

    // Fallback caso não exista transition
    window.setTimeout(cleanup, 400);

    if (this.debug) {
      console.log(`✅ Loading completed in ${elapsed}ms`);
    }

    this.onComplete?.(elapsed);
  }

  /**
   * Cancela explicitamente (ex.: navegação/abort)
   */
  public cancel(): void {
    this.clearTimeout();
    this.completed = true;
  }

  /**
   * Mostra ações de recovery
   */
  private showRecovery(): void {
    if (this.completed) return;
    if (this.recoveryEl) this.recoveryEl.style.display = 'block';

    if (this.debug) {
      console.warn('⏱️ Loading timeout - showing recovery actions');
    }

    this.onTimeout?.();
  }

  /**
   * Inicia timeout
   */
  private startTimeout(): void {
    this.timeoutId = window.setTimeout(() => {
      this.showRecovery();
    }, this.timeoutDurationMs);
  }

  /**
   * Reseta timeout
   */
  private resetTimeout(): void {
    this.clearTimeout();
    this.startTimeout();
  }

  /**
   * Limpa timeout
   */
  private clearTimeout(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
