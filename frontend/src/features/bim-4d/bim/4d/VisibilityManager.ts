/**
 * VisibilityManager - Gerenciamento de Visibilidade de Elementos
 * 
 * Responsável por:
 * - Aplicar estados de visibilidade em objetos Three.js
 * - Gerenciar transições suaves (fade in/out)
 * - Otimizar batch updates de visibilidade
 * 
 * @module bim/4d/VisibilityManager
 */

import type { Object3D, Material, Mesh } from 'three';
import type { VisibilityState } from './types';

/**
 * Gerenciador de visibilidade temporal de elementos BIM
 * 
 * @example
 * ```typescript
 * const visManager = new VisibilityManager();
 * visManager.applyVisibilityState(stateMap);
 * ```
 */
export class VisibilityManager {
  private guidToObjectMap: Map<string, Object3D> = new Map();
  private transitionDuration: number = 300; // ms
  private activeTransitions: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Registra um objeto Three.js com seu GUID
   * 
   * @param guid - GUID do elemento IFC
   * @param object - Objeto Three.js correspondente
   */
  registerObject(guid: string, object: Object3D): void {
    this.guidToObjectMap.set(guid, object);
  }
  
  /**
   * Registra múltiplos objetos de uma vez
   */
  registerObjects(objects: Map<string, Object3D>): void {
    objects.forEach((object, guid) => {
      this.registerObject(guid, object);
    });
  }
  
  /**
   * Remove registro de um objeto
   */
  unregisterObject(guid: string): void {
    // Cancelar transição ativa se houver
    const timeout = this.activeTransitions.get(guid);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTransitions.delete(guid);
    }
    
    this.guidToObjectMap.delete(guid);
  }
  
  /**
   * Aplica um mapa de estados de visibilidade
   * 
   * @param state - Map de GUID -> VisibilityState
   */
  applyVisibilityState(state: Map<string, VisibilityState>): void {
    const startTime = performance.now();
    let updatedCount = 0;
    
    // Aplicar estado para cada elemento
    state.forEach((visibility, guid) => {
      const updated = this.updateObjectVisibility(guid, visibility);
      if (updated) updatedCount++;
    });
    
    const duration = performance.now() - startTime;
    
    // Log de performance (apenas em dev)
    if (process.env.NODE_ENV === 'development' && updatedCount > 100) {
      console.log(`VisibilityManager: Updated ${updatedCount} objects in ${duration.toFixed(2)}ms`);
    }
  }
  
  /**
   * Atualiza visibilidade de um objeto específico
   * 
   * @param guid - GUID do elemento
   * @param state - Estado de visibilidade desejado
   * @returns true se objeto foi atualizado
   */
  updateObjectVisibility(guid: string, state: VisibilityState): boolean {
    const object = this.guidToObjectMap.get(guid);
    if (!object) {
      return false;
    }
    
    switch (state) {
      case 'hidden':
        this.setObjectHidden(object);
        break;
      
      case 'constructing':
        this.setObjectConstructing(object);
        break;
      
      case 'visible':
        this.setObjectVisible(object);
        break;
    }
    
    return true;
  }
  
  /**
   * Define duração das transições de visibilidade
   * 
   * @param ms - Duração em milissegundos
   */
  setTransitionDuration(ms: number): void {
    this.transitionDuration = Math.max(0, ms);
  }
  
  /**
   * Retorna objetos atualmente ocultos
   */
  getHiddenObjects(): Object3D[] {
    const hidden: Object3D[] = [];
    
    this.guidToObjectMap.forEach(object => {
      if (!object.visible) {
        hidden.push(object);
      }
    });
    
    return hidden;
  }
  
  /**
   * Retorna objetos atualmente visíveis
   */
  getVisibleObjects(): Object3D[] {
    const visible: Object3D[] = [];
    
    this.guidToObjectMap.forEach(object => {
      if (object.visible) {
        visible.push(object);
      }
    });
    
    return visible;
  }
  
  /**
   * Define objeto como oculto (não visível)
   */
  private setObjectHidden(object: Object3D): void {
    object.visible = false;
    this.setObjectOpacity(object, 0);
  }
  
  /**
   * Define objeto como em construção (semi-transparente)
   */
  private setObjectConstructing(object: Object3D): void {
    object.visible = true;
    
    // Animação de fade-in suave para 0.7 (70% opacidade)
    if (this.transitionDuration > 0) {
      this.animateOpacity(object, 0.7, this.transitionDuration);
    } else {
      this.setObjectOpacity(object, 0.7);
    }
  }
  
  /**
   * Define objeto como completamente visível
   */
  private setObjectVisible(object: Object3D): void {
    object.visible = true;
    
    // Animação de fade-in suave para 1.0 (100% opacidade)
    if (this.transitionDuration > 0) {
      this.animateOpacity(object, 1.0, this.transitionDuration);
    } else {
      this.setObjectOpacity(object, 1.0);
    }
  }
  
  /**
   * Define opacidade de um objeto
   */
  private setObjectOpacity(object: Object3D, opacity: number): void {
    object.traverse((child) => {
      if (this.isMesh(child)) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        
        materials.forEach(material => {
          if (material && 'opacity' in material) {
            material.opacity = opacity;
            material.transparent = opacity < 1.0;
            material.needsUpdate = true;
          }
        });
      }
    });
  }
  
  /**
   * Anima opacidade de um objeto
   * 
   * Implementação simplificada sem biblioteca de tween
   * Para produção, considerar usar @tweenjs/tween.js
   */
  private animateOpacity(object: Object3D, targetOpacity: number, duration: number): void {
    // Cancelar animação anterior deste objeto
    const guid = this.getGuidForObject(object);
    if (guid) {
      const existingTimeout = this.activeTransitions.get(guid);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
    }
    
    // Obter opacidade atual
    let currentOpacity = 0;
    object.traverse((child) => {
      if (this.isMesh(child)) {
        const material = Array.isArray(child.material)
          ? child.material[0]
          : child.material;
        
        if (material && 'opacity' in material) {
          currentOpacity = material.opacity;
          return; // Usar primeiro material encontrado
        }
      }
    });
    
    // Animação simples com setInterval
    const steps = 20; // 20 frames de animação
    const stepDuration = duration / steps;
    const opacityStep = (targetOpacity - currentOpacity) / steps;
    let currentStep = 0;
    
    const intervalId = setInterval(() => {
      currentStep++;
      const newOpacity = currentOpacity + (opacityStep * currentStep);
      
      this.setObjectOpacity(object, newOpacity);
      
      if (currentStep >= steps) {
        clearInterval(intervalId);
        this.setObjectOpacity(object, targetOpacity); // Garantir valor final exato
        
        if (guid) {
          this.activeTransitions.delete(guid);
        }
      }
    }, stepDuration) as unknown as NodeJS.Timeout;
    
    if (guid) {
      this.activeTransitions.set(guid, intervalId);
    }
  }
  
  /**
   * Type guard para verificar se é um Mesh
   */
  private isMesh(object: Object3D): object is Mesh {
    return (object as Mesh).isMesh === true;
  }
  
  /**
   * Encontra GUID de um objeto (busca reversa)
   */
  private getGuidForObject(object: Object3D): string | undefined {
    for (const [guid, obj] of this.guidToObjectMap.entries()) {
      if (obj === object) {
        return guid;
      }
    }
    return undefined;
  }
  
  /**
   * Limpa todos os registros e transições
   */
  clear(): void {
    // Cancelar todas as transições ativas
    this.activeTransitions.forEach(timeout => clearTimeout(timeout));
    this.activeTransitions.clear();
    
    // Limpar mapa de objetos
    this.guidToObjectMap.clear();
  }
  
  /**
   * Libera recursos
   */
  dispose(): void {
    this.clear();
  }
}
