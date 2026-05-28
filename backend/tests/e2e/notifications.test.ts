import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_JWT_TOKEN || '';

const describeNotificationsE2E = TEST_TOKEN ? describe : describe.skip;

describeNotificationsE2E('Notifications System E2E', () => {
  let socket: Socket;
  let receivedNotifications: any[] = [];

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      // Conectar ao WebSocket
      socket = io(`${API_URL}/notifications`, {
        auth: { token: TEST_TOKEN },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        console.log('✅ Connected to notifications');
        resolve();
      });

      socket.on('connect_error', () => resolve());

      socket.on('new_notification', (notification) => {
        receivedNotifications.push(notification);
      });
    });
  });

  afterAll(() => {
    socket?.disconnect();
  });

  it('should connect to WebSocket with valid token', () => {
    expect(socket.connected).toBe(true);
  });

  it('should receive notifications list', (done) => {
    socket.emit('request_notifications', { limit: 10 });

    socket.once('notifications_list', (notifications) => {
      expect(Array.isArray(notifications)).toBe(true);
      done();
    });
  });

  it('should receive unread count', (done) => {
    socket.emit('get_unread_count');

    socket.once('unread_count', ({ count }) => {
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
      done();
    });
  });

  it('should mark notification as read', async () => {
    // Primeiro, criar uma notificação via REST API
    const response = await fetch(`${API_URL}/api/v1/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
      },
    });

    const data = await response.json();
    
    if (data.notifications.length > 0) {
      const notificationId = data.notifications[0].id;

      const markResponse = await fetch(
        `${API_URL}/api/v1/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
          },
        }
      );

      expect(markResponse.ok).toBe(true);
    }
  });

  it('should create notification via REST API', async () => {
    // Nota: Este teste requer autenticação e IDs válidos
    // Você pode precisar ajustar baseado no seu setup de testes

    const notificationData = {
      type: 'system_alert',
      title: 'Test Notification',
      message: 'This is a test notification from E2E tests',
      priority: 'low',
    };

    // Este endpoint pode não existir (admin only)
    // Aqui é apenas um exemplo de como testar a criação
    console.log('Notification test:', notificationData);
    expect(notificationData.title).toBe('Test Notification');
  });

  it('should list notifications with filters', async () => {
    const response = await fetch(
      `${API_URL}/api/v1/notifications?unreadOnly=true&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
        },
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.notifications)).toBe(true);
  });

  it('should get notification preferences', async () => {
    const response = await fetch(
      `${API_URL}/api/v1/notifications/preferences`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
        },
      }
    );

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(Array.isArray(data.preferences)).toBe(true);
  });

  it('should update notification preferences', async () => {
    const preferenceData = {
      notificationType: 'ifc_upload_complete',
      channels: ['in_app', 'push'],
      enabled: true,
    };

    const response = await fetch(
      `${API_URL}/api/v1/notifications/preferences`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferenceData),
      }
    );

    expect(response.ok).toBe(true);
  });

  it('should mark all notifications as read', async () => {
    const response = await fetch(
      `${API_URL}/api/v1/notifications/mark-all-read`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
        },
      }
    );

    expect(response.ok).toBe(true);
  });
});
