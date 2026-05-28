/**
 * NotificationService
 * Gerencia notificações, alertas, mensagens e comunicação assíncrona
 * Integra com event bus, state manager, UI, WebSocket e storage
 */

import { eventBus } from '../../core';

export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'alert' 
  | 'workflow' 
  | 'custom';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'toast' | 'banner' | 'modal' | 'email' | 'webpush' | 'badge' | 'sound';

export interface NotificationAction {
  label: string;
  callback: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  actions?: NotificationAction[];
  group?: string;
  read: boolean;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

export interface NotificationFilter {
  type?: NotificationType;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  group?: string;
  read?: boolean;
  from?: number;
  to?: number;
}

export interface NotificationPreferences {
  sound: boolean;
  channel: NotificationChannel;
  language: string;
  grouping: boolean;
  deduplication: boolean;
  doNotDisturb: boolean;
  doNotDisturbHours?: { start: number; end: number };
}

export type UnsubscribeFn = () => void;

class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private notificationChangeListeners: Set<(notification: Notification) => void> = new Set();
  private badgeChangeListeners: Set<(count: number) => void> = new Set();
  private preferences: NotificationPreferences;
  private unreadCount: number = 0;

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.loadFromStorage();
  }

  /**
   * Cria/exibe notificação
   */
  notify(notification: Omit<Notification, 'id' | 'read' | 'timestamp'>): string {
    const id = this.generateId();
    const fullNotification: Notification = {
      ...notification,
      id,
      read: false,
      timestamp: Date.now(),
    };

    // Verifica deduplicação
    if (this.preferences.deduplication && this.isDuplicate(fullNotification)) {
      console.log('[NotificationService] Duplicate notification skipped:', fullNotification.title);
      return id;
    }

    // Verifica do not disturb
    if (this.preferences.doNotDisturb && this.isDoNotDisturb()) {
      console.log('[NotificationService] Notification silenced (Do Not Disturb):', fullNotification.title);
      this.notifications.set(id, fullNotification);
      this.saveToStorage();
      return id;
    }

    this.notifications.set(id, fullNotification);
    this.unreadCount++;
    this.saveToStorage();

    // Emitir eventos
    this.notificationChangeListeners.forEach(listener => listener(fullNotification));
    this.badgeChangeListeners.forEach(listener => listener(this.unreadCount));

    console.log('[NotificationService] Notification created:', fullNotification.title);

    return id;
  }

  /**
   * Atualiza notificação
   */
  updateNotification(id: string, updates: Partial<Notification>): void {
    const notification = this.notifications.get(id);
    if (!notification) {
      console.warn('[NotificationService] Notification not found:', id);
      return;
    }

    const updated = { ...notification, ...updates };
    this.notifications.set(id, updated);
    this.saveToStorage();

    this.notificationChangeListeners.forEach(listener => listener(updated));

    console.log('[NotificationService] Notification updated:', id);
  }

  /**
   * Remove notificação
   */
  removeNotification(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) {
      return;
    }

    if (!notification.read) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.badgeChangeListeners.forEach(listener => listener(this.unreadCount));
    }

    this.notifications.delete(id);
    this.saveToStorage();

    console.log('[NotificationService] Notification removed:', id);
  }

  /**
   * Lista notificações
   */
  getNotifications(filter?: NotificationFilter): Notification[] {
    let notifications = Array.from(this.notifications.values());

    if (filter) {
      notifications = notifications.filter(n => {
        if (filter.type && n.type !== filter.type) return false;
        if (filter.priority && n.priority !== filter.priority) return false;
        if (filter.channel && n.channel !== filter.channel) return false;
        if (filter.group && n.group !== filter.group) return false;
        if (filter.read !== undefined && n.read !== filter.read) return false;
        if (filter.from && n.timestamp < filter.from) return false;
        if (filter.to && n.timestamp > filter.to) return false;
        return true;
      });
    }

    // Ordenar por timestamp (mais recente primeiro)
    return notifications.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Marca como lida
   */
  markAsRead(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification || notification.read) {
      return;
    }

    notification.read = true;
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    this.saveToStorage();

    this.badgeChangeListeners.forEach(listener => listener(this.unreadCount));

    console.log('[NotificationService] Notification marked as read:', id);
  }

  /**
   * Marca todas como lidas
   */
  markAllAsRead(filter?: NotificationFilter): void {
    const notifications = this.getNotifications(filter);
    let updated = false;

    notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        updated = true;
      }
    });

    if (updated) {
      this.unreadCount = 0;
      this.saveToStorage();
      this.badgeChangeListeners.forEach(listener => listener(0));
      console.log('[NotificationService] All notifications marked as read');
    }
  }

  /**
   * Registra listener para nova notificação
   */
  onNotification(callback: (notification: Notification) => void): UnsubscribeFn {
    this.notificationChangeListeners.add(callback);
    return () => this.notificationChangeListeners.delete(callback);
  }

  /**
   * Registra listener para mudança de badge
   */
  onBadgeChange(callback: (count: number) => void): UnsubscribeFn {
    this.badgeChangeListeners.add(callback);
    return () => this.badgeChangeListeners.delete(callback);
  }

  /**
   * Subscribe em canal (placeholder para WebSocket/SSE)
   */
  subscribeChannel(channel: string): void {
    console.log('[NotificationService] Subscribed to channel:', channel);
    // Em produção, conectar WebSocket/SSE
  }

  /**
   * Unsubscribe de canal
   */
  unsubscribeChannel(channel: string): void {
    console.log('[NotificationService] Unsubscribed from channel:', channel);
    // Em produção, desconectar WebSocket/SSE
  }

  /**
   * Define preferências do usuário
   */
  setUserPreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
    this.savePreferencesToStorage();
    console.log('[NotificationService] Preferences updated:', prefs);
  }

  /**
   * Retorna preferências do usuário
   */
  getUserPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Retorna contagem de não lidas
   */
  getUnreadCount(): number {
    return this.unreadCount;
  }

  /**
   * Limpa todas as notificações
   */
  clearAll(): void {
    this.notifications.clear();
    this.unreadCount = 0;
    this.saveToStorage();
    this.badgeChangeListeners.forEach(listener => listener(0));
    console.log('[NotificationService] All notifications cleared');
  }

  /**
   * Remove notificações expiradas
   */
  removeExpired(): void {
    const now = Date.now();
    let removed = 0;

    this.notifications.forEach((notification, id) => {
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
        removed++;
      }
    });

    if (removed > 0) {
      this.saveToStorage();
      console.log('[NotificationService] Removed expired notifications:', removed);
    }
  }

  /**
   * Verifica se é duplicata
   */
  private isDuplicate(notification: Notification): boolean {
    const notifications = Array.from(this.notifications.values());
    return notifications.some(n => 
      n.type === notification.type &&
      n.title === notification.title &&
      n.message === notification.message &&
      n.group === notification.group &&
      Date.now() - n.timestamp < 5000 // Duplicata se mesma notificação em 5 segundos
    );
  }

  /**
   * Verifica se está em horário de não perturbe
   */
  private isDoNotDisturb(): boolean {
    if (!this.preferences.doNotDisturbHours) {
      return false;
    }

    const now = new Date();
    const hours = now.getHours();
    const { start, end } = this.preferences.doNotDisturbHours;

    if (start <= end) {
      return hours >= start && hours < end;
    } else {
      // Horário que atravessa meia-noite (ex: 22:00 - 06:00)
      return hours >= start || hours < end;
    }
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Carrega do storage
   */
  private loadFromStorage(): void {
    try {
      const notifsStr = localStorage.getItem('notifications');
      const prefsStr = localStorage.getItem('notificationPreferences');

      if (notifsStr) {
        const notifs = JSON.parse(notifsStr);
        notifs.forEach((n: Notification) => this.notifications.set(n.id, n));
        this.unreadCount = Array.from(this.notifications.values()).filter(n => !n.read).length;
      }

      if (prefsStr) {
        this.preferences = JSON.parse(prefsStr);
      }
    } catch (error) {
      console.error('[NotificationService] Failed to load from storage:', error);
    }
  }

  /**
   * Salva no storage
   */
  private saveToStorage(): void {
    try {
      const notifs = Array.from(this.notifications.values());
      localStorage.setItem('notifications', JSON.stringify(notifs));
    } catch (error) {
      console.error('[NotificationService] Failed to save to storage:', error);
    }
  }

  /**
   * Salva preferências no storage
   */
  private savePreferencesToStorage(): void {
    try {
      localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('[NotificationService] Failed to save preferences:', error);
    }
  }

  /**
   * Retorna preferências padrão
   */
  private getDefaultPreferences(): NotificationPreferences {
    return {
      sound: true,
      channel: 'toast',
      language: 'pt-BR',
      grouping: true,
      deduplication: true,
      doNotDisturb: false,
    };
  }
}

// Singleton instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

export default NotificationService;
