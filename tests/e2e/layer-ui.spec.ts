import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Layer UI (Color Picker + Selection)
 * Tests the new color picker and layer selection features
 */

test.describe('Layer UI - Color Picker & Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('arxisvr_token', 'test-token');
    });
    await page.goto('/app.html');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open layer panel from activity bar', async ({ page }) => {
    // Click layers icon in activity bar
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    
    // Layer panel should be visible
    await expect(page.locator('#layer-panel')).toBeVisible({ timeout: 5000 });
  });

  test('should select layer when clicked', async ({ page }) => {
    // Open layer panel
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    // Click first layer
    const firstLayer = page.locator('[data-layer-id]').first();
    await firstLayer.click();
    
    // Layer should have selection outline
    await expect(firstLayer).toHaveCSS('outline', /2px solid/);
  });

  test('should open color picker when color box clicked', async ({ page }) => {
    // Open layer panel
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    // Click color box of first layer
    const colorBox = page.locator('[data-layer-id]').first().locator('div').first();
    await colorBox.click();
    
    // Color picker overlay should appear
    await expect(page.locator('h3:has-text("Selecionar Cor")')).toBeVisible();
    await expect(page.locator('#color-picker-input')).toBeVisible();
  });

  test('should show preset colors in color picker', async ({ page }) => {
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    const colorBox = page.locator('[data-layer-id]').first().locator('div').first();
    await colorBox.click();
    
    // Should have at least 16 preset colors
    const presetColors = await page.locator('.preset-color').count();
    expect(presetColors).toBeGreaterThanOrEqual(16);
  });

  test('should apply color from picker', async ({ page }) => {
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    // Open color picker
    const colorBox = page.locator('[data-layer-id]').first().locator('div').first();
    await colorBox.click();
    
    // Select preset color
    await page.locator('.preset-color').first().click();
    
    // Apply
    await page.locator('#color-picker-apply').click();
    
    // Color picker should close
    await expect(page.locator('#color-picker-input')).not.toBeVisible();
  });

  test('should cancel color picker', async ({ page }) => {
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    const colorBox = page.locator('[data-layer-id]').first().locator('div').first();
    await colorBox.click();
    
    // Cancel
    await page.locator('#color-picker-cancel').click();
    
    // Picker should close
    await expect(page.locator('#color-picker-input')).not.toBeVisible();
  });

  test('should isolate selected layer', async ({ page }) => {
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    // Select a layer
    const firstLayer = page.locator('[data-layer-id]').first();
    await firstLayer.click();
    
    // Click isolate button
    await page.locator('button:has-text("Isolar")').click();
    
    // Only selected layer should be visible
    // (This would require checking the actual layer visibility state)
  });

  test('should toggle layer visibility', async ({ page }) => {
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    // Click visibility button
    const visibilityBtn = page.locator('[data-layer-id]').first().locator('button').first();
    const initialIcon = await visibilityBtn.textContent();
    
    await visibilityBtn.click();
    
    // Icon should change
    const newIcon = await visibilityBtn.textContent();
    expect(newIcon).not.toBe(initialIcon);
  });

  test('should toggle layer lock', async ({ page }) => {
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    // Click lock button (second button in layer item)
    const lockBtn = page.locator('[data-layer-id]').first().locator('button').nth(1);
    const initialIcon = await lockBtn.textContent();
    
    await lockBtn.click();
    
    // Icon should change between 🔒 and 🔓
    const newIcon = await lockBtn.textContent();
    expect(newIcon).not.toBe(initialIcon);
  });

  test('should adjust layer opacity', async ({ page }) => {
    await page.locator('.activity-bar-item[data-view="layers"]').click();
    await page.waitForSelector('#layer-panel');
    
    // Find opacity slider
    const opacitySlider = page.locator('[data-layer-id]').first().locator('input[type="range"]');
    
    // Change value
    await opacitySlider.fill('50');
    
    // Label should update
    const opacityLabel = page.locator('[data-layer-id]').first().locator('span').last();
    await expect(opacityLabel).toContainText('50%');
  });
});
