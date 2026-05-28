/**
 * ViewportOverlay - estado operacional do canvas.
 *
 * Mostra vazio/loading/erro sem competir com o viewer Three.js.
 */

import { uiStore } from './state/uiStore';
import { eventBus as appEventBus } from './state/eventBus';
import { eventBus as coreEventBus, EventType } from '../core';

type ViewportOverlayState = 'idle' | 'loading' | 'ready' | 'error';

export class ViewportOverlay {
  private readonly container: HTMLElement;
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly description: HTMLElement;
  private readonly progress: HTMLElement;
  private readonly progressValue: HTMLElement;
  private readonly meta: HTMLElement;
  private readonly runtime: HTMLElement;
  private readonly unsubscribers: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.root = document.createElement('div');
    this.title = document.createElement('h2');
    this.description = document.createElement('p');
    this.progress = document.createElement('div');
    this.progressValue = document.createElement('div');
    this.meta = document.createElement('div');
    this.runtime = document.createElement('div');

    this.render();
    this.subscribeToEvents();
    this.setIdle();
  }

  private render(): void {
    this.root.className = 'viewport-overlay';
    this.root.setAttribute('aria-live', 'polite');

    const panel = document.createElement('div');
    panel.className = 'viewport-overlay__panel';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'viewport-overlay__eyebrow';
    eyebrow.textContent = 'Workspace BIM';

    this.title.className = 'viewport-overlay__title';
    this.description.className = 'viewport-overlay__description';

    this.progress.className = 'viewport-overlay__progress';
    const progressTrack = document.createElement('div');
    progressTrack.className = 'viewport-overlay__progress-track';
    this.progressValue.className = 'viewport-overlay__progress-value';
    progressTrack.appendChild(this.progressValue);
    this.progress.appendChild(progressTrack);

    this.meta.className = 'viewport-overlay__meta';

    const actions = document.createElement('div');
    actions.className = 'viewport-overlay__actions';

    const openButton = document.createElement('button');
    openButton.className = 'btn btn--primary';
    openButton.type = 'button';
    openButton.textContent = 'Abrir IFC';
    openButton.addEventListener('click', () => uiStore.openModal('loadFile'));

    const shortcut = document.createElement('span');
    shortcut.className = 'viewport-overlay__shortcut';
    shortcut.textContent = 'Ctrl+O';

    actions.appendChild(openButton);
    actions.appendChild(shortcut);

    panel.appendChild(eyebrow);
    panel.appendChild(this.title);
    panel.appendChild(this.description);
    panel.appendChild(this.progress);
    panel.appendChild(this.meta);
    panel.appendChild(actions);

    this.runtime.className = 'viewport-overlay__runtime';

    this.root.appendChild(panel);
    this.root.appendChild(this.runtime);
    this.container.appendChild(this.root);
  }

  private subscribeToEvents(): void {
    this.onCoreEvent(EventType.MODEL_LOAD_REQUESTED, ({ fileRef, url }) => {
      this.setLoading(4, `Preparando ${fileRef?.name || url || 'modelo'}`);
    });

    this.onCoreEvent(EventType.MODEL_LOADING, ({ fileName }) => {
      this.setLoading(8, `Carregando ${fileName || 'modelo'}`);
    });

    this.onCoreEvent(EventType.MODEL_LOAD_PROGRESS, ({ progress }) => {
      this.setLoading(progress ?? 0, 'Processando geometria e metadados IFC');
    });

    this.onCoreEvent(EventType.MODEL_LOADED, ({ fileName }) => {
      this.setReady(fileName || uiStore.getState().statusBar.fileName || 'Modelo carregado');
    });

    this.onCoreEvent(EventType.MODEL_LOAD_FAILED, ({ message, error }) => {
      this.setError(message || error || 'Falha ao carregar modelo');
    });

    this.onCoreEvent(EventType.MODEL_ERROR, ({ error, fileName }) => {
      this.setError(`Falha em ${fileName || 'modelo'}: ${error?.message || 'erro desconhecido'}`);
    });

    this.unsubscribers.push(appEventBus.on('ProgressChanged', (event) => {
      this.setLoading(event.payload.progress, event.payload.message);
    }));

    this.unsubscribers.push(appEventBus.on('ModelLoaded', (event) => {
      this.setReady(event.payload.fileName);
    }));

    this.unsubscribers.push(appEventBus.on('ErrorRaised', (event) => {
      this.setError(event.payload.message);
    }));
  }

  private onCoreEvent(event: EventType, callback: (data: any) => void): void {
    coreEventBus.on(event as any, callback);
    this.unsubscribers.push(() => coreEventBus.off(event as any, callback));
  }

  private setIdle(): void {
    this.setState('idle');
    this.title.textContent = 'Viewer aguardando modelo';
    this.description.textContent = 'Importe um arquivo IFC para iniciar navegação técnica, inspeção de elementos e gerenciamento de vistas.';
    this.meta.textContent = 'Formatos: IFC 2x3/4 · Navegação: FPS/Orbit/Drone · Painéis: Propriedades/Camadas/Seções';
    this.setProgress(0);
  }

  private setLoading(progress: number, message: string): void {
    this.setState('loading');
    this.title.textContent = 'Carregando modelo';
    this.description.textContent = message;
    this.meta.textContent = `${Math.round(Math.max(0, Math.min(100, progress)))}% concluído`;
    this.setProgress(progress);
  }

  private setReady(fileName: string): void {
    this.setState('ready');
    this.runtime.textContent = `${fileName} · Viewer ativo`;
  }

  private setError(message: string): void {
    this.setState('error');
    this.title.textContent = 'Falha ao carregar';
    this.description.textContent = message;
    this.meta.textContent = 'Verifique o arquivo IFC e tente novamente.';
    this.setProgress(0);
  }

  private setState(state: ViewportOverlayState): void {
    this.root.dataset.state = state;
    this.root.classList.toggle('is-ready', state === 'ready');
    this.root.classList.toggle('is-loading', state === 'loading');
    this.root.classList.toggle('is-error', state === 'error');
  }

  private setProgress(progress: number): void {
    const value = Math.max(0, Math.min(100, progress));
    this.progressValue.style.width = `${value}%`;
  }

  public destroy(): void {
    this.unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    this.root.remove();
  }
}