import { test, expect } from '@playwright/test';

/**
 * E2E Tests - Federated Models CRUD
 * Tests the new federated models backend + frontend integration
 */

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:3001';
const TOKEN = process.env.E2E_TOKEN ?? '';

test.describe('Federated Models CRUD', () => {
  let projectId: string;
  let federatedModelId: string;

  test.beforeAll(async ({ request }) => {
    // Create test project for federated models
    const res = await request.post(`${API_BASE}/api/v1/projects`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        companyId: 'test-company-id',
        name: 'Test Project for Federated Models',
        description: 'E2E Test Project'
      }
    });
    
    if (res.ok()) {
      const body = await res.json();
      projectId = body.id;
    }
  });

  test('should create federated model', async ({ request }) => {
    const res = await request.post(
      `${API_BASE}/api/v1/projects/${projectId}/federated-models`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: 'Test Federated Model',
          description: 'E2E test federation',
          models: [
            {
              ifcModelId: 'model-1',
              transformation: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
              },
              visible: true
            }
          ]
        }
      }
    );

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.name).toBe('Test Federated Model');
    federatedModelId = body.id;
  });

  test('should list federated models', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/api/v1/projects/${projectId}/federated-models`,
      {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      }
    );

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test('should get specific federated model', async ({ request }) => {
    const res = await request.get(
      `${API_BASE}/api/v1/projects/${projectId}/federated-models/${federatedModelId}`,
      {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      }
    );

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.id).toBe(federatedModelId);
    expect(body.name).toBe('Test Federated Model');
  });

  test('should update federated model', async ({ request }) => {
    const res = await request.put(
      `${API_BASE}/api/v1/projects/${projectId}/federated-models/${federatedModelId}`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: 'Updated Federated Model',
          description: 'Updated description'
        }
      }
    );

    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.name).toBe('Updated Federated Model');
  });

  test('should delete federated model', async ({ request }) => {
    const res = await request.delete(
      `${API_BASE}/api/v1/projects/${projectId}/federated-models/${federatedModelId}`,
      {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      }
    );

    expect(res.status()).toBe(204);
  });
});
