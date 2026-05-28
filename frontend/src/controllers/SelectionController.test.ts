/**
 * SelectionController Tests
 * Unit tests for selection management
 */

import SelectionController from './SelectionController';

describe('SelectionController', () => {
  let controller: SelectionController;

  beforeEach(() => {
    controller = new SelectionController();
  });

  afterEach(() => {
    controller.reset();
  });

  describe('Selection', () => {
    test('should select single object', () => {
      controller.selectObject('object-123');

      expect(controller.isSelected('object-123')).toBe(true);
      expect(controller.getSelectionCount()).toBe(1);
    });

    test('should select multiple objects', () => {
      controller.selectObjects(['obj-1', 'obj-2', 'obj-3']);

      expect(controller.getSelectionCount()).toBe(3);
      expect(controller.isSelected('obj-1')).toBe(true);
      expect(controller.isSelected('obj-2')).toBe(true);
      expect(controller.isSelected('obj-3')).toBe(true);
    });

    test('should deselect object', () => {
      controller.selectObject('object-123');
      controller.deselectObject('object-123');

      expect(controller.isSelected('object-123')).toBe(false);
      expect(controller.getSelectionCount()).toBe(0);
    });

    test('should clear all selections', () => {
      controller.selectObjects(['obj-1', 'obj-2', 'obj-3']);
      controller.clearSelection();

      expect(controller.getSelectionCount()).toBe(0);
    });

    test('should toggle selection', () => {
      controller.toggleSelection('object-123');
      expect(controller.isSelected('object-123')).toBe(true);

      controller.toggleSelection('object-123');
      expect(controller.isSelected('object-123')).toBe(false);
    });
  });

  describe('Multi-select Mode', () => {
    test('should enable multi-select', () => {
      controller.setMultiSelect(true);
      expect(controller.isMultiSelect()).toBe(true);
    });

    test('should clear previous selection when multi-select is disabled', () => {
      controller.setMultiSelect(false);
      controller.selectObject('obj-1');
      controller.selectObject('obj-2');

      expect(controller.getSelectionCount()).toBe(1);
    });

    test('should keep previous selection when multi-select is enabled', () => {
      controller.setMultiSelect(true);
      controller.selectObject('obj-1');
      controller.selectObject('obj-2');

      expect(controller.getSelectionCount()).toBe(2);
    });
  });

  describe('Selection Queries', () => {
    test('should get selected objects', () => {
      controller.selectObjects(['obj-1', 'obj-2']);
      const selected = controller.getSelectedObjects();

      expect(selected).toHaveLength(2);
      expect(selected[0].id).toBe('obj-1');
    });

    test('should get selected IDs', () => {
      controller.selectObjects(['obj-1', 'obj-2']);
      const ids = controller.getSelectedIds();

      expect(ids).toEqual(['obj-1', 'obj-2']);
    });
  });

  describe('Reset', () => {
    test('should reset controller', () => {
      controller.setMultiSelect(true);
      controller.selectObject('obj-123');
      controller.reset();

      expect(controller.getSelectionCount()).toBe(0);
      expect(controller.isMultiSelect()).toBe(false);
    });
  });
});
