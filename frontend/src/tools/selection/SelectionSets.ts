/**
 * SelectionSets - Sistema para salvar/carregar conjuntos de seleção
 * 
 * Permite:
 * - Salvar seleções com nome
 * - Carregar seleções salvas
 * - Exportar/importar para JSON
 * - Compartilhar entre sessões
 */

import * as THREE from 'three';
import type { FilterableElement } from './SelectionFilters';

/**
 * Identificador único de elemento
 */
export interface ElementIdentifier {
  uuid?: string;         // UUID do mesh
  expressID?: number;    // ExpressID do IFC
  modelID?: number;      // ID do modelo
  ifcType?: string;      // Tipo IFC
  name?: string;         // Nome do objeto
}

/**
 * Conjunto de seleção salvo
 */
export interface SelectionSet {
  id: string;
  name: string;
  description?: string;
  elements: ElementIdentifier[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Estatísticas de um conjunto
 */
export interface SelectionSetStats {
  totalElements: number;
  ifcTypes: Record<string, number>;
  layers: string[];
  createdAt: Date;
}

/**
 * SelectionSets - Gerenciador de conjuntos de seleção
 */
export class SelectionSets {
  private sets: Map<string, SelectionSet> = new Map();
  private storageKey = 'arxisVR_selectionSets';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Cria um novo conjunto de seleção
   */
  public createSet(
    name: string,
    elements: FilterableElement[],
    description?: string,
    metadata?: Record<string, any>
  ): SelectionSet {
    const id = this.generateId();
    const now = new Date();

    const selectionSet: SelectionSet = {
      id,
      name,
      description,
      elements: elements.map(el => this.createIdentifier(el)),
      createdAt: now,
      updatedAt: now,
      metadata
    };

    this.sets.set(id, selectionSet);
    this.saveToStorage();

    console.log(`✅ Selection set created: "${name}" (${elements.length} elements)`);

    return selectionSet;
  }

  /**
   * Atualiza conjunto existente
   */
  public updateSet(
    id: string,
    updates: Partial<Omit<SelectionSet, 'id' | 'createdAt'>>
  ): SelectionSet | null {
    const set = this.sets.get(id);
    if (!set) {
      console.warn(`⚠️ Selection set not found: ${id}`);
      return null;
    }

    const updated = {
      ...set,
      ...updates,
      updatedAt: new Date()
    };

    this.sets.set(id, updated);
    this.saveToStorage();

    console.log(`✅ Selection set updated: "${updated.name}"`);

    return updated;
  }

  /**
   * Deleta conjunto
   */
  public deleteSet(id: string): boolean {
    const set = this.sets.get(id);
    if (!set) {
      console.warn(`⚠️ Selection set not found: ${id}`);
      return false;
    }

    this.sets.delete(id);
    this.saveToStorage();

    console.log(`✅ Selection set deleted: "${set.name}"`);

    return true;
  }

  /**
   * Busca conjunto por ID
   */
  public getSet(id: string): SelectionSet | null {
    return this.sets.get(id) || null;
  }

  /**
   * Lista todos os conjuntos
   */
  public getAllSets(): SelectionSet[] {
    return Array.from(this.sets.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  /**
   * Busca conjuntos por nome (fuzzy)
   */
  public searchSets(query: string): SelectionSet[] {
    const lowerQuery = query.toLowerCase();
    
    return this.getAllSets().filter(set => 
      set.name.toLowerCase().includes(lowerQuery) ||
      set.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Restaura elementos de um conjunto (busca na scene)
   */
  public restoreElements(
    set: SelectionSet,
    scene: THREE.Scene
  ): FilterableElement[] {
    const restored: FilterableElement[] = [];
    const meshMap = this.buildSceneMeshMap(scene);

    for (const identifier of set.elements) {
      const mesh = this.findMeshByIdentifier(identifier, meshMap);
      if (mesh) {
        restored.push({
          mesh,
          expressID: mesh.userData.expressID,
          modelID: mesh.userData.modelID,
          ifcType: mesh.userData.ifcType || mesh.userData.type,
          layer: mesh.userData.layer
        });
      }
    }

    const matchRate = (restored.length / set.elements.length) * 100;
    console.log(`🔄 Restored ${restored.length}/${set.elements.length} elements (${matchRate.toFixed(1)}%)`);

    return restored;
  }

  /**
   * Calcula estatísticas de um conjunto
   */
  public getStats(set: SelectionSet): SelectionSetStats {
    const ifcTypes: Record<string, number> = {};
    const layersSet = new Set<string>();

    for (const element of set.elements) {
      if (element.ifcType) {
        ifcTypes[element.ifcType] = (ifcTypes[element.ifcType] || 0) + 1;
      }
    }

    return {
      totalElements: set.elements.length,
      ifcTypes,
      layers: Array.from(layersSet),
      createdAt: set.createdAt
    };
  }

  /**
   * Exporta conjunto para JSON
   */
  public exportToJSON(id: string): string | null {
    const set = this.sets.get(id);
    if (!set) return null;

    return JSON.stringify(set, null, 2);
  }

  /**
   * Exporta todos os conjuntos
   */
  public exportAllToJSON(): string {
    const allSets = this.getAllSets();
    return JSON.stringify(allSets, null, 2);
  }

  /**
   * Importa conjunto de JSON
   */
  public importFromJSON(json: string): SelectionSet | null {
    try {
      const data = JSON.parse(json);
      
      // Validar estrutura
      if (!data.id || !data.name || !Array.isArray(data.elements)) {
        console.error('❌ Invalid selection set JSON format');
        return null;
      }

      // Converter datas
      const set: SelectionSet = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };

      // Gerar novo ID se já existir
      if (this.sets.has(set.id)) {
        set.id = this.generateId();
      }

      this.sets.set(set.id, set);
      this.saveToStorage();

      console.log(`✅ Selection set imported: "${set.name}"`);

      return set;
    } catch (error) {
      console.error('❌ Error importing selection set:', error);
      return null;
    }
  }

  /**
   * Importa múltiplos conjuntos de JSON
   */
  public importMultipleFromJSON(json: string): SelectionSet[] {
    try {
      const data = JSON.parse(json);
      
      if (!Array.isArray(data)) {
        console.error('❌ Expected array of selection sets');
        return [];
      }

      const imported: SelectionSet[] = [];

      for (const item of data) {
        const set = this.importFromJSON(JSON.stringify(item));
        if (set) {
          imported.push(set);
        }
      }

      console.log(`✅ Imported ${imported.length} selection sets`);

      return imported;
    } catch (error) {
      console.error('❌ Error importing selection sets:', error);
      return [];
    }
  }

  /**
   * Salva no localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.sets.values());
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('❌ Error saving selection sets to storage:', error);
    }
  }

  /**
   * Carrega do localStorage
   */
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return;

      const sets: SelectionSet[] = JSON.parse(data);
      
      for (const set of sets) {
        // Converter datas
        set.createdAt = new Date(set.createdAt);
        set.updatedAt = new Date(set.updatedAt);
        
        this.sets.set(set.id, set);
      }

      console.log(`📦 Loaded ${sets.length} selection sets from storage`);
    } catch (error) {
      console.error('❌ Error loading selection sets from storage:', error);
    }
  }

  /**
   * Cria identificador de elemento
   */
  private createIdentifier(element: FilterableElement): ElementIdentifier {
    return {
      uuid: element.mesh.uuid,
      expressID: element.expressID,
      modelID: element.modelID,
      ifcType: element.ifcType,
      name: element.mesh.name
    };
  }

  /**
   * Constrói mapa de meshes da scene
   */
  private buildSceneMeshMap(scene: THREE.Scene): Map<string, THREE.Mesh> {
    const map = new Map<string, THREE.Mesh>();

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        map.set(object.uuid, object);
        
        // Indexar por expressID também
        if (object.userData.expressID !== undefined) {
          const key = `${object.userData.modelID}_${object.userData.expressID}`;
          map.set(key, object);
        }
      }
    });

    return map;
  }

  /**
   * Busca mesh por identificador
   */
  private findMeshByIdentifier(
    identifier: ElementIdentifier,
    meshMap: Map<string, THREE.Mesh>
  ): THREE.Mesh | null {
    // Tentar UUID primeiro (mais confiável)
    if (identifier.uuid) {
      const mesh = meshMap.get(identifier.uuid);
      if (mesh) return mesh;
    }

    // Tentar expressID
    if (identifier.expressID !== undefined && identifier.modelID !== undefined) {
      const key = `${identifier.modelID}_${identifier.expressID}`;
      const mesh = meshMap.get(key);
      if (mesh) return mesh;
    }

    // Fallback: buscar por tipo e nome
    for (const mesh of meshMap.values()) {
      if (identifier.ifcType && mesh.userData.ifcType === identifier.ifcType) {
        if (identifier.name && mesh.name === identifier.name) {
          return mesh;
        }
      }
    }

    return null;
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `sel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpa todos os conjuntos
   */
  public clearAll(): void {
    this.sets.clear();
    this.saveToStorage();
    console.log('🗑️ All selection sets cleared');
  }

  /**
   * Conta total de conjuntos
   */
  public count(): number {
    return this.sets.size;
  }
}

// Singleton
export const selectionSets = new SelectionSets();
