/**
 * Model Versioning System
 * Sistema funcional de versionamento de modelos BIM
 * Suporta diff, merge, detecção de conflitos, histórico completo
 */

import * as THREE from 'three';

export interface ModelVersion {
  id: string;
  timestamp: number;
  author: string;
  message: string;
  parentId: string | null;
  snapshot: ModelSnapshot;
  metadata: VersionMetadata;
}

export interface ModelSnapshot {
  entities: Map<string, EntityData>;
  relationships: Map<string, RelationshipData>;
  properties: Map<string, PropertyData>;
  geometries: Map<string, GeometryData>;
}

export interface EntityData {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  geometry?: string; // geometry ID
  parent?: string;
  children?: string[];
  metadata?: Record<string, any>;
}

export interface RelationshipData {
  id: string;
  type: string;
  source: string;
  target: string;
  properties?: Record<string, any>;
}

export interface PropertyData {
  entityId: string;
  name: string;
  value: any;
  type: string;
  unit?: string;
}

export interface GeometryData {
  id: string;
  type: 'mesh' | 'line' | 'point';
  vertices: Float32Array;
  indices?: Uint32Array;
  normals?: Float32Array;
  uvs?: Float32Array;
  boundingBox?: { min: THREE.Vector3; max: THREE.Vector3 };
}

export interface VersionMetadata {
  changeCount: number;
  addedEntities: string[];
  modifiedEntities: string[];
  deletedEntities: string[];
  statistics: {
    totalEntities: number;
    totalProperties: number;
    totalRelationships: number;
    totalGeometries: number;
  };
}

export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  changes: Change[];
  summary: DiffSummary;
}

export interface Change {
  type: 'add' | 'modify' | 'delete';
  entityType: 'entity' | 'relationship' | 'property' | 'geometry';
  entityId: string;
  path?: string; // propriedade modificada
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export interface DiffSummary {
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
  affectedEntities: Set<string>;
}

export interface MergeConflict {
  entityId: string;
  path: string;
  baseValue: any;
  localValue: any;
  remoteValue: any;
  type: 'modify-modify' | 'modify-delete' | 'add-add';
}

export interface MergeResult {
  success: boolean;
  conflicts: MergeConflict[];
  mergedSnapshot?: ModelSnapshot;
  metadata: {
    baseVersion: string;
    localVersion: string;
    remoteVersion: string;
    autoResolved: number;
    conflictCount: number;
  };
}

export class VersioningSystem {
  private versions: Map<string, ModelVersion> = new Map();
  private currentVersion: string | null = null;
  private branches: Map<string, string> = new Map(); // branchName -> versionId
  private currentBranch: string = 'main';

  constructor() {
    console.log('📦 Versioning System initialized');
    this.branches.set('main', '');
  }

  /**
   * Cria snapshot do modelo atual
   */
  public createSnapshot(scene: THREE.Scene): ModelSnapshot {
    const entities = new Map<string, EntityData>();
    const geometries = new Map<string, GeometryData>();
    const relationships = new Map<string, RelationshipData>();
    const properties = new Map<string, PropertyData>();

    // Percorre todos os objetos na cena
    scene.traverse((object) => {
      if (!object.userData.ifcId) return;

      const entityId = object.userData.ifcId;
      
      // Entity data
      const entityData: EntityData = {
        id: entityId,
        type: object.userData.ifcType || 'Unknown',
        name: object.name,
        properties: { ...object.userData },
        parent: object.parent?.userData.ifcId,
        children: object.children
          .filter((c) => c.userData.ifcId)
          .map((c) => c.userData.ifcId),
        metadata: {
          position: object.position.toArray(),
          rotation: object.rotation.toArray(),
          scale: object.scale.toArray(),
          visible: object.visible,
          layers: object.layers.mask
        }
      };

      // Geometry data
      if (object instanceof THREE.Mesh && object.geometry) {
        const geomId = `geom_${entityId}`;
        entityData.geometry = geomId;

        const geometry = object.geometry;
        const geometryData: GeometryData = {
          id: geomId,
          type: 'mesh',
          vertices: new Float32Array(geometry.attributes.position.array),
          indices: geometry.index
            ? new Uint32Array(geometry.index.array)
            : undefined,
          normals: geometry.attributes.normal
            ? new Float32Array(geometry.attributes.normal.array)
            : undefined,
          uvs: geometry.attributes.uv
            ? new Float32Array(geometry.attributes.uv.array)
            : undefined
        };

        if (!geometry.boundingBox) {
          geometry.computeBoundingBox();
        }
        if (geometry.boundingBox) {
          geometryData.boundingBox = {
            min: geometry.boundingBox.min.clone(),
            max: geometry.boundingBox.max.clone()
          };
        }

        geometries.set(geomId, geometryData);
      }

      entities.set(entityId, entityData);

      // Properties
      Object.entries(object.userData).forEach(([key, value]) => {
        if (key.startsWith('ifc') || key === 'expressID') return;
        
        properties.set(`${entityId}_${key}`, {
          entityId,
          name: key,
          value,
          type: typeof value
        });
      });
    });

    return { entities, relationships, properties, geometries };
  }

  /**
   * Cria nova versão
   */
  public createVersion(
    snapshot: ModelSnapshot,
    author: string,
    message: string
  ): string {
    const versionId = this.generateVersionId();
    const parentId = this.currentVersion;

    const metadata = this.computeMetadata(snapshot, parentId);

    const version: ModelVersion = {
      id: versionId,
      timestamp: Date.now(),
      author,
      message,
      parentId,
      snapshot,
      metadata
    };

    this.versions.set(versionId, version);
    this.currentVersion = versionId;
    this.branches.set(this.currentBranch, versionId);

    console.log(`📦 Version ${versionId} created:`, {
      message,
      author,
      changes: metadata.changeCount,
      entities: metadata.statistics.totalEntities
    });

    return versionId;
  }

  /**
   * Computa metadata da versão
   */
  private computeMetadata(
    snapshot: ModelSnapshot,
    parentId: string | null
  ): VersionMetadata {
    const metadata: VersionMetadata = {
      changeCount: 0,
      addedEntities: [],
      modifiedEntities: [],
      deletedEntities: [],
      statistics: {
        totalEntities: snapshot.entities.size,
        totalProperties: snapshot.properties.size,
        totalRelationships: snapshot.relationships.size,
        totalGeometries: snapshot.geometries.size
      }
    };

    if (!parentId) {
      // Primeira versão - tudo é "added"
      metadata.addedEntities = Array.from(snapshot.entities.keys());
      metadata.changeCount = metadata.addedEntities.length;
      return metadata;
    }

    const parent = this.versions.get(parentId);
    if (!parent) return metadata;

    // Compute diff
    const diff = this.computeDiff(parent.snapshot, snapshot);
    
    diff.changes.forEach((change) => {
      if (change.entityType === 'entity') {
        switch (change.type) {
          case 'add':
            metadata.addedEntities.push(change.entityId);
            break;
          case 'modify':
            metadata.modifiedEntities.push(change.entityId);
            break;
          case 'delete':
            metadata.deletedEntities.push(change.entityId);
            break;
        }
      }
    });

    metadata.changeCount = diff.changes.length;
    return metadata;
  }

  /**
   * Calcula diferença entre duas versões
   */
  public computeDiff(from: ModelSnapshot, to: ModelSnapshot): VersionDiff {
    const changes: Change[] = [];
    const affectedEntities = new Set<string>();

    // Entities adicionadas ou modificadas
    to.entities.forEach((entity, id) => {
      const oldEntity = from.entities.get(id);
      
      if (!oldEntity) {
        // Added
        changes.push({
          type: 'add',
          entityType: 'entity',
          entityId: id,
          newValue: entity
        });
        affectedEntities.add(id);
      } else {
        // Modified?
        const entityChanges = this.compareEntities(oldEntity, entity);
        entityChanges.forEach((change) => {
          changes.push(change);
          affectedEntities.add(id);
        });
      }
    });

    // Entities deletadas
    from.entities.forEach((entity, id) => {
      if (!to.entities.has(id)) {
        changes.push({
          type: 'delete',
          entityType: 'entity',
          entityId: id,
          oldValue: entity
        });
        affectedEntities.add(id);
      }
    });

    // Geometries
    this.compareGeometries(from.geometries, to.geometries, changes, affectedEntities);

    // Properties
    this.compareProperties(from.properties, to.properties, changes, affectedEntities);

    const summary: DiffSummary = {
      addedCount: changes.filter((c) => c.type === 'add').length,
      modifiedCount: changes.filter((c) => c.type === 'modify').length,
      deletedCount: changes.filter((c) => c.type === 'delete').length,
      affectedEntities
    };

    return {
      fromVersion: '',
      toVersion: '',
      changes,
      summary
    };
  }

  /**
   * Compara duas entidades
   */
  private compareEntities(old: EntityData, current: EntityData): Change[] {
    const changes: Change[] = [];

    // Name
    if (old.name !== current.name) {
      changes.push({
        type: 'modify',
        entityType: 'entity',
        entityId: current.id,
        path: 'name',
        oldValue: old.name,
        newValue: current.name
      });
    }

    // Type
    if (old.type !== current.type) {
      changes.push({
        type: 'modify',
        entityType: 'entity',
        entityId: current.id,
        path: 'type',
        oldValue: old.type,
        newValue: current.type
      });
    }

    // Properties
    const allKeys = new Set([
      ...Object.keys(old.properties),
      ...Object.keys(current.properties)
    ]);

    allKeys.forEach((key) => {
      const oldVal = old.properties[key];
      const newVal = current.properties[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          type: 'modify',
          entityType: 'entity',
          entityId: current.id,
          path: `properties.${key}`,
          oldValue: oldVal,
          newValue: newVal
        });
      }
    });

    // Metadata
    if (JSON.stringify(old.metadata) !== JSON.stringify(current.metadata)) {
      changes.push({
        type: 'modify',
        entityType: 'entity',
        entityId: current.id,
        path: 'metadata',
        oldValue: old.metadata,
        newValue: current.metadata
      });
    }

    return changes;
  }

  /**
   * Compara geometrias
   */
  private compareGeometries(
    oldGeoms: Map<string, GeometryData>,
    newGeoms: Map<string, GeometryData>,
    changes: Change[],
    affected: Set<string>
  ): void {
    newGeoms.forEach((geom, id) => {
      const oldGeom = oldGeoms.get(id);
      
      if (!oldGeom) {
        changes.push({
          type: 'add',
          entityType: 'geometry',
          entityId: id,
          newValue: geom
        });
      } else if (!this.geometriesEqual(oldGeom, geom)) {
        changes.push({
          type: 'modify',
          entityType: 'geometry',
          entityId: id,
          oldValue: oldGeom,
          newValue: geom
        });
      }
    });

    oldGeoms.forEach((geom, id) => {
      if (!newGeoms.has(id)) {
        changes.push({
          type: 'delete',
          entityType: 'geometry',
          entityId: id,
          oldValue: geom
        });
      }
    });
  }

  /**
   * Compara arrays de geometria
   */
  private geometriesEqual(a: GeometryData, b: GeometryData): boolean {
    if (a.type !== b.type) return false;
    if (a.vertices.length !== b.vertices.length) return false;
    
    // Sample comparison (não compara todos os vértices por performance)
    const sampleSize = Math.min(100, a.vertices.length);
    for (let i = 0; i < sampleSize; i++) {
      if (Math.abs(a.vertices[i] - b.vertices[i]) > 0.001) return false;
    }
    
    return true;
  }

  /**
   * Compara propriedades
   */
  private compareProperties(
    oldProps: Map<string, PropertyData>,
    newProps: Map<string, PropertyData>,
    changes: Change[],
    affected: Set<string>
  ): void {
    newProps.forEach((prop, id) => {
      const oldProp = oldProps.get(id);
      
      if (!oldProp) {
        changes.push({
          type: 'add',
          entityType: 'property',
          entityId: id,
          newValue: prop
        });
        affected.add(prop.entityId);
      } else if (JSON.stringify(oldProp.value) !== JSON.stringify(prop.value)) {
        changes.push({
          type: 'modify',
          entityType: 'property',
          entityId: id,
          oldValue: oldProp.value,
          newValue: prop.value
        });
        affected.add(prop.entityId);
      }
    });

    oldProps.forEach((prop, id) => {
      if (!newProps.has(id)) {
        changes.push({
          type: 'delete',
          entityType: 'property',
          entityId: id,
          oldValue: prop
        });
        affected.add(prop.entityId);
      }
    });
  }

  /**
   * Faz merge de duas versões (three-way merge)
   */
  public merge(
    baseVersionId: string,
    localVersionId: string,
    remoteVersionId: string
  ): MergeResult {
    const base = this.versions.get(baseVersionId);
    const local = this.versions.get(localVersionId);
    const remote = this.versions.get(remoteVersionId);

    if (!base || !local || !remote) {
      return {
        success: false,
        conflicts: [],
        metadata: {
          baseVersion: baseVersionId,
          localVersion: localVersionId,
          remoteVersion: remoteVersionId,
          autoResolved: 0,
          conflictCount: 0
        }
      };
    }

    const conflicts: MergeConflict[] = [];
    const mergedEntities = new Map<string, EntityData>();

    // Three-way merge
    const allEntityIds = new Set([
      ...base.snapshot.entities.keys(),
      ...local.snapshot.entities.keys(),
      ...remote.snapshot.entities.keys()
    ]);

    let autoResolved = 0;

    allEntityIds.forEach((entityId) => {
      const baseEntity = base.snapshot.entities.get(entityId);
      const localEntity = local.snapshot.entities.get(entityId);
      const remoteEntity = remote.snapshot.entities.get(entityId);

      // Case 1: Apenas local modificou
      if (baseEntity && localEntity && !remoteEntity) {
        mergedEntities.set(entityId, localEntity);
        autoResolved++;
        return;
      }

      // Case 2: Apenas remote modificou
      if (baseEntity && !localEntity && remoteEntity) {
        mergedEntities.set(entityId, remoteEntity);
        autoResolved++;
        return;
      }

      // Case 3: Ambos deletaram
      if (baseEntity && !localEntity && !remoteEntity) {
        autoResolved++;
        return;
      }

      // Case 4: Ambos adicionaram o mesmo
      if (!baseEntity && localEntity && remoteEntity) {
        if (JSON.stringify(localEntity) === JSON.stringify(remoteEntity)) {
          mergedEntities.set(entityId, localEntity);
          autoResolved++;
        } else {
          // Conflito: ambos adicionaram mas com dados diferentes
          conflicts.push({
            entityId,
            path: '',
            baseValue: undefined,
            localValue: localEntity,
            remoteValue: remoteEntity,
            type: 'add-add'
          });
        }
        return;
      }

      // Case 5: Ambos modificaram
      if (baseEntity && localEntity && remoteEntity) {
        const localChanges = this.compareEntities(baseEntity, localEntity);
        const remoteChanges = this.compareEntities(baseEntity, remoteEntity);

        if (localChanges.length === 0) {
          // Local não modificou, usa remote
          mergedEntities.set(entityId, remoteEntity);
          autoResolved++;
        } else if (remoteChanges.length === 0) {
          // Remote não modificou, usa local
          mergedEntities.set(entityId, localEntity);
          autoResolved++;
        } else {
          // Ambos modificaram - detecta conflitos por propriedade
          const mergedEntity = { ...baseEntity };
          let hasConflict = false;

          localChanges.forEach((localChange) => {
            const remoteChange = remoteChanges.find(
              (rc) => rc.path === localChange.path
            );

            if (!remoteChange) {
              // Apenas local modificou esta propriedade
              this.applyChange(mergedEntity, localChange);
            } else if (
              JSON.stringify(localChange.newValue) ===
              JSON.stringify(remoteChange.newValue)
            ) {
              // Ambos fizeram a mesma modificação
              this.applyChange(mergedEntity, localChange);
            } else {
              // Conflito!
              hasConflict = true;
              conflicts.push({
                entityId,
                path: localChange.path || '',
                baseValue: localChange.oldValue,
                localValue: localChange.newValue,
                remoteValue: remoteChange.newValue,
                type: 'modify-modify'
              });
            }
          });

          // Aplica mudanças remote que local não tocou
          remoteChanges.forEach((remoteChange) => {
            const localChange = localChanges.find(
              (lc) => lc.path === remoteChange.path
            );
            if (!localChange) {
              this.applyChange(mergedEntity, remoteChange);
            }
          });

          if (!hasConflict) autoResolved++;
          mergedEntities.set(entityId, mergedEntity);
        }
      }
    });

    const success = conflicts.length === 0;
    
    const mergedSnapshot: ModelSnapshot = {
      entities: mergedEntities,
      relationships: new Map(), // TODO: merge relationships
      properties: new Map(), // TODO: merge properties
      geometries: new Map() // TODO: merge geometries
    };

    return {
      success,
      conflicts,
      mergedSnapshot: success ? mergedSnapshot : undefined,
      metadata: {
        baseVersion: baseVersionId,
        localVersion: localVersionId,
        remoteVersion: remoteVersionId,
        autoResolved,
        conflictCount: conflicts.length
      }
    };
  }

  /**
   * Aplica mudança em entidade
   */
  private applyChange(entity: EntityData, change: Change): void {
    if (!change.path) return;

    const parts = change.path.split('.');
    let target: any = entity;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) {
        target[parts[i]] = {};
      }
      target = target[parts[i]];
    }

    target[parts[parts.length - 1]] = change.newValue;
  }

  /**
   * Gera ID único para versão
   */
  private generateVersionId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Lista todas as versões
   */
  public listVersions(): ModelVersion[] {
    return Array.from(this.versions.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  /**
   * Retorna versão específica
   */
  public getVersion(versionId: string): ModelVersion | undefined {
    return this.versions.get(versionId);
  }

  /**
   * Retorna versão atual
   */
  public getCurrentVersion(): ModelVersion | undefined {
    return this.currentVersion
      ? this.versions.get(this.currentVersion)
      : undefined;
  }

  /**
   * Checkout de versão específica
   */
  public checkout(versionId: string): ModelSnapshot | null {
    const version = this.versions.get(versionId);
    if (!version) return null;

    this.currentVersion = versionId;
    console.log(`📦 Checked out version ${versionId}`);
    
    return version.snapshot;
  }

  /**
   * Cria nova branch
   */
  public createBranch(branchName: string, fromVersion?: string): boolean {
    if (this.branches.has(branchName)) {
      console.warn(`⚠️ Branch ${branchName} already exists`);
      return false;
    }

    const versionId = fromVersion || this.currentVersion || '';
    this.branches.set(branchName, versionId);
    console.log(`📦 Branch ${branchName} created from ${versionId}`);
    
    return true;
  }

  /**
   * Muda para outra branch
   */
  public switchBranch(branchName: string): boolean {
    if (!this.branches.has(branchName)) {
      console.warn(`⚠️ Branch ${branchName} does not exist`);
      return false;
    }

    this.currentBranch = branchName;
    const versionId = this.branches.get(branchName);
    if (versionId) {
      this.currentVersion = versionId;
    }
    
    console.log(`📦 Switched to branch ${branchName}`);
    return true;
  }

  /**
   * Lista todas as branches
   */
  public listBranches(): Map<string, string> {
    return new Map(this.branches);
  }

  /**
   * Retorna branch atual
   */
  public getCurrentBranch(): string {
    return this.currentBranch;
  }
}

// Singleton instance
export const versioning = new VersioningSystem();
