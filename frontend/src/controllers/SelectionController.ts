/**
 * SelectionController
 * Manages object selection in the 3D viewer and coordinates with UI
 */

import BaseController, { ControllerConfig } from './BaseController';

export interface SelectionOptions {
  multiSelect?: boolean;
  clearPrevious?: boolean;
  emitEvents?: boolean;
}

export interface SelectedObject {
  id: string;
  type: string;
  properties?: any;
  metadata?: any;
}

export class SelectionController extends BaseController {
  private selectedObjects: Map<string, SelectedObject>;
  private multiSelect: boolean;

  constructor(config: ControllerConfig = {}) {
    super({
      name: 'SelectionController',
      autoReset: false,
      ...config,
    });
    this.selectedObjects = new Map();
    this.multiSelect = false;
  }

  /**
   * Select an object by ID
   */
  selectObject(id: string, options: SelectionOptions = {}): void {
    const {
      multiSelect = this.multiSelect,
      clearPrevious = true,
      emitEvents = true,
    } = options;

    if (clearPrevious && !multiSelect) {
      this.clearSelection(false);
    }

    // Add to selection
    const selectedObject: SelectedObject = {
      id,
      type: 'unknown',
      properties: {},
      metadata: {},
    };

    this.selectedObjects.set(id, selectedObject);

    // Update viewer
    this.updateViewerSelection();

    // Update state
    this.setState({
      selectedObjects: Array.from(this.selectedObjects.values()),
      count: this.selectedObjects.size,
    });

    if (emitEvents) {
      this.emitSuccess(selectedObject, { action: 'select', id });
    }
  }

  /**
   * Select multiple objects
   */
  selectObjects(ids: string[], options: SelectionOptions = {}): void {
    const { clearPrevious = true, emitEvents = true } = options;

    if (clearPrevious) {
      this.clearSelection(false);
    }

    ids.forEach(id => {
      const selectedObject: SelectedObject = {
        id,
        type: 'unknown',
        properties: {},
        metadata: {},
      };
      this.selectedObjects.set(id, selectedObject);
    });

    this.updateViewerSelection();

    this.setState({
      selectedObjects: Array.from(this.selectedObjects.values()),
      count: this.selectedObjects.size,
    });

    if (emitEvents) {
      this.emitSuccess(
        { count: ids.length, ids },
        { action: 'selectMultiple' }
      );
    }
  }

  /**
   * Deselect an object
   */
  deselectObject(id: string, emitEvents: boolean = true): void {
    if (this.selectedObjects.has(id)) {
      this.selectedObjects.delete(id);
      this.updateViewerSelection();

      this.setState({
        selectedObjects: Array.from(this.selectedObjects.values()),
        count: this.selectedObjects.size,
      });

      if (emitEvents) {
        this.emitSuccess(null, { action: 'deselect', id });
      }
    }
  }

  /**
   * Clear all selections
   */
  clearSelection(emitEvents: boolean = true): void {
    const count = this.selectedObjects.size;
    this.selectedObjects.clear();
    this.updateViewerSelection();

    this.setState({
      selectedObjects: [],
      count: 0,
    });

    if (emitEvents && count > 0) {
      this.emitSuccess(null, { action: 'clear' });
    }
  }

  /**
   * Toggle selection of an object
   */
  toggleSelection(id: string): void {
    if (this.selectedObjects.has(id)) {
      this.deselectObject(id);
    } else {
      this.selectObject(id, { clearPrevious: false });
    }
  }

  /**
   * Select all objects of a type
   */
  selectByType(type: string): void {
    // This would query the viewer for all objects of a type
    // For now, simulate
    this.selectObjects([`object-1-${type}`, `object-2-${type}`]);
  }

  /**
   * Select objects by property filter
   */
  selectByFilter(filter: object): void {
    // This would query the viewer with a filter
    // For now, simulate
    this.selectObjects(['object-1', 'object-2']);
  }

  /**
   * Get selected objects
   */
  getSelectedObjects(): SelectedObject[] {
    return Array.from(this.selectedObjects.values());
  }

  /**
   * Get selected object IDs
   */
  getSelectedIds(): string[] {
    return Array.from(this.selectedObjects.keys());
  }

  /**
   * Get selection count
   */
  getSelectionCount(): number {
    return this.selectedObjects.size;
  }

  /**
   * Check if an object is selected
   */
  isSelected(id: string): boolean {
    return this.selectedObjects.has(id);
  }

  /**
   * Enable/disable multi-select mode
   */
  setMultiSelect(enabled: boolean): void {
    this.multiSelect = enabled;
    this.setState({ multiSelect: enabled });
  }

  /**
   * Get multi-select mode
   */
  isMultiSelect(): boolean {
    return this.multiSelect;
  }

  /**
   * Update viewer selection
   */
  private updateViewerSelection(): void {
    // This would integrate with Viewer 3D
    // For now, just update state
    this.setState({
      viewerSelection: Array.from(this.selectedObjects.keys()),
    });
  }

  /**
   * Update object properties (when loaded from viewer)
   */
  updateObjectProperties(id: string, properties: any): void {
    const obj = this.selectedObjects.get(id);
    if (obj) {
      obj.properties = properties;
      this.selectedObjects.set(id, obj);
      this.setState({
        selectedObjects: Array.from(this.selectedObjects.values()),
      });
    }
  }

  /**
   * Get properties of selected objects
   */
  getSelectedProperties(): any[] {
    return this.getSelectedObjects().map(obj => obj.properties);
  }

  /**
   * Reset controller
   */
  reset(): void {
    this.clearSelection(false);
    this.multiSelect = false;
    super.reset();
  }
}

export default SelectionController;
