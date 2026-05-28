import { eventBus, EventType } from '../core';

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
  private static _instance: NotificationSystem | null = null;
  
  public static getInstance(): NotificationSystem {
    if (!NotificationSystem._instance) {
      NotificationSystem._instance = new NotificationSystem();
    }
    return NotificationSystem._instance;
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
        animation: slideIn 0.3s ease;
        pointer-events: auto;
        cursor: pointer;
        border-left: 4px solid;
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
      
      .notification.closing {
        animation: slideOut 0.3s ease;
      }
      
      .notification-success {
        border-left-color: #00ff88;
      }
      
      .notification-error {
        border-left-color: #ff4444;
      }
      
      .notification-warning {
        border-left-color: #ffaa00;
      }
      
      .notification-info {
        border-left-color: #4488ff;
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
    eventBus.on(EventType.MODEL_LOAD_REQUESTED, () => {
      this.info('Loading Model', 'Please wait...');
    });

    eventBus.on(EventType.MODEL_LOADED, (data: any) => {
      this.success('Model Loaded', `${data.fileName || 'Model'} loaded successfully`);
    });

    eventBus.on(EventType.MODEL_LOAD_FAILED, (data: any) => {
      this.error('Load Failed', data.error || 'Failed to load model');
    });

    // Network
    eventBus.on(EventType.NET_CONNECTED, () => {
      this.success('Connected', 'Connected to multiplayer server');
    });

    eventBus.on(EventType.NET_DISCONNECTED, () => {
      this.info('Disconnected', 'Disconnected from server');
    });

    eventBus.on(EventType.NET_CONNECTION_FAILED, (data: any) => {
      this.error('Connection Failed', data.error || 'Failed to connect to server');
    });

    // XR
    eventBus.on(EventType.XR_SESSION_STARTED, (data: any) => {
      this.success('VR Activated', `Entered ${data.mode || 'VR'} mode`);
    });

    eventBus.on(EventType.XR_SESSION_ENDED, () => {
      this.info('VR Deactivated', 'Exited VR mode');
    });

    eventBus.on(EventType.XR_SESSION_FAILED, (data: any) => {
      this.error('VR Failed', data.error || 'Failed to enter VR');
    });

    // Export
    eventBus.on(EventType.EXPORT_COMPLETED, (data: any) => {
      this.success('Export Complete', `${data.type} saved: ${data.filename}`);
    });

    eventBus.on(EventType.EXPORT_FAILED, (data: any) => {
      this.error('Export Failed', data.error || 'Export failed');
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

  private show(type: string, icon: string, title: string, message: string, duration: number): string {
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
let notificationSystem: NotificationSystem | null = null;

export function getNotificationSystem(): NotificationSystem {
  if (!notificationSystem) {
    notificationSystem = new NotificationSystem();
  }
  return notificationSystem;
}
