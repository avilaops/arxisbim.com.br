import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 5 PR #4 — QueryPanel E2E.
 *
 * Seeds the scene with a couple of meshes annotated as IfcWall, runs a
 * SQL-like query through the panel, and asserts that:
 *   - the result list populates with the expected count
 *   - BatchSelectionService receives the matched uuids
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

async function seedWalls(page: Page): Promise<number> {
  return await page.evaluate(async () => {
    const bridgePath = '/src/__test_bridge__/index.ts';
    const { THREE } = await import(/* @vite-ignore */ bridgePath);
    const host = (window as any).__viewerHost;
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const mk = (id: number, loadBearing: boolean) => {
      const m = new THREE.Mesh(geom, mat);
      m.name = `e2e-wall-${id}`;
      m.userData = {
        expressID: id,
        ifcType: 'IfcWall',
        psets: [
          { Name: 'Pset_WallCommon', HasProperties: [{ Name: 'LoadBearing', NominalValue: { value: loadBearing } }] },
        ],
      };
      host.scene.add(m);
      return m;
    };
    mk(1001, true);
    mk(1002, true);
    mk(1003, false);
    return 3;
  });
}

test.describe('query-panel (Sprint 5)', () => {
  test('runs SELECT and lists matching IfcWall elements', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    const seeded = await seedWalls(page);
    expect(seeded).toBe(3);

    const mount = page.locator('#query-panel-mount');
    await expect(mount).toBeVisible();

    const input = mount.locator('#query-input');
    await input.fill('SELECT * FROM IfcWall WHERE LoadBearing = true');

    await mount.locator('#query-run').click();

    // Status should announce match count > 0.
    await expect(mount.locator('.query-panel__status')).toContainText(/Encontrados\s+2/i);

    // Result list should have exactly the two load-bearing walls.
    const items = mount.locator('.query-panel__result-item');
    await expect(items).toHaveCount(2);
  });

  test('feeds matched uuids into BatchSelectionService', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    await seedWalls(page);

    const mount = page.locator('#query-panel-mount');
    await mount.locator('#query-input').fill('SELECT * FROM IfcWall WHERE LoadBearing = true');
    await mount.locator('#query-run').click();

    await expect(mount.locator('.query-panel__status')).toContainText(/Encontrados/i);

    const size = await page.evaluate(async () => {
      const bridgePath = '/src/__test_bridge__/index.ts';
      const { batchSelectionService } = await import(/* @vite-ignore */ bridgePath);
      return batchSelectionService.size();
    });
    expect(size).toBe(2);
  });

  test('shows parser error for malformed query', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);

    const mount = page.locator('#query-panel-mount');
    await mount.locator('#query-input').fill('NOT A VALID QUERY');
    await mount.locator('#query-run').click();

    await expect(mount.locator('.query-panel__status--error')).toBeVisible();
  });
});
