import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../../core/observability/service.js';
import { verifyToken } from '../../core/auth/jwt.js';
import { NotificationService } from './notifications.service.js';
export class NotificationsGateway {
    io;
    notificationsNamespace;
    userConnections; // userId -> Set<socketId>
    constructor(httpServer) {
        // Criar servidor Socket.IO ou reutilizar existente
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: ['http://localhost:5173', 'http://localhost:3000'],
                methods: ['GET', 'POST'],
                credentials: true
            },
            path: '/socket.io/',
        });
        // Criar namespace específico para notificações
        this.notificationsNamespace = this.io.of('/notifications');
        this.userConnections = new Map();
        this.setupMiddleware();
        this.setupEventHandlers();
        logger.info('🔔 Notifications Gateway initialized');
    }
    /**
     * Configura middleware de autenticação
     */
    setupMiddleware() {
        this.notificationsNamespace.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (!token) {
                    logger.warn('WebSocket connection attempt without token');
                    return next(new Error('Authentication error: No token provided'));
                }
                // Verificar JWT
                const decoded = await verifyToken(token);
                if (!decoded || !decoded.userId) {
                    logger.warn('Invalid token in WebSocket connection');
                    return next(new Error('Authentication error: Invalid token'));
                }
                // Anexar dados do usuário ao socket
                socket.userId = decoded.userId;
                socket.tenantId = decoded.tenantId;
                socket.userEmail = decoded.email;
                logger.info('WebSocket authenticated', {
                    userId: socket.userId,
                    tenantId: socket.tenantId,
                    socketId: socket.id,
                });
                next();
            }
            catch (error) {
                logger.error('WebSocket authentication error', error);
                next(new Error('Authentication error'));
            }
        });
    }
    /**
     * Configura handlers de eventos
     */
    setupEventHandlers() {
        this.notificationsNamespace.on('connection', (socket) => {
            this.handleConnection(socket);
            socket.on('disconnect', () => this.handleDisconnect(socket));
            socket.on('mark_notification_read', (data) => this.handleMarkAsRead(socket, data));
            socket.on('mark_all_read', () => this.handleMarkAllRead(socket));
            socket.on('request_notifications', (data) => this.handleRequestNotifications(socket, data));
            socket.on('get_unread_count', () => this.handleGetUnreadCount(socket));
        });
    }
    /**
     * Handle nova conexão
     */
    handleConnection(socket) {
        if (!socket.userId)
            return;
        // Adicionar socket ao mapa de conexões
        if (!this.userConnections.has(socket.userId)) {
            this.userConnections.set(socket.userId, new Set());
        }
        this.userConnections.get(socket.userId).add(socket.id);
        // Fazer join em room específica do usuário
        socket.join(`user:${socket.userId}`);
        socket.join(`tenant:${socket.tenantId}`);
        logger.info('WebSocket connection established', {
            userId: socket.userId,
            socketId: socket.id,
            activeConnections: this.userConnections.get(socket.userId).size,
        });
        // Enviar contagem de não lidas
        this.sendUnreadCount(socket);
    }
    /**
     * Handle desconexão
     */
    handleDisconnect(socket) {
        if (!socket.userId)
            return;
        const userSockets = this.userConnections.get(socket.userId);
        if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
                this.userConnections.delete(socket.userId);
            }
        }
        logger.info('WebSocket disconnected', {
            userId: socket.userId,
            socketId: socket.id,
        });
    }
    /**
     * Handle marcar notificação como lida
     */
    async handleMarkAsRead(socket, data) {
        if (!socket.userId || !socket.tenantId)
            return;
        try {
            await NotificationService.markAsRead(data.notificationId, socket.userId, socket.tenantId);
            // Enviar confirmação
            socket.emit('notification_marked_read', { notificationId: data.notificationId });
            // Atualizar contagem
            this.sendUnreadCount(socket);
            logger.info('Notification marked as read', {
                userId: socket.userId,
                notificationId: data.notificationId,
            });
        }
        catch (error) {
            logger.error('Error marking notification as read', error);
            socket.emit('error', { message: 'Failed to mark notification as read' });
        }
    }
    /**
     * Handle marcar todas como lidas
     */
    async handleMarkAllRead(socket) {
        if (!socket.userId || !socket.tenantId)
            return;
        try {
            await NotificationService.markAllAsRead(socket.userId, socket.tenantId);
            socket.emit('all_notifications_marked_read');
            this.sendUnreadCount(socket);
            logger.info('All notifications marked as read', {
                userId: socket.userId,
            });
        }
        catch (error) {
            logger.error('Error marking all notifications as read', error);
            socket.emit('error', { message: 'Failed to mark all notifications as read' });
        }
    }
    /**
     * Handle requisição de notificações
     */
    async handleRequestNotifications(socket, data) {
        if (!socket.userId || !socket.tenantId)
            return;
        try {
            const notifications = await NotificationService.list(socket.userId, socket.tenantId, {
                unreadOnly: data.unreadOnly,
                types: data.types,
                limit: data.limit || 50,
                offset: data.offset || 0,
            });
            socket.emit('notifications_list', notifications);
            logger.info('Notifications requested', {
                userId: socket.userId,
                count: notifications.length,
            });
        }
        catch (error) {
            logger.error('Error fetching notifications', error);
            socket.emit('error', { message: 'Failed to fetch notifications' });
        }
    }
    /**
     * Handle requisição de contagem de não lidas
     */
    async handleGetUnreadCount(socket) {
        if (!socket.userId || !socket.tenantId)
            return;
        try {
            this.sendUnreadCount(socket);
        }
        catch (error) {
            logger.error('Error getting unread count', error);
            socket.emit('error', { message: 'Failed to get unread count' });
        }
    }
    /**
     * Envia contagem de notificações não lidas
     */
    async sendUnreadCount(socket) {
        if (!socket.userId || !socket.tenantId)
            return;
        try {
            const count = await NotificationService.getUnreadCount(socket.userId, socket.tenantId);
            socket.emit('unread_count', { count });
        }
        catch (error) {
            logger.error('Error sending unread count', error);
        }
    }
    /**
     * Envia notificação para usuário específico (todas suas conexões)
     */
    async sendToUser(userId, notification) {
        const userSockets = this.userConnections.get(userId);
        if (userSockets && userSockets.size > 0) {
            this.notificationsNamespace.to(`user:${userId}`).emit('new_notification', notification);
            logger.info('Notification sent to user', {
                userId,
                notificationId: notification.id,
                activeConnections: userSockets.size,
            });
            // Enviar nova contagem
            const count = await NotificationService.getUnreadCount(userId, notification.tenantId);
            this.notificationsNamespace.to(`user:${userId}`).emit('unread_count', { count });
        }
        else {
            logger.info('User not connected via WebSocket, notification stored', {
                userId,
                notificationId: notification.id,
            });
        }
    }
    /**
     * Envia notificação para todos os usuários de um tenant
     */
    sendToTenant(tenantId, notification) {
        this.notificationsNamespace.to(`tenant:${tenantId}`).emit('new_notification', notification);
        logger.info('Notification sent to tenant', {
            tenantId,
            notificationId: notification.id,
        });
    }
    /**
     * Broadcast para todos os usuários conectados
     */
    broadcast(notification) {
        this.notificationsNamespace.emit('new_notification', notification);
        logger.info('Notification broadcasted', {
            notificationId: notification.id,
        });
    }
    /**
     * Obtém estatísticas de conexões
     */
    getConnectionStats() {
        const stats = {
            totalConnections: 0,
            uniqueUsers: this.userConnections.size,
            userConnections: [],
        };
        this.userConnections.forEach((sockets, userId) => {
            stats.totalConnections += sockets.size;
            stats.userConnections.push({
                userId,
                connections: sockets.size,
            });
        });
        return stats;
    }
}
//# sourceMappingURL=notifications.gateway.js.map