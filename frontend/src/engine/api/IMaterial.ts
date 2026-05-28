/**
 * Interface abstrata para Material
 * Implementações: ThreeMaterialAdapter, AvxMaterialAdapter
 */

export interface IMaterial {
  /**
   * Tipo do material
   */
  type: MaterialType;

  /**
   * Cor do material (hex)
   */
  color?: number;

  /**
   * Opacidade
   */
  opacity: number;

  /**
   * Transparência
   */
  transparent: boolean;

  /**
   * Side rendering
   */
  side: MaterialSide;

  /**
   * Wireframe
   */
  wireframe: boolean;

  /**
   * Depth test
   */
  depthTest: boolean;

  /**
   * Depth write
   */
  depthWrite: boolean;

  /**
   * Retorna implementação nativa
   */
  getNativeMaterial(): any;

  /**
   * Clona material
   */
  clone(): IMaterial;

  /**
   * Limpa recursos
   */
  dispose(): void;
}

export enum MaterialType {
  Basic = 'MeshBasicMaterial',
  Standard = 'MeshStandardMaterial',
  Physical = 'MeshPhysicalMaterial',
  Lambert = 'MeshLambertMaterial',
  Phong = 'MeshPhongMaterial',
  Line = 'LineBasicMaterial',
  Points = 'PointsMaterial'
}

export enum MaterialSide {
  Front = 0,
  Back = 1,
  Double = 2
}

export interface IStandardMaterial extends IMaterial {
  metalness: number;
  roughness: number;
  emissive: number;
  emissiveIntensity: number;
}

export interface IPhysicalMaterial extends IStandardMaterial {
  clearcoat: number;
  clearcoatRoughness: number;
  transmission: number;
  thickness: number;
}

export interface IMaterialFactory {
  /**
   * Cria material básico
   */
  createBasic(options: {
    color?: number;
    opacity?: number;
    transparent?: boolean;
  }): IMaterial;

  /**
   * Cria material standard
   */
  createStandard(options: {
    color?: number;
    metalness?: number;
    roughness?: number;
    opacity?: number;
  }): IStandardMaterial;

  /**
   * Cria material físico
   */
  createPhysical(options: {
    color?: number;
    metalness?: number;
    roughness?: number;
    clearcoat?: number;
    transmission?: number;
  }): IPhysicalMaterial;
}
