/**
 * InspectorController - Liga SelectionService ↔ Panel ↔ PropertyResolver ↔ RaycastPicker
 */

import * as THREE from 'three';
import { InspectorPanel } from './InspectorPanel';
import { RaycastPicker } from './RaycastPicker';
import { propertyResolver } from './PropertyResolver';
import { selectionService, SelectionPayload } from './SelectionService';

// Feature flag
export const ENABLE_INSPECTOR = true;

export class InspectorController {
  private panel: InspectorPanel | null = null;
  private picker: RaycastPicker | null = null;
  private rootContainer: HTMLElement | null = null;
  private unsubscribe?: () => void;

  /**
   * Inicializa o sistema de inspeção
   */
  public initialize(
    scene: THREE.Scene,
    camera: THREE.Camera,
    canvas: HTMLCanvasElement,
    rootContainer: HTMLElement,
    ifcLoader?: any
  ): void {
    if (!ENABLE_INSPECTOR) {
      console.log('⚠️ Inspector desabilitado (feature flag)');
      return;
    }

    console.log('🔍 Inicializando Inspector...');

    this.rootContainer = rootContainer;

    // Injetar IFC loader e scene no PropertyResolver (se disponível)
    if (ifcLoader) {
      propertyResolver.setIfcLoader(ifcLoader);
    }
    propertyResolver.setScene(scene);

    // Criar painel (mas NÃO montar ainda)
    this.panel = new InspectorPanel();

    // Criar raycast picker
    this.picker = new RaycastPicker(scene, camera, canvas);

    // Escutar mudanças de seleção
    this.setupSelectionListener();

    console.log('✅ Inspector inicializado');
    console.log('💡 Clique em objetos para ver propriedades');
  }

  /**
   * Configura listener para mudanças de seleção
   */
  private setupSelectionListener(): void {
    this.unsubscribe = selectionService.onSelectionChanged(async (payload) => {
      if (!payload) {
        // Sem seleção → desmontar painel
        this.hidePanel();
      }
      // NÃO abre automaticamente - deixa para o usuário decidir via context menu
    });
  }

  /**
   * Mostra painel com dados da seleção (público para uso via context menu)
   */
  public async showPanel(payload?: SelectionPayload): Promise<void> {
    if (!this.panel || !this.rootContainer) return;

    // Se não passou payload, usar seleção atual
    const data = payload || selectionService.getSelected();
    if (!data) {
      console.warn('⚠️ Nenhum objeto selecionado para mostrar propriedades');
      return;
    }

    // Montar painel se não estiver montado
    if (!this.panel.isMounted()) {
      this.panel.mount(this.rootContainer);
    }

    // Atualizar dados
    await this.panel.setData(data);
  }

  /**
   * Esconde painel (desmonta) - público para uso via context menu
   */
  public hidePanel(): void {
    if (this.panel && this.panel.isMounted()) {
      this.panel.unmount();
    }
  }

  /**
   * Ativa/desativa o inspector
   */
  public setEnabled(enabled: boolean): void {
    this.picker?.setEnabled(enabled);
  }

  /**
   * Limpa seleção
   */
  public clearSelection(): void {
    selectionService.clear();
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.unsubscribe?.();
    this.panel?.destroy();
    this.picker?.dispose();
    propertyResolver.clearCache();
    this.rootContainer = null;
  }
}

// Export singleton
export const inspectorController = new InspectorController();
