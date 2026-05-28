/**
 * Registry com LAZY LOADING - Carrega componentes apenas quando necessário
 * Reduz tempo de inicialização de ~2s para ~200ms
 */

// Tipo padrão para instâncias de componentes (interface minima com lifecycle)
export type ComponentInstance = {
  element?: HTMLElement;
  open?: () => void;
  close?: () => void;
  destroy?: () => void;
  mount?(container?: HTMLElement): void;
  setAppController?(controller: any): void;
  onOpen?(): void;
  onClose?(): void;
  [key: string]: any; // Permite propriedades adicionais/privadas
};

// Metadados de componentes (política de descarte)
export type ComponentMetadata = {
  persistent?: boolean; // true = hide/show, false = destroy ao fechar
  preload?: boolean;    // true = carrega após first frame
  category?: 'modal' | 'panel' | 'widget' | 'overlay';
};

const componentMetadata: Record<string, ComponentMetadata> = {
  // Modais: destroy ao fechar
  LoadFileModal: { persistent: false, preload: true, category: 'modal' },
  ExportModal: { persistent: false, preload: true, category: 'modal' },
  ShareModal: { persistent: false, preload: true, category: 'modal' },
  
  // Painéis: persistent (preserva estado)
  TimelinePanel: { persistent: true, category: 'panel' },
  LayersPanel: { persistent: true, category: 'panel' },
  IFCPropertyPanel: { persistent: true, category: 'panel' },
  AdvancedSearchPanel: { persistent: true, category: 'panel' },
  
  // Widgets: persistent
  UserPresenceWidget: { persistent: true, category: 'widget' },
  ActivityFeed: { persistent: true, category: 'widget' },
  
  // Overlays: destroy ao fechar
  TutorialOverlay: { persistent: false, category: 'overlay' }
};

// Lazy imports usando dynamic import()
const componentLoaders: Record<string, () => Promise<ComponentInstance>> = {
  // BIM 4D/5D/6D
  TimelinePanel: () => import('./ui/panels-v2/TimelinePanel').then(m => new m.TimelinePanel()),
  SchedulePanel: () => import('./ui/panels-v2/SchedulePanel').then(m => new m.SchedulePanel()),
  CostDashboard: () => import('./ui/panels-v2/CostDashboard').then(m => new m.CostDashboard()),
  QuantitiesPanel: () => import('./ui/panels-v2/QuantitiesPanel').then(m => new m.QuantitiesPanel()),
  FacilityPanel: () => import('./ui/panels-v2/FacilityPanel').then(m => new m.FacilityPanel()),
  MaintenancePanel: () => import('./ui/panels-v2/MaintenancePanel').then(m => new m.MaintenancePanel()),
  
  // Visualização
  MaterialEditor: () => import('./ui/panels-v2/MaterialEditor').then(m => new m.MaterialEditor()),
  LightingPanel: () => import('./ui/panels-v2/LightingPanel').then(m => new m.LightingPanel()),
  ClippingPlanesEditor: () => import('./ui/panels-v2/ClippingPlanesEditor').then(m => new m.ClippingPlanesEditor()),
  SectionBoxTool: () => import('./ui/panels-v2/SectionBoxTool').then(m => new m.SectionBoxTool()),
  ExplodeViewPanel: () => import('./ui/panels-v2/ExplodeViewPanel').then(m => new m.ExplodeViewPanel()),
  TransparencyControl: () => import('./ui/panels-v2/TransparencyControl').then(m => new m.TransparencyControl()),
  CameraPresetsPanel: () => import('./ui/panels-v2/CameraPresetsPanel').then(m => new m.CameraPresetsPanel()),
  
  // Colaboração
  ChatPanel: () => import('./ui/panels-v2/ChatPanel').then(m => new m.ChatPanel()),
  AnnotationsPanel: () => import('./ui/panels-v2/AnnotationsPanel').then(m => new m.AnnotationsPanel()),
  IssuesPanel: () => import('./ui/panels-v2/IssuesPanel').then(m => new m.IssuesPanel()),
  UserPresenceWidget: () => import('./ui/panels-v2/UserPresenceWidget').then(m => new m.UserPresenceWidget()),
  ActivityFeed: () => import('./ui/panels-v2/ActivityFeed').then(m => new m.ActivityFeed()),
  
  // Busca
  AdvancedSearchPanel: () => import('./ui/panels-v2/AdvancedSearchPanel').then(m => new m.AdvancedSearchPanel()),
  FilterBuilder: () => import('./ui/panels-v2/FilterBuilder').then(m => new m.FilterBuilder()),
  SavedFiltersPanel: () => import('./ui/panels-v2/SavedFiltersPanel').then(m => new m.SavedFiltersPanel()),
  SelectionSetsPanel: () => import('./ui/panels-v2/SelectionSetsPanel').then(m => new m.SelectionSetsPanel()),
  
  // Gerenciamento
  FileBrowser: () => import('./ui/panels-v2/FileBrowser').then(m => new m.FileBrowser()),
  RecentProjects: () => import('./ui/panels-v2/RecentProjects').then(m => new m.RecentProjects()),
  CloudStoragePanel: () => import('./ui/panels-v2/CloudStoragePanel').then(m => new m.CloudStoragePanel()),
  VersionHistory: () => import('./ui/panels-v2/VersionHistory').then(m => new m.VersionHistory()),
  ProjectExplorer: () => import('./ui/panels-v2/ProjectExplorer').then(m => new m.ProjectExplorer()),
  IFCPropertyPanel: () => import('./ui/panels-v2/IFCPropertyPanel').then(m => new m.IFCPropertyPanel()),
  LayersPanel: () => import('./ui/panels-v2/LayersPanel').then(m => new m.LayersPanel()),
  MeasurementPanel: () => import('./ui/panels-v2/MeasurementPanel').then(m => new m.MeasurementPanel()),
  
  // Analytics
  DashboardWidget: () => import('./ui/panels-v2/DashboardWidget').then(m => new m.DashboardWidget()),
  ChartsPanel: () => import('./ui/panels-v2/ChartsPanel').then(m => new m.ChartsPanel()),
  ReportViewer: () => import('./ui/panels-v2/ReportViewer').then(m => new m.ReportViewer()),
  ExportReportButton: () => import('./ui/panels-v2/ExportReportButton').then(m => new m.ExportReportButton()),
  
  // VR/AR
  VRControlsPanel: () => import('./ui/panels-v2/VRControlsPanel').then(m => new m.VRControlsPanel()),
  VRTeleportUI: () => import('./ui/panels-v2/VRTeleportUI').then(m => new m.VRTeleportUI()),
  VRMenuRadial: () => import('./ui/panels-v2/VRMenuRadial').then(m => new m.VRMenuRadial()),
  ARMeasurementUI: () => import('./ui/panels-v2/ARMeasurementUI').then(m => new m.ARMeasurementUI()),
  
  // Interface
  KeyboardShortcutsPanel: () => import('./ui/panels-v2/KeyboardShortcutsPanel').then(m => new m.KeyboardShortcutsPanel()),
  HelpPanel: () => import('./ui/panels-v2/HelpPanel').then(m => new m.HelpPanel()),
  TutorialOverlay: () => import('./ui/panels-v2/TutorialOverlay').then(m => new m.TutorialOverlay(null as any)), // AppController será injetado depois
  CommandPalette: () => import('./ui/panels-v2/CommandPalette').then(m => new m.CommandPalette()),
  ThemePicker: () => import('./ui/panels-v2/ThemePicker').then(m => new m.ThemePicker()),
  LanguageSelector: () => import('./ui/panels-v2/LanguageSelector').then(m => new m.LanguageSelector()),
  SettingsPanel: () => import('./ui/panels-v2/SettingsPanel').then(m => new m.SettingsPanel()),
  AvatarCustomizer: () => import('../../features/virtual-meetings/avatar/AvatarCustomizer').then(m => new m.AvatarCustomizer()),
  
  // Modais (mais usados, carregamento prioritário)
  LoadFileModal: () => import('./ui/modals/LoadFileModal-v2').then(m => new m.LoadFileModal()),
  ExportModal: () => import('./ui/modals/ExportModal').then(m => new m.ExportModal()),
  ShareModal: () => import('./ui/modals/ShareModal').then(m => new m.ShareModal()),
  VersionCompareModal: () => import('./ui/modals/VersionCompareModal').then(m => new m.VersionCompareModal()),
  ConflictDetectionModal: () => import('./ui/modals/ConflictDetectionModal').then(m => new m.ConflictDetectionModal()),
  ReportGeneratorModal: () => import('./ui/modals/ReportGeneratorModal').then(m => new m.ReportGeneratorModal())
};

// Registry exposto (para compatibilidade)
export const ComponentsRegistry: Record<string, () => Promise<ComponentInstance>> = componentLoaders;

/**
 * Cache de Promises para dedupe de carregamento concorrente
 * Garante que cada componente seja importado apenas uma vez, mesmo com múltiplos cliques
 */
const loadPromises = new Map<string, Promise<ComponentInstance>>();

/**
 * Cria componente com lazy loading + dedupe de carregamento
 * SEMPRE retorna Promise para contrato consistente
 */
export async function createComponent(name: string): Promise<ComponentInstance | null> {
  const loader = componentLoaders[name];
  if (!loader) {
    console.error(`❌ Componente não registrado: ${name}`);
    return null;
  }
  
  try {
    // Dedupe: se já está carregando, retorna a mesma Promise
    let p = loadPromises.get(name);
    if (!p) {
      console.log(`⏳ Carregando componente: ${name}...`);
      p = loader();
      loadPromises.set(name, p);
    }

    const instance = await p;
    console.log(`✅ Componente carregado: ${name}`);
    return instance;
  } catch (error) {
    loadPromises.delete(name); // Permite retry em caso de erro
    console.error(`❌ Erro ao carregar componente ${name}:`, error);
    return null;
  }
}

/**
 * Obtém metadados do componente
 */
export function getComponentMetadata(name: string): ComponentMetadata {
  return componentMetadata[name] || { persistent: true, category: 'panel' };
}

/**
 * ComponentManager - Gerencia ciclo de vida de componentes UI
 * Evita duplicação e controla estado centralizado com dedupe por key
 */
export class ComponentManager {
  private instances = new Map<string, ComponentInstance>();
  private pending = new Map<string, Promise<ComponentInstance | null>>(); // Dedupe de open() concorrente
  private hiddenInstances = new Set<string>(); // Instâncias hidden (persistent)

  get(key: string): ComponentInstance | undefined {
    return this.instances.get(key);
  }

  has(key: string): boolean {
    return this.instances.has(key);
  }

  /**
   * Abre componente com dedupe de chamadas concorrentes
   * @param key - ID único da instância (ex: 'modal:load-file', 'panel:timeline')
   * @param componentName - Nome do tipo de componente (ex: 'LoadFileModal', 'TimelinePanel')
   */
  async open(key: string, componentName: string): Promise<ComponentInstance | null> {
    // Se já existe e está hidden, apenas mostra
    const existing = this.instances.get(key);
    if (existing) {
      if (this.hiddenInstances.has(key)) {
        this.hiddenInstances.delete(key);
        if (existing.element) existing.element.style.display = '';
      }
      existing.open?.();
      existing.onOpen?.();
      return existing;
    }

    // Dedupe: se já está abrindo, retorna a mesma Promise
    const inflight = this.pending.get(key);
    if (inflight) return inflight;

    const task = (async () => {
      const instance = await createComponent(componentName);
      if (!instance) return null;

      // Adiciona ao DOM se necessário
      if (instance.element && !instance.element.parentElement) {
        document.body.appendChild(instance.element);
      }

      // Mount lifecycle
      instance.mount?.();

      // Abre/ativa
      instance.open?.();
      instance.onOpen?.();

      this.instances.set(key, instance);
      return instance;
    })().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, task);
    return task;
  }

  /**
   * Fecha componente (hide se persistent, destroy se não)
   */
  close(key: string): void {
    const instance = this.instances.get(key);
    if (!instance) return;

    instance.close?.();
    instance.onClose?.();

    // Obtém metadados para decidir política de descarte
    const componentName = this.getComponentNameFromKey(key);
    const meta = componentName ? getComponentMetadata(componentName) : { persistent: true };

    if (meta.persistent) {
      // Persistent: apenas hide (preserva estado)
      if (instance.element) {
        instance.element.style.display = 'none';
      }
      this.hiddenInstances.add(key);
    } else {
      // Não-persistent: destroy e remove
      instance.destroy?.();

      if (instance.element?.parentElement) {
        instance.element.parentElement.removeChild(instance.element);
      }

      this.instances.delete(key);
      this.hiddenInstances.delete(key);
    }
  }

  async toggle(key: string, componentName: string): Promise<ComponentInstance | null> {
    if (this.instances.has(key) && !this.hiddenInstances.has(key)) {
      this.close(key);
      return null;
    }
    return this.open(key, componentName);
  }

  /**
   * Fecha todos os componentes (force destroy se lowMemory)
   */
  closeAll(options?: { forceDestroy?: boolean }): void {
    for (const key of Array.from(this.instances.keys())) {
      if (options?.forceDestroy) {
        // Low memory mode: destroy tudo
        const instance = this.instances.get(key);
        instance?.close?.();
        instance?.destroy?.();
        if (instance?.element?.parentElement) {
          instance.element.parentElement.removeChild(instance.element);
        }
        this.instances.delete(key);
      } else {
        this.close(key);
      }
    }
    this.hiddenInstances.clear();
  }

  getStats() {
    return {
      count: this.instances.size,
      keys: Array.from(this.instances.keys()),
      hidden: Array.from(this.hiddenInstances),
      pending: this.pending.size
    };
  }

  /**
   * Extrai componentName do key (heurística)
   * Ex: 'modal:LoadFileModal' -> 'LoadFileModal', 'panel:timeline' -> null
   */
  private getComponentNameFromKey(key: string): string | null {
    const parts = key.split(':');
    if (parts.length === 2) {
      // Verifica se é PascalCase (componentName)
      const candidate = parts[1];
      if (/^[A-Z]/.test(candidate)) return candidate;
    }
    return null;
  }
}

/**
 * Instância global do ComponentManager
 */
export const componentManager = new ComponentManager();

/**
 * Preload de componentes críticos após first frame
 * Carrega modais mais usados (LoadFileModal, ExportModal, ShareModal) em idle time
 */
export function preloadCriticalComponents(): void {
  const preloadList = Object.entries(componentMetadata)
    .filter(([_, meta]) => meta.preload)
    .map(([name]) => name);

  const doPreload = () => {
    console.log(`🚀 Preloading ${preloadList.length} critical components...`);
    preloadList.forEach(name => {
      createComponent(name).catch(err => {
        console.warn(`⚠️ Failed to preload ${name}:`, err);
      });
    });
  };

  // Usa requestIdleCallback se disponível, senão setTimeout
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(doPreload, { timeout: 2000 });
  } else {
    setTimeout(doPreload, 50);
  }
}

/**
 * UI Command Router - Padrão de comandos para atalhos de teclado e Command Palette
 * Ex: 'open:timeline', 'toggle:chat', 'close:all'
 */
export async function executeUICommand(command: string): Promise<boolean> {
  const [action, target] = command.split(':', 2);

  switch (action) {
    case 'open': {
      if (target === 'all') return false; // Não faz sentido
      const key = `cmd:${target}`;
      const componentName = componentNameFromAlias(target);
      if (!componentName) {
        console.warn(`❌ Unknown component alias: ${target}`);
        return false;
      }
      await componentManager.open(key, componentName);
      return true;
    }

    case 'toggle': {
      const key = `cmd:${target}`;
      const componentName = componentNameFromAlias(target);
      if (!componentName) {
        console.warn(`❌ Unknown component alias: ${target}`);
        return false;
      }
      await componentManager.toggle(key, componentName);
      return true;
    }

    case 'close': {
      if (target === 'all') {
        componentManager.closeAll();
        return true;
      }
      const key = `cmd:${target}`;
      componentManager.close(key);
      return true;
    }

    default:
      console.warn(`❌ Unknown UI command: ${command}`);
      return false;
  }
}

/**
 * Mapeia alias para componentName (ex: 'timeline' -> 'TimelinePanel')
 */
function componentNameFromAlias(alias: string): string | null {
  const aliasMap: Record<string, string> = {
    // Panels
    'timeline': 'TimelinePanel',
    'schedule': 'SchedulePanel',
    'layers': 'LayersPanel',
    'properties': 'IFCPropertyPanel',
    'search': 'AdvancedSearchPanel',
    'chat': 'ChatPanel',
    'settings': 'SettingsPanel',
    'help': 'HelpPanel',
    
    // Modals
    'load': 'LoadFileModal',
    'export': 'ExportModal',
    'share': 'ShareModal',
    
    // Tools
    'measure': 'MeasurementPanel',
    'section': 'SectionBoxTool',
    'clipping': 'ClippingPlanesEditor',
    
    // Avatar
    'avatar': 'AvatarCustomizer'
  };

  return aliasMap[alias.toLowerCase()] || null;
}

/**
 * InputGate - Detecta se usuário está digitando em UI
 * Bloqueia controles de câmera (WASD) quando necessário
 */
export function shouldBlockCameraControls(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;

  // Campos de input ativos (SEMPRE bloqueia)
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;

  // Modal ativo: só bloqueia se está digitando em campo de texto
  const hasModal = document.querySelector('.arxis-modal-overlay, [data-modal-open="true"]') !== null;
  if (hasModal) {
    // Se tem modal mas NÃO está em input, permite movimento (WASD)
    return false;
  }

  // Apenas bloqueia se está REALMENTE digitando em um painel (focus dentro dele)
  const isInsidePanel = el.closest('[data-arxis-panel], .arxis-panel, .arxis-dock') !== null;
  if (isInsidePanel) {
    // Se tem focus em elemento interativo dentro do painel
    const isInteractive = tag === 'button' || el.getAttribute('role') === 'button' || el.tabIndex >= 0;
    return isInteractive;
  }

  return false;
}

/**
 * Alias para compatibilidade (deprecated, usar shouldBlockCameraControls)
 * @deprecated Use shouldBlockCameraControls() instead
 */
export function isTypingInUI(): boolean {
  return shouldBlockCameraControls();
}

/**
 * Detecta se há UI aberta que deveria bloquear pointer lock
 */
export function hasOpenUI(): boolean {
  const hasModal = document.querySelector('.arxis-modal-overlay, [data-modal-open="true"]') !== null;
  
  // Apenas bloqueia pointer lock se modal aberto (painéis não bloqueiam)
  return hasModal;
}
