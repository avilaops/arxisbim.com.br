import { test, expect } from '@playwright/test';

/**
 * E2E básico - Smoke tests enterprise
 * DoD: Abrir app → painel → modal → sem crash
 */

test.describe('ArxisVR Smoke Tests', () => {
  test('deve carregar aplicação sem erros', async ({ page }) => {
    // Monitora erros no console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Abre aplicação
    await page.goto('/');

    // Aguarda loading terminar (timeout 20s)
    await page.waitForSelector('#loading.hidden', { timeout: 20000 });

    // Verifica onboarding aparece
    await expect(page.locator('#onboarding')).toBeVisible();

    // Não deve ter erros críticos
    const criticalErrors = errors.filter(e => 
      !e.includes('DevTools') && 
      !e.includes('Favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('deve abrir Activity Bar Explorer', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#loading.hidden', { timeout: 20000 });

    // Fecha onboarding (ESC)
    await page.keyboard.press('Escape');

    // Clica em Explorer na Activity Bar
    const explorerBtn = page.locator('.activity-bar-item[data-view="explorer"]');
    await explorerBtn.click();

    // Sidebar deve ficar visível
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.sidebar-title')).toContainText('EXPLORER');
  });

  test('deve abrir modal LoadFileModal', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#loading.hidden', { timeout: 20000 });

    // Fecha onboarding
    await page.keyboard.press('Escape');

    // Clica em "Abrir Arquivo IFC" na sidebar
    const openFileBtn = page.locator('button:has-text("Abrir Arquivo IFC")');
    await openFileBtn.first().click();

    // Aguarda modal aparecer
    await page.waitForTimeout(1000);

    // Verifica se componente carregou (pode ser lazy)
    const hasModal = await page.locator('.modal, [role="dialog"]').count() > 0;
    const hasPanel = await page.locator('.panel, .arxis-panel').count() > 0;

    // Deve ter aberto algo (modal ou panel)
    expect(hasModal || hasPanel).toBeTruthy();
  });

  test('deve navegar entre views da Activity Bar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#loading.hidden', { timeout: 20000 });
    await page.keyboard.press('Escape');

    // Testa várias views
    const views = ['search', 'layers', 'properties', 'tools', 'settings'];

    for (const view of views) {
      const btn = page.locator(`.activity-bar-item[data-view="${view}"]`);
      await btn.click();
      await page.waitForTimeout(300);

      // Sidebar deve atualizar
      await expect(page.locator('#sidebar')).toBeVisible();
    }
  });

  test('deve exibir status bar com informações', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#loading.hidden', { timeout: 20000 });

    // Status bar deve estar visível
    await expect(page.locator('.status-bar')).toBeVisible();

    // Deve ter FPS
    await expect(page.locator('#status-fps')).toBeVisible();
    await expect(page.locator('#status-fps')).toContainText('FPS');

    // Deve ter memória
    await expect(page.locator('#status-memory')).toBeVisible();
    await expect(page.locator('#status-memory')).toContainText('MB');
  });

  test('não deve ter memory leaks em navegação', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#loading.hidden', { timeout: 20000 });
    await page.keyboard.press('Escape');

    // Captura memória inicial
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Navega entre views 10x
    for (let i = 0; i < 10; i++) {
      await page.locator('.activity-bar-item[data-view="explorer"]').click();
      await page.waitForTimeout(100);
      await page.locator('.activity-bar-item[data-view="search"]').click();
      await page.waitForTimeout(100);
    }

    // Captura memória final
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Crescimento não deve ser absurdo (< 50MB)
    const growth = (finalMemory - initialMemory) / 1024 / 1024;
    console.log(`Memory growth: ${growth.toFixed(2)} MB`);
    expect(growth).toBeLessThan(50);
  });
});
