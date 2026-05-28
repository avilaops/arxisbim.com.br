/**
 * Federation Versioning Service
 * 
 * Manages versions and snapshots of federated models
 * Storage: PostgreSQL (DATABASE_URL from .env)
 */

import { db } from '../../shared/database/db.js';
import { federatedModels } from '../../shared/database/schema/projects.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface FederationVersion {
  id: string;
  federationId: string;
  versionNumber: number;
  name: string;
  description: string;
  snapshot: any; // Complete federation state
  createdAt: string;
  createdBy: string;
  tags: string[];
}

export interface VersionComparison {
  version1: FederationVersion;
  version2: FederationVersion;
  differences: {
    modelsAdded: string[];
    modelsRemoved: string[];
    modelsModified: Array<{
      modelId: string;
      changes: string[];
    }>;
  };
}

export class FederationVersionService {
  private versions: Map<string, FederationVersion[]> = new Map();

  /**
   * Create version snapshot
   */
  async createVersion(
    federationId: string,
    name: string,
    description: string,
    userId: string,
    tags: string[] = []
  ): Promise<FederationVersion> {
    // Get current federation state
    const [federation] = await db
      .select()
      .from(federatedModels)
      .where(eq(federatedModels.id, federationId));

    if (!federation) {
      throw new Error('Federation not found');
    }

    // Get existing versions
    const existingVersions = this.versions.get(federationId) || [];
    const versionNumber = existingVersions.length + 1;

    // Create version snapshot
    const version: FederationVersion = {
      id: randomUUID(),
      federationId,
      versionNumber,
      name,
      description,
      snapshot: {
        name: federation.name,
        description: federation.description,
        models: federation.models,
        projectId: federation.projectId,
        createdAt: federation.createdAt,
        updatedAt: federation.updatedAt,
      },
      createdAt: new Date().toISOString(),
      createdBy: userId,
      tags,
    };

    existingVersions.push(version);
    this.versions.set(federationId, existingVersions);

    return version;
  }

  /**
   * Get all versions for federation
   */
  async getVersions(federationId: string): Promise<FederationVersion[]> {
    return this.versions.get(federationId) || [];
  }

  /**
   * Get specific version
   */
  async getVersion(versionId: string): Promise<FederationVersion | null> {
    for (const versions of this.versions.values()) {
      const version = versions.find(v => v.id === versionId);
      if (version) return version;
    }
    return null;
  }

  /**
   * Restore federation to specific version
   */
  async restoreVersion(
    federationId: string,
    versionId: string,
    tenantId: string
  ): Promise<any> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (version.federationId !== federationId) {
      throw new Error('Version does not belong to this federation');
    }

    // Update federation to version snapshot
    const [restored] = await db
      .update(federatedModels)
      .set({
        name: version.snapshot.name,
        description: version.snapshot.description,
        models: version.snapshot.models,
        updatedAt: new Date(),
      } as any)
      .where(eq(federatedModels.id, federationId))
      .returning();

    return restored;
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    version1Id: string,
    version2Id: string
  ): Promise<VersionComparison> {
    const version1 = await this.getVersion(version1Id);
    const version2 = await this.getVersion(version2Id);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    const models1 = (version1.snapshot.models as any[]) || [];
    const models2 = (version2.snapshot.models as any[]) || [];

    const modelIds1 = new Set(models1.map((m: any) => m.ifcModelId));
    const modelIds2 = new Set(models2.map((m: any) => m.ifcModelId));

    // Find additions and removals
    const modelsAdded: string[] = [];
    const modelsRemoved: string[] = [];
    const modelsModified: Array<{ modelId: string; changes: string[] }> = [];

    models2.forEach((m2: any) => {
      if (!modelIds1.has(m2.ifcModelId)) {
        modelsAdded.push(m2.ifcModelId);
      }
    });

    models1.forEach((m1: any) => {
      if (!modelIds2.has(m1.ifcModelId)) {
        modelsRemoved.push(m1.ifcModelId);
      } else {
        // Check for modifications
        const m2 = models2.find((m: any) => m.ifcModelId === m1.ifcModelId);
        if (m2) {
          const changes: string[] = [];
          if (m1.visible !== m2.visible) {
            changes.push(`Visibility: ${m1.visible} → ${m2.visible}`);
          }
          if (JSON.stringify(m1.transformation) !== JSON.stringify(m2.transformation)) {
            changes.push('Transformation updated');
          }
          if (changes.length > 0) {
            modelsModified.push({ modelId: m1.ifcModelId, changes });
          }
        }
      }
    });

    return {
      version1,
      version2,
      differences: {
        modelsAdded,
        modelsRemoved,
        modelsModified,
      },
    };
  }

  /**
   * Tag a version
   */
  async addTag(versionId: string, tag: string): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    if (!version.tags.includes(tag)) {
      version.tags.push(tag);
    }
  }

  /**
   * Get versions by tag
   */
  async getVersionsByTag(federationId: string, tag: string): Promise<FederationVersion[]> {
    const versions = this.versions.get(federationId) || [];
    return versions.filter(v => v.tags.includes(tag));
  }

  /**
   * Delete old versions (keep last N)
   */
  async pruneVersions(federationId: string, keepLast: number = 10): Promise<void> {
    const versions = this.versions.get(federationId) || [];
    if (versions.length > keepLast) {
      const toKeep = versions.slice(-keepLast);
      this.versions.set(federationId, toKeep);
    }
  }

  /**
   * Get version timeline
   */
  async getTimeline(federationId: string): Promise<Array<{
    versionId: string;
    versionNumber: number;
    name: string;
    createdAt: string;
    createdBy: string;
    modelCount: number;
    tags: string[];
  }>> {
    const versions = this.versions.get(federationId) || [];
    return versions.map(v => ({
      versionId: v.id,
      versionNumber: v.versionNumber,
      name: v.name,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      modelCount: (v.snapshot.models as any[])?.length || 0,
      tags: v.tags,
    }));
  }

  /**
   * Create automatic checkpoint (before major changes)
   */
  async createCheckpoint(
    federationId: string,
    reason: string,
    userId: string
  ): Promise<FederationVersion> {
    return this.createVersion(
      federationId,
      `Checkpoint: ${reason}`,
      `Automatic checkpoint created before: ${reason}`,
      userId,
      ['checkpoint', 'auto']
    );
  }
}

export const federationVersionService = new FederationVersionService();
