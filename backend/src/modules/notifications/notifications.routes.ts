import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { NotificationService } from './notifications.service.js';
import { z } from 'zod';
import { observabilityService } from '../../core/observability/service.js';
import { authenticateRequest } from '../../core/auth/middleware.js';

// Schemas de validação
const notificationTypeSchema = z.enum([
  'ifc_upload_complete',
  'ifc_processing_failed',
  'federation_created',
  'federation_updated',
  'comment_added',
  'comment_replied',
  'task_assigned',
  'task_completed',
  'meeting_scheduled',
  'meeting_started',
  'project_shared',
  'user_mentioned',
  'system_alert',
]);

const listNotificationsSchema = z.object({
  unreadOnly: z.boolean().optional(),
  types: z.array(notificationTypeSchema).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

const markAsReadSchema = z.object({
  notificationId: z.string().uuid(),
});

const deleteNotificationSchema = z.object({
  notificationId: z.string().uuid(),
});

const updatePreferencesSchema = z.object({
  notificationType: notificationTypeSchema,
  channels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])),
  enabled: z.boolean(),
});

export async function notificationsRoutes(fastify: FastifyInstance) {
  // =====================================
  // GET / - Listar notificações
  // =====================================
  fastify.get('/', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const query = request.query as any;

    try {
      const validation = listNotificationsSchema.safeParse(query);

      if (!validation.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: validation.error.issues,
        });
      }

      const notifications = await NotificationService.list(
        user.userId,
        user.tenantId,
        validation.data
      );

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'notifications.list',
        resource: 'notifications',
        metadata: { count: notifications.length },
      });

      return reply.code(200).send({
        notifications,
        count: notifications.length,
      });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error listing notifications');

      await observabilityService.logError({
        tenantId: user.tenantId,
        userId: user.userId,
        errorMessage: error.message,
        stackTrace: error.stack,
        context: { action: 'notifications.list' },
        severity: 'error',
      });

      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to list notifications',
      });
    }
  });

  // =====================================
  // GET /unread-count - Contagem de não lidas
  // =====================================
  fastify.get('/unread-count', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;

    try {
      const count = await NotificationService.getUnreadCount(user.userId, user.tenantId);

      return reply.code(200).send({ count });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error getting unread count');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to get unread count',
      });
    }
  });

  // =====================================
  // PUT /:id/read - Marcar como lida
  // =====================================
  fastify.put('/:id/read', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const { id } = request.params;

    try {
      const notification = await NotificationService.markAsRead(id, user.userId, user.tenantId);

      if (!notification) {
        return reply.code(404).send({
          error: 'Not found',
          message: 'Notification not found',
        });
      }

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'notifications.mark_read',
        resource: 'notification',
        metadata: { notificationId: id },
      });

      return reply.code(200).send({ notification });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error marking notification as read');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to mark notification as read',
      });
    }
  });

  // =====================================
  // PUT /mark-all-read - Marcar todas como lidas
  // =====================================
  fastify.put('/mark-all-read', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;

    try {
      await NotificationService.markAllAsRead(user.userId, user.tenantId);

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'notifications.mark_all_read',
        resource: 'notifications',
      });

      return reply.code(200).send({ success: true });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error marking all notifications as read');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to mark all notifications as read',
      });
    }
  });

  // =====================================
  // DELETE /:id - Deletar notificação
  // =====================================
  fastify.delete('/:id', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = request.user!;
    const { id } = request.params;

    try {
      await NotificationService.delete(id, user.userId, user.tenantId);

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'notifications.delete',
        resource: 'notification',
        metadata: { notificationId: id },
      });

      return reply.code(200).send({ success: true });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error deleting notification');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to delete notification',
      });
    }
  });

  // =====================================
  // GET /preferences - Obter preferências
  // =====================================
  fastify.get('/preferences', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;

    try {
      const preferences = await NotificationService.getPreferences(user.userId, user.tenantId);

      return reply.code(200).send({ preferences });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error getting notification preferences');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to get preferences',
      });
    }
  });

  // =====================================
  // PUT /preferences - Atualizar preferências
  // =====================================
  fastify.put('/preferences', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const body = request.body as any;

    try {
      const validation = updatePreferencesSchema.safeParse(body);

      if (!validation.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: validation.error.issues,
        });
      }

      const preference = await NotificationService.updatePreferences({
        userId: user.userId,
        tenantId: user.tenantId,
        ...validation.data,
      } as any);

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'notifications.update_preferences',
        resource: 'notification_preferences',
        metadata: { notificationType: validation.data.notificationType },
      });

      return reply.code(200).send({ preference });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error updating notification preferences');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to update preferences',
      });
    }
  });
}
