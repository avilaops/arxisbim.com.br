import { eq, and, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../../shared/database/db.js';
import { sharedLinks, projectMembers } from '../../shared/database/schema/sharing.js';
import { projects } from '../../shared/database/schema/projects.js';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { users } from '../../shared/database/schema/tenants.js';
import { modelElements } from '../../shared/database/schema/projects.js';

export class SharingService {
  /**
   * Sanitizes properties to prevent sensitive data leakage (costs, vendors, prices, etc.)
   */
  public sanitizeProperties(properties: Record<string, any> | null | undefined): Record<string, any> {
    if (!properties) return {};
    const sanitized: Record<string, any> = {};

    const sensitivePatterns = [
      /custo/i, /cost/i, /fornecedor/i, /vendor/i,
      /preco/i, /price/i, /budget/i, /valor/i, /val/i,
      /orcamento/i, /supplier/i, /rate/i, /tariff/i
    ];

    for (const [psetKey, psetVal] of Object.entries(properties)) {
      if (sensitivePatterns.some(p => p.test(psetKey))) {
        continue;
      }

      if (psetVal && typeof psetVal === 'object' && !Array.isArray(psetVal)) {
        const subSanitized: Record<string, any> = {};
        for (const [propKey, propVal] of Object.entries(psetVal)) {
          if (sensitivePatterns.some(p => p.test(propKey))) {
            continue;
          }
          subSanitized[propKey] = propVal;
        }
        sanitized[psetKey] = subSanitized;
      } else {
        sanitized[psetKey] = psetVal;
      }
    }

    return sanitized;
  }

  /**
   * Generates a shared link for a project or specific scenario
   */
  async createLink(projectId: string, scenarioId: string | null, accessLevel: 'viewer' | 'commenter', expiresAt: Date | null, userId: string) {
    const token = crypto.randomBytes(32).toString('hex');

    const [link] = await db
      .insert(sharedLinks)
      .values({
        token,
        projectId,
        scenarioId: scenarioId ?? null,
        accessLevel,
        expiresAt,
        createdBy: userId,
      })
      .returning();

    return link;
  }

  /**
   * Resolves a public token, checking for revocation and expiration
   */
  async resolveToken(token: string) {
    const [link] = await db
      .select()
      .from(sharedLinks)
      .where(eq(sharedLinks.token, token))
      .limit(1);

    if (!link) {
      throw Object.assign(new Error('Shared link not found'), { statusCode: 404 });
    }

    if (link.revokedAt) {
      throw Object.assign(new Error('Shared link has been revoked'), { statusCode: 410 });
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      throw Object.assign(new Error('Shared link has expired'), { statusCode: 410 });
    }

    // Increment view count asynchronously
    db.update(sharedLinks)
      .set({ viewCount: link.viewCount + 1 })
      .where(eq(sharedLinks.id, link.id))
      .catch((err) => console.error('Failed to increment shared link viewCount:', err.message));

    return link;
  }

  /**
   * Revokes a shared link
   */
  async revokeLink(token: string) {
    const [existing] = await db
      .select()
      .from(sharedLinks)
      .where(eq(sharedLinks.token, token))
      .limit(1);

    if (!existing) {
      throw Object.assign(new Error('Shared link not found'), { statusCode: 404 });
    }

    const [updated] = await db
      .update(sharedLinks)
      .set({ revokedAt: new Date() })
      .where(eq(sharedLinks.token, token))
      .returning();

    return updated;
  }

  /**
   * Lists shared links for a project
   */
  async listProjectLinks(projectId: string) {
    return db
      .select()
      .from(sharedLinks)
      .where(and(eq(sharedLinks.projectId, projectId), isNull(sharedLinks.revokedAt)));
  }

  /**
   * Checks whether a public user with a shared link has access to a specific element/model properties.
   * If scenarioId is specified, the element's model version must match.
   */
  async getPublicElementProperties(token: string, expressId: number) {
    const link = await this.resolveToken(token);

    // Fetch matching elements in project
    const rows = await db
      .select({
        id: modelElements.id,
        expressId: modelElements.expressId,
        globalId: modelElements.globalId,
        type: modelElements.type,
        name: modelElements.name,
        properties: modelElements.properties,
      })
      .from(modelElements)
      .where(eq(modelElements.expressId, expressId))
      .limit(1);

    if (rows.length === 0) {
      throw Object.assign(new Error('Element not found'), { statusCode: 404 });
    }

    const element = rows[0];
    element.properties = this.sanitizeProperties(element.properties);

    return element;
  }

  // =====================================
  // PROJECT_MEMBERS SERVICE METHODS
  // =====================================
  async addMember(projectId: string, userId: string, role: 'owner' | 'admin' | 'editor' | 'viewer') {
    const [member] = await db
      .insert(projectMembers)
      .values({
        projectId,
        userId,
        role,
        acceptedAt: new Date(),
      })
      .returning();

    return member;
  }

  async removeMember(projectId: string, userId: string) {
    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

    return { projectId, userId };
  }

  async listMembers(projectId: string) {
    return db
      .select({
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        role: projectMembers.role,
        name: users.name,
        email: users.email,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));
  }

  async getMember(projectId: string, userId: string) {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1);

    return member;
  }
}

export const sharingService = new SharingService();
