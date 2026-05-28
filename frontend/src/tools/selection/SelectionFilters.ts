/**
 * SelectionFilters - Sistema de filtros para seleção avançada
 * 
 * Permite selecionar elementos por:
 * - Tipo IFC (IfcWall, IfcWindow, etc)
 * - Propriedades (Name=X, LoadBearing=true, etc)
 * - Layer
 * - Bounding box
 * - Expressões customizadas
 */

import * as THREE from 'three';
import type { IFCElement } from '../../features/bim-4d/bim/inspector/PropertyTypes';

/**
 * Tipos de filtros disponíveis
 */
export enum FilterType {
  IFC_TYPE = 'ifc_type',
  PROPERTY = 'property',
  LAYER = 'layer',
  BOUNDING_BOX = 'bounding_box',
  MATERIAL = 'material',
  CUSTOM = 'custom'
}

/**
 * Operadores de comparação
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN_RANGE = 'in_range',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists'
}

/**
 * Definição de um filtro
 */
export interface SelectionFilter {
  type: FilterType;
  operator: FilterOperator;
  field?: string;      // Nome do campo/propriedade
  value?: any;         // Valor a comparar
  values?: any[];      // Múltiplos valores (para IN_RANGE, etc)
  caseSensitive?: boolean;
  customPredicate?: (element: FilterableElement) => boolean;
}

/**
 * Elemento filtrável (mesh + dados IFC)
 */
export interface FilterableElement {
  mesh: THREE.Mesh;
  expressID?: number;
  modelID?: number;
  ifcType?: string;
  ifcData?: IFCElement;
  layer?: string;
  boundingBox?: THREE.Box3;
}

/**
 * Resultado de filtro
 */
export interface FilterResult {
  matched: FilterableElement[];
  total: number;
  matchCount: number;
  executionTime: number;
}

/**
 * SelectionFilters - Classe principal
 */
export class SelectionFilters {
  private scene: THREE.Scene | null = null;
  private cache: Map<string, FilterableElement[]> = new Map();

  /**
   * Define scene para busca de elementos
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    this.clearCache();
  }

  /**
   * Aplica filtro e retorna elementos que correspondem
   */
  public async applyFilter(filter: SelectionFilter): Promise<FilterResult> {
    const startTime = performance.now();
    
    // Buscar todos os elementos filtráveis
    const elements = await this.getAllFilterableElements();
    
    // Aplicar filtro
    const matched = elements.filter(element => this.matchesFilter(element, filter));
    
    const executionTime = performance.now() - startTime;
    
    return {
      matched,
      total: elements.length,
      matchCount: matched.length,
      executionTime
    };
  }

  /**
   * Aplica múltiplos filtros (AND logic)
   */
  public async applyFilters(filters: SelectionFilter[]): Promise<FilterResult> {
    const startTime = performance.now();
    
    // Buscar todos os elementos filtráveis
    let elements = await this.getAllFilterableElements();
    
    // Aplicar cada filtro sequencialmente
    for (const filter of filters) {
      elements = elements.filter(element => this.matchesFilter(element, filter));
    }
    
    const executionTime = performance.now() - startTime;
    
    return {
      matched: elements,
      total: (await this.getAllFilterableElements()).length,
      matchCount: elements.length,
      executionTime
    };
  }

  /**
   * Busca todos os elementos filtráveis da cena
   */
  private async getAllFilterableElements(): Promise<FilterableElement[]> {
    if (!this.scene) {
      console.warn('⚠️ Scene não configurada no SelectionFilters');
      return [];
    }

    // Cache simples
    const cacheKey = 'all_elements';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const elements: FilterableElement[] = [];

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const element: FilterableElement = {
          mesh: object,
          expressID: object.userData.expressID,
          modelID: object.userData.modelID,
          ifcType: object.userData.ifcType || object.userData.type,
          layer: object.userData.layer
        };

        // Calcular bounding box
        if (object.geometry) {
          const bbox = new THREE.Box3().setFromObject(object);
          element.boundingBox = bbox;
        }

        elements.push(element);
      }
    });

    this.cache.set(cacheKey, elements);
    return elements;
  }

  /**
   * Verifica se elemento corresponde ao filtro
   */
  private matchesFilter(element: FilterableElement, filter: SelectionFilter): boolean {
    switch (filter.type) {
      case FilterType.IFC_TYPE:
        return this.matchIfcType(element, filter);
      
      case FilterType.PROPERTY:
        return this.matchProperty(element, filter);
      
      case FilterType.LAYER:
        return this.matchLayer(element, filter);
      
      case FilterType.BOUNDING_BOX:
        return this.matchBoundingBox(element, filter);
      
      case FilterType.MATERIAL:
        return this.matchMaterial(element, filter);
      
      case FilterType.CUSTOM:
        return filter.customPredicate ? filter.customPredicate(element) : false;
      
      default:
        return false;
    }
  }

  /**
   * Match por tipo IFC
   */
  private matchIfcType(element: FilterableElement, filter: SelectionFilter): boolean {
    if (!element.ifcType || !filter.value) return false;

    const elementType = element.ifcType.toLowerCase();
    const filterValue = String(filter.value).toLowerCase();

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        return elementType === filterValue;
      
      case FilterOperator.NOT_EQUALS:
        return elementType !== filterValue;
      
      case FilterOperator.CONTAINS:
        return elementType.includes(filterValue);
      
      case FilterOperator.STARTS_WITH:
        return elementType.startsWith(filterValue);
      
      case FilterOperator.ENDS_WITH:
        return elementType.endsWith(filterValue);
      
      default:
        return false;
    }
  }

  /**
   * Match por propriedade IFC
   */
  private matchProperty(element: FilterableElement, filter: SelectionFilter): boolean {
    if (!filter.field) return false;

    // Buscar propriedade no userData primeiro (rápido)
    const userDataValue = element.mesh.userData[filter.field];
    
    if (userDataValue !== undefined) {
      return this.compareValues(userDataValue, filter.value, filter.operator);
    }

    // Se não encontrou no userData, buscar em ifcData (lento, requer async)
    // Por enquanto, retornar false (otimização futura)
    return false;
  }

  /**
   * Match por layer
   */
  private matchLayer(element: FilterableElement, filter: SelectionFilter): boolean {
    if (!element.layer || !filter.value) return false;

    const elementLayer = filter.caseSensitive ? element.layer : element.layer.toLowerCase();
    const filterValue = filter.caseSensitive ? String(filter.value) : String(filter.value).toLowerCase();

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        return elementLayer === filterValue;
      
      case FilterOperator.NOT_EQUALS:
        return elementLayer !== filterValue;
      
      case FilterOperator.CONTAINS:
        return elementLayer.includes(filterValue);
      
      default:
        return false;
    }
  }

  /**
   * Match por bounding box
   */
  private matchBoundingBox(element: FilterableElement, filter: SelectionFilter): boolean {
    if (!element.boundingBox || !filter.value) return false;

    const bbox = element.boundingBox;
    const filterBox = filter.value as THREE.Box3;

    switch (filter.operator) {
      case FilterOperator.EQUALS:
        // Contido completamente dentro
        return filterBox.containsBox(bbox);
      
      case FilterOperator.CONTAINS:
        // Intersecta
        return filterBox.intersectsBox(bbox);
      
      default:
        return false;
    }
  }

  /**
   * Match por material
   */
  private matchMaterial(element: FilterableElement, filter: SelectionFilter): boolean {
    const material = element.mesh.material;
    if (!material || !filter.value) return false;

    const materials = Array.isArray(material) ? material : [material];
    const filterValue = String(filter.value).toLowerCase();

    return materials.some(mat => {
      const matName = (mat.name || '').toLowerCase();
      
      switch (filter.operator) {
        case FilterOperator.EQUALS:
          return matName === filterValue;
        
        case FilterOperator.CONTAINS:
          return matName.includes(filterValue);
        
        default:
          return false;
      }
    });
  }

  /**
   * Compara valores com operador
   */
  private compareValues(value: any, filterValue: any, operator: FilterOperator): boolean {
    switch (operator) {
      case FilterOperator.EQUALS:
        return value === filterValue;
      
      case FilterOperator.NOT_EQUALS:
        return value !== filterValue;
      
      case FilterOperator.CONTAINS:
        return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
      
      case FilterOperator.GREATER_THAN:
        return Number(value) > Number(filterValue);
      
      case FilterOperator.LESS_THAN:
        return Number(value) < Number(filterValue);
      
      case FilterOperator.IN_RANGE:
        const num = Number(value);
        return Array.isArray(filterValue) && num >= filterValue[0] && num <= filterValue[1];
      
      case FilterOperator.EXISTS:
        return value !== undefined && value !== null;
      
      case FilterOperator.NOT_EXISTS:
        return value === undefined || value === null;
      
      default:
        return false;
    }
  }

  /**
   * Limpa cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Seleciona todos os elementos de um tipo IFC
   */
  public async selectByIfcType(ifcType: string): Promise<FilterResult> {
    return this.applyFilter({
      type: FilterType.IFC_TYPE,
      operator: FilterOperator.EQUALS,
      value: ifcType
    });
  }

  /**
   * Seleciona todos os elementos com uma propriedade
   */
  public async selectByProperty(field: string, value: any, operator: FilterOperator = FilterOperator.EQUALS): Promise<FilterResult> {
    return this.applyFilter({
      type: FilterType.PROPERTY,
      operator,
      field,
      value
    });
  }

  /**
   * Seleciona elementos dentro de uma bounding box
   */
  public async selectByBoundingBox(box: THREE.Box3, contained: boolean = false): Promise<FilterResult> {
    return this.applyFilter({
      type: FilterType.BOUNDING_BOX,
      operator: contained ? FilterOperator.EQUALS : FilterOperator.CONTAINS,
      value: box
    });
  }

  /**
   * Inverte seleção
   */
  public async invertSelection(currentSelection: FilterableElement[]): Promise<FilterableElement[]> {
    const allElements = await this.getAllFilterableElements();
    const selectedIds = new Set(currentSelection.map(el => el.mesh.uuid));
    
    return allElements.filter(el => !selectedIds.has(el.mesh.uuid));
  }
}

// Singleton
export const selectionFilters = new SelectionFilters();
