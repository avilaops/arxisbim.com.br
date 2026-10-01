/**
 * VersionHistoryService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getVersionHistoryService } from './VersionHistoryService';

describe('VersionHistoryService', () => {
  let service: ReturnType<typeof getVersionHistoryService>;

  beforeEach(() => {
    service = getVersionHistoryService();
  });

  describe('Version Management', () => {
    it('should create version', () => {
      const version = service.createVersion(
        'project-1',
        'Initial version',
        'user-1',
        'John Doe',
        []
      );

      expect(version.id).toBeDefined();
      expect(version.version).toBe('1.0.0');
      expect(version.authorName).toBe('John Doe');
    });

    it('should increment version number', () => {
      const v1 = service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      const v2 = service.createVersion('project-1', 'v2', 'user-1', 'John', [], v1.id);

      expect(v2.version).toBe('1.0.1');
    });

    it('should get version by ID', () => {
      const version = service.createVersion('project-1', 'Test', 'user-1', 'John', []);
      const found = service.getVersion(version.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(version.id);
    });

    it('should list project versions', () => {
      service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      service.createVersion('project-1', 'v2', 'user-1', 'John', []);

      const versions = service.getProjectVersions('project-1');
      expect(versions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Branch Management', () => {
    it('should create branch', () => {
      const version = service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      const branch = service.createBranch('project-1', 'feature-1', 'user-1', version.id);

      expect(branch.id).toBeDefined();
      expect(branch.name).toBe('feature-1');
      expect(branch.isMain).toBe(false);
    });

    it('should switch branch', () => {
      const version = service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      const branch = service.createBranch('project-1', 'feature-1', 'user-1', version.id);

      const switched = service.switchBranch(branch.id);
      expect(switched).toBe(true);
    });

    it('should list project branches', () => {
      const version = service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      service.createBranch('project-1', 'feature-1', 'user-1', version.id);
      service.createBranch('project-1', 'feature-2', 'user-1', version.id);

      const branches = service.getProjectBranches('project-1');
      expect(branches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Branch Merge', () => {
    it('should merge branches', () => {
      const v1 = service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      const mainBranch = service.createBranch('project-1', 'main', 'user-1', v1.id);
      const featureBranch = service.createBranch('project-1', 'feature', 'user-1', v1.id);

      // Cada lado precisa de versão criada COM o branch corrente: o serviço
      // marca `version.branch` na criação, e `createBranch` só guarda o
      // `baseVersionId` — a v1 acima pertence ao branch que estava ativo, não
      // ao main recém-criado. Sem isto o merge devolvia null.
      service.switchBranch(mainBranch.id);
      service.createVersion('project-1', 'v1-main', 'user-1', 'John', [], v1.id);

      service.switchBranch(featureBranch.id);
      service.createVersion('project-1', 'v2', 'user-1', 'John', [], v1.id);

      const merged = service.mergeBranch(featureBranch.id, mainBranch.id);
      expect(merged).not.toBeNull();
      expect(merged?.isMerged).toBe(true);
    });
  });

  describe('Version Revert', () => {
    it('should revert to previous version', () => {
      // Projeto próprio: `getVersionHistoryService()` é singleton e os casos
      // acima já numeraram 'project-1'. Com projeto isolado a sequência é
      // determinística — 1.0.0, 1.0.1 e a reversão em 1.0.2, acima das duas.
      const v1 = service.createVersion('projeto-revert', 'v1', 'user-1', 'John', []);
      service.createVersion('projeto-revert', 'v2', 'user-1', 'John', [], v1.id);

      const reverted = service.revertToVersion(v1.id, 'user-1', 'John');
      expect(reverted).not.toBeNull();
      expect(reverted?.version).toBe('1.0.2');
      expect(reverted?.metadata?.revertedFrom).toBe(v1.id);
    });
  });

  describe('Version Comparison', () => {
    it('should compare versions', () => {
      const v1 = service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      const v2 = service.createVersion('project-1', 'v2', 'user-1', 'John', [], v1.id);

      const changes = service.compareVersions(v1.id, v2.id);
      expect(Array.isArray(changes)).toBe(true);
    });

    it('should get diff between versions', () => {
      const v1 = service.createVersion('project-1', 'v1', 'user-1', 'John', []);
      const v2 = service.createVersion('project-1', 'v2', 'user-1', 'John', [], v1.id);

      const diff = service.getDiff(v1.id, v2.id);
      expect(diff.added).toBeDefined();
      expect(diff.modified).toBeDefined();
      expect(diff.deleted).toBeDefined();
    });
  });
});
