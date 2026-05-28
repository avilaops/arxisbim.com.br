import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 4 PR #4 — Selection actions floating bar.
 *
 * Programmatically inserts a Three.js mesh into the scene, selects it via
 * SelectionService, and verifies the floating bar (focus/hide/isolate/show-all)
 * is wired up and mutates `mesh.visible` correctly.
 */

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:3001';
const EMAIL = process.env.E2E_EMAIL ?? 'admin@arxisvr.local';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Demo@1234';
const TENANT_HEADER = process.env.E2E_TENANT ?? 'arxisvr-demo-098b9c';

async function authedGoto(page: Page, path: string): Promise<void> {
  const res = await page.request.post(`${API_BASE}/api/v1/auth/login`, {
    headers: { 'x-tenant-id': TENANT_HEADER },
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.ok(), `login failed (${res.status()})`).toBeTruthy();
  const body = await res.json();
  const token = body?.data?.accessToken ?? body?.accessToken;
  expect(token).toBeTruthy();
  await page.addInitScript(([t]) => localStorage.setItem('arxisvr_token', t), [token]);
  await page.goto(path);
}

async function waitForViewer(page: Page): Promise<void> {
  await expect.poll(
    async () =>
      page.evaluate(() => {
        const h = (window as unknown as { __viewerHost?: { scene?: unknown } }).__viewerHost;
        return !!(h && h.scene);
      }),
    { timeout: 15_000 },
  ).toBe(true);
}

async function seedAndSelectMesh(page: Page): Promise<string> {
  return await page.evaluate(async () => {
    const bridgePath = '/src/__test_bridge__/index.ts';
    const { THREE, selectionService } = await import(/* @vite-ignore */ bridgePath);
    const host = (window as any).__viewerHost;
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.name = 'e2e-test-cube';
    host.scene.add(mesh);
    selectionService.setSelected({
      object3D: mesh,
      id: mesh.uuid,
      type: 'mesh',
    });
    return mesh.uuid;
  });
}

test.describe('selection-actions (Sprint 4)', () => {
  test('floating bar appears when an object is selected', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    await seedAndSelectMesh(page);

    const bar = page.locator('.selection-actions');
    await expect(bar).toBeVisible();
    await expect(bar.locator('button[data-act="focus"]')).toBeVisible();
    await expect(bar.locator('button[data-act="hide"]')).toBeVisible();
    await expect(bar.locator('button[data-act="isolate"]')).toBeVisible();
  });

  test('hide sets mesh.visible=false and show-all restores it', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    const uuid = await seedAndSelectMesh(page);

    await page.locator('.selection-actions button[data-act="hide"]').click();

    const hiddenState = await page.evaluate((id) => {
      const host = (window as any).__viewerHost;
      let found: any = null;
      host.scene.traverse((o: any) => {
        if (o.uuid === id) found = o;
      });
      return found?.visible;
    }, uuid);
    expect(hiddenState).toBe(false);

    // show-all button only appears when something is hidden
    const showAll = page.locator('.selection-actions button[data-act="show-all"]');
    await expect(showAll).toBeVisible();
    await showAll.click();

    const restoredState = await page.evaluate((id) => {
      const host = (window as any).__viewerHost;
      let found: any = null;
      host.scene.traverse((o: any) => {
        if (o.uuid === id) found = o;
      });
      return found?.visible;
    }, uuid);
    expect(restoredState).toBe(true);
  });

  test('focus button updates camera position', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    await seedAndSelectMesh(page);

    const before = await page.evaluate(() => {
      const c = (window as any).__viewerHost.camera;
      return { x: c.position.x, y: c.position.y, z: c.position.z };
    });

    await page.locator('.selection-actions button[data-act="focus"]').click();

    const after = await page.evaluate(() => {
      const c = (window as any).__viewerHost.camera;
      return { x: c.position.x, y: c.position.y, z: c.position.z };
    });

    expect(before).not.toEqual(after);
  });
});
