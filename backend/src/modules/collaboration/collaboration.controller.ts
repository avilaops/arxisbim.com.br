import type { FastifyRequest, FastifyReply } from 'fastify';
import { collaborationService } from './collaboration.service.js';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    tenantId: string;
    email: string;
  };
}

export class CollaborationController {
  /**
   * Add comment
   * POST /api/v1/collaboration/comments
   */
  async addComment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { resourceType, resourceId, content } = request.body as {
        resourceType: 'ifc' | 'federation';
        resourceId: string;
        content: string;
      };

      if (!resourceType || !resourceId || !content) {
        return reply.code(400).send({
          error: 'resourceType, resourceId, and content are required',
        });
      }

      const comment = await collaborationService.addComment(
        resourceType,
        resourceId,
        user.userId,
        user.email,
        content
      );

      return reply.code(201).send(comment);
    } catch (error: any) {
      console.error('Error adding comment:', error);
      return reply.code(500).send({
        error: 'Failed to add comment',
        message: error.message,
      });
    }
  }

  /**
   * Get comments
   * GET /api/v1/collaboration/comments/:resourceType/:resourceId
   */
  async getComments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { resourceType, resourceId } = request.params as {
        resourceType: 'ifc' | 'federation';
        resourceId: string;
      };

      const comments = await collaborationService.getComments(
        resourceType,
        resourceId
      );

      return reply.send(comments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      return reply.code(500).send({
        error: 'Failed to fetch comments',
        message: error.message,
      });
    }
  }

  /**
   * Resolve comment
   * PATCH /api/v1/collaboration/comments/:commentId/resolve
   */
  async resolveComment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { commentId } = request.params as { commentId: string };

      await collaborationService.resolveComment(commentId);

      return reply.send({ success: true });
    } catch (error: any) {
      console.error('Error resolving comment:', error);
      return reply.code(500).send({
        error: 'Failed to resolve comment',
        message: error.message,
      });
    }
  }

  /**
   * Get activities
   * GET /api/v1/collaboration/activities
   */
  async getActivities(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { resourceType, resourceId, limit } = request.query as {
        resourceType?: 'ifc' | 'federation';
        resourceId?: string;
        limit?: string;
      };

      const activities = await collaborationService.getActivities(
        resourceType,
        resourceId,
        limit ? parseInt(limit) : 50
      );

      return reply.send(activities);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      return reply.code(500).send({
        error: 'Failed to fetch activities',
        message: error.message,
      });
    }
  }

  /**
   * Mark as viewed
   * POST /api/v1/collaboration/view
   */
  async markAsViewed(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { resourceType, resourceId } = request.body as {
        resourceType: 'ifc' | 'federation';
        resourceId: string;
      };

      await collaborationService.markAsViewed(
        resourceType,
        resourceId,
        user.userId,
        user.email
      );

      return reply.send({ success: true });
    } catch (error: any) {
      console.error('Error marking as viewed:', error);
      return reply.code(500).send({
        error: 'Failed to mark as viewed',
        message: error.message,
      });
    }
  }

  /**
   * Get team activity feed
   * GET /api/v1/collaboration/feed
   */
  async getTeamFeed(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      const { limit } = request.query as { limit?: string };

      const feed = await collaborationService.getTeamActivityFeed(
        user.tenantId,
        limit ? parseInt(limit) : 100
      );

      return reply.send(feed);
    } catch (error: any) {
      console.error('Error fetching team feed:', error);
      return reply.code(500).send({
        error: 'Failed to fetch team feed',
        message: error.message,
      });
    }
  }
}
