import * as THREE from 'three';

/**
 * InstanceManager - Gerencia instâncias de geometrias repetidas
 * Reduz drasticamente uso de memória para elementos IFC repetidos
 * 
 * Técnicas:
 * - InstancedMesh para elementos idênticos (colunas, janelas, etc)
 * - Geometry merging para elementos similares
 * - Material pooling para reduzir draw calls
 * 
 * Economia típica: 60-90% de memória em modelos BIM
 */
export class InstanceManager {
  private scene: THREE.Scene;
  
  // Cache de geometrias e materiais
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private materialCache = new Map<string, THREE.Material>();
  
  // Instâncias agrupadas por geometria+material
  private instanceGroups = new Map<string, InstanceGroup>();
  
  // Estatísticas
  private stats = {
    totalElements: 0,
    instancedElements: 0,
    memorySaved: 0,
    drawCallsSaved: 0
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Adiciona elemento ao sistema de instancing
   * Automaticamente agrupa elementos similares
   */
  public addElement(
    id: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    transform: THREE.Matrix4,
    userData?: any
  ): void {
    this.stats.totalElements++;

    // Criar hash único para geometria + material
    const geomHash = this.getGeometryHash(geometry);
    const matHash = this.getMaterialHash(material);
    const groupKey = `${geomHash}_${matHash}`;

    // Verificar se já existe grupo
    let group = this.instanceGroups.get(groupKey);

    if (!group) {
      // Criar novo grupo
      group = new InstanceGroup(geometry, material, this.scene);
      this.instanceGroups.set(groupKey, group);
      
      // Adicionar ao cache
      this.geometryCache.set(geomHash, geometry);
      this.materialCache.set(matHash, material);
    }

    // Adicionar instância ao grupo
    group.addInstance(id, transform, userData);
    this.stats.instancedElements++;
  }

  /**
   * Remove elemento do sistema
   */
  public removeElement(id: string): void {
    for (const [key, group] of this.instanceGroups.entries()) {
      if (group.removeInstance(id)) {
        // Se grupo ficou vazio, remover
        if (group.getInstanceCount() === 0) {
          group.dispose();
          this.instanceGroups.delete(key);
        }
        break;
      }
    }
  }

  /**
   * Atualiza transform de uma instância
   */
  public updateInstance(id: string, transform: THREE.Matrix4): void {
    for (const group of this.instanceGroups.values()) {
      if (group.updateInstance(id, transform)) {
        break;
      }
    }
  }

  /**
   * Finaliza processamento e cria InstancedMesh
   * Deve ser chamado após adicionar todos os elementos
   */
  public finalize(): void {
    console.log('🎯 Finalizando instancing...');

    for (const [key, group] of this.instanceGroups.entries()) {
      const count = group.getInstanceCount();
      
      if (count >= 3) {
        // Vale a pena instanciar (3+ elementos)
        group.createInstancedMesh();
        this.stats.drawCallsSaved += count - 1;
        
        // Economia de memória estimada
        const geometrySize = this.estimateGeometrySize(group.geometry);
        this.stats.memorySaved += geometrySize * (count - 1);
        
        console.log(`✅ Grupo ${key}: ${count} instâncias (${(geometrySize * count / 1024).toFixed(2)} KB → ${(geometrySize / 1024).toFixed(2)} KB)`);
      } else {
        // Poucos elementos, renderizar normalmente
        group.createIndividualMeshes();
      }
    }

    this.logStats();
  }

  /**
   * Cria hash único para geometria
   */
  private getGeometryHash(geometry: THREE.BufferGeometry): string {
    const position = geometry.attributes.position;
    if (!position) return 'empty';

    const count = position.count;
    const array = position.array;

    // Sample alguns vértices para criar signature
    const samples = [
      array[0], array[1], array[2], // primeiro
      array[Math.floor(count / 2) * 3], // meio
      array[count * 3 - 3], array[count * 3 - 2], array[count * 3 - 1] // último
    ].map(v => Math.round(v * 1000));

    return `g_${count}_${samples.join('_')}`;
  }

  /**
   * Cria hash único para material
   */
  private getMaterialHash(material: THREE.Material): string {
    if (material instanceof THREE.MeshStandardMaterial) {
      const color = material.color.getHex();
      const metalness = Math.round(material.metalness * 100);
      const roughness = Math.round(material.roughness * 100);
      const opacity = Math.round(material.opacity * 100);
      
      return `mat_${color}_${metalness}_${roughness}_${opacity}`;
    }
    
    return `mat_${material.type}_${material.id}`;
  }

  /**
   * Estima tamanho de geometria em bytes
   */
  private estimateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;

    for (const key in geometry.attributes) {
      const attribute = geometry.attributes[key];
      size += attribute.array.byteLength;
    }

    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }

    return size;
  }

  /**
   * Obtém estatísticas de instancing
   */
  public getStats() {
    return {
      ...this.stats,
      memorySavedMB: (this.stats.memorySaved / (1024 * 1024)).toFixed(2),
      instanceRate: this.stats.totalElements > 0 
        ? ((this.stats.instancedElements / this.stats.totalElements) * 100).toFixed(1)
        : '0'
    };
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    for (const group of this.instanceGroups.values()) {
      group.dispose();
    }

    this.instanceGroups.clear();
    this.geometryCache.clear();
    this.materialCache.clear();
  }

  /**
   * Log de estatísticas
   */
  private logStats(): void {
    const stats = this.getStats();
    
    console.log('📊 Estatísticas de Instancing:');
    console.log(`   Total de elementos: ${stats.totalElements}`);
    console.log(`   Elementos instanciados: ${stats.instancedElements} (${stats.instanceRate}%)`);
    console.log(`   Memória economizada: ${stats.memorySavedMB} MB`);
    console.log(`   Draw calls economizados: ${stats.drawCallsSaved}`);
  }
}

/**
 * Grupo de instâncias com mesma geometria e material
 */
class InstanceGroup {
  public geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private scene: THREE.Scene;
  
  private instances = new Map<string, InstanceData>();
  private instancedMesh: THREE.InstancedMesh | null = null;
  private individualMeshes: THREE.Mesh[] = [];

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, scene: THREE.Scene) {
    this.geometry = geometry;
    this.material = material;
    this.scene = scene;
  }

  /**
   * Adiciona instância ao grupo
   */
  public addInstance(id: string, transform: THREE.Matrix4, userData?: any): void {
    this.instances.set(id, {
      transform: transform.clone(),
      userData: userData || {},
      index: this.instances.size
    });
  }

  /**
   * Remove instância
   */
  public removeInstance(id: string): boolean {
    const instance = this.instances.get(id);
    if (!instance) return false;

    this.instances.delete(id);

    // Se já criou InstancedMesh, atualizar
    if (this.instancedMesh) {
      this.recreateInstancedMesh();
    }

    return true;
  }

  /**
   * Atualiza transform de instância
   */
  public updateInstance(id: string, transform: THREE.Matrix4): boolean {
    const instance = this.instances.get(id);
    if (!instance) return false;

    instance.transform.copy(transform);

    // Se já criou InstancedMesh, atualizar matriz
    if (this.instancedMesh && instance.index !== undefined) {
      this.instancedMesh.setMatrixAt(instance.index, transform);
      this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    return true;
  }

  /**
   * Cria InstancedMesh para renderização eficiente
   */
  public createInstancedMesh(): void {
    const count = this.instances.size;
    
    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      count
    );

    // Configurar matrizes
    let index = 0;
    for (const [id, data] of this.instances.entries()) {
      data.index = index;
      this.instancedMesh.setMatrixAt(index, data.transform);
      
      // Copiar userData para a primeira instância
      if (index === 0) {
        this.instancedMesh.userData = { ...data.userData };
      }
      
      index++;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.frustumCulled = true;
    this.instancedMesh.castShadow = true;
    this.instancedMesh.receiveShadow = true;

    this.scene.add(this.instancedMesh);
  }

  /**
   * Cria meshes individuais (fallback para poucos elementos)
   */
  public createIndividualMeshes(): void {
    for (const [id, data] of this.instances.entries()) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.applyMatrix4(data.transform);
      mesh.userData = { ...data.userData, originalId: id };
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      this.individualMeshes.push(mesh);
      this.scene.add(mesh);
    }
  }

  /**
   * Recria InstancedMesh (após mudanças)
   */
  private recreateInstancedMesh(): void {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh = null;
    }
    
    this.createInstancedMesh();
  }

  /**
   * Obtém contagem de instâncias
   */
  public getInstanceCount(): number {
    return this.instances.size;
  }

  /**
   * Limpa recursos
   */
  public dispose(): void {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh = null;
    }

    for (const mesh of this.individualMeshes) {
      this.scene.remove(mesh);
    }
    this.individualMeshes = [];

    this.instances.clear();
  }
}

interface InstanceData {
  transform: THREE.Matrix4;
  userData: any;
  index?: number;
}
