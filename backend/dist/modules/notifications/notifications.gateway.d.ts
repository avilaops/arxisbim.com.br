import type { Server as HTTPServer } from 'http';
export declare class NotificationsGateway {
    private io;
    private notificationsNamespace;
    private userConnections;
    constructor(httpServer: HTTPServer);
    /**
     * Configura middleware de autenticação
     */
    private setupMiddleware;
    /**
     * Configura handlers de eventos
     */
    private setupEventHandlers;
    /**
     * Handle nova conexão
     */
    private handleConnection;
    /**
     * Handle desconexão
     */
    private handleDisconnect;
    /**
     * Handle marcar notificação como lida
     */
    private handleMarkAsRead;
    /**
     * Handle marcar todas como lidas
     */
    private handleMarkAllRead;
    /**
     * Handle requisição de notificações
     */
    private handleRequestNotifications;
    /**
     * Handle requisição de contagem de não lidas
     */
    private handleGetUnreadCount;
    /**
     * Envia contagem de notificações não lidas
     */
    private sendUnreadCount;
    /**
     * Envia notificação para usuário específico (todas suas conexões)
     */
    sendToUser(userId: string, notification: any): Promise<void>;
    /**
     * Envia notificação para todos os usuários de um tenant
     */
    sendToTenant(tenantId: string, notification: any): void;
    /**
     * Broadcast para todos os usuários conectados
     */
    broadcast(notification: any): void;
    /**
     * Obtém estatísticas de conexões
     */
    getConnectionStats(): {
        totalConnections: number;
        uniqueUsers: number;
        userConnections: {
            userId: string;
            connections: number;
        }[];
    };
}
//# sourceMappingURL=notifications.gateway.d.ts.map