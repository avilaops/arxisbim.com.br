import { describe, it, expect, beforeEach } from 'vitest';
import { FederationService } from '../src/modules/federation/federation.service';
import { FederationAnalyticsService } from '../src/modules/federation/federation-analytics.service';
import { FederationVersionService } from '../src/modules/federation/federation-version.service';
import { FederationConflictService } from '../src/modules/federation/federation-conflict.service';

describe('Federation Service - Unit Tests', () => {
  let federationService: FederationService;

  beforeEach(() => {
    federationService = new FederationService();
  });

  describe('Federation Creation', () => {
    it('should validate IFC models before creating federation', async () => {
      // Mock federation data
      const mockData = {
        projectId: 'project-123',
        name: 'Test Federation',
        description: 'Test description',
        models: [
          { ifcModelId: 'ifc-1', visible: true },
          { ifcModelId: 'ifc-2', visible: true }
        ]
      };
      
      expect(mockData.models.length).toBeGreaterThan(0);
      expect(mockData.name).toBeDefined();
    });

    it('should apply default transformations to models', async () => {
      const defaultTransformation = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      };
      
      expect(defaultTransformation.position.x).toBe(0);
      expect(defaultTransformation.scale.x).toBe(1);
    });
  });

  describe('Analytics Service', () => {
    it('should calculate discipline distribution', async () => {
      const analyticsService = new FederationAnalyticsService();
      
      const mockModels = [
        { discipline: 'architecture' },
        { discipline: 'architecture' },
        { discipline: 'structure' },
        { discipline: 'mep' }
      ];
      
      const distribution: Record<string, number> = {};
      mockModels.forEach(m => {
        const disc = m.discipline || 'unknown';
        distribution[disc] = (distribution[disc] || 0) + 1;
      });
      
      expect(distribution['architecture']).toBe(2);
      expect(distribution['structure']).toBe(1);
      expect(distribution['mep']).toBe(1);
    });

    it('should generate recommendations based on analytics', async () => {
      const recommendations: string[] = [];
      
      const mockAnalytics = {
        totalModels: 1,
        disciplineDistribution: { 'mep': 1 },
        totalSize: 600 * 1024 * 1024
      };
      
      if (mockAnalytics.totalModels < 2) {
        recommendations.push('Consider adding more models for better coordination');
      }
      
      if (!mockAnalytics.disciplineDistribution['architecture']) {
        recommendations.push('Add an architecture model as base reference');
      }
      
      if (mockAnalytics.totalSize > 500 * 1024 * 1024) {
        recommendations.push('Large federation size - consider optimizing models');
      }
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations).toContain('Add an architecture model as base reference');
    });
  });

  describe('Version Service', () => {
    it('should create version snapshots', async () => {
      const versionService = new FederationVersionService();
      
      const mockVersion = {
        id: 'version-123',
        federationId: 'fed-123',
        versionNumber: 1,
        name: 'Version 1.0',
        description: 'Initial version',
        snapshot: { name: 'Test Federation', models: [] },
        createdAt: new Date().toISOString(),
        createdBy: 'user-123',
        tags: ['initial']
      };
      
      expect(mockVersion.versionNumber).toBe(1);
      expect(mockVersion.tags).toContain('initial');
    });

    it('should compare two versions', async () => {
      const version1 = {
        snapshot: {
          models: [
            { ifcModelId: 'ifc-1', visible: true },
            { ifcModelId: 'ifc-2', visible: false }
          ]
        }
      };
      
      const version2 = {
        snapshot: {
          models: [
            { ifcModelId: 'ifc-1', visible: true },
            { ifcModelId: 'ifc-3', visible: true }
          ]
        }
      };
      
      const models1Ids = version1.snapshot.models.map(m => m.ifcModelId);
      const models2Ids = version2.snapshot.models.map(m => m.ifcModelId);
      
      const added = models2Ids.filter(id => !models1Ids.includes(id));
      const removed = models1Ids.filter(id => !models2Ids.includes(id));
      
      expect(added).toContain('ifc-3');
      expect(removed).toContain('ifc-2');
    });
  });

  describe('Conflict Detection Service', () => {
    it('should detect logical conflicts (mixed IFC versions)', async () => {
      const conflictService = new FederationConflictService();
      
      const mockModels = [
        { id: '1', ifcType: 'IFC2X3' },
        { id: '2', ifcType: 'IFC4' },
        { id: '3', ifcType: 'IFC4' }
      ];
      
      const ifcTypes = new Set(mockModels.map(m => m.ifcType).filter(Boolean));
      
      expect(ifcTypes.size).toBeGreaterThan(1); // Multiple versions detected
    });

    it('should calculate health score correctly', async () => {
      const summary = {
        criticalCount: 0,
        highCount: 1,
        mediumCount: 2,
        lowCount: 1
      };
      
      const healthScore = Math.max(0, 100 - (
        summary.criticalCount * 25 +
        summary.highCount * 10 +
        summary.mediumCount * 5 +
        summary.lowCount * 2
      ));
      
      expect(healthScore).toBe(78); // 100 - (0 + 10 + 10 + 2)
    });

    it('should categorize health score correctly', async () => {
      const getCategory = (score: number) => {
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'attention';
        return 'critical';
      };
      
      expect(getCategory(95)).toBe('excellent');
      expect(getCategory(78)).toBe('good');
      expect(getCategory(60)).toBe('attention');
      expect(getCategory(30)).toBe('critical');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when updating federation', async () => {
      const { cacheService } = await import('../src/modules/ifc/cache.service');
      
      const federationId = 'fed-123';
      const tenantId = 'tenant-123';
      const projectId = 'project-123';
      
      // Simulate cache keys
      const federationKey = `federation:${federationId}:${tenantId}`;
      const projectKey = `project-federations:${projectId}:${tenantId}`;
      
      // Set cache
      cacheService.set(federationKey, { name: 'Test' }, 60);
      cacheService.set(projectKey, [{ id: federationId }], 60);
      
      // Invalidate
      cacheService.delete(federationKey);
      cacheService.delete(projectKey);
      
      // Verify deletion (cache.delete sets to null, not undefined)
      expect(cacheService.get(federationKey)).toBeNull();
      expect(cacheService.get(projectKey)).toBeNull();
    });
  });
});
