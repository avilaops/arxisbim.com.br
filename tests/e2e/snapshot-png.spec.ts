import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 4 PR #4 — Snapshot PNG smoke.
 *
 * Clicks the snapshot button; verifies the anchor download is triggered and
 * (in headless Chromium) a download event with `arxisvr-snapshot-*.png`
 * filename is produced.
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

test.describe('snapshot-png (Sprint 4)', () => {
  test('snapshot button triggers a PNG download', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await expect(page.locator('#viewer-canvas')).toBeVisible();

    // Wait for viewerHost so the snapshot handler has a renderer.
    await expect.poll(
      async () =>
        page.evaluate(() => !!(window as any).__viewerHost?.renderer),
      { timeout: 15_000 },
    ).toBe(true);

    const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
    await page.locator('[data-action="snapshot-png"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^arxisvr-snapshot-\d+\.png$/);
  });
});
