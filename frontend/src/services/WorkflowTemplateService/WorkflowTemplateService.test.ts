/**
 * WorkflowTemplateService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getWorkflowTemplateService } from './WorkflowTemplateService';

describe('WorkflowTemplateService', () => {
  let service: ReturnType<typeof getWorkflowTemplateService>;

  beforeEach(() => {
    service = getWorkflowTemplateService();
  });

  describe('Template Management', () => {
    it('should initialize with system templates', () => {
      const templates = service.listTemplates();
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should create custom template', () => {
      const template = service.createTemplate({
        name: 'Test Workflow',
        description: 'Test description',
        category: 'custom',
        nodes: [],
        triggers: [],
        variables: {},
      });

      expect(template.id).toBeDefined();
      expect(template.name).toBe('Test Workflow');
      expect(template.isSystem).toBe(false);
    });

    it('should update custom template', () => {
      const template = service.createTemplate({
        name: 'Test Workflow',
        description: 'Test description',
        category: 'custom',
        nodes: [],
        triggers: [],
        variables: {},
      });

      const updated = service.updateTemplate(template.id, {
        name: 'Updated Workflow',
      });

      expect(updated?.name).toBe('Updated Workflow');
    });

    it('should delete custom template', () => {
      const template = service.createTemplate({
        name: 'Test Workflow',
        description: 'Test description',
        category: 'custom',
        nodes: [],
        triggers: [],
        variables: {},
      });

      const deleted = service.deleteTemplate(template.id);
      expect(deleted).toBe(true);

      const found = service.getTemplate(template.id);
      expect(found).toBeUndefined();
    });

    it('should not update system template', () => {
      const systemTemplate = service.listSystemTemplates()[0];
      const updated = service.updateTemplate(systemTemplate.id, {
        name: 'Hacked',
      });

      expect(updated).toBeNull();
    });

    it('should not delete system template', () => {
      const systemTemplate = service.listSystemTemplates()[0];
      const deleted = service.deleteTemplate(systemTemplate.id);

      expect(deleted).toBe(false);
    });
  });

  describe('Template Execution', () => {
    it('should execute template', async () => {
      const template = service.createTemplate({
        name: 'Test Workflow',
        description: 'Test description',
        category: 'custom',
        nodes: [
          { id: 'node1', type: 'action', config: {} },
        ],
        triggers: [],
        variables: {},
      });

      const execution = await service.executeTemplate(template.id);
      expect(execution.status).toBe('completed');
      expect(execution.id).toBeDefined();
    });

    it('should list template executions', () => {
      const template = service.createTemplate({
        name: 'Test Workflow',
        description: 'Test description',
        category: 'custom',
        nodes: [],
        triggers: [],
        variables: {},
      });

      const executions = service.listTemplateExecutions(template.id);
      expect(Array.isArray(executions)).toBe(true);
    });
  });

  describe('Template Filtering', () => {
    it('should list templates by category', () => {
      const notificationTemplates = service.listTemplatesByCategory('notification');
      expect(notificationTemplates.length).toBeGreaterThan(0);
    });

    it('should list system templates', () => {
      const systemTemplates = service.listSystemTemplates();
      expect(systemTemplates.length).toBeGreaterThan(0);
    });

    it('should list custom templates', () => {
      service.createTemplate({
        name: 'Custom Workflow',
        description: 'Test',
        category: 'custom',
        nodes: [],
        triggers: [],
        variables: {},
      });

      const customTemplates = service.listCustomTemplates();
      expect(customTemplates.length).toBeGreaterThan(0);
    });
  });
});
