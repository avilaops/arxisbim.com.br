import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import { notifications, notificationPreferences } from '../../shared/database/schema/index.js';
export class NotificationService {
    /**
     * Cria uma nova notificação
     */
    static async create(input) {
        const [notification] = await db
            .insert(notifications)
            .values({
            userId: input.userId,
            tenantId: input.tenantId,
            type: input.type,
            title: input.title,
            message: input.message,
            priority: input.priority || 'medium',
            actionUrl: input.actionUrl,
            metadata: input.metadata || {},
            isRead: false,
            readAt: null,
            createdAt: new Date(),
        })
            .returning();
        // Determinar canais de entrega
        const channels = await this.getDeliveryChannels(input.userId, input.tenantId, input.type, input.channels);
        // Retornar notificação com canais
        return {
            ...notification,
            channels,
        };
    }
    /**
     * Cria notificações em lote para múltiplos usuários
     */
    static async createBulk(userIds, tenantId, notification) {
        const notificationsData = userIds.map((userId) => ({
            userId,
            tenantId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority || 'medium',
            actionUrl: notification.actionUrl,
            metadata: notification.metadata || {},
            isRead: false,
            readAt: null,
            createdAt: new Date(),
        }));
        const createdNotifications = await db
            .insert(notifications)
            .values(notificationsData)
            .returning();
        return createdNotifications;
    }
    /**
     * Lista notificações do usuário
     */
    static async list(userId, tenantId, options) {
        let query = db
            .select()
            .from(notifications)
            .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)))
            .orderBy(desc(notifications.createdAt));
        if (options?.unreadOnly) {
            query = query.where(eq(notifications.isRead, false));
        }
        if (options?.types && options.types.length > 0) {
            query = query.where(inArray(notifications.type, options.types));
        }
        if (options?.limit) {
            query = query.limit(options.limit);
        }
        if (options?.offset) {
            query = query.offset(options.offset);
        }
        return await query;
    }
    /**
     * Marca notificação como lida
     */
    static async markAsRead(notificationId, userId, tenantId) {
        const [updated] = await db
            .update(notifications)
            .set({
            isRead: true,
            readAt: new Date(),
        })
            .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)))
            .returning();
        return updated;
    }
    /**
     * Marca todas as notificações como lidas
     */
    static async markAllAsRead(userId, tenantId) {
        await db
            .update(notifications)
            .set({
            isRead: true,
            readAt: new Date(),
        })
            .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId), eq(notifications.isRead, false)));
        return { success: true };
    }
    /**
     * Conta notificações não lidas
     */
    static async getUnreadCount(userId, tenantId) {
        const result = await db
            .select()
            .from(notifications)
            .where(and(eq(notifications.userId, userId), eq(notifications.tenantId, tenantId), eq(notifications.isRead, false)));
        return result.length;
    }
    /**
     * Deleta notificação
     */
    static async delete(notificationId, userId, tenantId) {
        await db
            .delete(notifications)
            .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), eq(notifications.tenantId, tenantId)));
        return { success: true };
    }
    /**
     * Atualiza preferências de notificação do usuário
     */
    static async updatePreferences(preference) {
        const existing = await db
            .select()
            .from(notificationPreferences)
            .where(and(eq(notificationPreferences.userId, preference.userId), eq(notificationPreferences.tenantId, preference.tenantId), eq(notificationPreferences.notificationType, preference.notificationType)))
            .limit(1);
        if (existing.length > 0) {
            const [updated] = await db
                .update(notificationPreferences)
                .set({
                channels: preference.channels,
                enabled: preference.enabled,
                updatedAt: new Date(),
            })
                .where(and(eq(notificationPreferences.userId, preference.userId), eq(notificationPreferences.tenantId, preference.tenantId), eq(notificationPreferences.notificationType, preference.notificationType)))
                .returning();
            return updated;
        }
        else {
            const [created] = await db
                .insert(notificationPreferences)
                .values({
                userId: preference.userId,
                tenantId: preference.tenantId,
                notificationType: preference.notificationType,
                channels: preference.channels,
                enabled: preference.enabled,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning();
            return created;
        }
    }
    /**
     * Obtém preferências de notificação do usuário
     */
    static async getPreferences(userId, tenantId) {
        return await db
            .select()
            .from(notificationPreferences)
            .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.tenantId, tenantId)));
    }
    /**
     * Determina quais canais usar para entregar a notificação
     */
    static async getDeliveryChannels(userId, tenantId, type, requestedChannels) {
        // Buscar preferências do usuário
        const preferences = await db
            .select()
            .from(notificationPreferences)
            .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.tenantId, tenantId), eq(notificationPreferences.notificationType, type)))
            .limit(1);
        if (preferences.length > 0 && preferences[0].enabled) {
            return preferences[0].channels;
        }
        // Fallback: usar canais solicitados ou padrões
        if (requestedChannels && requestedChannels.length > 0) {
            return requestedChannels;
        }
        // Padrão: apenas in-app
        return ['in_app'];
    }
    /**
     * Helpers para tipos específicos de notificação
     */
    static async notifyIfcUploadComplete(userId, tenantId, ifcModelId, ifcModelName) {
        return await this.create({
            userId,
            tenantId,
            type: 'ifc_upload_complete',
            title: 'IFC Upload Completo',
            message: `O modelo "${ifcModelName}" foi processado com sucesso`,
            priority: 'medium',
            actionUrl: `/models/${ifcModelId}`,
            metadata: { ifcModelId, ifcModelName },
            channels: ['in_app', 'push'],
        });
    }
    static async notifyIfcProcessingFailed(userId, tenantId, ifcModelName, error) {
        return await this.create({
            userId,
            tenantId,
            type: 'ifc_processing_failed',
            title: 'Erro no Processamento',
            message: `Falha ao processar "${ifcModelName}": ${error}`,
            priority: 'high',
            metadata: { ifcModelName, error },
            channels: ['in_app', 'email'],
        });
    }
    static async notifyUserMentioned(userId, tenantId, mentionedBy, context, actionUrl) {
        return await this.create({
            userId,
            tenantId,
            type: 'user_mentioned',
            title: 'Você foi mencionado',
            message: `${mentionedBy} mencionou você em ${context}`,
            priority: 'medium',
            actionUrl,
            metadata: { mentionedBy, context },
            channels: ['in_app', 'email'],
        });
    }
    static async notifyMeetingStarted(userIds, tenantId, meetingId, meetingTitle) {
        return await this.createBulk(userIds, tenantId, {
            type: 'meeting_started',
            title: 'Reunião Iniciada',
            message: `A reunião "${meetingTitle}" começou`,
            priority: 'high',
            actionUrl: `/meetings/${meetingId}`,
            metadata: { meetingId, meetingTitle },
            channels: ['in_app', 'push'],
        });
    }
}
//# sourceMappingURL=notifications.service.js.map