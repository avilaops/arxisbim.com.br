import { eq, and, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../shared/database/db.js';
import { elementComments } from '../../shared/database/schema/comments.js';
import { projects } from '../../shared/database/schema/projects.js';
import { memberships } from '../../shared/database/schema/workspaces.js';
import { users } from '../../shared/database/schema/tenants.js';
import { emailService } from '../../core/email/email.service.js';
import { buildMentionEmailHtml } from '../email/mention.email.js';

export interface CreateCommentInput {
  modelVersionId?: string;
  globalId?: string;
  worldPosition?: { x: number; y: number; z: number };
  body: string;
  parentId?: string;
}

export class CommentsService {
  /**
   * List all comments of a project structured as a hierarchy (parents + children replies)
   */
  async listByProject(projectId: string, globalId?: string) {
    const resolver = alias(users, 'resolver');

    const conditions = [eq(elementComments.projectId, projectId)];
    if (globalId) {
      conditions.push(eq(elementComments.globalId, globalId));
    }

    const rows = await db
      .select({
        id: elementComments.id,
        projectId: elementComments.projectId,
        modelVersionId: elementComments.modelVersionId,
        globalId: elementComments.globalId,
        worldPosition: elementComments.worldPosition,
        body: elementComments.body,
        parentId: elementComments.parentId,
        authorId: elementComments.authorId,
        isResolved: elementComments.isResolved,
        resolvedBy: elementComments.resolvedBy,
        resolvedAt: elementComments.resolvedAt,
        createdAt: elementComments.createdAt,
        authorName: users.name,
        authorEmail: users.email,
        resolvedByName: resolver.name,
      })
      .from(elementComments)
      .leftJoin(users, eq(elementComments.authorId, users.id))
      .leftJoin(resolver, eq(elementComments.resolvedBy, resolver.id))
      .where(and(...conditions))
      .orderBy(elementComments.createdAt);

    // Structure 2 levels: parents and replies
    const parentsMap = new Map<string, any>();
    const replies: any[] = [];

    for (const r of rows) {
      const formatted = {
        ...r,
        replies: [],
      };
      if (!r.parentId) {
        parentsMap.set(r.id, formatted);
      } else {
        replies.push(formatted);
      }
    }

    for (const reply of replies) {
      const parent = parentsMap.get(reply.parentId);
      if (parent) {
        parent.replies.push(reply);
      } else {
        // If parent not in mapping (e.g. filtered by globalId but parent was not, or orphan), treat as parent
        parentsMap.set(reply.id, reply);
      }
    }

    return Array.from(parentsMap.values());
  }

  /**
   * Create a new comment or reply and notify mentioned users
   */
  async create(projectId: string, authorId: string, input: CreateCommentInput) {
    // 1. Fetch project and author details
    const [project] = await db
      .select({
        name: projects.name,
        tenantId: projects.tenantId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    }

    const [author] = await db
      .select({
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);

    const authorName = author?.name || 'Membro do Projeto';

    // 2. If parentId is set, verify that parent exists and doesn't have parentId itself (limit to 2 levels)
    if (input.parentId) {
      const [parent] = await db
        .select({
          id: elementComments.id,
          parentId: elementComments.parentId,
        })
        .from(elementComments)
        .where(eq(elementComments.id, input.parentId))
        .limit(1);

      if (!parent) {
        throw Object.assign(new Error('Parent comment not found'), { statusCode: 400 });
      }

      // Thread replies are capped at 2 levels: if parent has a parentId, link to that parent instead
      if (parent.parentId) {
        input.parentId = parent.parentId;
      }
    }

    // 3. Insert comment
    const [comment] = await db
      .insert(elementComments)
      .values({
        projectId,
        modelVersionId: input.modelVersionId ?? null,
        globalId: input.globalId ?? null,
        worldPosition: input.worldPosition ?? null,
        body: input.body,
        parentId: input.parentId ?? null,
        authorId,
      })
      .returning();

    // 4. Parse mentions from body (e.g. @nicolas or @nicolas@avilaops.com)
    const mentions = input.body.match(/@([a-zA-Z0-9_.-]+(?:@[a-zA-Z0-9_.-]+\.[a-zA-Z]{2,})?)/g);

    if (mentions && mentions.length > 0) {
      // Fetch active members of project's tenant
      const activeMembers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(
          and(
            eq(memberships.tenantId, project.tenantId),
            eq(memberships.status, 'active'),
            eq(users.isActive, true)
          )
        );

      const notifiedUserIds = new Set<string>();

      for (const rawMention of mentions) {
        const queryMention = rawMention.substring(1).toLowerCase().trim(); // remove '@'

        // Find match in active tenant memberships
        const targetMember = activeMembers.find((member) => {
          const emailLower = member.email.toLowerCase();
          const emailPrefix = emailLower.split('@')[0];
          const nameNormalized = member.name.toLowerCase().replace(/\s+/g, '');

          return (
            emailLower === queryMention ||
            emailPrefix === queryMention ||
            nameNormalized === queryMention
          );
        });

        // Send email if target member found, is not the author, and has not been notified yet
        if (targetMember && targetMember.id !== authorId && !notifiedUserIds.has(targetMember.id)) {
          notifiedUserIds.add(targetMember.id);

          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const viewUrl = `${frontendUrl}/projects/${projectId}?commentId=${comment.id}`;
          const subject = `[ArxisVR] Você foi mencionado em ${project.name}`;
          const html = buildMentionEmailHtml(project.name, authorName, input.body, viewUrl);

          // Queue transactional email asynchronously
          await emailService
            .sendCustomEmail(targetMember.email, subject, html, project.tenantId)
            .catch((err) => {
              console.error(`❌ Failed to queue mention email to ${targetMember.email}:`, err.message);
            });
        }
      }
    }

    // Return the newly created comment joined with author info
    return {
      ...comment,
      authorName,
      authorEmail: '',
      resolvedByName: null,
      replies: [],
    };
  }

  /**
   * Toggle resolved state of a comment
   */
  async toggleResolve(commentId: string, userId: string) {
    const [existing] = await db
      .select({
        id: elementComments.id,
        isResolved: elementComments.isResolved,
      })
      .from(elementComments)
      .where(eq(elementComments.id, commentId))
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error('Comment not found'), { statusCode: 404 });
    }

    const nextResolved = !existing.isResolved;

    const [updated] = await db
      .update(elementComments)
      .set({
        isResolved: nextResolved,
        resolvedBy: nextResolved ? userId : null,
        resolvedAt: nextResolved ? new Date() : null,
      })
      .where(eq(elementComments.id, commentId))
      .returning();

    // Fetch resolver name
    let resolvedByName: string | null = null;
    if (nextResolved) {
      const [resolver] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      resolvedByName = resolver?.name || null;
    }

    return {
      ...updated,
      resolvedByName,
    };
  }

  /**
   * Delete a comment (cascade deletes replies via DB foreign key constraint)
   */
  async delete(commentId: string) {
    const [existing] = await db
      .select({
        id: elementComments.id,
      })
      .from(elementComments)
      .where(eq(elementComments.id, commentId))
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error('Comment not found'), { statusCode: 404 });
    }

    await db.delete(elementComments).where(eq(elementComments.id, commentId));
    return { id: commentId };
  }
}
