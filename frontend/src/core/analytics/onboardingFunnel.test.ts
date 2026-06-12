import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackMock = vi.fn();
vi.mock('./Analytics', () => ({ analytics: { track: (...a: unknown[]) => trackMock(...a) } }));

import { trackOnboarding, createFunnelTimer } from './onboardingFunnel';

describe('onboardingFunnel', () => {
  beforeEach(() => trackMock.mockClear());

  it('trackOnboarding emits event with funnel tag + props', () => {
    trackOnboarding('project_created', { projectId: 'p1' });
    expect(trackMock).toHaveBeenCalledWith('project_created', { funnel: 'onboarding', projectId: 'p1' });
  });

  it('never throws if analytics.track throws', () => {
    trackMock.mockImplementationOnce(() => { throw new Error('boom'); });
    expect(() => trackOnboarding('register_completed')).not.toThrow();
  });

  it('createFunnelTimer computes elapsedMs between steps', () => {
    let t = 1000;
    const timer = createFunnelTimer(() => t);
    t = 1000; timer.step('register_completed');
    t = 3500; timer.step('project_created');
    const second = trackMock.mock.calls[1];
    expect(second[0]).toBe('project_created');
    expect((second[1] as { elapsedMs: number }).elapsedMs).toBe(2500);
  });
});
