import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Project Selector UI
 * Tests tenant → company → project hierarchy selection
 */

test.describe('Project Selector', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login and navigate to app
    await page.addInitScript(() => {
      localStorage.setItem('arxisvr_token', 'test-token');
    });
    await page.goto('/app.html');
  });

  test('should display tenant selector when logged in', async ({ page }) => {
    const selector = await page.locator('#tenant-project-selector');
    await expect(selector).toBeVisible();
    
    const tenantSelect = await page.locator('#tenant-select');
    await expect(tenantSelect).toBeVisible();
  });

  test('should load companies when tenant selected', async ({ page }) => {
    // Select first tenant
    const tenantSelect = await page.locator('#tenant-select');
    await tenantSelect.selectOption({ index: 1 }); // Skip default option
    
    // Wait for company select to appear
    await page.waitForSelector('#company-select', { timeout: 5000 });
    const companySelect = await page.locator('#company-select');
    await expect(companySelect).toBeVisible();
  });

  test('should load projects when company selected', async ({ page }) => {
    // Select tenant
    const tenantSelect = await page.locator('#tenant-select');
    await tenantSelect.selectOption({ index: 1 });
    
    // Wait and select company
    await page.waitForSelector('#company-select');
    const companySelect = await page.locator('#company-select');
    await companySelect.selectOption({ index: 1 });
    
    // Wait for project select to appear
    await page.waitForSelector('#project-select', { timeout: 5000 });
    const projectSelect = await page.locator('#project-select');
    await expect(projectSelect).toBeVisible();
  });

  test('should show create project button when company selected', async ({ page }) => {
    // Navigate to company selection
    await page.locator('#tenant-select').selectOption({ index: 1 });
    await page.waitForSelector('#company-select');
    await page.locator('#company-select').selectOption({ index: 1 });
    
    // Create project button should appear
    const createBtn = await page.locator('#create-project-btn');
    await expect(createBtn).toBeVisible();
  });

  test('should open create project form', async ({ page }) => {
    // Navigate to company
    await page.locator('#tenant-select').selectOption({ index: 1 });
    await page.waitForSelector('#company-select');
    await page.locator('#company-select').selectOption({ index: 1 });
    
    // Click create project
    await page.locator('#create-project-btn').click();
    
    // Form should appear
    await expect(page.locator('#project-name')).toBeVisible();
    await expect(page.locator('#project-desc')).toBeVisible();
  });

  test('should emit project-changed event when project selected', async ({ page }) => {
    let eventFired = false;
    
    await page.evaluate(() => {
      window.addEventListener('project-changed', () => {
        (window as any).__projectChangedFired = true;
      });
    });
    
    // Complete selection flow
    await page.locator('#tenant-select').selectOption({ index: 1 });
    await page.waitForSelector('#company-select');
    await page.locator('#company-select').selectOption({ index: 1 });
    await page.waitForSelector('#project-select');
    await page.locator('#project-select').selectOption({ index: 1 });
    
    // Check if event fired
    eventFired = await page.evaluate(() => (window as any).__projectChangedFired);
    expect(eventFired).toBeTruthy();
  });

  test('should persist selection to localStorage', async ({ page }) => {
    // Select tenant
    await page.locator('#tenant-select').selectOption({ value: 'tenant-123' });
    
    // Check localStorage
    const storedTenant = await page.evaluate(() => 
      localStorage.getItem('arxisvr_tenant_id')
    );
    expect(storedTenant).toBe('tenant-123');
  });
});
