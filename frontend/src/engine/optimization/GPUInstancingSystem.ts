import * as THREE from 'three';
import { EntityManager, MeshComponent, TransformComponent } from '../ecs';

/**
 * GPUInstancingSystem - Sistema de instancing para elementos repetitivos
 * Reduz draw calls agrupando objetos idênticos
 */
export class GPUInstancingSystem {
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private instanceData: Map<string, InstancedGroup> = new Map();
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager;
  }

  /**
   * Analisa cena e cria instâncias para objetos similares
   */
  public analyzeAndCreateInstances(): void {
    // Agrupa entidades por geometria/material similar
    const groups = this.groupSimilarEntities();

    // Cria InstancedMesh para cada grupo
    groups.forEach((entities, key) => {
      if (entities.length > 1) { // Só instancia se houver mais de 1
        this.createInstancedMesh(key, entities);
      }
    });
  }

  /**
   * Agrupa entidades com geometria/material similar
   */
  private groupSimilarEntities(): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    const entities = this.entityManager.getEntitiesWithComponents(
      MeshComponent,
      TransformComponent
    );

    entities.forEach(entity => {
      const meshComp = entity.getComponent(MeshComponent);
      const transformComp = entity.getComponent(TransformComponent);

      if (!meshComp || !transformComp) return;

      // Cria chave baseada em geometria e material
      const key = this.generateInstanceKey(meshComp.mesh);

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    });

    return groups;
  }

  /**
   * Gera chave única para instancing baseada em geometria/material
   */
  private generateInstanceKey(mesh: THREE.Mesh): string {
    const geometry = mesh.geometry;
    const material = mesh.material;

    // Hash simples baseado em propriedades da geometria
    const geomHash = `${geometry.attributes.position?.count || 0}_${geometry.index?.count || 0}`;
    const matHash = material instanceof THREE.Material ?
      `${material.type}_${(material as any).color?.getHex() || 0}` : 'default';

    return `${geomHash}_${matHash}`;
  }

  /**
   * Cria InstancedMesh para um grupo de entidades
   */
  private createInstancedMesh(key: string, entities: any[]): void {
    if (entities.length === 0) return;

    const firstEntity = entities[0];
    const firstMesh = firstEntity.getComponent(MeshComponent).mesh;

    // Cria InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(
      firstMesh.geometry,
      firstMesh.material,
      entities.length
    );

    // Matrix temporária para transforms
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    // Define transforms para cada instância
    entities.forEach((entity, index) => {
      const transform = entity.getComponent(TransformComponent);

      position.copy(transform.position);
      rotation.copy(transform.rotation);
      scale.copy(transform.scale);

      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      instancedMesh.setMatrixAt(index, matrix);
    });

    // Armazena referência
    this.instancedMeshes.set(key, instancedMesh);
    this.instanceData.set(key, {
      entities,
      instancedMesh,
      count: entities.length
    });

    console.log(`🎯 Created instanced mesh for ${entities.length} entities (${key})`);
  }

  /**
   * Atualiza instâncias quando transforms mudam
   */
  public updateInstances(): void {
    this.instanceData.forEach((group, key) => {
      const instancedMesh = group.instancedMesh;
      const matrix = new THREE.Matrix4();

      group.entities.forEach((entity, index) => {
        const transform = entity.getComponent(TransformComponent);
        if (transform) {
          const position = transform.position;
          const rotation = transform.rotation;
          const scale = transform.scale;

          matrix.compose(
            position,
            new THREE.Quaternion().setFromEuler(rotation),
            scale
          );
          instancedMesh.setMatrixAt(index, matrix);
        }
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
    });
  }

  /**
   * Adiciona instâncias à cena
   */
  public addToScene(scene: THREE.Scene): void {
    this.instancedMeshes.forEach(mesh => {
      scene.add(mesh);
    });
  }

  /**
   * Remove instâncias da cena
   */
  public removeFromScene(scene: THREE.Scene): void {
    this.instancedMeshes.forEach(mesh => {
      scene.remove(mesh);
    });
  }

  /**
   * Obtém estatísticas de instancing
   */
  public getStats(): InstancingStats {
    let totalInstances = 0;
    let totalDrawCalls = 0;
    let savedDrawCalls = 0;

    this.instanceData.forEach(group => {
      totalInstances += group.count;
      totalDrawCalls += 1; // 1 draw call por InstancedMesh
      savedDrawCalls += group.count - 1; // Draw calls economizadas
    });

    return {
      instancedMeshes: this.instancedMeshes.size,
      totalInstances,
      totalDrawCalls,
      savedDrawCalls
    };
  }

  /**
   * Limpa todas as instâncias
   */
  public dispose(): void {
    this.instancedMeshes.forEach(mesh => {
      mesh.dispose();
    });
    this.instancedMeshes.clear();
    this.instanceData.clear();
  }
}

/**
 * Interfaces
 */
interface InstancedGroup {
  entities: any[];
  instancedMesh: THREE.InstancedMesh;
  count: number;
}

export interface InstancingStats {
  instancedMeshes: number;
  totalInstances: number;
  totalDrawCalls: number;
  savedDrawCalls: number;
}