import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import { notifications, notificationPreferences } from '../../shared/database/schema/index.js';

export type NotificationType = 
  | 'ifc_upload_complete'
  | 'ifc_processing_failed'
  | 'federation_created'
  | 'federation_updated'
  | 'comment_added'
  | 'comment_replied'
  | 'task_assigned'
  | 'task_completed'
  | 'meeting_scheduled'
  | 'meeting_started'
  | 'project_shared'
  | 'user_mentioned'
  | 'system_alert';

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

export class NotificationService {
  /**
   * Cria uma nova notificação
   */
  static async create(input: CreateNotificationInput) {
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
      } as any)
      .returning();

    // Determinar canais de entrega
    const channels = await this.getDeliveryChannels(
      input.userId,
      input.tenantId,
      input.type,
      input.channels
    );

    // Retornar notificação com canais
    return {
      ...notification,
      channels,
    };
  }

  /**
   * Cria notificações em lote para múltiplos usuários
   */
  static async createBulk(
    userIds: string[],
    tenantId: string,
    notification: Omit<CreateNotificationInput, 'userId' | 'tenantId'>
  ) {
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
      .values(notificationsData as any)
      .returning();

    return createdNotifications;
  }

  /**
   * Lista notificações do usuário
   */
  static async list(userId: string, tenantId: string, options?: {
    unreadOnly?: boolean;
    types?: NotificationType[];
    limit?: number;
    offset?: number;
  }) {
    let query: any = db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      ))
      .orderBy(desc(notifications.createdAt));

    if (options?.unreadOnly) {
      query = query.where(eq(notifications.isRead, false));
    }

    if (options?.types && options.types.length > 0) {
      query = query.where(inArray(notifications.type, options.types));
    }

    if (options?.limit) {
      query = query.limit(options.limit) as any;
    }

    if (options?.offset) {
      query = query.offset(options.offset) as any;
    }

    return await query;
  }

  /**
   * Marca notificação como lida
   */
  static async markAsRead(notificationId: string, userId: string, tenantId: string) {
    const [updated] = await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      } as any)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      ))
      .returning();

    return updated;
  }

  /**
   * Marca todas as notificações como lidas
   */
  static async markAllAsRead(userId: string, tenantId: string) {
    await db
      .update(notifications)
      .set({
        isRead: true,
        readAt: new Date(),
      } as any)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isRead, false)
      ));

    return { success: true };
  }

  /**
   * Conta notificações não lidas
   */
  static async getUnreadCount(userId: string, tenantId: string) {
    const result = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.isRead, false)
      ));

    return result.length;
  }

  /**
   * Deleta notificação
   */
  static async delete(notificationId: string, userId: string, tenantId: string) {
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      ));

    return { success: true };
  }

  /**
   * Atualiza preferências de notificação do usuário
   */
  static async updatePreferences(preference: NotificationPreference) {
    const existing = await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, preference.userId),
        eq(notificationPreferences.tenantId, preference.tenantId),
        eq(notificationPreferences.notificationType, preference.notificationType)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(notificationPreferences)
        .set({
          channels: preference.channels,
          enabled: preference.enabled,
          updatedAt: new Date(),
        } as any)
        .where(and(
          eq(notificationPreferences.userId, preference.userId),
          eq(notificationPreferences.tenantId, preference.tenantId),
          eq(notificationPreferences.notificationType, preference.notificationType)
        ))
        .returning();

      return updated;
    } else {
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
        } as any)
        .returning();

      return created;
    }
  }

  /**
   * Obtém preferências de notificação do usuário
   */
  static async getPreferences(userId: string, tenantId: string) {
    return await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.tenantId, tenantId)
      ));
  }

  /**
   * Determina quais canais usar para entregar a notificação
   */
  private static async getDeliveryChannels(
    userId: string,
    tenantId: string,
    type: NotificationType,
    requestedChannels?: NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    // Buscar preferências do usuário
    const preferences = await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.tenantId, tenantId),
        eq(notificationPreferences.notificationType, type)
      ))
      .limit(1);

    if (preferences.length > 0 && preferences[0].enabled) {
      return preferences[0].channels as NotificationChannel[];
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

  static async notifyIfcUploadComplete(
    userId: string,
    tenantId: string,
    ifcModelId: string,
    ifcModelName: string
  ) {
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

  static async notifyIfcProcessingFailed(
    userId: string,
    tenantId: string,
    ifcModelName: string,
    error: string
  ) {
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

  static async notifyUserMentioned(
    userId: string,
    tenantId: string,
    mentionedBy: string,
    context: string,
    actionUrl: string
  ) {
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

  static async notifyMeetingStarted(
    userIds: string[],
    tenantId: string,
    meetingId: string,
    meetingTitle: string
  ) {
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
