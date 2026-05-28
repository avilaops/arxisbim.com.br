import { useNotifications } from '../hooks/useNotifications';
import { useState } from 'react';

interface NotificationsPanelProps {
  onClose?: () => void;
}

/**
 * Painel de notificações do ArxisVR
 */
export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-blue-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🔵';
      case 'low': return '⚪';
      default: return '⚪';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('ifc')) return '📦';
    if (type.includes('meeting')) return '👥';
    if (type.includes('comment')) return '💬';
    if (type.includes('task')) return '✓';
    return '🔔';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <div className="notifications-panel bg-white rounded-lg shadow-xl w-96 max-h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Notificações</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Não lidas ({unreadCount})
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="ml-auto px-3 py-1 rounded text-sm text-blue-600 hover:bg-blue-50"
            >
              Marcar todas
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <div className="text-4xl mb-2">🔔</div>
            <p>Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 text-2xl">
                    {getTypeIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>

                    {/* Priority & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={getPriorityColor(notification.priority)}>
                          {getPriorityIcon(notification.priority)} {notification.priority}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Marcar lida
                          </button>
                        )}
                        {notification.actionUrl && (
                          <a
                            href={notification.actionUrl}
                            className="text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Ver →
                          </a>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Badge de contador de notificações
 */
export function NotificationBadge() {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}
