/**
 * Funil de onboarding (S05).
 *
 * Eventos tipados que medem o tempo entre cadastro e percepção de valor.
 * Sem isto o funil register → project → upload fica cego (decisão arquitetural
 * S05). Envolve o singleton `analytics` — não cria provider novo.
 */
import { analytics } from './Analytics';

export type OnboardingStep =
  | 'register_completed'
  | 'project_created'
  | 'upload_started'
  | 'upload_finished';

export interface OnboardingFunnelProps {
  /** ms desde o passo anterior do funil (time-to-value parcial). */
  elapsedMs?: number;
  projectId?: string;
  modelId?: string;
  fileSizeBytes?: number;
  [key: string]: unknown;
}

/** Emite um evento do funil de onboarding. Best-effort (nunca lança). */
export function trackOnboarding(step: OnboardingStep, props: OnboardingFunnelProps = {}): void {
  try {
    void analytics.track(step, { funnel: 'onboarding', ...props });
  } catch {
    // Telemetria nunca quebra o fluxo do usuário.
  }
}

/**
 * Cronômetro do funil: marca o início e calcula `elapsedMs` em cada passo.
 * Útil pra medir a meta de "< 2 minutos do cadastro ao primeiro upload".
 */
export function createFunnelTimer(now: () => number = () => Date.now()) {
  let last = now();
  return {
    step(step: OnboardingStep, props: OnboardingFunnelProps = {}): void {
      const t = now();
      trackOnboarding(step, { elapsedMs: t - last, ...props });
      last = t;
    },
  };
}
