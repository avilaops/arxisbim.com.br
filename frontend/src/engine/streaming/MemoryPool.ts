import * as THREE from 'three';

/**
 * MemoryPool - Pool de objetos reutilizáveis
 * Reduz garbage collection mantendo objetos alocados
 * 
 * Features:
 * - Pool de geometrias, materiais, meshes
 * - Reutilização automática
 * - Liberação estratégica baseada em uso
 */
export class MemoryPool {
  private geometryPool: Map<string, THREE.BufferGeometry[]> = new Map();
  private materialPool: Map<string, THREE.Material[]> = new Map();
  private meshPool: THREE.Mesh[] = [];
  
  private poolLimits = {
    geometry: 100,
    material: 50,
    mesh: 200
  };
  
  constructor() {
    console.log('🏊 Memory Pool initialized');
  }
  
  /**
   * Obtém geometria do pool ou cria nova
   */
  public acquireGeometry(type: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    const pool = this.geometryPool.get(type);
    
    if (pool && pool.length > 0) {
      const geometry = pool.pop()!;
      console.log(`♻️ Reusing geometry: ${type}`);
      return geometry;
    }
    
    console.log(`✨ Creating new geometry: ${type}`);
    return factory();
  }
  
  /**
   * Devolve geometria ao pool
   */
  public releaseGeometry(type: string, geometry: THREE.BufferGeometry): void {
    if (!this.geometryPool.has(type)) {
      this.geometryPool.set(type, []);
    }
    
    const pool = this.geometryPool.get(type)!;
    
    if (pool.length < this.poolLimits.geometry) {
      pool.push(geometry);
      console.log(`📥 Geometry returned to pool: ${type}`);
    } else {
      geometry.dispose();
      console.log(`🗑️ Geometry disposed (pool full): ${type}`);
    }
  }
  
  /**
   * Obtém material do pool ou cria novo
   */
  public acquireMaterial(type: string, factory: () => THREE.Material): THREE.Material {
    const pool = this.materialPool.get(type);
    
    if (pool && pool.length > 0) {
      const material = pool.pop()!;
      console.log(`♻️ Reusing material: ${type}`);
      return material;
    }
    
    console.log(`✨ Creating new material: ${type}`);
    return factory();
  }
  
  /**
   * Devolve material ao pool
   */
  public releaseMaterial(type: string, material: THREE.Material): void {
    if (!this.materialPool.has(type)) {
      this.materialPool.set(type, []);
    }
    
    const pool = this.materialPool.get(type)!;
    
    if (pool.length < this.poolLimits.material) {
      pool.push(material);
      console.log(`📥 Material returned to pool: ${type}`);
    } else {
      material.dispose();
      console.log(`🗑️ Material disposed (pool full): ${type}`);
    }
  }
  
  /**
   * Obtém mesh do pool ou cria nova
   */
  public acquireMesh(): THREE.Mesh | null {
    if (this.meshPool.length > 0) {
      const mesh = this.meshPool.pop()!;
      console.log('♻️ Reusing mesh from pool');
      return mesh;
    }
    
    console.log('✨ No mesh available in pool');
    return null;
  }
  
  /**
   * Devolve mesh ao pool
   */
  public releaseMesh(mesh: THREE.Mesh): void {
    // Reseta propriedades da mesh
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    mesh.visible = true;
    
    if (this.meshPool.length < this.poolLimits.mesh) {
      this.meshPool.push(mesh);
      console.log('📥 Mesh returned to pool');
    } else {
      console.log('🗑️ Mesh disposed (pool full)');
    }
  }
  
  /**
   * Cria pool pré-alocado de geometrias comuns
   */
  public preallocateCommonGeometries(): void {
    const geometries: [string, () => THREE.BufferGeometry][] = [
      ['box', () => new THREE.BoxGeometry(1, 1, 1)],
      ['sphere', () => new THREE.SphereGeometry(0.5, 32, 32)],
      ['plane', () => new THREE.PlaneGeometry(1, 1)],
      ['cylinder', () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32)]
    ];
    
    geometries.forEach(([type, factory]) => {
      const pool: THREE.BufferGeometry[] = [];
      
      for (let i = 0; i < 10; i++) {
        pool.push(factory());
      }
      
      this.geometryPool.set(type, pool);
    });
    
    console.log('✅ Pre-allocated common geometries');
  }
  
  /**
   * Cria pool pré-alocado de materiais comuns
   */
  public preallocateCommonMaterials(): void {
    const materials: [string, () => THREE.Material][] = [
      ['standard', () => new THREE.MeshStandardMaterial({ color: 0xffffff })],
      ['basic', () => new THREE.MeshBasicMaterial({ color: 0xffffff })],
      ['lambert', () => new THREE.MeshLambertMaterial({ color: 0xffffff })]
    ];
    
    materials.forEach(([type, factory]) => {
      const pool: THREE.Material[] = [];
      
      for (let i = 0; i < 10; i++) {
        pool.push(factory());
      }
      
      this.materialPool.set(type, pool);
    });
    
    console.log('✅ Pre-allocated common materials');
  }
  
  /**
   * Limpa pool específico
   */
  public clearPool(poolType: 'geometry' | 'material' | 'mesh'): void {
    switch (poolType) {
      case 'geometry':
        this.geometryPool.forEach((pool) => {
          pool.forEach((geometry) => geometry.dispose());
        });
        this.geometryPool.clear();
        console.log('🧹 Geometry pool cleared');
        break;
      
      case 'material':
        this.materialPool.forEach((pool) => {
          pool.forEach((material) => material.dispose());
        });
        this.materialPool.clear();
        console.log('🧹 Material pool cleared');
        break;
      
      case 'mesh':
        this.meshPool = [];
        console.log('🧹 Mesh pool cleared');
        break;
    }
  }
  
  /**
   * Limpa todos os pools
   */
  public clearAll(): void {
    this.clearPool('geometry');
    this.clearPool('material');
    this.clearPool('mesh');
    console.log('🧹 All pools cleared');
  }
  
  /**
   * Retorna estatísticas dos pools
   */
  public getStats(): {
    geometry: { types: number; totalItems: number };
    material: { types: number; totalItems: number };
    mesh: number;
  } {
    let geometryTotal = 0;
    this.geometryPool.forEach((pool) => {
      geometryTotal += pool.length;
    });
    
    let materialTotal = 0;
    this.materialPool.forEach((pool) => {
      materialTotal += pool.length;
    });
    
    return {
      geometry: {
        types: this.geometryPool.size,
        totalItems: geometryTotal
      },
      material: {
        types: this.materialPool.size,
        totalItems: materialTotal
      },
      mesh: this.meshPool.length
    };
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    console.log('📊 Memory Pool Stats:');
    console.log(`   Geometry: ${stats.geometry.totalItems} items (${stats.geometry.types} types)`);
    console.log(`   Material: ${stats.material.totalItems} items (${stats.material.types} types)`);
    console.log(`   Mesh: ${stats.mesh} items`);
  }
}
