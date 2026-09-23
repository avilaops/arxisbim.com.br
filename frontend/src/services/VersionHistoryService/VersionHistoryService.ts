/**
 * VersionHistoryService
 * Histórico de versões colaborativo para modelos BIM
 * Rastreia todas as alterações com suporte a branch e merge
 */

export interface Version {
  id: string;
  projectId: string;
  version: string;
  description: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  changes: Change[];
  branch: string;
  parentVersionId?: string;
  isMerged: boolean;
  mergeSourceId?: string;
  metadata: Record<string, any>;
}

export interface Change {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move';
  elementId: string;
  elementType: string;
  previousValue?: any;
  newValue?: any;
  timestamp: string;
}

export interface Branch {
  id: string;
  name: string;
  projectId: string;
  createdBy: string;
  createdAt: string;
  baseVersionId: string;
  isMain: boolean;
}

class VersionHistoryService {
  private versions: Map<string, Version> = new Map();
  private branches: Map<string, Branch> = new Map();
  private currentBranch: string = 'main';

  /**
   * Cria nova versão
   */
  createVersion(
    projectId: string,
    description: string,
    authorId: string,
    authorName: string,
    changes: Change[],
    parentVersionId?: string
  ): Version {
    const parentVersion = parentVersionId ? this.versions.get(parentVersionId) : null;
    const versionNumber = this.calculateNextVersion(projectId, parentVersion);

    const version: Version = {
      id: this.generateVersionId(),
      projectId,
      version: versionNumber,
      description,
      authorId,
      authorName,
      timestamp: new Date().toISOString(),
      changes,
      branch: this.currentBranch,
      parentVersionId,
      isMerged: false,
      metadata: {},
    };

    this.versions.set(version.id, version);
    console.log('[VersionHistoryService] Version created:', version.version, 'by:', authorName);
    return version;
  }

  /**
   * Calcula próxima versão
   */
  private calculateNextVersion(projectId: string, parentVersion?: Version | null): string {
    if (!parentVersion) {
      return '1.0.0';
    }

    const parts = parentVersion.version.split('.').map(Number);
    parts[2]++; // Incrementar patch

    return parts.join('.');
  }

  /**
   * Cria novo branch
   */
  createBranch(
    projectId: string,
    name: string,
    createdBy: string,
    baseVersionId: string
  ): Branch {
    const branch: Branch = {
      id: this.generateBranchId(),
      name,
      projectId,
      createdBy,
      createdAt: new Date().toISOString(),
      baseVersionId,
      isMain: false,
    };

    this.branches.set(branch.id, branch);
    console.log('[VersionHistoryService] Branch created:', name);
    return branch;
  }

  /**
   * Alterna branch atual
   */
  switchBranch(branchId: string): boolean {
    const branch = this.branches.get(branchId);
    if (!branch) {
      return false;
    }

    this.currentBranch = branch.id;
    console.log('[VersionHistoryService] Switched to branch:', branch.name);
    return true;
  }

  /**
   * Merge branch
   */
  mergeBranch(sourceBranchId: string, targetBranchId: string): Version | null {
    const sourceBranch = this.branches.get(sourceBranchId);
    const targetBranch = this.branches.get(targetBranchId);

    if (!sourceBranch || !targetBranch) {
      return null;
    }

    // Obter última versão do branch de origem
    const sourceVersions = this.getVersionsByBranch(sourceBranchId);
    const targetVersions = this.getVersionsByBranch(targetBranchId);

    if (sourceVersions.length === 0 || targetVersions.length === 0) {
      return null;
    }

    const sourceVersion = sourceVersions[0];
    const targetVersion = targetVersions[0];

    // Criar versão de merge
    const mergedChanges = this.mergeChanges(sourceVersion.changes, targetVersion.changes);

    const mergedVersion: Version = {
      id: this.generateVersionId(),
      projectId: sourceBranch.projectId,
      version: this.calculateNextVersion(sourceBranch.projectId, targetVersion),
      description: `Merge ${sourceBranch.name} into ${targetBranch.name}`,
      authorId: 'system',
      authorName: 'System',
      timestamp: new Date().toISOString(),
      changes: mergedChanges,
      branch: targetBranchId,
      parentVersionId: targetVersion.id,
      isMerged: true,
      mergeSourceId: sourceVersion.id,
      metadata: {
        mergeSourceBranch: sourceBranch.name,
        mergeTargetBranch: targetBranch.name,
      },
    };

    this.versions.set(mergedVersion.id, mergedVersion);
    console.log('[VersionHistoryService] Branch merged:', sourceBranch.name, '->', targetBranch.name);
    return mergedVersion;
  }

  /**
   * Mescla mudanças
   */
  private mergeChanges(sourceChanges: Change[], targetChanges: Change[]): Change[] {
    // Simplificação: combinar mudanças sem duplicatas
    const merged = [...targetChanges];
    const existingIds = new Set(targetChanges.map(c => c.elementId));

    sourceChanges.forEach(change => {
      if (!existingIds.has(change.elementId)) {
        merged.push(change);
      }
    });

    return merged;
  }

  /**
   * Reverte para versão anterior
   */
  revertToVersion(versionId: string, authorId: string, authorName: string): Version | null {
    const version = this.versions.get(versionId);
    if (!version) {
      return null;
    }

    // Criar nova versão revertendo mudanças
    const revertedChanges = version.changes.map(change => ({
      ...change,
      type: change.type === 'create' ? 'delete' : change.type === 'delete' ? 'create' : 'update' as any,
      previousValue: change.newValue,
      newValue: change.previousValue,
    }));

    // O pai da reversão é a versão MAIS RECENTE do projeto, não a que está
    // sendo revertida: `calculateNextVersion` numera a partir do pai, então
    // reverter para 1.0.0 com o projeto em 1.0.1 criava uma segunda 1.0.1 —
    // dois registros distintos com o mesmo número, e o histórico deixava de
    // ser ordenável. A mudança revertida continua rastreável por
    // `metadata.revertedFrom`.
    // `getProjectVersions` ordena por timestamp, e versões criadas no mesmo
    // milissegundo empatam — a maior numeração é o critério estável aqui.
    const versaoAtual = this.getProjectVersions(version.projectId)
      .reduce((maior, atual) => (compararVersoes(atual.version, maior.version) > 0 ? atual : maior), version);

    const revertedVersion = this.createVersion(
      version.projectId,
      `Revert to ${version.version}`,
      authorId,
      authorName,
      revertedChanges,
      versaoAtual.id
    );
    revertedVersion.metadata = { ...revertedVersion.metadata, revertedFrom: version.id };

    console.log('[VersionHistoryService] Reverted to version:', version.version);
    return revertedVersion;
  }

  /**
   * Retorna versão por ID
   */
  getVersion(versionId: string): Version | undefined {
    return this.versions.get(versionId);
  }

  /**
   * Lista versões de um projeto
   */
  getProjectVersions(projectId: string): Version[] {
    return Array.from(this.versions.values())
      .filter(v => v.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Lista versões de um branch
   */
  getVersionsByBranch(branchId: string): Version[] {
    return Array.from(this.versions.values())
      .filter(v => v.branch === branchId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Lista versões de um usuário
   */
  getUserVersions(authorId: string): Version[] {
    return Array.from(this.versions.values())
      .filter(v => v.authorId === authorId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Retorna branch por ID
   */
  getBranch(branchId: string): Branch | undefined {
    return this.branches.get(branchId);
  }

  /**
   * Lista branches de um projeto
   */
  getProjectBranches(projectId: string): Branch[] {
    return Array.from(this.branches.values()).filter(b => b.projectId === projectId);
  }

  /**
   * Retorna branch atual
   */
  getCurrentBranch(): Branch | undefined {
    return this.branches.get(this.currentBranch);
  }

  /**
   * Compara duas versões
   */
  compareVersions(versionId1: string, versionId2: string): Change[] {
    const version1 = this.versions.get(versionId1);
    const version2 = this.versions.get(versionId2);

    if (!version1 || !version2) {
      return [];
    }

    // Simplificação: retornar mudanças da versão mais recente
    const newerVersion = new Date(version1.timestamp) > new Date(version2.timestamp) ? version1 : version2;
    return newerVersion.changes;
  }

  /**
   * Obtém diff detalhado entre versões
   */
  getDiff(versionId1: string, versionId2: string): {
    added: Change[];
    modified: Change[];
    deleted: Change[];
  } {
    const changes = this.compareVersions(versionId1, versionId2);

    return {
      added: changes.filter(c => c.type === 'create'),
      modified: changes.filter(c => c.type === 'update'),
      deleted: changes.filter(c => c.type === 'delete'),
    };
  }

  /**
   * Gera ID de versão
   */
  private generateVersionId(): string {
    return `version_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gera ID de branch
   */
  private generateBranchId(): string {
    return `branch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.versions.clear();
    this.branches.clear();
    this.currentBranch = 'main';
    console.log('[VersionHistoryService] Disposed');
  }
}

// Singleton instance
let versionHistoryServiceInstance: VersionHistoryService | null = null;

export function getVersionHistoryService(): VersionHistoryService {
  if (!versionHistoryServiceInstance) {
    versionHistoryServiceInstance = new VersionHistoryService();
  }
  return versionHistoryServiceInstance;
}

export default VersionHistoryService;

/** Compara "1.0.10" com "1.0.9" por número, não por string. */
function compararVersoes(a: string, b: string): number {
  const partesA = a.split('.').map(Number);
  const partesB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partesA.length, partesB.length); i++) {
    const diferenca = (partesA[i] || 0) - (partesB[i] || 0);
    if (diferenca !== 0) return diferenca;
  }
  return 0;
}
