/**
 * NotificationManager.ts - Sistema de notificações toast
 * Mostra mensagens de sucesso, erro, aviso e info
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  type: NotificationType;
  message: string;
  duration?: number; // milliseconds, 0 = permanent
  action?: {
    label: string;
    callback: () => void;
  };
}

class NotificationManager {
  private static instance: NotificationManager;
  private container: HTMLElement | null = null;
  private notifications: Map<string, HTMLElement> = new Map();

  private constructor() {
    this.createContainer();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * Create notifications container
   */
  private createContainer(): void {
    const container = document.createElement('div');
    container.className = 'notifications-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10001;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    `;

    document.body.appendChild(container);
    this.container = container;
  }

  /**
   * Show notification
   */
  public show(options: NotificationOptions): string {
    const id = this.generateId();
    const notification = this.createNotification(id, options);
    
    if (!this.container) return id;

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    });

    // Auto-dismiss if duration is set
    if (options.duration && options.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, options.duration);
    }

    return id;
  }

  /**
   * Success notification
   */
  public success(message: string, duration = 3000): string {
    return this.show({ type: 'success', message, duration });
  }

  /**
   * Error notification
   */
  public error(message: string, duration = 5000): string {
    return this.show({ type: 'error', message, duration });
  }

  /**
   * Warning notification
   */
  public warning(message: string, duration = 4000): string {
    return this.show({ type: 'warning', message, duration });
  }

  /**
   * Info notification
   */
  public info(message: string, duration = 3000): string {
    return this.show({ type: 'info', message, duration });
  }

  /**
   * Create notification element
   */
  private createNotification(id: string, options: NotificationOptions): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `notification notification-${options.type}`;
    notification.style.cssText = `
      background: ${this.getBackgroundColor(options.type)};
      border: 1px solid ${this.getBorderColor(options.type)};
      border-radius: 12px;
      padding: 16px 20px;
      min-width: 300px;
      max-width: 400px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: all;
      cursor: pointer;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    const icon = this.getIcon(options.type);
    const iconColor = this.getIconColor(options.type);

    notification.innerHTML = `
      <div style="
        font-size: 20px;
        color: ${iconColor};
        flex-shrink: 0;
      ">${icon}</div>

      <div style="
        flex: 1;
        color: #fff;
        font-size: 14px;
        line-height: 1.5;
      ">${options.message}</div>

      ${options.action ? `
        <button class="notification-action" style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          padding: 6px 12px;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">${options.action.label}</button>
      ` : ''}

      <button class="notification-close" style="
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      ">×</button>

      <style>
        .notification:hover {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }

        .notification-action:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .notification-close:hover {
          color: #fff;
        }
      </style>
    `;

    // Click to dismiss
    notification.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('notification-action')) {
        return; // Don't dismiss on action button click
      }
      this.dismiss(id);
    });

    // Close button
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismiss(id);
    });

    // Action button
    if (options.action) {
      const actionBtn = notification.querySelector('.notification-action');
      actionBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        options.action!.callback();
        this.dismiss(id);
      });
    }

    return notification;
  }

  /**
   * Dismiss notification
   */
  public dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';

    setTimeout(() => {
      notification.remove();
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Dismiss all notifications
   */
  public dismissAll(): void {
    this.notifications.forEach((_, id) => {
      this.dismiss(id);
    });
  }

  /**
   * Get background color for type
   */
  private getBackgroundColor(type: NotificationType): string {
    const colors = {
      success: 'rgba(0, 200, 83, 0.15)',
      error: 'rgba(244, 67, 54, 0.15)',
      warning: 'rgba(255, 167, 38, 0.15)',
      info: 'rgba(33, 150, 243, 0.15)'
    };
    return colors[type];
  }

  /**
   * Get border color for type
   */
  private getBorderColor(type: NotificationType): string {
    const colors = {
      success: 'rgba(0, 255, 136, 0.3)',
      error: 'rgba(244, 67, 54, 0.3)',
      warning: 'rgba(255, 167, 38, 0.3)',
      info: 'rgba(33, 150, 243, 0.3)'
    };
    return colors[type];
  }

  /**
   * Get icon color for type
   */
  private getIconColor(type: NotificationType): string {
    const colors = {
      success: '#00ff88',
      error: '#f44336',
      warning: '#ffa726',
      info: '#2196f3'
    };
    return colors[type];
  }

  /**
   * Get icon for type
   */
  private getIcon(type: NotificationType): string {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const notificationManager = NotificationManager.getInstance();
