test.describe('budget-panel (Sprint 10)', () => {
  test('edita item inline e persiste após reload', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    // Cria orçamento e item
    const budget = page.locator('#budget-panel-mount');
    await expect(budget).toBeVisible();
    await budget.locator('#budget-name').fill('Sprint10-Budget');
    await budget.locator('#budget-create').click();
    await budget.locator('#ci-desc').fill('Areia');
    await budget.locator('#ci-unit').fill('m3');
    await budget.locator('#ci-qty').fill('2');
    await budget.locator('#ci-price').fill('200');
    await budget.locator('#ci-add').click();
    // Edita descrição inline
    const descInput = budget.locator('.ci-edit.ci-desc');
    await descInput.fill('Areia fina lavada');
    await descInput.blur();
    // Aguarda feedback visual
    await expect(descInput).not.toBeDisabled();
    // Reload e valida persistência
    await page.reload();
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    const budget2 = page.locator('#budget-panel-mount');
    await expect(budget2).toBeVisible();
    // Seleciona orçamento
    await budget2.locator('.budget-panel__list-item').click();
    const descInput2 = budget2.locator('.ci-edit.ci-desc');
    await expect(descInput2).toHaveValue('Areia fina lavada');
  });
});
import { test, expect, type Page } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Sprint 7 PR #4 — BudgetPanel E2E.
 *
 * Seeds an IfcWall with Qto_WallBaseQuantities.NetVolume = 4, runs the takeoff
 * (so TakeoffPanel.getLastResult() returns a result), creates a Budget with one
 * CostItem (5 m3 × R$ 100 = R$ 500 orçado), links it to the seeded element,
 * calculates the report and asserts:
 *   - actual total = 400 (4 m3 × R$ 100)
 *   - delta = -100
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

async function seedWall(page: Page): Promise<string> {
  return await page.evaluate(async () => {
    const bridgePath = '/src/__test_bridge__/index.ts';
    const { THREE } = await import(/* @vite-ignore */ bridgePath);
    const host = (window as any).__viewerHost;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    m.userData = {
      expressID: 3001,
      ifcType: 'IfcWall',
      psets: [
        {
          Name: 'Qto_WallBaseQuantities',
          HasProperties: [{ Name: 'NetVolume', NominalValue: { value: 4 } }],
        },
      ],
    };
    host.scene.add(m);
    return m.uuid as string;
  });
}

test.describe('budget-panel (Sprint 7)', () => {
  test('creates budget, links item, calculates report', async ({ page }) => {
    await authedGoto(page, '/app.html');
    await waitForViewer(page);
    const wallUuid = await seedWall(page);

    // First, run a Takeoff so the budget can pull a result.
    const takeoffMount = page.locator('#takeoff-panel-mount');
    await takeoffMount.locator('#takeoff-run').click();
    await expect(takeoffMount.locator('.takeoff-panel__table')).toBeVisible({ timeout: 5_000 });

    // Seed the selection with the wall's Three.js uuid; app.html maps it to
    // the expressID before linking, matching what IfcTakeoffAdapter emits.
    await page.evaluate(async (uuid) => {
      const bridgePath = '/src/__test_bridge__/index.ts';
      const { batchSelectionService } = await import(/* @vite-ignore */ bridgePath);
      batchSelectionService.selectMany([uuid]);
    }, wallUuid);

    const budget = page.locator('#budget-panel-mount');
    await expect(budget).toBeVisible();

    await budget.locator('#budget-name').fill('Sprint7-Budget');
    await budget.locator('#budget-create').click();

    await budget.locator('#ci-desc').fill('Concreto C25');
    await budget.locator('#ci-unit').fill('m3');
    await budget.locator('#ci-qty').fill('5');
    await budget.locator('#ci-price').fill('100');
    await budget.locator('#ci-add').click();

    await budget.locator('#ci-link-selected').click();
    await expect(budget.locator('.budget-panel__status')).toContainText(/linkados/i, { timeout: 2_000 });

    await budget.locator('#budget-calc').click();
    const report = budget.locator('.budget-panel__report');
    await expect(report).toBeVisible({ timeout: 5_000 });

    const txt = await report.textContent();
    // Orçado = 5 × 100 = 500; Realizado = 4 × 100 = 400; Δ = -100.
    expect(txt).toMatch(/500\.00/);
    expect(txt).toMatch(/400\.00/);
    expect(txt).toMatch(/-100\.00/);
  });
});
