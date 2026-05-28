/**
 * Collaboration Features for IFC/Federation
 *
 * Real-time collaboration features for team coordination
 * Uses PostgreSQL for storage (configured via .env)
 */
export interface Comment {
    id: string;
    resourceType: 'ifc' | 'federation';
    resourceId: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: string;
    resolved: boolean;
}
export interface Activity {
    id: string;
    type: 'upload' | 'update' | 'delete' | 'view' | 'comment' | 'validation';
    resourceType: 'ifc' | 'federation';
    resourceId: string;
    userId: string;
    userName: string;
    description: string;
    timestamp: string;
    metadata?: any;
}
export declare class CollaborationService {
    private comments;
    private activities;
    /**
     * Add comment to IFC or Federation
     */
    addComment(resourceType: 'ifc' | 'federation', resourceId: string, userId: string, userName: string, content: string): Promise<Comment>;
    /**
     * Get comments for resource
     */
    getComments(resourceType: 'ifc' | 'federation', resourceId: string): Promise<Comment[]>;
    /**
     * Resolve comment
     */
    resolveComment(commentId: string): Promise<void>;
    /**
     * Delete comment
     */
    deleteComment(commentId: string): Promise<void>;
    /**
     * Log activity
     */
    logActivity(activity: Omit<Activity, 'id'>): Promise<Activity>;
    /**
     * Get recent activities
     */
    getActivities(resourceType?: 'ifc' | 'federation', resourceId?: string, limit?: number): Promise<Activity[]>;
    /**
     * Get user activity summary
     */
    getUserActivitySummary(userId: string, days?: number): Promise<{
        totalActivities: number;
        byType: Record<string, number>;
        recentActivities: Activity[];
    }>;
    /**
     * Get team activity feed
     */
    getTeamActivityFeed(tenantId: string, limit?: number): Promise<Activity[]>;
    /**
     * Mark resource as viewed
     */
    markAsViewed(resourceType: 'ifc' | 'federation', resourceId: string, userId: string, userName: string): Promise<void>;
    /**
     * Get view count
     */
    getViewCount(resourceType: 'ifc' | 'federation', resourceId: string): Promise<number>;
    /**
     * Get unique viewers
     */
    getUniqueViewers(resourceType: 'ifc' | 'federation', resourceId: string): Promise<string[]>;
    private generateId;
}
export declare const collaborationService: CollaborationService;
//# sourceMappingURL=collaboration.service.d.ts.map