import { collaborationService } from './collaboration.service.js';
export class CollaborationController {
    /**
     * Add comment
     * POST /api/v1/collaboration/comments
     */
    async addComment(request, reply) {
        try {
            const user = request.user;
            const { resourceType, resourceId, content } = request.body;
            if (!resourceType || !resourceId || !content) {
                return reply.code(400).send({
                    error: 'resourceType, resourceId, and content are required',
                });
            }
            const comment = await collaborationService.addComment(resourceType, resourceId, user.userId, user.email, content);
            return reply.code(201).send(comment);
        }
        catch (error) {
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
    async getComments(request, reply) {
        try {
            const { resourceType, resourceId } = request.params;
            const comments = await collaborationService.getComments(resourceType, resourceId);
            return reply.send(comments);
        }
        catch (error) {
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
    async resolveComment(request, reply) {
        try {
            const { commentId } = request.params;
            await collaborationService.resolveComment(commentId);
            return reply.send({ success: true });
        }
        catch (error) {
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
    async getActivities(request, reply) {
        try {
            const { resourceType, resourceId, limit } = request.query;
            const activities = await collaborationService.getActivities(resourceType, resourceId, limit ? parseInt(limit) : 50);
            return reply.send(activities);
        }
        catch (error) {
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
    async markAsViewed(request, reply) {
        try {
            const user = request.user;
            const { resourceType, resourceId } = request.body;
            await collaborationService.markAsViewed(resourceType, resourceId, user.userId, user.email);
            return reply.send({ success: true });
        }
        catch (error) {
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
    async getTeamFeed(request, reply) {
        try {
            const user = request.user;
            const { limit } = request.query;
            const feed = await collaborationService.getTeamActivityFeed(user.tenantId, limit ? parseInt(limit) : 100);
            return reply.send(feed);
        }
        catch (error) {
            console.error('Error fetching team feed:', error);
            return reply.code(500).send({
                error: 'Failed to fetch team feed',
                message: error.message,
            });
        }
    }
}
//# sourceMappingURL=collaboration.controller.js.map