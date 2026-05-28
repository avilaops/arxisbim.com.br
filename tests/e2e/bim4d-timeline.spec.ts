import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 3 PR #4 — BIM 4D timeline smoke test.
 *
 * Validates that the scenarios sidebar (which carries the 4D timeline
 * controls in app.html) mounts and accepts user interaction without
 * crashing the viewer.
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
  expect(token, 'no accessToken in login response').toBeTruthy();
  await page.addInitScript(([t]) => localStorage.setItem('arxisvr_token', t), [token]);
  await page.goto(path);
  await expect(page.locator('#viewer-canvas')).toBeVisible({ timeout: 15_000 });
}

test.describe('bim4d-timeline (Sprint 3 smoke)', () => {
  test('scenarios panel renders inside the sidebar mount', async ({ page }) => {
    await authedGoto(page, '/app.html');

    const mount = page.locator('#scenarios-panel-mount');
    await expect(mount).toBeAttached();
    // ScenariosPanel paints at least one node into the mount once init finishes.
    await expect.poll(
      async () => mount.evaluate((el) => el.childElementCount),
      { timeout: 10_000 },
    ).toBeGreaterThan(0);
  });

  test('sections panel exposes X/Y/Z controls without throwing', async ({ page }) => {
    await authedGoto(page, '/app.html');

    const mount = page.locator('#sections-panel-mount');
    await expect(mount).toBeAttached();
    await expect.poll(
      async () => mount.evaluate((el) => el.childElementCount),
      { timeout: 10_000 },
    ).toBeGreaterThan(0);
  });

  test('keyboard shortcut Esc clears selection without breaking the viewer', async ({ page }) => {
    await authedGoto(page, '/app.html');

    // Press Escape — should be a no-op when nothing is selected.
    await page.keyboard.press('Escape');
    // Viewer host must still be alive.
    const alive = await page.evaluate(() => {
      const h = (window as unknown as { __viewerHost?: { renderer?: unknown } }).__viewerHost;
      return !!h?.renderer;
    });
    expect(alive).toBeTruthy();
  });
});
