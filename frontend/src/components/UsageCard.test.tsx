import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UsageCard } from './UsageCard';
import type { CurrentBillingResponse } from '../api/v1/services/billing.service';

function makeCurrent(over = false): CurrentBillingResponse {
  return {
    tenantId: 't1',
    tenantName: 'T',
    subscription: {
      plan: 'free', status: 'active', billingCycle: 'monthly', currency: 'BRL',
      amountCents: 0, currentPeriodStart: null, currentPeriodEnd: null, trialEndsAt: null,
      cancelAtPeriodEnd: false, provider: 'internal', providerCustomerId: null, providerSubscriptionId: null,
      features: [], limits: { maxUsers: 2, maxProjects: 3, maxStorageGB: 5, maxFileSizeMB: 50, collaboratorsPerSession: 2, apiCallsPerMonth: 0 } as any,
    } as any,
    usage: { users: 1, projects: over ? 9 : 2, storageGB: 1.2 },
    overLimit: { users: false, projects: over, storage: false },
  } as any;
}

let container: HTMLDivElement; let root: Root;
afterEach(() => { act(() => root.unmount()); container.remove(); });

async function render(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(el); });
}

describe('UsageCard', () => {
  it('renders success with plan + usage bars', async () => {
    await render(<UsageCard fetchCurrent={async () => makeCurrent()} />);
    expect(container.querySelector('[data-testid="usage-card"]')).toBeTruthy();
    expect(container.textContent).toContain('free');
    expect(container.textContent).toContain('2 / 3'); // projetos
  });

  it('renders error state on rejection', async () => {
    await render(<UsageCard fetchCurrent={async () => { throw new Error('falhou'); }} />);
    expect(container.querySelector('[data-testid="usage-card-error"]')).toBeTruthy();
    expect(container.textContent).toContain('falhou');
  });
});
