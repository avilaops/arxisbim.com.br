/**
 * SelectionService - Gerencia seleção de objetos (singleton)
 */

import * as THREE from 'three';

export interface SelectionPayload {
  object3D: THREE.Object3D;
  id: string | number;
  type: 'ifc' | 'mesh' | 'unknown';
  properties?: any;
  expressID?: number;
  modelID?: number;
}

type SelectionListener = (payload: SelectionPayload | null) => void;

export class SelectionService {
  private static instance: SelectionService;
  private currentSelection: SelectionPayload | null = null;
  private listeners: Set<SelectionListener> = new Set();

  private constructor() {}

  public static getInstance(): SelectionService {
    if (!SelectionService.instance) {
      SelectionService.instance = new SelectionService();
    }
    return SelectionService.instance;
  }

  /**
   * Define o objeto selecionado
   */
  public setSelected(payload: SelectionPayload): void {
    this.currentSelection = payload;
    this.notifyListeners();
    console.log('🎯 Objeto selecionado:', payload);
  }

  /**
   * Limpa a seleção
   */
  public clear(): void {
    this.currentSelection = null;
    this.notifyListeners();
    console.log('🎯 Seleção limpa');
  }

  /**
   * Retorna o objeto selecionado
   */
  public getSelected(): SelectionPayload | null {
    return this.currentSelection;
  }

  /**
   * Registra listener para mudanças de seleção
   */
  public onSelectionChanged(listener: SelectionListener): () => void {
    this.listeners.add(listener);
    // Retorna função para remover listener
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentSelection);
      } catch (error) {
        console.error('Erro ao notificar listener:', error);
      }
    });
  }
}

// Export singleton instance
export const selectionService = SelectionService.getInstance();
