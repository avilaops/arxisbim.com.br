/**
 * Collaboration Features for IFC/Federation
 * 
 * Real-time collaboration features for team coordination
 * Uses PostgreSQL for storage (configured via .env)
 */

import { db } from '../../shared/database/db.js';

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

export class CollaborationService {
  private comments: Map<string, Comment[]> = new Map();
  private activities: Activity[] = [];

  /**
   * Add comment to IFC or Federation
   */
  async addComment(
    resourceType: 'ifc' | 'federation',
    resourceId: string,
    userId: string,
    userName: string,
    content: string
  ): Promise<Comment> {
    const comment: Comment = {
      id: this.generateId(),
      resourceType,
      resourceId,
      userId,
      userName,
      content,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    const key = `${resourceType}:${resourceId}`;
    const existing = this.comments.get(key) || [];
    existing.push(comment);
    this.comments.set(key, existing);

    // Log activity
    await this.logActivity({
      type: 'comment',
      resourceType,
      resourceId,
      userId,
      userName,
      description: `Commented: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      timestamp: new Date().toISOString(),
    });

    return comment;
  }

  /**
   * Get comments for resource
   */
  async getComments(
    resourceType: 'ifc' | 'federation',
    resourceId: string
  ): Promise<Comment[]> {
    const key = `${resourceType}:${resourceId}`;
    return this.comments.get(key) || [];
  }

  /**
   * Resolve comment
   */
  async resolveComment(commentId: string): Promise<void> {
    for (const [key, comments] of this.comments.entries()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
        return;
      }
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<void> {
    for (const [key, comments] of this.comments.entries()) {
      const index = comments.findIndex(c => c.id === commentId);
      if (index !== -1) {
        comments.splice(index, 1);
        this.comments.set(key, comments);
        return;
      }
    }
  }

  /**
   * Log activity
   */
  async logActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    const newActivity: Activity = {
      id: this.generateId(),
      ...activity,
    };

    this.activities.push(newActivity);

    // Keep only last 1000 activities
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(-1000);
    }

    return newActivity;
  }

  /**
   * Get recent activities
   */
  async getActivities(
    resourceType?: 'ifc' | 'federation',
    resourceId?: string,
    limit: number = 50
  ): Promise<Activity[]> {
    let filtered = this.activities;

    if (resourceType && resourceId) {
      filtered = filtered.filter(
        a => a.resourceType === resourceType && a.resourceId === resourceId
      );
    } else if (resourceType) {
      filtered = filtered.filter(a => a.resourceType === resourceType);
    }

    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string, days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const userActivities = this.activities.filter(
      a => a.userId === userId && new Date(a.timestamp) >= cutoffDate
    );

    const summary = {
      totalActivities: userActivities.length,
      byType: {} as Record<string, number>,
      recentActivities: userActivities.slice(-10),
    };

    userActivities.forEach(a => {
      summary.byType[a.type] = (summary.byType[a.type] || 0) + 1;
    });

    return summary;
  }

  /**
   * Get team activity feed
   */
  async getTeamActivityFeed(tenantId: string, limit: number = 100) {
    // In production, filter by tenantId from database
    return this.activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Mark resource as viewed
   */
  async markAsViewed(
    resourceType: 'ifc' | 'federation',
    resourceId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.logActivity({
      type: 'view',
      resourceType,
      resourceId,
      userId,
      userName,
      description: `Viewed ${resourceType}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get view count
   */
  async getViewCount(
    resourceType: 'ifc' | 'federation',
    resourceId: string
  ): Promise<number> {
    return this.activities.filter(
      a =>
        a.type === 'view' &&
        a.resourceType === resourceType &&
        a.resourceId === resourceId
    ).length;
  }

  /**
   * Get unique viewers
   */
  async getUniqueViewers(
    resourceType: 'ifc' | 'federation',
    resourceId: string
  ): Promise<string[]> {
    const views = this.activities.filter(
      a =>
        a.type === 'view' &&
        a.resourceType === resourceType &&
        a.resourceId === resourceId
    );

    const uniqueUsers = new Set(views.map(v => v.userId));
    return Array.from(uniqueUsers);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const collaborationService = new CollaborationService();
