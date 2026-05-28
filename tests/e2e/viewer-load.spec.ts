import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 3 PR #4 — Viewer load smoke test.
 *
 * Verifies app.html boots Three.js + IFC.js scaffolding, exposes
 * `window.__viewerHost`, and mounts the right-panel action buttons.
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
}

test.describe('viewer-load (Sprint 3 smoke)', () => {
  test('canvas + sidebar panel mounts are present', async ({ page }) => {
    await authedGoto(page, '/app.html');

    await expect(page.locator('#viewer-canvas')).toBeVisible();
    // Panel mounts created by app.html (scenarios / sections / measurements)
    await expect(page.locator('#scenarios-panel-mount')).toBeAttached();
    await expect(page.locator('#sections-panel-mount')).toBeAttached();
    await expect(page.locator('#measurements-panel-mount')).toBeAttached();
  });

  test('window.__viewerHost is exposed with scene + camera + renderer', async ({ page }) => {
    await authedGoto(page, '/app.html');

    // The host is wired during init(); give it a beat.
    await expect.poll(
      async () => page.evaluate(() => {
        const h = (window as unknown as { __viewerHost?: Record<string, unknown> }).__viewerHost;
        if (!h) return null;
        return {
          hasScene: 'scene' in h,
          hasCamera: 'camera' in h,
          hasRenderer: 'renderer' in h,
        };
      }),
      { timeout: 15_000 },
    ).toEqual({ hasScene: true, hasCamera: true, hasRenderer: true });
  });

  test('quick-action buttons exist (Upload / Export GLB / Snapshot)', async ({ page }) => {
    await authedGoto(page, '/app.html');

    await expect(page.locator('[data-action="upload-ifc"]').first()).toBeVisible();
    await expect(page.locator('[data-action="export-glb"]')).toBeVisible();
    await expect(page.locator('[data-action="snapshot-png"]')).toBeVisible();
  });

  test('no console errors during initial boot', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await authedGoto(page, '/app.html');
    await expect(page.locator('#viewer-canvas')).toBeVisible();
    await page.waitForTimeout(1000); // let async init finish

    // Filter known noise (favicon 404, DevTools messages, dev-only warnings).
    const critical = errors.filter((e) =>
      !/favicon|DevTools|Source map|Lit is in dev mode|GLTFLoader|Failed to load resource: the server responded with a status of 404/i.test(e),
    );
    expect(critical, `unexpected console errors:\n${critical.join('\n')}`).toEqual([]);
  });
});
