/**
 * AdvancedSelectionTool - Ferramenta de seleção avançada
 * 
 * Integra SelectionFilters e SelectionSets para fornecer
 * uma ferramenta completa de seleção para o usuário
 */

import * as THREE from 'three';
import { BaseTool } from '../Tool';
import { selectionFilters, SelectionFilters, SelectionFilter, FilterResult, FilterableElement } from './SelectionFilters';
import { selectionSets, SelectionSets, SelectionSet } from './SelectionSets';
import { eventBus, EventType } from '../../core';

/**
 * Modo de seleção
 */
export enum SelectionMode {
  ADD = 'add',           // Adiciona à seleção existente
  REMOVE = 'remove',     // Remove da seleção existente
  REPLACE = 'replace'    // Substitui seleção existente
}

/**
 * Evento de seleção avançada
 */
export interface AdvancedSelectionEvent {
  mode: SelectionMode;
  elements: FilterableElement[];
  filter?: SelectionFilter;
  selectionSet?: SelectionSet;
}

/**
 * AdvancedSelectionTool
 */
export class AdvancedSelectionTool extends BaseTool {
  public readonly id = 'advanced_selection';
  public override readonly name = 'Advanced Selection';
  public override readonly type = 'advanced_selection';
  public readonly description = 'Select elements by type, properties, and filters';

  private scene: THREE.Scene;
  private filters: SelectionFilters;
  private sets: SelectionSets;
  private currentSelection: Set<THREE.Mesh> = new Set();
  private selectionMode: SelectionMode = SelectionMode.REPLACE;

  constructor(scene: THREE.Scene, _camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.filters = selectionFilters;
    this.sets = selectionSets;

    // Configurar scene nos filtros
    this.filters.setScene(scene);
  }

  /**
   * Ativa ferramenta
   */
  public override activate(): void {
    super.activate();
    console.log('🎯 Advanced Selection Tool activated');
    
    eventBus.emit(EventType.TOOL_CHANGED, {
      oldTool: null,
      newTool: this.id
    });
  }

  /**
   * Desativa ferramenta
   */
  public override deactivate(): void {
    super.deactivate();
    console.log('🎯 Advanced Selection Tool deactivated');
  }

  /**
   * Atualiza ferramenta (não usado)
   */
  public override update(_deltaTime: number): void {
    // Não precisa update
  }

  /**
   * Limpa seleção
   */
  public clearSelection(): void {
    this.currentSelection.clear();
    this.emitSelectionChanged([]);
  }

  /**
   * Seleciona por filtro
   */
  public async selectByFilter(filter: SelectionFilter, mode: SelectionMode = SelectionMode.REPLACE): Promise<FilterResult> {
    const result = await this.filters.applyFilter(filter);
    this.applySelection(result.matched, mode);
    
    console.log(`✅ Selected ${result.matchCount} elements (${result.executionTime.toFixed(2)}ms)`);
    
    eventBus.emit('AdvancedSelectionApplied', {
      mode,
      elements: result.matched,
      filter
    } as AdvancedSelectionEvent);
    
    return result;
  }

  /**
   * Seleciona por múltiplos filtros
   */
  public async selectByFilters(filters: SelectionFilter[], mode: SelectionMode = SelectionMode.REPLACE): Promise<FilterResult> {
    const result = await this.filters.applyFilters(filters);
    this.applySelection(result.matched, mode);
    
    console.log(`✅ Selected ${result.matchCount} elements with ${filters.length} filters (${result.executionTime.toFixed(2)}ms)`);
    
    return result;
  }

  /**
   * Seleciona todos os elementos de um tipo IFC
   */
  public async selectByIfcType(ifcType: string, mode: SelectionMode = SelectionMode.REPLACE): Promise<number> {
    const result = await this.filters.selectByIfcType(ifcType);
    this.applySelection(result.matched, mode);
    
    console.log(`✅ Selected ${result.matchCount} ${ifcType} elements`);
    
    return result.matchCount;
  }

  /**
   * Seleciona por propriedade
   */
  public async selectByProperty(
    field: string,
    value: any,
    mode: SelectionMode = SelectionMode.REPLACE
  ): Promise<number> {
    const result = await this.filters.selectByProperty(field, value);
    this.applySelection(result.matched, mode);
    
    console.log(`✅ Selected ${result.matchCount} elements where ${field}=${value}`);
    
    return result.matchCount;
  }

  /**
   * Seleciona por bounding box
   */
  public async selectByBoundingBox(
    box: THREE.Box3,
    contained: boolean = false,
    mode: SelectionMode = SelectionMode.REPLACE
  ): Promise<number> {
    const result = await this.filters.selectByBoundingBox(box, contained);
    this.applySelection(result.matched, mode);
    
    console.log(`✅ Selected ${result.matchCount} elements in bounding box`);
    
    return result.matchCount;
  }

  /**
   * Inverte seleção
   */
  public async invertSelection(): Promise<number> {
    const currentElements = Array.from(this.currentSelection).map(mesh => ({
      mesh,
      expressID: mesh.userData.expressID,
      modelID: mesh.userData.modelID,
      ifcType: mesh.userData.ifcType || mesh.userData.type
    }));
    
    const inverted = await this.filters.invertSelection(currentElements);
    this.applySelection(inverted, SelectionMode.REPLACE);
    
    console.log(`✅ Inverted selection: ${inverted.length} elements`);
    
    return inverted.length;
  }

  /**
   * Salva seleção atual como conjunto
   */
  public saveSelectionAsSet(name: string, description?: string): SelectionSet | null {
    const elements = this.getCurrentSelectionElements();
    
    if (elements.length === 0) {
      console.warn('⚠️ No elements selected to save');
      return null;
    }
    
    const set = this.sets.createSet(name, elements, description);
    
    console.log(`✅ Saved selection set: "${name}" (${elements.length} elements)`);
    
    return set;
  }

  /**
   * Carrega conjunto de seleção
   */
  public loadSelectionSet(setId: string, mode: SelectionMode = SelectionMode.REPLACE): boolean {
    const set = this.sets.getSet(setId);
    
    if (!set) {
      console.warn(`⚠️ Selection set not found: ${setId}`);
      return false;
    }
    
    const elements = this.sets.restoreElements(set, this.scene);
    this.applySelection(elements, mode);
    
    console.log(`✅ Loaded selection set: "${set.name}" (${elements.length} elements)`);
    
    eventBus.emit('AdvancedSelectionApplied', {
      mode,
      elements,
      selectionSet: set
    } as AdvancedSelectionEvent);
    
    return true;
  }

  /**
   * Lista todos os conjuntos salvos
   */
  public listSelectionSets(): SelectionSet[] {
    return this.sets.getAllSets();
  }

  /**
   * Deleta conjunto de seleção
   */
  public deleteSelectionSet(setId: string): boolean {
    return this.sets.deleteSet(setId);
  }

  /**
   * Exporta conjunto para JSON
   */
  public exportSelectionSet(setId: string): string | null {
    return this.sets.exportToJSON(setId);
  }

  /**
   * Importa conjunto de JSON
   */
  public importSelectionSet(json: string): SelectionSet | null {
    return this.sets.importFromJSON(json);
  }

  /**
   * Aplica seleção com modo
   */
  private applySelection(elements: FilterableElement[], mode: SelectionMode): void {
    switch (mode) {
      case SelectionMode.REPLACE:
        this.currentSelection.clear();
        elements.forEach(el => this.currentSelection.add(el.mesh));
        break;
      
      case SelectionMode.ADD:
        elements.forEach(el => this.currentSelection.add(el.mesh));
        break;
      
      case SelectionMode.REMOVE:
        elements.forEach(el => this.currentSelection.delete(el.mesh));
        break;
    }
    
    this.emitSelectionChanged(this.getCurrentSelectionElements());
  }

  /**
   * Emite evento de mudança de seleção
   */
  private emitSelectionChanged(elements: FilterableElement[]): void {
    eventBus.emit(EventType.SELECTION_CHANGED, {
      selected: elements.length > 0 ? elements[0].mesh : null,
      selectedMultiple: elements.map(el => el.mesh),
      count: elements.length
    });
  }

  /**
   * Retorna elementos da seleção atual
   */
  private getCurrentSelectionElements(): FilterableElement[] {
    return Array.from(this.currentSelection).map(mesh => ({
      mesh,
      expressID: mesh.userData.expressID,
      modelID: mesh.userData.modelID,
      ifcType: mesh.userData.ifcType || mesh.userData.type,
      layer: mesh.userData.layer
    }));
  }

  /**
   * Retorna meshes selecionados
   */
  public getSelectedMeshes(): THREE.Mesh[] {
    return Array.from(this.currentSelection);
  }

  /**
   * Retorna elementos selecionados
   */
  public getSelectedElements(): FilterableElement[] {
    return this.getCurrentSelectionElements();
  }

  /**
   * Retorna quantidade de elementos selecionados
   */
  public getSelectionCount(): number {
    return this.currentSelection.size;
  }

  /**
   * Define modo de seleção
   */
  public setSelectionMode(mode: SelectionMode): void {
    this.selectionMode = mode;
    console.log(`🎯 Selection mode: ${mode}`);
  }

  /**
   * Retorna modo de seleção atual
   */
  public getSelectionMode(): SelectionMode {
    return this.selectionMode;
  }

  /**
   * Limpa cache de filtros
   */
  public clearFilterCache(): void {
    this.filters.clearCache();
  }
}

// Export singleton factory
let instance: AdvancedSelectionTool | null = null;

export function createAdvancedSelectionTool(scene: THREE.Scene, camera: THREE.Camera): AdvancedSelectionTool {
  if (!instance) {
    instance = new AdvancedSelectionTool(scene, camera);
  }
  return instance;
}

export function getAdvancedSelectionTool(): AdvancedSelectionTool | null {
  return instance;
}
