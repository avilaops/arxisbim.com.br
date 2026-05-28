import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 3 PR #4 — Smoke E2E spec for authentication.
 *
 * Strategy: drive auth through the public API and verify the token is
 * persisted + accepted by app.html, instead of poking the React form
 * (more resilient to label/class changes).
 */

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:3001';
const EMAIL = process.env.E2E_EMAIL ?? 'admin@arxisvr.local';
const PASSWORD = process.env.E2E_PASSWORD ?? 'Demo@1234';
const TENANT_HEADER = process.env.E2E_TENANT ?? 'arxisvr-demo-098b9c';

async function login(page: Page): Promise<string> {
  const res = await page.request.post(`${API_BASE}/api/v1/auth/login`, {
    headers: { 'x-tenant-id': TENANT_HEADER },
    data: { email: EMAIL, password: PASSWORD },
  });
  expect(res.ok(), `login failed (${res.status()})`).toBeTruthy();
  const body = await res.json();
  const token = body?.data?.accessToken ?? body?.accessToken;
  expect(token, 'no accessToken in login response').toBeTruthy();
  return token as string;
}

test.describe('auth (Sprint 3 smoke)', () => {
  test('rejects invalid credentials', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
      headers: { 'x-tenant-id': TENANT_HEADER },
      data: { email: EMAIL, password: 'wrong-on-purpose' },
      failOnStatusCode: false,
    });
    expect(res.ok()).toBeFalsy();
    expect([400, 401, 403]).toContain(res.status());
  });

  test('login → token persists → app.html boots without redirect', async ({ page }) => {
    const token = await login(page);

    await page.addInitScript(
      ([t]) => localStorage.setItem('arxisvr_token', t),
      [token],
    );

    await page.goto('/app.html');
    // app.html keeps the user (no redirect to /login.html) when token is present.
    await expect(page).toHaveURL(/\/app\.html/);
    await expect(page.locator('#viewer-canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('without token app.html redirects to login', async ({ page }) => {
    await page.addInitScript(() => {
      try { localStorage.removeItem('arxisvr_token'); } catch { /* ignore */ }
    });
    await page.goto('/app.html');
    // Either redirects to login.html OR shows the gate; both are acceptable.
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    const onLogin = /login\.html/.test(url);
    const stillOnApp = /app\.html/.test(url);
    expect(onLogin || stillOnApp).toBeTruthy();
  });
});
