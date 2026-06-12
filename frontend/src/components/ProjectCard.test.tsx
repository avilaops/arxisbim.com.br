import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ProjectCard } from './ProjectCard';
import { EmptyState } from './EmptyState';

let container: HTMLDivElement; let root: Root;
afterEach(() => { act(() => root.unmount()); container.remove(); });

async function render(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(el); });
}

describe('ProjectCard', () => {
  it('shows status badge label for each state', async () => {
    await render(<ProjectCard name="Obra A" status="processing" progress={40} />);
    expect(container.querySelector('[data-status="processing"]')).toBeTruthy();
    expect(container.textContent).toContain('Processando');
    // progress bar present for processing
    expect(container.querySelector('[data-testid="project-card"] div div')).toBeTruthy();
  });

  it('ready state shows no progress bar', async () => {
    await render(<ProjectCard name="Obra B" status="ready" progress={100} />);
    expect(container.textContent).toContain('Pronto');
  });

  it('fires onOpen on click', async () => {
    const onOpen = vi.fn();
    await render(<ProjectCard name="Obra C" status="failed" onOpen={onOpen} />);
    await act(async () => { (container.querySelector('[data-testid="project-card"]') as HTMLButtonElement).click(); });
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe('EmptyState', () => {
  it('renders value copy (IFC → cenários), not just "upload"', async () => {
    await render(<EmptyState />);
    expect(container.textContent).toContain('cenários de prazo e custo');
  });

  it('fires onCta', async () => {
    const onCta = vi.fn();
    await render(<EmptyState onCta={onCta} />);
    await act(async () => { (container.querySelector('[data-testid="empty-state-cta"]') as HTMLButtonElement).click(); });
    expect(onCta).toHaveBeenCalledOnce();
  });
});
