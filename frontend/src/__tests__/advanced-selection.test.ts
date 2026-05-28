/**
 * Testes para Advanced Selection System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { 
  SelectionFilters, 
  FilterType, 
  FilterOperator,
  type FilterableElement 
} from '../tools/selection/SelectionFilters';
import { SelectionSets } from '../tools/selection/SelectionSets';
import { AdvancedSelectionTool, SelectionMode } from '../tools/selection/AdvancedSelectionTool';

describe('SelectionFilters', () => {
  let filters: SelectionFilters;
  let scene: THREE.Scene;
  let testMeshes: THREE.Mesh[];

  beforeEach(() => {
    filters = new SelectionFilters();
    scene = new THREE.Scene();
    testMeshes = [];

    // Criar meshes de teste
    const createTestMesh = (name: string, ifcType: string, expressID: number) => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      
      mesh.name = name;
      mesh.userData.ifcType = ifcType;
      mesh.userData.expressID = expressID;
      mesh.userData.modelID = 0;
      
      scene.add(mesh);
      testMeshes.push(mesh);
      
      return mesh;
    };

    // Criar elementos de teste
    createTestMesh('Wall 1', 'IfcWall', 100);
    createTestMesh('Wall 2', 'IfcWall', 101);
    createTestMesh('Window 1', 'IfcWindow', 200);
    createTestMesh('Door 1', 'IfcDoor', 300);
    createTestMesh('Slab 1', 'IfcSlab', 400);

    filters.setScene(scene);
  });

  describe('selectByIfcType', () => {
    it('should select all elements of a given IFC type', async () => {
      const result = await filters.selectByIfcType('IfcWall');
      
      expect(result.matchCount).toBe(2);
      expect(result.matched.every(el => el.ifcType === 'IfcWall')).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should return empty result for non-existent type', async () => {
      const result = await filters.selectByIfcType('IfcColumn');
      
      expect(result.matchCount).toBe(0);
      expect(result.matched).toHaveLength(0);
    });
  });

  describe('selectByProperty', () => {
    it('should select elements by property value', async () => {
      // Adicionar propriedade customizada
      testMeshes[0].userData.loadBearing = true;
      testMeshes[1].userData.loadBearing = true;
      testMeshes[2].userData.loadBearing = false;
      
      const result = await filters.selectByProperty('loadBearing', true);
      
      expect(result.matchCount).toBe(2);
    });
  });

  describe('applyFilter with operators', () => {
    it('should filter with CONTAINS operator', async () => {
      const result = await filters.applyFilter({
        type: FilterType.IFC_TYPE,
        operator: FilterOperator.CONTAINS,
        value: 'Wall'
      });
      
      expect(result.matchCount).toBe(2);
    });

    it('should filter with STARTS_WITH operator', async () => {
      const result = await filters.applyFilter({
        type: FilterType.IFC_TYPE,
        operator: FilterOperator.STARTS_WITH,
        value: 'Ifc'
      });
      
      expect(result.matchCount).toBe(5); // Todos começam com 'Ifc'
    });

    it('should filter with NOT_EQUALS operator', async () => {
      const result = await filters.applyFilter({
        type: FilterType.IFC_TYPE,
        operator: FilterOperator.NOT_EQUALS,
        value: 'IfcWall'
      });
      
      expect(result.matchCount).toBe(3); // Window, Door, Slab
    });
  });

  describe('selectByBoundingBox', () => {
    it('should select elements within bounding box', async () => {
      // Posicionar meshes
      testMeshes[0].position.set(0, 0, 0);
      testMeshes[1].position.set(5, 5, 5);
      testMeshes[2].position.set(10, 10, 10);
      
      const box = new THREE.Box3(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, 1, 1)
      );
      
      const result = await filters.selectByBoundingBox(box, false);
      
      // Pelo menos o mesh na origem deve estar selecionado
      expect(result.matchCount).toBeGreaterThan(0);
    });
  });

  describe('invertSelection', () => {
    it('should invert current selection', async () => {
      // Selecionar apenas walls
      const wallsResult = await filters.selectByIfcType('IfcWall');
      expect(wallsResult.matchCount).toBe(2);
      
      // Inverter seleção
      const inverted = await filters.invertSelection(wallsResult.matched);
      
      expect(inverted.length).toBe(3); // Window, Door, Slab
    });
  });

  describe('applyFilters (multiple)', () => {
    it('should apply multiple filters with AND logic', async () => {
      // Adicionar layer
      testMeshes[0].userData.layer = 'Structural';
      testMeshes[1].userData.layer = 'Architectural';
      
      const result = await filters.applyFilters([
        {
          type: FilterType.IFC_TYPE,
          operator: FilterOperator.EQUALS,
          value: 'IfcWall'
        },
        {
          type: FilterType.LAYER,
          operator: FilterOperator.EQUALS,
          value: 'Structural'
        }
      ]);
      
      expect(result.matchCount).toBe(1); // Apenas Wall 1
    });
  });
});

describe('SelectionSets', () => {
  let sets: SelectionSets;
  let scene: THREE.Scene;
  let testElements: FilterableElement[];

  beforeEach(() => {
    sets = new SelectionSets();
    sets.clearAll(); // Limpar sets anteriores
    scene = new THREE.Scene();
    testElements = [];

    // Criar elementos de teste
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      mesh.userData.expressID = 100 + i;
      mesh.userData.ifcType = 'IfcWall';
      scene.add(mesh);
      
      testElements.push({
        mesh,
        expressID: 100 + i,
        modelID: 0,
        ifcType: 'IfcWall'
      });
    }
  });

  describe('createSet', () => {
    it('should create a new selection set', () => {
      const set = sets.createSet('Test Set', testElements, 'Test description');
      
      expect(set).toBeDefined();
      expect(set.name).toBe('Test Set');
      expect(set.description).toBe('Test description');
      expect(set.elements).toHaveLength(3);
      expect(set.id).toBeTruthy();
    });

    it('should save set to localStorage', () => {
      const set = sets.createSet('Persistent Set', testElements);
      
      // Criar nova instância e verificar se carregou
      const newSets = new SelectionSets();
      const loaded = newSets.getSet(set.id);
      
      expect(loaded).toBeDefined();
      expect(loaded?.name).toBe('Persistent Set');
    });
  });

  describe('updateSet', () => {
    it('should update existing set', () => {
      const set = sets.createSet('Original Name', testElements);
      
      const updated = sets.updateSet(set.id, {
        name: 'New Name',
        description: 'New description'
      });
      
      expect(updated).toBeDefined();
      expect(updated?.name).toBe('New Name');
      expect(updated?.description).toBe('New description');
    });
  });

  describe('deleteSet', () => {
    it('should delete set', () => {
      const set = sets.createSet('To Delete', testElements);
      
      const deleted = sets.deleteSet(set.id);
      expect(deleted).toBe(true);
      
      const retrieved = sets.getSet(set.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('restoreElements', () => {
    it('should restore elements from set', () => {
      const set = sets.createSet('Restore Test', testElements);
      
      const restored = sets.restoreElements(set, scene);
      
      expect(restored.length).toBe(3);
      expect(restored.every(el => el.mesh instanceof THREE.Mesh)).toBe(true);
    });
  });

  describe('exportToJSON', () => {
    it('should export set to JSON', () => {
      const set = sets.createSet('Export Test', testElements);
      
      const json = sets.exportToJSON(set.id);
      
      expect(json).toBeTruthy();
      expect(() => JSON.parse(json!)).not.toThrow();
    });
  });

  describe('importFromJSON', () => {
    it('should import set from JSON', () => {
      const original = sets.createSet('Import Test', testElements);
      const json = sets.exportToJSON(original.id)!;
      
      // Limpar e reimportar
      sets.clearAll();
      const imported = sets.importFromJSON(json);
      
      expect(imported).toBeDefined();
      expect(imported?.name).toBe('Import Test');
      expect(imported?.elements).toHaveLength(3);
    });
  });
});

describe('AdvancedSelectionTool', () => {
  let tool: AdvancedSelectionTool;
  let scene: THREE.Scene;
  let camera: THREE.Camera;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera();
    tool = new AdvancedSelectionTool(scene, camera);

    // Criar meshes de teste
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial()
      );
      mesh.userData.expressID = 100 + i;
      mesh.userData.ifcType = i < 3 ? 'IfcWall' : 'IfcWindow';
      scene.add(mesh);
    }
  });

  describe('selectByIfcType', () => {
    it('should select elements by IFC type', async () => {
      const count = await tool.selectByIfcType('IfcWall');
      
      expect(count).toBe(3);
      expect(tool.getSelectionCount()).toBe(3);
    });
  });

  describe('selection modes', () => {
    it('should replace selection in REPLACE mode', async () => {
      await tool.selectByIfcType('IfcWall', SelectionMode.REPLACE);
      expect(tool.getSelectionCount()).toBe(3);
      
      await tool.selectByIfcType('IfcWindow', SelectionMode.REPLACE);
      expect(tool.getSelectionCount()).toBe(2);
    });

    it('should add to selection in ADD mode', async () => {
      await tool.selectByIfcType('IfcWall', SelectionMode.REPLACE);
      expect(tool.getSelectionCount()).toBe(3);
      
      await tool.selectByIfcType('IfcWindow', SelectionMode.ADD);
      expect(tool.getSelectionCount()).toBe(5);
    });

    it('should remove from selection in REMOVE mode', async () => {
      await tool.selectByIfcType('IfcWall', SelectionMode.REPLACE);
      await tool.selectByIfcType('IfcWindow', SelectionMode.ADD);
      expect(tool.getSelectionCount()).toBe(5);
      
      await tool.selectByIfcType('IfcWindow', SelectionMode.REMOVE);
      expect(tool.getSelectionCount()).toBe(3);
    });
  });

  describe('saveSelectionAsSet', () => {
    it('should save current selection as set', async () => {
      await tool.selectByIfcType('IfcWall');
      
      const set = tool.saveSelectionAsSet('My Walls', 'All wall elements');
      
      expect(set).toBeDefined();
      expect(set?.name).toBe('My Walls');
      expect(set?.elements).toHaveLength(3);
    });
  });

  describe('loadSelectionSet', () => {
    it('should load saved selection set', async () => {
      await tool.selectByIfcType('IfcWall');
      const set = tool.saveSelectionAsSet('Load Test')!;
      
      tool.clearSelection();
      expect(tool.getSelectionCount()).toBe(0);
      
      const loaded = tool.loadSelectionSet(set.id);
      
      expect(loaded).toBe(true);
      expect(tool.getSelectionCount()).toBe(3);
    });
  });

  describe('invertSelection', () => {
    it('should invert current selection', async () => {
      await tool.selectByIfcType('IfcWall');
      expect(tool.getSelectionCount()).toBe(3);
      
      await tool.invertSelection();
      
      expect(tool.getSelectionCount()).toBe(2); // Windows
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected elements', async () => {
      await tool.selectByIfcType('IfcWall');
      expect(tool.getSelectionCount()).toBe(3);
      
      tool.clearSelection();
      
      expect(tool.getSelectionCount()).toBe(0);
    });
  });
});
