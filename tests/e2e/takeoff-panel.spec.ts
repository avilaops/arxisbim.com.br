import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 6 PR #4 — TakeoffPanel E2E.
 *
 * Seeds a couple of IfcWall meshes carrying Qto_WallBaseQuantities, hits the
 * "Calcular" button and asserts that the aggregated table is rendered with
 * the expected sums. Also verifies the CSV download payload through an
 * injected downloader installed on `window` before the panel handler runs.
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
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const h = (window as unknown as { __viewerHost?: { scene?: unknown } }).__viewerHost;
          return !!(h && h.scene);
        }),
      { timeout: 15_000 },
    )
    .toBe(true);
}

async function seedWallsWithQuantities(page: Page): Promise<number> {
  return await page.evaluate(async () => {
    const bridgePath = '/src/__test_bridge__/index.ts';
    const { THREE } = await import(/* @vite-ignore */ bridgePath);
    const host = (window as any).__viewerHost;
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const mk = (id: number, volume: number) => {
      const m = new THREE.Mesh(geom, mat);
      m.name = `e2e-wall-${id}`;
      m.userData = {
        expressID: id,
        ifcType: 'IfcWall',
        psets: [
          {
            Name: 'Qto_WallBaseQuantities',
            HasProperties: [
              { Name: 'NetVolume', NominalValue: { value: volume } },
            ],
          },
        ],
      };
      host.scene.add(m);
      return m;
    };
    mk(2001, 2);
    mk(2002, 3);
    return 2;
  });
}

test.describe('takeoff-panel (Sprint 6)', () => {
  test('Calcular populates aggregated table by IFC type', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    const seeded = await seedWallsWithQuantities(page);
    expect(seeded).toBe(2);

    const mount = page.locator('#takeoff-panel-mount');
    await expect(mount).toBeVisible();
    await mount.locator('#takeoff-run').click();

    await expect(mount.locator('.takeoff-panel__table')).toBeVisible({ timeout: 5_000 });
    const tableText = await mount.locator('.takeoff-panel__table').textContent();
    expect(tableText).toMatch(/IfcWall/);
    expect(tableText).toMatch(/NetVolume/);
    // 2 + 3 = 5.00 sum.
    expect(tableText).toMatch(/5\.00/);

    await expect(mount.locator('#takeoff-export')).toBeEnabled();
  });

  test('Exportar CSV produces a takeoff-*.csv payload', async ({ page }) => {
    // Install a downloader stub BEFORE the panel handler runs by hooking
    // the click via Blob → URL.createObjectURL.
    await page.addInitScript(() => {
      (window as any).__takeoffCsvCalls = [] as Array<{ url: string }>;
      const origCreate = URL.createObjectURL.bind(URL);
      URL.createObjectURL = (blob: Blob) => {
        const url = origCreate(blob);
        (window as any).__takeoffCsvCalls.push({ url });
        return url;
      };
    });

    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    await seedWallsWithQuantities(page);

    const mount = page.locator('#takeoff-panel-mount');
    await mount.locator('#takeoff-run').click();
    await expect(mount.locator('.takeoff-panel__table')).toBeVisible({ timeout: 5_000 });

    // Intercept the synthetic <a download> click before it leaves the page.
    await page.evaluate(() => {
      const origClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        (window as any).__lastDownloadName = (this as HTMLAnchorElement).download;
        // do not trigger real download
        origClick; // keep reference, no-op
      };
    });

    await mount.locator('#takeoff-export').click();

    const downloadName = await page.evaluate(() => (window as any).__lastDownloadName as string | undefined);
    expect(downloadName).toMatch(/^takeoff-.*\.csv$/);

    const calls = await page.evaluate(() => (window as any).__takeoffCsvCalls as Array<{ url: string }>);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
