/**
 * SharedSelectionService
 * Sincroniza seleções de elementos entre usuários colaborativos
 * Integra com RealtimeService para propagação de seleções
 */

import { getRealtimeService } from '../RealtimeService';

export interface SharedSelection {
  userId: string;
  userName: string;
  elementIds: string[];
  timestamp: number;
  color: string;
}

export interface SelectionHighlight {
  elementId: string;
  userId: string;
  color: string;
}

class SharedSelectionService {
  private realtimeService: ReturnType<typeof getRealtimeService>;
  private localSelections: Set<string> = new Set();
  private remoteSelections: Map<string, SharedSelection> = new Map();
  private selectionListeners: Set<(selections: SharedSelection[]) => void> = new Set();
  private enabled: boolean = true;

  constructor() {
    this.realtimeService = getRealtimeService();
    this.init();
  }

  private init(): void {
    // Ouvir eventos de seleção do realtime
    this.realtimeService.onRealtimeEvent((event) => {
      if (event.type === 'selection_changed') {
        this.handleRemoteSelection(event.userId, event.data.elementIds);
      }
    });
  }

  /**
   * Define seleção local e propaga para outros usuários
   */
  setSelection(elementIds: string[]): void {
    if (!this.enabled) {
      return;
    }

    this.localSelections = new Set(elementIds);

    // Propagar seleção via realtime
    this.realtimeService.notifySelection(elementIds);

    console.log('[SharedSelectionService] Local selection set:', elementIds.length);
  }

  /**
   * Adiciona elementos à seleção local
   */
  addToSelection(elementIds: string[]): void {
    const newSelection = new Set([...this.localSelections, ...elementIds]);
    this.setSelection(Array.from(newSelection));
  }

  /**
   * Remove elementos da seleção local
   */
  removeFromSelection(elementIds: string[]): void {
    const newSelection = new Set([...this.localSelections].filter(id => !elementIds.includes(id)));
    this.setSelection(Array.from(newSelection));
  }

  /**
   * Limpa seleção local
   */
  clearSelection(): void {
    this.setSelection([]);
  }

  /**
   * Retorna seleção local
   */
  getLocalSelection(): string[] {
    return Array.from(this.localSelections);
  }

  /**
   * Retorna todas as seleções (local + remota)
   */
  getAllSelections(): SharedSelection[] {
    const selections: SharedSelection[] = [];

    // Adicionar seleções remotas
    this.remoteSelections.forEach(selection => {
      selections.push(selection);
    });

    return selections;
  }

  /**
   * Retorna highlights para renderização
   */
  getHighlights(): SelectionHighlight[] {
    const highlights: SelectionHighlight[] = [];

    this.remoteSelections.forEach(selection => {
      selection.elementIds.forEach(elementId => {
        highlights.push({
          elementId,
          userId: selection.userId,
          color: selection.color,
        });
      });
    });

    return highlights;
  }

  /**
   * Trata seleção remota recebida
   */
  private handleRemoteSelection(userId: string, elementIds: string[]): void {
    const users = this.realtimeService.getOnlineUsers();
    const user = users.find(u => u.id === userId);

    if (!user) {
      return;
    }

    const selection: SharedSelection = {
      userId,
      userName: user.name,
      elementIds,
      timestamp: Date.now(),
      color: user.color,
    };

    this.remoteSelections.set(userId, selection);

    // Notificar listeners
    this.notifyListeners();

    console.log('[SharedSelectionService] Remote selection received:', userId, elementIds.length);
  }

  /**
   * Remove seleção de usuário que saiu
   */
  removeUserSelection(userId: string): void {
    this.remoteSelections.delete(userId);
    this.notifyListeners();
  }

  /**
   * Habilita/desabilita sincronização de seleção
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log('[SharedSelectionService] Enabled:', enabled);
  }

  /**
   * Ouvir mudanças de seleção
   */
  onSelectionChange(callback: (selections: SharedSelection[]) => void): () => void {
    this.selectionListeners.add(callback);
    return () => this.selectionListeners.delete(callback);
  }

  /**
   * Notifica listeners de mudança
   */
  private notifyListeners(): void {
    const selections = this.getAllSelections();
    this.selectionListeners.forEach(listener => listener(selections));
  }

  /**
   * Verifica se elemento está selecionado por outro usuário
   */
  isElementSelectedByOther(elementId: string): boolean {
    for (const selection of this.remoteSelections.values()) {
      if (selection.elementIds.includes(elementId)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Retorna usuários que selecionaram um elemento
   */
  getElementSelectors(elementId: string): SharedSelection[] {
    const selectors: SharedSelection[] = [];
    for (const selection of this.remoteSelections.values()) {
      if (selection.elementIds.includes(elementId)) {
        selectors.push(selection);
      }
    }
    return selectors;
  }

  /**
   * Limpa todas as seleções remotas
   */
  clearRemoteSelections(): void {
    this.remoteSelections.clear();
    this.notifyListeners();
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    return {
      localSelections: this.localSelections.size,
      remoteUsers: this.remoteSelections.size,
      totalRemoteSelections: Array.from(this.remoteSelections.values())
        .reduce((sum, sel) => sum + sel.elementIds.length, 0),
    };
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.localSelections.clear();
    this.remoteSelections.clear();
    this.selectionListeners.clear();
  }
}

// Singleton instance
let sharedSelectionServiceInstance: SharedSelectionService | null = null;

export function getSharedSelectionService(): SharedSelectionService {
  if (!sharedSelectionServiceInstance) {
    sharedSelectionServiceInstance = new SharedSelectionService();
  }
  return sharedSelectionServiceInstance;
}

export default SharedSelectionService;
