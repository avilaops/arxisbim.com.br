import type { FastifyRequest, FastifyReply } from 'fastify';
export declare class CollaborationController {
    /**
     * Add comment
     * POST /api/v1/collaboration/comments
     */
    addComment(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get comments
     * GET /api/v1/collaboration/comments/:resourceType/:resourceId
     */
    getComments(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Resolve comment
     * PATCH /api/v1/collaboration/comments/:commentId/resolve
     */
    resolveComment(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get activities
     * GET /api/v1/collaboration/activities
     */
    getActivities(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Mark as viewed
     * POST /api/v1/collaboration/view
     */
    markAsViewed(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Get team activity feed
     * GET /api/v1/collaboration/feed
     */
    getTeamFeed(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=collaboration.controller.d.ts.map