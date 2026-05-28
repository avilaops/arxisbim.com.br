import * as THREE from 'three';

/**
 * Material System - Sistema de materiais PBR realistas
 * Biblioteca de materiais otimizados para arquitetura e construção
 */
export class MaterialSystem {
  private materialLibrary: Map<string, THREE.Material> = new Map();
  private textureLoader: THREE.TextureLoader;
  private pmremGenerator: THREE.PMREMGenerator | null = null;

  constructor(renderer?: THREE.WebGLRenderer) {
    this.textureLoader = new THREE.TextureLoader();
    
    if (renderer) {
      this.pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.pmremGenerator.compileEquirectangularShader();
    }

    this.initializeMaterialLibrary();
  }

  /**
   * Inicializa biblioteca de materiais pré-definidos
   */
  private initializeMaterialLibrary(): void {
    // Concreto
    this.materialLibrary.set('concrete', new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.9,
      metalness: 0.0,
      name: 'Concrete'
    }));

    // Vidro
    this.materialLibrary.set('glass', new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.5,
      name: 'Glass'
    }));

    // Aço
    this.materialLibrary.set('steel', new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.4,
      metalness: 1.0,
      name: 'Steel'
    }));

    // Madeira
    this.materialLibrary.set('wood', new THREE.MeshStandardMaterial({
      color: 0x8b6f47,
      roughness: 0.8,
      metalness: 0.0,
      name: 'Wood'
    }));

    // Tijolo
    this.materialLibrary.set('brick', new THREE.MeshStandardMaterial({
      color: 0x9d5c3e,
      roughness: 0.9,
      metalness: 0.0,
      name: 'Brick'
    }));

    // Gesso/Drywall
    this.materialLibrary.set('drywall', new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.7,
      metalness: 0.0,
      name: 'Drywall'
    }));

    // Cerâmica
    this.materialLibrary.set('ceramic', new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.0,
      name: 'Ceramic'
    }));

    // Alumínio
    this.materialLibrary.set('aluminum', new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.3,
      metalness: 0.9,
      name: 'Aluminum'
    }));

    // Pedra
    this.materialLibrary.set('stone', new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.0,
      name: 'Stone'
    }));

    // PVC
    this.materialLibrary.set('pvc', new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.5,
      metalness: 0.0,
      name: 'PVC'
    }));

    console.log(`📦 Material Library inicializada: ${this.materialLibrary.size} materiais`);
  }

  /**
   * Obtém material da biblioteca
   */
  public getMaterial(name: string): THREE.Material | undefined {
    const material = this.materialLibrary.get(name.toLowerCase());
    return material ? material.clone() : undefined;
  }

  /**
   * Cria material PBR customizado
   */
  public createPBRMaterial(params: PBRMaterialParams): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: params.color || 0xffffff,
      roughness: params.roughness ?? 0.5,
      metalness: params.metalness ?? 0.0,
      emissive: params.emissive || 0x000000,
      emissiveIntensity: params.emissiveIntensity ?? 0.0,
      transparent: params.transparent ?? false,
      opacity: params.opacity ?? 1.0,
      side: params.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      name: params.name || 'Custom Material'
    });

    // Carrega texturas se fornecidas
    if (params.map) {
      material.map = this.textureLoader.load(params.map);
      material.map.colorSpace = THREE.SRGBColorSpace;
      this.applyArchitecturalDefaults(material.map);
    }

    if (params.normalMap) {
      material.normalMap = this.textureLoader.load(params.normalMap);
      this.applyArchitecturalDefaults(material.normalMap);
    }

    if (params.roughnessMap) {
      material.roughnessMap = this.textureLoader.load(params.roughnessMap);
      this.applyArchitecturalDefaults(material.roughnessMap);
    }

    if (params.metalnessMap) {
      material.metalnessMap = this.textureLoader.load(params.metalnessMap);
      this.applyArchitecturalDefaults(material.metalnessMap);
    }

    if (params.aoMap) {
      material.aoMap = this.textureLoader.load(params.aoMap);
      this.applyArchitecturalDefaults(material.aoMap);
    }

    return material;
  }

  /**
   * Aplica defaults arquitetônicos a texturas (FIX ENTERPRISE)
   * Essencial para qualidade PBR em BIM
   */
  private applyArchitecturalDefaults(texture: THREE.Texture): void {
    // Repeat wrapping (comum em arquitetura)
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Anisotropic filtering (melhora qualidade em ângulos rasos)
    texture.anisotropy = 16;

    // Minification filter
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }

  /**
   * Cria material vidro físico (Physical Material)
   */
  public createGlassMaterial(
    color: number = 0xffffff,
    transmission: number = 0.9,
    thickness: number = 0.5
  ): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      metalness: 0.0,
      roughness: 0.1,
      transmission: transmission,
      thickness: thickness,
      transparent: true,
      opacity: 0.5,
      envMapIntensity: 1.0,
      name: 'Glass'
    });
  }

  /**
   * Cria material emissor de luz
   */
  public createEmissiveMaterial(
    color: number,
    intensity: number = 1.0
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: color,
      emissiveIntensity: intensity,
      name: 'Emissive'
    });
  }

  /**
   * Aplica material a um objeto
   */
  public applyMaterial(object: THREE.Object3D, materialName: string): void {
    const material = this.getMaterial(materialName);
    
    if (!material) {
      console.warn(`Material '${materialName}' não encontrado na biblioteca`);
      return;
    }

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // CRITICAL FIX: NÃO dispor material antigo (pode ser compartilhado)
        // Dispose só deve acontecer no teardown global (viewer.dispose)
        child.material = material.clone();
      }
    });
  }

  /**
   * Detecta e aplica materiais baseado no tipo de elemento IFC
   */
  public applyMaterialByIFCType(object: THREE.Object3D, ifcType: string): void {
    let materialName = 'concrete'; // Default

    // Mapeamento de tipos IFC para materiais
    const typeMapping: { [key: string]: string } = {
      'IFCWALL': 'concrete',
      'IFCWALLSTANDARDCASE': 'concrete',
      'IFCSLAB': 'concrete',
      'IFCROOF': 'concrete',
      'IFCBEAM': 'steel',
      'IFCCOLUMN': 'concrete',
      'IFCDOOR': 'wood',
      'IFCWINDOW': 'glass',
      'IFCCURTAINWALL': 'glass',
      'IFCPLATE': 'steel',
      'IFCMEMBER': 'steel',
      'IFCRAILING': 'aluminum',
      'IFCSTAIR': 'concrete',
      'IFCSTAIRFLIGHT': 'concrete',
      'IFCRAMP': 'concrete',
      'IFCCOVERING': 'ceramic',
      'IFCFURNISHINGELEMENT': 'wood'
    };

    materialName = typeMapping[ifcType.toUpperCase()] || 'concrete';
    this.applyMaterial(object, materialName);
  }

  /**
   * Lista todos os materiais disponíveis
   */
  public listMaterials(): string[] {
    return Array.from(this.materialLibrary.keys());
  }

  /**
   * Adiciona material customizado à biblioteca
   */
  public addMaterial(name: string, material: THREE.Material): void {
    this.materialLibrary.set(name.toLowerCase(), material);
    console.log(`✅ Material '${name}' adicionado à biblioteca`);
  }

  /**
   * Remove material da biblioteca
   */
  public removeMaterial(name: string): void {
    const material = this.materialLibrary.get(name.toLowerCase());
    if (material) {
      material.dispose();
      this.materialLibrary.delete(name.toLowerCase());
      console.log(`🗑️ Material '${name}' removido da biblioteca`);
    }
  }

  public dispose(): void {
    // Descarta todos os materiais
    this.materialLibrary.forEach((material) => {
      material.dispose();
    });
    this.materialLibrary.clear();

    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
    }
  }
}

// Types
interface PBRMaterialParams {
  color?: number;
  roughness?: number;
  metalness?: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  doubleSided?: boolean;
  name?: string;
  map?: string;
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  aoMap?: string;
}

export type { PBRMaterialParams };
