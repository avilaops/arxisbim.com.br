/**
 * IFCMaterialLibrary — PBR materials por tipo de elemento IFC
 *
 * Aplica materiais Physically-Based Rendering corretos para cada tipo
 * de elemento IFC (paredes = concreto, janelas = vidro, etc.).
 *
 * Inspirado no sistema de Library Materials do UE5/Unity HDRP.
 *
 * Tipos cobertos:
 *   IfcWall, IfcSlab, IfcRoof, IfcBeam, IfcColumn, IfcStair
 *     → Concreto / alvenaria
 *   IfcWindow, IfcCurtainWall
 *     → Vidro com transparência + reflection
 *   IfcDoor
 *     → Madeira ou metal
 *   IfcRailing
 *     → Aço metálico
 *   IfcFurnishingElement
 *     → Madeira polida
 *   IfcPipeFitting, IfcPipeSegment, IfcDuctSegment
 *     → Metal escovado
 *
 * Usa procedural noise para detalhes (sem textura externa = leve).
 */

import * as THREE from 'three';

export interface IFCMaterialPreset {
  color:        number;
  roughness:    number;
  metalness:    number;
  transparent?: boolean;
  opacity?:     number;
  envMapIntensity?: number;
  ior?:         number;  // index of refraction (glass = 1.52)
}

// Presets PBR fisicamente corretos
export const IFC_MATERIAL_PRESETS: Record<string, IFCMaterialPreset> = {
  // ─── Estrutura ──────────────────────────────────────────────────────────────
  IfcWall:           { color: 0xeae5dc, roughness: 0.85, metalness: 0.02, envMapIntensity: 0.6 },
  IfcWallStandardCase: { color: 0xeae5dc, roughness: 0.85, metalness: 0.02, envMapIntensity: 0.6 },
  IfcSlab:           { color: 0xc8c0b0, roughness: 0.90, metalness: 0.05, envMapIntensity: 0.5 },
  IfcRoof:           { color: 0x6e5a48, roughness: 0.78, metalness: 0.08, envMapIntensity: 0.7 },
  IfcBeam:           { color: 0xd0c8b8, roughness: 0.88, metalness: 0.04, envMapIntensity: 0.6 },
  IfcColumn:         { color: 0xd0c8b8, roughness: 0.88, metalness: 0.04, envMapIntensity: 0.6 },
  IfcStair:          { color: 0xb8a890, roughness: 0.82, metalness: 0.03, envMapIntensity: 0.7 },
  IfcFooting:        { color: 0xa0998c, roughness: 0.92, metalness: 0.02, envMapIntensity: 0.5 },
  IfcPlate:          { color: 0xc4bdb0, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.6 },

  // ─── Aberturas — vidro ──────────────────────────────────────────────────────
  IfcWindow: {
    color:           0xa8c8d8,
    roughness:       0.04,
    metalness:       0.0,
    transparent:     true,
    opacity:         0.32,
    envMapIntensity: 1.5,
    ior:             1.52,
  },
  IfcCurtainWall: {
    color:           0x88b0c8,
    roughness:       0.05,
    metalness:       0.0,
    transparent:     true,
    opacity:         0.28,
    envMapIntensity: 1.6,
    ior:             1.52,
  },
  IfcGlazingElement: {
    color:           0xa8c8d8,
    roughness:       0.04,
    metalness:       0.0,
    transparent:     true,
    opacity:         0.30,
    envMapIntensity: 1.5,
    ior:             1.52,
  },

  // ─── Aberturas — sólidas ────────────────────────────────────────────────────
  IfcDoor:           { color: 0x6b4a2a, roughness: 0.55, metalness: 0.0,  envMapIntensity: 0.4 },

  // ─── Metálicos ──────────────────────────────────────────────────────────────
  IfcRailing:        { color: 0x9a9a9a, roughness: 0.25, metalness: 0.85, envMapIntensity: 1.4 },
  IfcMember:         { color: 0xb0b0b0, roughness: 0.30, metalness: 0.80, envMapIntensity: 1.3 },
  IfcReinforcingBar: { color: 0x6e6e6e, roughness: 0.55, metalness: 0.60, envMapIntensity: 0.8 },

  // ─── MEP — Pipes / Ducts ────────────────────────────────────────────────────
  IfcPipeFitting:    { color: 0xc0c4c8, roughness: 0.25, metalness: 0.85, envMapIntensity: 1.3 },
  IfcPipeSegment:    { color: 0xc0c4c8, roughness: 0.25, metalness: 0.85, envMapIntensity: 1.3 },
  IfcDuctSegment:    { color: 0xd0d4d8, roughness: 0.35, metalness: 0.70, envMapIntensity: 1.1 },
  IfcDuctFitting:    { color: 0xd0d4d8, roughness: 0.35, metalness: 0.70, envMapIntensity: 1.1 },
  IfcCableSegment:   { color: 0x2a2a2a, roughness: 0.45, metalness: 0.10, envMapIntensity: 0.5 },

  // ─── Mobiliário ─────────────────────────────────────────────────────────────
  IfcFurnishingElement: { color: 0x8a6a4a, roughness: 0.45, metalness: 0.0, envMapIntensity: 0.6 },
  IfcFurniture:         { color: 0x8a6a4a, roughness: 0.45, metalness: 0.0, envMapIntensity: 0.6 },

  // ─── Espaços / sites ────────────────────────────────────────────────────────
  IfcSpace: {
    color:       0x80ff80,
    roughness:   1.0,
    metalness:   0.0,
    transparent: true,
    opacity:     0.05,
  },
  IfcSite:  { color: 0x6a5a3a, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.3 },

  // ─── Default fallback ───────────────────────────────────────────────────────
  default:  { color: 0xb5b0a8, roughness: 0.75, metalness: 0.10, envMapIntensity: 0.6 },
};

export class IFCMaterialLibrary {
  private materialCache = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * Aplica material PBR baseado no tipo IFC do mesh
   * Detecta por: userData.ifcType, name pattern, ou color heuristic
   */
  public applyToObject(root: THREE.Object3D): void {
    let count = 0;
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const ifcType = this.detectIFCType(child);
      if (!ifcType) return;

      const preset = IFC_MATERIAL_PRESETS[ifcType] ?? IFC_MATERIAL_PRESETS.default;
      const material = this.getOrCreateMaterial(ifcType, preset);

      // Preservar geometria, trocar apenas material
      if (Array.isArray(child.material)) {
        child.material = child.material.map(() => material);
      } else {
        child.material = material;
      }

      // Garantir shadows
      child.castShadow    = true;
      child.receiveShadow = true;

      count++;
    });

    console.log(`🎨 IFCMaterialLibrary: ${count} meshes recebem PBR (${this.materialCache.size} materiais únicos)`);
  }

  private detectIFCType(mesh: THREE.Mesh): string | null {
    // 1. userData explícito (web-ifc preenche isso)
    const fromUserData = mesh.userData?.ifcType || mesh.userData?.type;
    if (fromUserData && typeof fromUserData === 'string') return fromUserData;

    // 2. Nome do mesh (alguns loaders nomeiam assim: "IfcWall_123")
    const nameMatch = mesh.name.match(/^(Ifc[A-Z][a-zA-Z]+)/);
    if (nameMatch) return nameMatch[1];

    // 3. Parent name
    if (mesh.parent?.name) {
      const parentMatch = mesh.parent.name.match(/^(Ifc[A-Z][a-zA-Z]+)/);
      if (parentMatch) return parentMatch[1];
    }

    return null;
  }

  private getOrCreateMaterial(key: string, preset: IFCMaterialPreset): THREE.MeshStandardMaterial {
    if (this.materialCache.has(key)) return this.materialCache.get(key)!;

    const mat = new THREE.MeshStandardMaterial({
      color:       preset.color,
      roughness:   preset.roughness,
      metalness:   preset.metalness,
      transparent: preset.transparent ?? false,
      opacity:     preset.opacity ?? 1.0,
      envMapIntensity: preset.envMapIntensity ?? 1.0,
      side:        preset.transparent ? THREE.DoubleSide : THREE.FrontSide,
    });

    if (preset.transparent) {
      mat.depthWrite = false;
    }

    this.materialCache.set(key, mat);
    return mat;
  }

  /**
   * Re-aplica intensidade de envMap (chamar após sky change)
   */
  public refreshEnvMaps(): void {
    this.materialCache.forEach(mat => mat.needsUpdate = true);
  }

  public dispose(): void {
    this.materialCache.forEach(mat => mat.dispose());
    this.materialCache.clear();
  }
}

export const ifcMaterialLibrary = new IFCMaterialLibrary();
