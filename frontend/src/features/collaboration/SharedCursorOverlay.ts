import { eventBus, EventType } from '../core';
import { collaborationManager, CursorUpdate } from './CollaborationManager';

interface PointerMoveEvent {
  event: PointerEvent;
  mouse: { x: number; y: number };
}

const CURSOR_THROTTLE_MS = 50;

export class SharedCursorOverlay {
  private container: HTMLElement;
  private overlay: HTMLDivElement;
  private cursorElements: Map<string, HTMLDivElement> = new Map();
  private pointerListener: (payload: PointerMoveEvent) => void;
  private disposers: Array<() => void> = [];
  private lastSent = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.style.position = this.container.style.position || 'relative';

    this.overlay = document.createElement('div');
    this.overlay.className = 'shared-cursor-overlay';
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.pointerEvents = 'none';
    this.overlay.style.zIndex = '12';

    this.container.appendChild(this.overlay);
    this.injectStyles();

    this.pointerListener = (payload) => this.handlePointerMove(payload);
    eventBus.on(EventType.INPUT_POINTER_MOVE, this.pointerListener as any);
    this.disposers.push(() => eventBus.off(EventType.INPUT_POINTER_MOVE, this.pointerListener as any));

    const offCursor = collaborationManager.on('cursor', (update: CursorUpdate) => {
      this.updateCursor(update);
    });
    this.disposers.push(offCursor);

    const offPresence = collaborationManager.on('presence', (users) => {
      const activeIds = new Set(users.map((u: any) => u.id));
      Array.from(this.cursorElements.keys()).forEach((id) => {
        if (!activeIds.has(id)) {
          const element = this.cursorElements.get(id);
          if (element) {
            element.remove();
          }
          this.cursorElements.delete(id);
        }
      });
    });
    this.disposers.push(offPresence);
  }

  private handlePointerMove({ event, mouse }: PointerMoveEvent): void {
    const now = Date.now();
    if (now - this.lastSent < CURSOR_THROTTLE_MS) {
      return;
    }
    this.lastSent = now;

    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    collaborationManager.sendCursorUpdate({
      screenX: x,
      screenY: y,
      normalizedX: rect.width > 0 ? x / rect.width : undefined,
      normalizedY: rect.height > 0 ? y / rect.height : undefined,
      worldPosition: undefined
    });

    // Atualiza imediatamente marcador local
    const localUser = collaborationManager.getLocalUser();
    if (localUser) {
      this.updateCursor({
        userId: localUser.id,
        userName: localUser.name,
        color: localUser.color,
        screenX: x,
        screenY: y,
        normalizedX: rect.width > 0 ? x / rect.width : mouse.x,
        normalizedY: rect.height > 0 ? y / rect.height : mouse.y,
        timestamp: now
      });
    }
  }

  private updateCursor(cursor: CursorUpdate): void {
    const rect = this.container.getBoundingClientRect();
    const x = cursor.normalizedX != null ? cursor.normalizedX * rect.width : cursor.screenX;
    const y = cursor.normalizedY != null ? cursor.normalizedY * rect.height : cursor.screenY;

    if (!isFinite(x) || !isFinite(y)) {
      return;
    }

    let element = this.cursorElements.get(cursor.userId);
    if (!element) {
      element = this.createCursorElement(cursor);
      this.cursorElements.set(cursor.userId, element);
      this.overlay.appendChild(element);
    }

    element.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }

  private createCursorElement(cursor: CursorUpdate): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'shared-cursor';
    wrapper.style.transform = `translate(${cursor.screenX}px, ${cursor.screenY}px) translate(-50%, -50%)`;

    const dot = document.createElement('div');
    dot.className = 'shared-cursor__dot';
    dot.style.background = cursor.color;
    wrapper.appendChild(dot);

    const label = document.createElement('div');
    label.className = 'shared-cursor__label';
    label.textContent = cursor.userName;
    label.style.background = 'rgba(0, 0, 0, 0.65)';
    label.style.borderColor = cursor.color;
    wrapper.appendChild(label);

    return wrapper;
  }

  private injectStyles(): void {
    if (document.getElementById('shared-cursor-overlay-styles')) return;

    const style = document.createElement('style');
    style.id = 'shared-cursor-overlay-styles';
    style.textContent = `
      .shared-cursor-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .shared-cursor {
        position: absolute;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
        will-change: transform;
      }

      .shared-cursor__dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
      }

      .shared-cursor__label {
        padding: 4px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 11px;
        font-weight: 500;
        color: #fff;
        backdrop-filter: blur(6px);
        pointer-events: none;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  public dispose(): void {
    this.disposers.forEach((dispose) => {
      try {
        dispose();
      } catch (error) {
        console.error('SharedCursorOverlay dispose error', error);
      }
    });
    this.disposers = [];

    this.cursorElements.forEach((element) => element.remove());
    this.cursorElements.clear();

    this.overlay.remove();
  }
}
