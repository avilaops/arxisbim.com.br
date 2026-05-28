import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 4 PR #4 — Scenarios panel structural smoke.
 *
 * Verifies the scenarios panel mounts and exposes its expected controls
 * (form, refresh button, list area). CRUD round-trip against the backend
 * requires a loaded project; structural check is enough for the smoke layer.
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

test.describe('scenarios-crud (Sprint 4 smoke)', () => {
  test('scenarios panel renders its form scaffolding', async ({ page }) => {
    await authedGoto(page, '/app.html');

    const mount = page.locator('#scenarios-panel-mount');
    await expect(mount).toBeAttached();

    // form + refresh button + list area
    await expect(mount.locator('#scenario-create-form')).toBeAttached();
    await expect(mount.locator('#scenario-name')).toBeAttached();
    await expect(mount.locator('#scenario-refresh')).toBeAttached();
    await expect(mount.locator('#scenario-list')).toBeAttached();
  });

  test('refresh button is clickable without throwing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await authedGoto(page, '/app.html');
    const refresh = page.locator('#scenarios-panel-mount #scenario-refresh');
    await expect(refresh).toBeAttached();
    await refresh.click();

    // give it a beat to surface any sync error
    await page.waitForTimeout(300);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
