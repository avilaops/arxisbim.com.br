import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Shell } from './Shell';

let container: HTMLDivElement; let root: Root;
afterEach(() => { act(() => root.unmount()); container.remove(); });

async function render(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(el); });
}

describe('Shell', () => {
  it('renders brand, nav items and children', async () => {
    await render(
      <Shell
        brand="ArxisVR"
        nav={[{ id: 'dash', label: 'Dashboard', active: true }]}
      >
        <div data-testid="page">conteúdo</div>
      </Shell>,
    );
    expect(container.querySelector('[data-testid="shell"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="shell-nav-dash"][data-active="true"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="page"]')).toBeTruthy();
  });

  it('fires nav item onClick', async () => {
    const onClick = vi.fn();
    await render(<Shell nav={[{ id: 'proj', label: 'Projetos', onClick }]} />);
    await act(async () => {
      (container.querySelector('[data-testid="shell-nav-proj"]') as HTMLButtonElement).click();
    });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('toggle button and backdrop drive onToggleNav', async () => {
    const onToggleNav = vi.fn();
    await render(<Shell navOpen onToggleNav={onToggleNav} />);
    await act(async () => {
      (container.querySelector('[data-testid="shell-nav-toggle"]') as HTMLButtonElement).click();
    });
    // backdrop only present when navOpen
    expect(container.querySelector('[data-testid="shell-backdrop"]')).toBeTruthy();
    await act(async () => {
      (container.querySelector('[data-testid="shell-backdrop"]') as HTMLDivElement).click();
    });
    expect(onToggleNav).toHaveBeenCalledTimes(2);
  });

  it('renders injected headerRight and sidebarFooter slots (no business fetch)', async () => {
    await render(
      <Shell
        headerRight={<span data-testid="hr">plano</span>}
        sidebarFooter={<span data-testid="sf">usage</span>}
      />,
    );
    expect(container.querySelector('[data-testid="hr"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="sf"]')).toBeTruthy();
  });
});
