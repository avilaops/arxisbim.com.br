/**
 * AppShell - Layout principal (tipo Blazor MainLayout)
 * ActivityBar + Sidebar + Editor + StatusBar
 */

import { uiStore } from './state/uiStore';
import { eventBus as appEventBus } from './state/eventBus';
import { appState, eventBus as coreEventBus, EventType } from '../core';
import { ViewerHost } from '../viewer/ViewerHost';
import type { ProjectWorkspaceState, UIState } from './state/uiStore';
import { appController } from './AppController';
import { ActivityBar } from '../shared/components/ui/components/ActivityBar';
import { Sidebar } from '../shared/components/ui/components/Sidebar';
import { StatusBar } from '../shared/components/ui/components/StatusBar';
import { ModalHost } from '../shared/components/ui/components/ModalHost';
import { WorkspaceTopBar } from './WorkspaceTopBar';
import { ViewportOverlay } from './ViewportOverlay';
import { BIM4DTimelineStrip } from '../features/bim-4d/ui/BIM4DTimelineStrip';

/**
 * AppShell = Composition root da UI
 */
export class AppShell {
  private container: HTMLElement;
  private viewerHost!: ViewerHost;
  private activityBar?: ActivityBar;
  private sidebar?: Sidebar;
  private statusBar?: StatusBar;
  private modalHost?: ModalHost;
  private workspaceTopBar?: WorkspaceTopBar;
  private viewportOverlay?: ViewportOverlay;
  private bim4dTimeline?: BIM4DTimelineStrip;

  private unsubscribe?: () => void;
  private eventUnsubscribers: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.subscribeToState();
    this.setupEventListeners();
  }

  /**
   * Renderiza estrutura do AppShell
   */
  private render(): void {
    // Limpa container (remove loading screen)
    this.container.innerHTML = '';
    this.container.className = 'app-shell';
    // ...existing code...
  }

  // ...existing code...
}
