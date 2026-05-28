/**
 * Federation Versioning Service
 *
 * Manages versions and snapshots of federated models
 * Storage: PostgreSQL (DATABASE_URL from .env)
 */
export interface FederationVersion {
    id: string;
    federationId: string;
    versionNumber: number;
    name: string;
    description: string;
    snapshot: any;
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
export declare class FederationVersionService {
    private versions;
    /**
     * Create version snapshot
     */
    createVersion(federationId: string, name: string, description: string, userId: string, tags?: string[]): Promise<FederationVersion>;
    /**
     * Get all versions for federation
     */
    getVersions(federationId: string): Promise<FederationVersion[]>;
    /**
     * Get specific version
     */
    getVersion(versionId: string): Promise<FederationVersion | null>;
    /**
     * Restore federation to specific version
     */
    restoreVersion(federationId: string, versionId: string, tenantId: string): Promise<any>;
    /**
     * Compare two versions
     */
    compareVersions(version1Id: string, version2Id: string): Promise<VersionComparison>;
    /**
     * Tag a version
     */
    addTag(versionId: string, tag: string): Promise<void>;
    /**
     * Get versions by tag
     */
    getVersionsByTag(federationId: string, tag: string): Promise<FederationVersion[]>;
    /**
     * Delete old versions (keep last N)
     */
    pruneVersions(federationId: string, keepLast?: number): Promise<void>;
    /**
     * Get version timeline
     */
    getTimeline(federationId: string): Promise<Array<{
        versionId: string;
        versionNumber: number;
        name: string;
        createdAt: string;
        createdBy: string;
        modelCount: number;
        tags: string[];
    }>>;
    /**
     * Create automatic checkpoint (before major changes)
     */
    createCheckpoint(federationId: string, reason: string, userId: string): Promise<FederationVersion>;
}
export declare const federationVersionService: FederationVersionService;
//# sourceMappingURL=federation-version.service.d.ts.map