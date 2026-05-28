import { eventBus, EventType } from '../../../core/EventBus';

/**
 * NotificationSystem - Sistema de notificações/toast HUD
 * 
 * Exibe feedback visual para operações:
 * - Success (verde): "Model loaded successfully"
 * - Error (vermelho): "Failed to connect to server"
 * - Warning (amarelo): "WebXR not supported"
 * - Info (azul): "Connecting to multiplayer..."
 */
export class NotificationSystem {
  private static instance: NotificationSystem | null = null;
  
  public static getInstance(): NotificationSystem {
    if (!NotificationSystem.instance) {
      NotificationSystem.instance = new NotificationSystem();
    }
    return NotificationSystem.instance;
  }
  
  private container!: HTMLElement;
  private notifications: Map<string, HTMLElement> = new Map();

  constructor() {
    this.createContainer();
    this.applyStyles();
    this.listenToEvents();
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .notification-container {
        position: fixed;
        top: 70px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }
      
      .notification {
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(20px);
        border-radius: 8px;
        padding: 16px 20px;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        gap: 12px;
        pointer-events: auto;
        cursor: pointer;
        animation: slideIn 0.3s ease-out;
        transition: all 0.2s;
      }
      
      .notification:hover {
        transform: translateX(-4px);
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
      }
      
      .notification.closing {
        animation: slideOut 0.3s ease-in forwards;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
      
      .notification-success {
        border-left: 4px solid #00ff88;
      }
      
      .notification-error {
        border-left: 4px solid #f5576c;
      }
      
      .notification-warning {
        border-left: 4px solid #ffd700;
      }
      
      .notification-info {
        border-left: 4px solid #00d4ff;
      }
      
      .notification-icon {
        font-size: 24px;
        flex-shrink: 0;
      }
      
      .notification-content {
        flex: 1;
      }
      
      .notification-title {
        font-weight: bold;
        font-size: 14px;
        color: white;
        margin-bottom: 4px;
      }
      
      .notification-message {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
      }
      
      .notification-close {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s;
      }
      
      .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    
    if (!document.getElementById('notification-system-styles')) {
      style.id = 'notification-system-styles';
      document.head.appendChild(style);
    }
  }

  private listenToEvents(): void {
    // Model Loading
    eventBus.on(EventType.MODEL_LOAD_COMPLETED, (data: any) => {
      this.success('Model Loaded', `${data.fileName || 'Model'} loaded successfully`);
    });

    eventBus.on(EventType.MODEL_LOAD_FAILED, (data: any) => {
      this.error('Load Failed', data.error || 'Failed to load model');
    });

    // Selection
    eventBus.on(EventType.OBJECT_SELECTED, (data: any) => {
      if (data.entity) {
        this.info('Object Selected', `Selected: ${data.entity.name || 'Entity'}`);
      }
    });

    // Tools
    eventBus.on(EventType.TOOL_ACTIVATED, (data: any) => {
      this.info('Tool Activated', `${data.toolType} tool is now active`);
    });

    // Network
    eventBus.on(EventType.NETWORK_CONNECTED, () => {
      this.success('Connected', 'Connected to multiplayer server');
    });

    eventBus.on(EventType.NETWORK_DISCONNECTED, () => {
      this.warning('Disconnected', 'Lost connection to server');
    });

    // Project
    eventBus.on(EventType.PROJECT_SAVED, () => {
      this.success('Project Saved', 'Project saved successfully');
    });

    eventBus.on(EventType.PROJECT_SAVE_FAILED, (data: any) => {
      this.error('Save Failed', data.error || 'Failed to save project');
    });
  }

  public success(title: string, message: string, duration = 3000): string {
    return this.show('success', '✅', title, message, duration);
  }

  public error(title: string, message: string, duration = 5000): string {
    return this.show('error', '❌', title, message, duration);
  }

  public warning(title: string, message: string, duration = 4000): string {
    return this.show('warning', '⚠️', title, message, duration);
  }

  public info(title: string, message: string, duration = 3000): string {
    return this.show('info', 'ℹ️', title, message, duration);
  }

  /**
   * Public show method - accepts both old and new signatures
   */
  public show(type: string, icon: string, title: string, message: string, duration: number): string;
  public show(message: string, type: 'success' | 'error' | 'warning' | 'info'): string;
  public show(...args: any[]): string {
    // New signature: (type, icon, title, message, duration)
    if (args.length === 5) {
      return this._show(args[0], args[1], args[2], args[3], args[4]);
    }
    // Old signature: (message, type) - convert to new
    const message = args[0] as string;
    const type = args[1] as 'success' | 'error' | 'warning' | 'info';
    const iconMap = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const durationMap = { success: 3000, error: 5000, warning: 4000, info: 3000 };
    return this._show(type, iconMap[type], message, '', durationMap[type]);
  }

  private _show(type: string, icon: string, title: string, message: string, duration: number): string {
    const id = `notification-${Date.now()}-${Math.random()}`;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.dataset.id = id;

    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close">✕</button>
    `;

    // Close button
    notification.querySelector('.notification-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss(id);
    });

    // Click to dismiss
    notification.addEventListener('click', () => {
      this.dismiss(id);
    });

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.classList.add('closing');

    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  public dismissAll(): void {
    this.notifications.forEach((_, id) => {
      this.dismiss(id);
    });
  }
}

// Backward compatibility
export function getNotificationSystem(): NotificationSystem {
  // Single source of truth: the class singleton
  return NotificationSystem.getInstance();
}
