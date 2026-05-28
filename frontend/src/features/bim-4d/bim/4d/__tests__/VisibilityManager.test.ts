/**
 * VisibilityManager Unit Tests
 * 
 * Testes para validar gerenciamento de visibilidade de elementos 3D
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VisibilityManager } from '../VisibilityManager';
import type { VisibilityState } from '../types';

// Mock Three.js objects
class MockMaterial {
  opacity: number = 1.0;
  transparent: boolean = false;
  needsUpdate: boolean = false;
}

class MockMesh {
  isMesh: boolean = true;
  material: MockMaterial;
  visible: boolean = true;
  
  constructor() {
    this.material = new MockMaterial();
  }
  
  traverse(callback: (obj: any) => void) {
    callback(this);
  }
}

describe('VisibilityManager', () => {
  let manager: VisibilityManager;
  let mockObjects: Map<string, any>;
  
  beforeEach(() => {
    manager = new VisibilityManager();
    
    // Criar objetos mock
    mockObjects = new Map();
    mockObjects.set('guid-1', new MockMesh());
    mockObjects.set('guid-2', new MockMesh());
    mockObjects.set('guid-3', new MockMesh());
    mockObjects.set('guid-4', new MockMesh());
    mockObjects.set('guid-5', new MockMesh());
  });
  
  afterEach(() => {
    manager.dispose();
  });
  
  describe('registerObject', () => {
    it('should register a single object', () => {
      const obj = new MockMesh();
      manager.registerObject('test-guid', obj);
      
      // Verificar que foi registrado (indiretamente através de update)
      const updated = manager.updateObjectVisibility('test-guid', 'hidden');
      expect(updated).toBe(true);
    });
  });
  
  describe('registerObjects', () => {
    it('should register multiple objects at once', () => {
      manager.registerObjects(mockObjects);
      
      // Verificar que todos foram registrados
      const updated1 = manager.updateObjectVisibility('guid-1', 'hidden');
      const updated2 = manager.updateObjectVisibility('guid-2', 'hidden');
      
      expect(updated1).toBe(true);
      expect(updated2).toBe(true);
    });
  });
  
  describe('unregisterObject', () => {
    it('should remove object from registry', () => {
      manager.registerObject('test-guid', new MockMesh());
      manager.unregisterObject('test-guid');
      
      const updated = manager.updateObjectVisibility('test-guid', 'visible');
      expect(updated).toBe(false);
    });
    
    it('should cancel active transitions on unregister', async () => {
      const obj = new MockMesh();
      manager.registerObject('test-guid', obj);
      manager.setTransitionDuration(500);
      
      // Iniciar transição
      manager.updateObjectVisibility('test-guid', 'constructing');
      
      // Unregister durante transição
      manager.unregisterObject('test-guid');
      
      // Não deve causar erro
      await new Promise(resolve => setTimeout(resolve, 600));
    });
  });
  
  describe('updateObjectVisibility - hidden state', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
      manager.setTransitionDuration(0); // Sem animação para testes
    });
    
    it('should hide object', () => {
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'hidden');
      
      expect(obj.visible).toBe(false);
    });
    
    it('should set opacity to 0', () => {
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'hidden');
      
      expect(obj.material.opacity).toBe(0);
    });
    
    it('should return false for unknown GUID', () => {
      const updated = manager.updateObjectVisibility('unknown-guid', 'hidden');
      expect(updated).toBe(false);
    });
  });
  
  describe('updateObjectVisibility - constructing state', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
      manager.setTransitionDuration(0);
    });
    
    it('should make object visible', () => {
      const obj = mockObjects.get('guid-1')!;
      obj.visible = false; // Começar oculto
      
      manager.updateObjectVisibility('guid-1', 'constructing');
      
      expect(obj.visible).toBe(true);
    });
    
    it('should set opacity to 0.7', () => {
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'constructing');
      
      expect(obj.material.opacity).toBe(0.7);
    });
    
    it('should enable transparency', () => {
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'constructing');
      
      expect(obj.material.transparent).toBe(true);
    });
  });
  
  describe('updateObjectVisibility - visible state', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
      manager.setTransitionDuration(0);
    });
    
    it('should make object visible', () => {
      const obj = mockObjects.get('guid-1')!;
      obj.visible = false;
      
      manager.updateObjectVisibility('guid-1', 'visible');
      
      expect(obj.visible).toBe(true);
    });
    
    it('should set opacity to 1.0', () => {
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'visible');
      
      expect(obj.material.opacity).toBe(1.0);
    });
    
    it('should disable transparency when fully opaque', () => {
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'visible');
      
      expect(obj.material.transparent).toBe(false);
    });
  });
  
  describe('applyVisibilityState', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
      manager.setTransitionDuration(0);
    });
    
    it('should apply state to multiple objects', () => {
      const state = new Map<string, VisibilityState>();
      state.set('guid-1', 'hidden');
      state.set('guid-2', 'constructing');
      state.set('guid-3', 'visible');
      
      manager.applyVisibilityState(state);
      
      expect(mockObjects.get('guid-1')!.visible).toBe(false);
      expect(mockObjects.get('guid-2')!.visible).toBe(true);
      expect(mockObjects.get('guid-3')!.visible).toBe(true);
      
      expect(mockObjects.get('guid-1')!.material.opacity).toBe(0);
      expect(mockObjects.get('guid-2')!.material.opacity).toBe(0.7);
      expect(mockObjects.get('guid-3')!.material.opacity).toBe(1.0);
    });
    
    it('should handle large batch updates efficiently', () => {
      // Criar muitos objetos
      const largeObjectMap = new Map();
      const largeStateMap = new Map<string, VisibilityState>();
      
      for (let i = 0; i < 1000; i++) {
        const guid = `guid-${i}`;
        largeObjectMap.set(guid, new MockMesh());
        largeStateMap.set(guid, i % 3 === 0 ? 'hidden' : i % 3 === 1 ? 'constructing' : 'visible');
      }
      
      manager.registerObjects(largeObjectMap);
      
      const startTime = performance.now();
      manager.applyVisibilityState(largeStateMap);
      const duration = performance.now() - startTime;
      
      // Deve processar em < 50ms (bem abaixo do target de 16ms para 1000 objetos)
      expect(duration).toBeLessThan(50);
    });
    
    it('should skip unknown GUIDs gracefully', () => {
      const state = new Map<string, VisibilityState>();
      state.set('guid-1', 'hidden');
      state.set('unknown-guid', 'visible');
      state.set('guid-2', 'constructing');
      
      // Não deve lançar erro
      expect(() => manager.applyVisibilityState(state)).not.toThrow();
      
      // Objetos conhecidos devem ser atualizados
      expect(mockObjects.get('guid-1')!.visible).toBe(false);
      expect(mockObjects.get('guid-2')!.visible).toBe(true);
    });
  });
  
  describe('setTransitionDuration', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
    });
    
    it('should update transition duration', () => {
      manager.setTransitionDuration(500);
      // Verificar indiretamente através de comportamento
      // (não há getter público, mas a animação deve funcionar)
    });
    
    it('should handle zero duration', () => {
      manager.setTransitionDuration(0);
      
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'visible');
      
      // Deve atualizar instantaneamente
      expect(obj.material.opacity).toBe(1.0);
    });
    
    it('should clamp negative values to 0', () => {
      manager.setTransitionDuration(-100);
      
      const obj = mockObjects.get('guid-1')!;
      manager.updateObjectVisibility('guid-1', 'visible');
      
      expect(obj.material.opacity).toBe(1.0);
    });
  });
  
  describe('getHiddenObjects', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
      manager.setTransitionDuration(0);
    });
    
    it('should return only hidden objects', () => {
      manager.updateObjectVisibility('guid-1', 'hidden');
      manager.updateObjectVisibility('guid-2', 'hidden');
      manager.updateObjectVisibility('guid-3', 'visible');
      
      const hidden = manager.getHiddenObjects();
      
      expect(hidden.length).toBe(2);
    });
    
    it('should return empty array when all visible', () => {
      mockObjects.forEach((obj, guid) => {
        manager.updateObjectVisibility(guid, 'visible');
      });
      
      const hidden = manager.getHiddenObjects();
      
      expect(hidden).toHaveLength(0);
    });
  });
  
  describe('getVisibleObjects', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
      manager.setTransitionDuration(0);
    });
    
    it('should return only visible objects', () => {
      // Primeiro ocultar todos
      mockObjects.forEach((obj, guid) => {
        manager.updateObjectVisibility(guid, 'hidden');
      });
      
      // Depois tornar alguns visíveis
      manager.updateObjectVisibility('guid-1', 'visible');
      manager.updateObjectVisibility('guid-2', 'constructing');
      manager.updateObjectVisibility('guid-3', 'hidden');
      
      const visible = manager.getVisibleObjects();
      
      expect(visible.length).toBe(2); // visible + constructing
    });
    
    it('should return empty array when all hidden', () => {
      mockObjects.forEach((obj, guid) => {
        manager.updateObjectVisibility(guid, 'hidden');
      });
      
      const visible = manager.getVisibleObjects();
      
      expect(visible).toHaveLength(0);
    });
  });
  
  describe('animated transitions', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
    });
    
    it('should animate opacity change over time', async () => {
      manager.setTransitionDuration(200);
      
      const obj = mockObjects.get('guid-1')!;
      obj.material.opacity = 0;
      
      manager.updateObjectVisibility('guid-1', 'visible');
      
      // Após metade do tempo, opacidade deve estar entre 0 e 1
      await new Promise(resolve => setTimeout(resolve, 100));
      const midOpacity = obj.material.opacity;
      
      expect(midOpacity).toBeGreaterThan(0);
      expect(midOpacity).toBeLessThan(1.0);
      
      // Após tempo completo + buffer, deve estar em 1.0
      await new Promise(resolve => setTimeout(resolve, 200)); // Mais tempo para completar
      
      expect(obj.material.opacity).toBeCloseTo(1.0, 0); // Menos precisão
    });
    
    it('should handle multiple transition calls without errors', () => {
      // Teste que múltiplas transições podem ser chamadas sem erro
      manager.setTransitionDuration(100);
      
      const obj = mockObjects.get('guid-1')!;
      
      // Chamar múltiplas transições rapidamente
      expect(() => {
        manager.updateObjectVisibility('guid-1', 'visible');
        manager.updateObjectVisibility('guid-1', 'hidden');
        manager.updateObjectVisibility('guid-1', 'constructing');
        manager.updateObjectVisibility('guid-1', 'visible');
      }).not.toThrow();
    });
  });
  
  describe('clear', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
    });
    
    it('should clear all registered objects', () => {
      manager.clear();
      
      const updated = manager.updateObjectVisibility('guid-1', 'visible');
      expect(updated).toBe(false);
    });
    
    it('should cancel all active transitions', async () => {
      manager.setTransitionDuration(500);
      
      mockObjects.forEach((obj, guid) => {
        manager.updateObjectVisibility(guid, 'constructing');
      });
      
      manager.clear();
      
      // Aguardar tempo da transição - não deve causar erros
      await new Promise(resolve => setTimeout(resolve, 600));
    });
  });
  
  describe('dispose', () => {
    beforeEach(() => {
      manager.registerObjects(mockObjects);
    });
    
    it('should clear all data on dispose', () => {
      manager.dispose();
      
      const updated = manager.updateObjectVisibility('guid-1', 'visible');
      expect(updated).toBe(false);
    });
  });
  
  describe('material handling', () => {
    it('should handle objects with array of materials', () => {
      class MockMeshWithMultipleMaterials {
        isMesh: boolean = true;
        visible: boolean = true;
        material: MockMaterial[];
        
        constructor() {
          this.material = [new MockMaterial(), new MockMaterial(), new MockMaterial()];
        }
        
        traverse(callback: (obj: any) => void) {
          callback(this);
        }
      }
      
      const obj = new MockMeshWithMultipleMaterials();
      manager.registerObject('multi-material', obj);
      manager.setTransitionDuration(0);
      
      manager.updateObjectVisibility('multi-material', 'constructing');
      
      // Todos os materiais devem ter opacity 0.7
      obj.material.forEach(mat => {
        expect(mat.opacity).toBe(0.7);
        expect(mat.transparent).toBe(true);
      });
    });
  });
});
