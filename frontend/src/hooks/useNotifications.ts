import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  loadNotifications: () => Promise<void>;
}

/**
 * Hook para gerenciar notificações em tempo real via WebSocket
 */
export function useNotifications(token: string): UseNotificationsReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Conectar ao WebSocket
  useEffect(() => {
    if (!token) return;

    const socketInstance = io(`${apiUrl}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to notifications');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from notifications');
      setIsConnected(false);
    });

    // Nova notificação
    socketInstance.on('new_notification', (notification: Notification) => {
      console.log('🔔 New notification:', notification);
      setNotifications((prev) => [notification, ...prev]);
      
      // Tocar som ou mostrar toast aqui
      showToast(notification);
    });

    // Atualização de contagem
    socketInstance.on('unread_count', ({ count }: { count: number }) => {
      setUnreadCount(count);
    });

    // Lista de notificações
    socketInstance.on('notifications_list', (list: Notification[]) => {
      setNotifications(list);
    });

    // Notificação marcada como lida
    socketInstance.on('notification_marked_read', ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    });

    // Todas marcadas como lidas
    socketInstance.on('all_notifications_marked_read', () => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    });

    // Erro
    socketInstance.on('error', (error: { message: string }) => {
      console.error('Notification error:', error);
    });

    setSocket(socketInstance);

    // Solicitar notificações iniciais
    socketInstance.emit('request_notifications', { limit: 50 });
    socketInstance.emit('get_unread_count');

    return () => {
      socketInstance.disconnect();
    };
  }, [token, apiUrl]);

  // Carregar notificações via REST API
  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, [apiUrl, token]);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    if (socket) {
      socket.emit('mark_notification_read', { notificationId });
    }

    try {
      await fetch(`${apiUrl}/api/v1/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }, [socket, apiUrl, token]);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (socket) {
      socket.emit('mark_all_read');
    }

    try {
      await fetch(`${apiUrl}/api/v1/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [socket, apiUrl, token]);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await fetch(`${apiUrl}/api/v1/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }, [apiUrl, token]);

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
  };
}

/**
 * Mostrar toast de notificação
 */
function showToast(notification: Notification) {
  // Verificar se o browser suporta notificações
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/logo.png',
      tag: notification.id,
    });
  }
  
  // Ou usar uma biblioteca de toast como react-hot-toast
  console.log('🔔 Notification:', notification.title, notification.message);
}

/**
 * Solicitar permissão para notificações do browser
 */
export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
}
