/**
 * Properties Panel Service
 * 
 * Service para gerenciamento de propriedades IFC
 */

import type {
  Property,
  PropertySet,
  PropertyUpdate,
  PropertyValidation,
  ValidationResult,
  PropertyLayout,
  PropertyGroup,
  PropertyTab,
  PropertyHistory,
  ElementProperties,
  PropertyChangeCallback,
  SelectionChangeCallback,
  PropertyTypeHandler,
  UnsubscribeFn,
} from './properties-panel.types';
import { COMMON_PROPERTY_GROUPS } from './properties-panel.types';

export class PropertiesPanelService {
  private static properties = new Map<number, ElementProperties>();
  private static history = new Map<number, PropertyHistory[]>();
  private static propertyChangeCallbacks: PropertyChangeCallback[] = [];
  private static selectionChangeCallbacks: SelectionChangeCallback[] = [];
  private static propertyTypeHandlers = new Map<string, PropertyTypeHandler>();
  private static layout: PropertyLayout = {
    type: 'grouped',
    groups: COMMON_PROPERTY_GROUPS,
    sortBy: 'group',
  };

  /**
   * Obtém propriedades de um elemento
   */
  static async getProperties(expressId: number): Promise<PropertySet[]> {
    // Check cache
    const cached = this.properties.get(expressId);
    if (cached) {
      return cached.propertySets;
    }

    // In a real implementation, this would fetch from backend/IFCService
    // For now, return empty
    return [];
  }

  /**
   * Define propriedades de um elemento (cache local)
   */
  static setProperties(
    expressId: number,
    type: string,
    propertySets: PropertySet[],
    metadata?: { globalId?: string; name?: string }
  ): void {
    this.properties.set(expressId, {
      expressId,
      type,
      globalId: metadata?.globalId,
      name: metadata?.name,
      propertySets,
      lastUpdated: new Date(),
    });
  }

  /**
   * Atualiza uma propriedade
   */
  static async updateProperty(expressId: number, update: PropertyUpdate): Promise<void> {
    const elementProps = this.properties.get(expressId);
    if (!elementProps) {
      throw new Error(`Properties not found for element ${expressId}`);
    }

    // Validate
    const property = this.findProperty(elementProps.propertySets, update.name);
    if (property && property.validation) {
      const result = this.validateProperty(update.value, property.validation);
      if (!result.valid) {
        throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
      }
    }

    // Record history
    if (property) {
      this.addHistory(expressId, {
        timestamp: new Date(),
        propertyName: update.name,
        oldValue: property.value,
        newValue: update.value,
      });
    }

    // Update property
    for (const pset of elementProps.propertySets) {
      if (!update.psetName || pset.name === update.psetName) {
        const prop = pset.properties.find(p => p.name === update.name);
        if (prop) {
          prop.value = update.value;
          break;
        }
      }
    }

    elementProps.lastUpdated = new Date();

    // Emit event
    this.emitPropertyChange(expressId, elementProps.propertySets);
  }

  /**
   * Valida uma propriedade
   */
  static validateProperty(value: any, validation: PropertyValidation): ValidationResult {
    const errors: string[] = [];

    if (validation.required && (value === null || value === undefined || value === '')) {
      errors.push('Property is required');
    }

    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push(`Value must be >= ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push(`Value must be <= ${validation.max}`);
      }
    }

    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`Length must be >= ${validation.minLength}`);
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push(`Length must be <= ${validation.maxLength}`);
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        errors.push('Value does not match pattern');
      }
    }

    if (validation.custom) {
      const customResult = validation.custom(value);
      if (typeof customResult === 'string') {
        errors.push(customResult);
      } else if (!customResult) {
        errors.push('Custom validation failed');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Define layout customizado
   */
  static setLayout(layout: PropertyLayout): void {
    this.layout = layout;
  }

  /**
   * Obtém layout atual
   */
  static getLayout(): PropertyLayout {
    return this.layout;
  }

  /**
   * Adiciona grupo ao layout
   */
  static addGroup(group: PropertyGroup): void {
    if (!this.layout.groups) {
      this.layout.groups = [];
    }
    this.layout.groups.push(group);
  }

  /**
   * Adiciona aba ao layout
   */
  static addTab(tab: PropertyTab): void {
    if (!this.layout.tabs) {
      this.layout.tabs = [];
    }
    this.layout.tabs.push(tab);
  }

  /**
   * Registra handler de tipo de propriedade customizado
   */
  static registerPropertyType(type: string, handler: PropertyTypeHandler): void {
    this.propertyTypeHandlers.set(type, handler);
  }

  /**
   * Obtém handler de tipo de propriedade
   */
  static getPropertyTypeHandler(type: string): PropertyTypeHandler | undefined {
    return this.propertyTypeHandlers.get(type);
  }

  /**
   * Obtém histórico de alterações
   */
  static getPropertyHistory(expressId: number): PropertyHistory[] {
    return this.history.get(expressId) || [];
  }

  /**
   * Desfaz última alteração (undo)
   */
  static async undoPropertyChange(expressId: number): Promise<void> {
    const hist = this.history.get(expressId);
    if (!hist || hist.length === 0) {
      return;
    }

    const lastChange = hist[hist.length - 1];
    
    await this.updateProperty(expressId, {
      name: lastChange.propertyName,
      value: lastChange.oldValue,
      type: 'string', // Type would be stored in history in production
    });

    // Remove last change from history
    hist.pop();
  }

  /**
   * Registra callback de mudança de propriedade
   */
  static onPropertiesChange(callback: PropertyChangeCallback): UnsubscribeFn {
    this.propertyChangeCallbacks.push(callback);
    return () => {
      const index = this.propertyChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.propertyChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Registra callback de mudança de seleção
   */
  static onSelectionChange(callback: SelectionChangeCallback): UnsubscribeFn {
    this.selectionChangeCallbacks.push(callback);
    return () => {
      const index = this.selectionChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.selectionChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emite evento de mudança de seleção
   */
  static emitSelectionChange(expressIds: number[]): void {
    this.selectionChangeCallbacks.forEach(cb => cb(expressIds));
  }

  /**
   * Limpa cache de propriedades
   */
  static clearCache(expressId?: number): void {
    if (expressId !== undefined) {
      this.properties.delete(expressId);
      this.history.delete(expressId);
    } else {
      this.properties.clear();
      this.history.clear();
    }
  }

  /**
   * Organiza propriedades por grupos
   */
  static organizeByGroups(propertySets: PropertySet[]): Map<string, Property[]> {
    const grouped = new Map<string, Property[]>();
    const groups = this.layout.groups || COMMON_PROPERTY_GROUPS;

    // Initialize groups
    for (const group of groups) {
      grouped.set(group.name, []);
    }

    // Add "Other" group for ungrouped properties
    grouped.set('other', []);

    // Organize properties
    for (const pset of propertySets) {
      for (const property of pset.properties) {
        let groupName = 'other';

        // Find matching group
        for (const group of groups) {
          if (group.properties.includes(property.name)) {
            groupName = group.name;
            break;
          }
        }

        const groupProps = grouped.get(groupName) || [];
        groupProps.push(property);
        grouped.set(groupName, groupProps);
      }
    }

    // Remove empty groups
    for (const [key, props] of grouped) {
      if (props.length === 0 && key !== 'other') {
        grouped.delete(key);
      }
    }

    return grouped;
  }

  // ==================== PRIVATE METHODS ====================

  private static findProperty(propertySets: PropertySet[], name: string): Property | undefined {
    for (const pset of propertySets) {
      const prop = pset.properties.find(p => p.name === name);
      if (prop) return prop;
    }
    return undefined;
  }

  private static addHistory(expressId: number, change: PropertyHistory): void {
    const hist = this.history.get(expressId) || [];
    hist.push(change);
    this.history.set(expressId, hist);

    // Limit history size
    const MAX_HISTORY = 50;
    if (hist.length > MAX_HISTORY) {
      hist.shift();
    }
  }

  private static emitPropertyChange(expressId: number, properties: PropertySet[]): void {
    this.propertyChangeCallbacks.forEach(cb => cb(expressId, properties));
  }
}
