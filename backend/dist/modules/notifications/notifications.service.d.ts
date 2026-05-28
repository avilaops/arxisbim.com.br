export type NotificationType = 'ifc_upload_complete' | 'ifc_processing_failed' | 'federation_created' | 'federation_updated' | 'comment_added' | 'comment_replied' | 'task_assigned' | 'task_completed' | 'meeting_scheduled' | 'meeting_started' | 'project_shared' | 'user_mentioned' | 'system_alert';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';
interface CreateNotificationInput {
    userId: string;
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    metadata?: Record<string, any>;
    channels?: NotificationChannel[];
}
interface NotificationPreference {
    userId: string;
    tenantId: string;
    notificationType: NotificationType;
    channels: NotificationChannel[];
    enabled: boolean;
}
export declare class NotificationService {
    /**
     * Cria uma nova notificação
     */
    static create(input: CreateNotificationInput): Promise<{
        channels: NotificationChannel[];
        id: string;
        tenantId: string;
        createdAt: Date;
        userId: string;
        metadata: unknown;
        type: string;
        message: string;
        title: string;
        priority: string;
        actionUrl: string;
        isRead: boolean;
        readAt: Date;
    }>;
    /**
     * Cria notificações em lote para múltiplos usuários
     */
    static createBulk(userIds: string[], tenantId: string, notification: Omit<CreateNotificationInput, 'userId' | 'tenantId'>): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        userId: string;
        metadata: unknown;
        type: string;
        message: string;
        title: string;
        priority: string;
        actionUrl: string;
        isRead: boolean;
        readAt: Date;
    }[]>;
    /**
     * Lista notificações do usuário
     */
    static list(userId: string, tenantId: string, options?: {
        unreadOnly?: boolean;
        types?: NotificationType[];
        limit?: number;
        offset?: number;
    }): Promise<any>;
    /**
     * Marca notificação como lida
     */
    static markAsRead(notificationId: string, userId: string, tenantId: string): Promise<{
        id: string;
        userId: string;
        tenantId: string;
        type: string;
        title: string;
        message: string;
        priority: string;
        actionUrl: string;
        metadata: unknown;
        isRead: boolean;
        readAt: Date;
        createdAt: Date;
    }>;
    /**
     * Marca todas as notificações como lidas
     */
    static markAllAsRead(userId: string, tenantId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Conta notificações não lidas
     */
    static getUnreadCount(userId: string, tenantId: string): Promise<number>;
    /**
     * Deleta notificação
     */
    static delete(notificationId: string, userId: string, tenantId: string): Promise<{
        success: boolean;
    }>;
    /**
     * Atualiza preferências de notificação do usuário
     */
    static updatePreferences(preference: NotificationPreference): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        notificationType: string;
        channels: ("email" | "push" | "in_app" | "sms")[];
        enabled: boolean;
    }>;
    /**
     * Obtém preferências de notificação do usuário
     */
    static getPreferences(userId: string, tenantId: string): Promise<{
        id: string;
        userId: string;
        tenantId: string;
        notificationType: string;
        channels: ("email" | "push" | "in_app" | "sms")[];
        enabled: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    /**
     * Determina quais canais usar para entregar a notificação
     */
    private static getDeliveryChannels;
    /**
     * Helpers para tipos específicos de notificação
     */
    static notifyIfcUploadComplete(userId: string, tenantId: string, ifcModelId: string, ifcModelName: string): Promise<{
        channels: NotificationChannel[];
        id: string;
        tenantId: string;
        createdAt: Date;
        userId: string;
        metadata: unknown;
        type: string;
        message: string;
        title: string;
        priority: string;
        actionUrl: string;
        isRead: boolean;
        readAt: Date;
    }>;
    static notifyIfcProcessingFailed(userId: string, tenantId: string, ifcModelName: string, error: string): Promise<{
        channels: NotificationChannel[];
        id: string;
        tenantId: string;
        createdAt: Date;
        userId: string;
        metadata: unknown;
        type: string;
        message: string;
        title: string;
        priority: string;
        actionUrl: string;
        isRead: boolean;
        readAt: Date;
    }>;
    static notifyUserMentioned(userId: string, tenantId: string, mentionedBy: string, context: string, actionUrl: string): Promise<{
        channels: NotificationChannel[];
        id: string;
        tenantId: string;
        createdAt: Date;
        userId: string;
        metadata: unknown;
        type: string;
        message: string;
        title: string;
        priority: string;
        actionUrl: string;
        isRead: boolean;
        readAt: Date;
    }>;
    static notifyMeetingStarted(userIds: string[], tenantId: string, meetingId: string, meetingTitle: string): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        userId: string;
        metadata: unknown;
        type: string;
        message: string;
        title: string;
        priority: string;
        actionUrl: string;
        isRead: boolean;
        readAt: Date;
    }[]>;
}
export {};
//# sourceMappingURL=notifications.service.d.ts.map