/**
 * BudgetService Tests
 * Unit tests for budget management operations
 */

import { budgetService } from './BudgetService';
import type { BudgetInput, TakeoffParams } from './types';

// Mock the API client
jest.mock('../../api/client', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    downloadFile: jest.fn(),
    uploadFile: jest.fn(),
  },
}));

describe('BudgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBudget', () => {
    it('should create a new budget', async () => {
      const mockBudget = {
        id: 'budget-123',
        name: 'Test Budget',
        projectId: 'project-123',
        type: 'direct' as const,
        status: 'draft' as const,
        items: [],
        totalCost: 0,
        currency: 'BRL',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-123',
        version: 1,
      };

      const { api } = require('../../api/client');
      api.post.mockResolvedValue(mockBudget);

      const input: BudgetInput = {
        projectId: 'project-123',
        name: 'Test Budget',
        type: 'direct',
      };

      const result = await budgetService.createBudget(input);

      expect(api.post).toHaveBeenCalledWith('/api/v1/budgets', input);
      expect(result).toEqual(mockBudget);
    });
  });

  describe('getBudget', () => {
    it('should get a budget by ID', async () => {
      const mockBudget = {
        id: 'budget-123',
        name: 'Test Budget',
        projectId: 'project-123',
        type: 'direct' as const,
        status: 'active' as const,
        items: [],
        totalCost: 1000,
        currency: 'BRL',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-123',
        version: 1,
      };

      const { api } = require('../../api/client');
      api.get.mockResolvedValue(mockBudget);

      const result = await budgetService.getBudget('budget-123');

      expect(api.get).toHaveBeenCalledWith('/api/v1/budgets/budget-123');
      expect(result).toEqual(mockBudget);
    });
  });

  describe('updateBudget', () => {
    it('should update a budget', async () => {
      const mockBudget = {
        id: 'budget-123',
        name: 'Updated Budget',
        projectId: 'project-123',
        type: 'direct' as const,
        status: 'active' as const,
        items: [],
        totalCost: 1000,
        currency: 'BRL',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        createdBy: 'user-123',
        version: 2,
      };

      const { api } = require('../../api/client');
      api.put.mockResolvedValue(mockBudget);

      const result = await budgetService.updateBudget('budget-123', {
        name: 'Updated Budget',
      });

      expect(api.put).toHaveBeenCalledWith('/api/v1/budgets/budget-123', {
        name: 'Updated Budget',
      });
      expect(result).toEqual(mockBudget);
    });
  });

  describe('deleteBudget', () => {
    it('should delete a budget', async () => {
      const { api } = require('../../api/client');
      api.delete.mockResolvedValue(undefined);

      await budgetService.deleteBudget('budget-123');

      expect(api.delete).toHaveBeenCalledWith('/api/v1/budgets/budget-123');
    });
  });

  describe('listBudgets', () => {
    it('should list budgets with filters', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          name: 'Budget 1',
          projectId: 'project-123',
          type: 'direct' as const,
          status: 'active' as const,
          items: [],
          totalCost: 1000,
          currency: 'BRL',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          createdBy: 'user-123',
          version: 1,
        },
      ];

      const { api } = require('../../api/client');
      api.get.mockResolvedValue(mockBudgets);

      const result = await budgetService.listBudgets({
        projectId: 'project-123',
        type: 'direct',
      });

      expect(api.get).toHaveBeenCalledWith('/api/v1/budgets', {
        projectId: 'project-123',
        type: 'direct',
      });
      expect(result).toEqual(mockBudgets);
    });
  });

  describe('calculateTakeoff', () => {
    it('should calculate takeoff from IFC model', async () => {
      const mockTakeoff = {
        budgetId: 'budget-123',
        modelId: 'model-123',
        items: [
          {
            id: 'item-1',
            elementId: 'element-1',
            elementType: 'IfcWall',
            category: 'estrutura',
            quantity: 100,
            unit: 'm²',
            properties: {},
          },
        ],
        summary: {
          totalItems: 1,
          totalQuantity: 100,
          categories: { estrutura: { count: 1, quantity: 100 } },
          unmatchedItems: 0,
        },
        calculatedAt: '2024-01-01T00:00:00Z',
      };

      const { api } = require('../../api/client');
      api.post.mockResolvedValue(mockTakeoff);

      const params: TakeoffParams = {
        modelId: 'model-123',
        filters: {
          elementTypes: ['IfcWall'],
        },
      };

      const result = await budgetService.calculateTakeoff(params);

      expect(api.post).toHaveBeenCalledWith('/api/v1/budgets/takeoff', params);
      expect(result).toEqual(mockTakeoff);
    });
  });

  describe('exportBudget', () => {
    it('should export budget in specified format', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const { api } = require('../../api/client');
      api.downloadFile.mockResolvedValue(mockBlob);

      const result = await budgetService.exportBudget('budget-123', {
        format: 'excel',
      });

      expect(api.downloadFile).toHaveBeenCalledWith(
        '/api/v1/budgets/budget-123/export',
        'budget-123.xlsx',
        {
          headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        }
      );
      expect(result).toEqual(mockBlob);
    });
  });

  describe('getBudgetHistory', () => {
    it('should get budget history', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          budgetId: 'budget-123',
          version: 1,
          changes: [],
          changedBy: 'user-123',
          changedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const { api } = require('../../api/client');
      api.get.mockResolvedValue(mockHistory);

      const result = await budgetService.getBudgetHistory('budget-123');

      expect(api.get).toHaveBeenCalledWith('/api/v1/budgets/budget-123/history');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('simulateScenario', () => {
    it('should simulate budget scenario', async () => {
      const mockSimulation = {
        originalBudget: {
          id: 'budget-123',
          name: 'Original',
          projectId: 'project-123',
          type: 'direct' as const,
          status: 'active' as const,
          items: [],
          totalCost: 1000,
          currency: 'BRL',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          createdBy: 'user-123',
          version: 1,
        },
        simulatedBudget: {
          id: 'budget-123',
          name: 'Simulated',
          projectId: 'project-123',
          type: 'direct' as const,
          status: 'active' as const,
          items: [],
          totalCost: 1200,
          currency: 'BRL',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          createdBy: 'user-123',
          version: 1,
        },
        changes: [],
        totalCostDifference: 200,
        percentageDifference: 20,
      };

      const { api } = require('../../api/client');
      api.post.mockResolvedValue(mockSimulation);

      const result = await budgetService.simulateScenario('budget-123', {
        name: 'Simulated',
      });

      expect(api.post).toHaveBeenCalledWith('/api/v1/budgets/budget-123/simulate', {
        name: 'Simulated',
      });
      expect(result).toEqual(mockSimulation);
    });
  });

  describe('attachDocument', () => {
    it('should attach document to budget', async () => {
      const mockUrl = 'https://example.com/document.pdf';

      const { api } = require('../../api/client');
      api.uploadFile.mockResolvedValue(mockUrl);

      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      const result = await budgetService.attachDocument('budget-123', mockFile);

      expect(api.uploadFile).toHaveBeenCalledWith(
        '/api/v1/budgets/budget-123/attachments',
        mockFile
      );
      expect(result).toEqual(mockUrl);
    });
  });

  describe('listAttachments', () => {
    it('should list budget attachments', async () => {
      const mockAttachments = [
        {
          id: 'attachment-1',
          budgetId: 'budget-123',
          name: 'document.pdf',
          url: 'https://example.com/document.pdf',
          size: 1024,
          type: 'application/pdf',
          uploadedAt: '2024-01-01T00:00:00Z',
          uploadedBy: 'user-123',
        },
      ];

      const { api } = require('../../api/client');
      api.get.mockResolvedValue(mockAttachments);

      const result = await budgetService.listAttachments('budget-123');

      expect(api.get).toHaveBeenCalledWith('/api/v1/budgets/budget-123/attachments');
      expect(result).toEqual(mockAttachments);
    });
  });
});
