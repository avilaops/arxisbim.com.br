import * as THREE from 'three';
import { getProjectsService, type TypeInfo } from '../api/v1/services/projects.service';

export const DEFAULT_TYPE_MAP: Record<string, TypeInfo> = {
  // estrutural
  IfcColumn: { category: 'structural', label: 'Pilar', color: '#8B7355' },
  IfcBeam: { category: 'structural', label: 'Viga', color: '#A0855B' },
  IfcSlab: { category: 'structural', label: 'Laje', color: '#B8A88A' },
  IfcFooting: { category: 'structural', label: 'Fundação', color: '#6B5B45' },
  IfcPile: { category: 'structural', label: 'Estaca', color: '#5B4D3A' },
  IfcMember: { category: 'structural', label: 'Membro', color: '#9C8463' },
  IfcPlate: { category: 'structural', label: 'Placa', color: '#AD9670' },
  IfcReinforcingBar: { category: 'structural', label: 'Armadura', color: '#7A6A50' },
  // arquitetônico
  IfcWall: { category: 'architectural', label: 'Parede', color: '#D4C5A9' },
  IfcWallStandardCase: { category: 'architectural', label: 'Parede', color: '#D4C5A9' },
  IfcDoor: { category: 'architectural', label: 'Porta', color: '#8B4513' },
  IfcWindow: { category: 'architectural', label: 'Janela', color: '#87CEEB' },
  IfcStair: { category: 'architectural', label: 'Escada', color: '#C8B99C' },
  IfcStairFlight: { category: 'architectural', label: 'Lance de escada', color: '#C8B99C' },
  IfcRamp: { category: 'architectural', label: 'Rampa', color: '#C8B99C' },
  IfcRailing: { category: 'architectural', label: 'Guarda-corpo', color: '#B0A080' },
  IfcRoof: { category: 'architectural', label: 'Cobertura', color: '#A52A2A' },
  IfcCovering: { category: 'architectural', label: 'Revestimento', color: '#CDBA96' },
  IfcCurtainWall: { category: 'architectural', label: 'Fachada cortina', color: '#9FB6CD' },
  // MEP
  IfcPipeSegment: { category: 'mep', label: 'Tubulação', color: '#4169E1' },
  IfcDuctSegment: { category: 'mep', label: 'Duto', color: '#20B2AA' },
  IfcCableCarrierSegment: { category: 'mep', label: 'Eletrocalha', color: '#FFD700' },
  IfcCableSegment: { category: 'mep', label: 'Cabo', color: '#DAA520' },
  IfcFlowSegment: { category: 'mep', label: 'Fluxo', color: '#5F9EA0' },
  IfcFlowFitting: { category: 'mep', label: 'Conexão', color: '#48A0A0' },
  IfcFlowTerminal: { category: 'mep', label: 'Terminal', color: '#3CB0A0' },
  IfcFlowController: { category: 'mep', label: 'Controlador', color: '#2EA08C' },
  // mobiliário / terreno
  IfcFurnishingElement: { category: 'furniture', label: 'Mobiliário', color: '#DEB887' },
  IfcFurniture: { category: 'furniture', label: 'Mobiliário', color: '#DEB887' },
  IfcSystemFurnitureElement: { category: 'furniture', label: 'Mobiliário', color: '#DEB887' },
  IfcSite: { category: 'site', label: 'Terreno', color: '#228B22' },
  IfcEarthworksFill: { category: 'site', label: 'Aterro', color: '#6B8E23' },
  IfcGeographicElement: { category: 'site', label: 'Geográfico', color: '#2E8B57' },
};

export const UNMAPPED: TypeInfo = { category: 'other', label: 'Outro', color: '#9CA3AF' };

export class TypeColorizer {
  private currentTypeMap: Record<string, TypeInfo> = { ...DEFAULT_TYPE_MAP };
  private materialCache = new Map<string, THREE.MeshStandardMaterial>();
  private onTypeMapChangedCallbacks = new Set<(map: Record<string, TypeInfo>) => void>();

  public getTypeMap(): Record<string, TypeInfo> {
    return this.currentTypeMap;
  }

  public registerOnTypeMapChanged(cb: (map: Record<string, TypeInfo>) => void): () => void {
    this.onTypeMapChangedCallbacks.add(cb);
    return () => {
      this.onTypeMapChangedCallbacks.delete(cb);
    };
  }

  private notifyTypeMapChanged(): void {
    for (const cb of this.onTypeMapChangedCallbacks) {
      try {
        cb(this.currentTypeMap);
      } catch (err) {
        console.error('Error in onTypeMapChanged callback:', err);
      }
    }
  }

  /**
   * Carrega o type map do projeto do backend
   */
  public async loadForProject(projectId: string): Promise<Record<string, TypeInfo>> {
    if (!projectId) {
      this.currentTypeMap = { ...DEFAULT_TYPE_MAP };
      this.clearCache();
      this.notifyTypeMapChanged();
      return this.currentTypeMap;
    }
    try {
      const projectsService = getProjectsService();
      const res = await projectsService.getTypeMap(projectId);
      if (res && res.map) {
        // Garantir que as chaves do map do backend sejam mapeadas corretamente
        const newMap: Record<string, TypeInfo> = {};
        // Primeiro carregar os defaults
        for (const [k, v] of Object.entries(DEFAULT_TYPE_MAP)) {
          newMap[k] = v;
        }
        // Aplicar overrides do backend
        for (const [k, v] of Object.entries(res.map)) {
          newMap[k] = v;
        }
        this.currentTypeMap = newMap;
        this.clearCache();
        this.notifyTypeMapChanged();
        console.log(`🎨 TypeColorizer: Loaded type map override for project ${projectId}`);
      }
    } catch (err: any) {
      if (!err?.message?.includes('not found') && !err?.message?.includes('404')) {
        console.warn(`🎨 TypeColorizer: Failed to load type map for project ${projectId}. Using defaults.`, err);
      }
      this.currentTypeMap = { ...DEFAULT_TYPE_MAP };
      this.clearCache();
      this.notifyTypeMapChanged();
    }
    return this.currentTypeMap;
  }

  /**
   * Limpa cache de materiais para forçar nova pintura
   */
  public clearCache(): void {
    this.materialCache.forEach(mat => mat.dispose());
    this.materialCache.clear();
  }

  /**
   * Aplica cores por categoria no modelo Three.js baseado no type map atual
   */
  public applyColorizer(root: THREE.Object3D): void {
    let count = 0;
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const ifcType = this.detectIFCType(child);
      if (!ifcType) return;

      const info = this.getTypeInfo(ifcType);
      const material = this.getOrCreateMaterial(ifcType, info);

      if (Array.isArray(child.material)) {
        child.material = child.material.map(() => material);
      } else {
        child.material = material;
      }

      child.castShadow = true;
      child.receiveShadow = true;
      count++;
    });

    console.log(`🎨 TypeColorizer: Colored ${count} meshes by category classification`);
  }

  private detectIFCType(mesh: THREE.Mesh): string | null {
    const fromUserData = mesh.userData?.ifcType || mesh.userData?.type;
    if (fromUserData && typeof fromUserData === 'string') return fromUserData;

    const nameMatch = mesh.name.match(/^(Ifc[A-Z][a-zA-Z]+)/);
    if (nameMatch) return nameMatch[1];

    if (mesh.parent?.name) {
      const parentMatch = mesh.parent.name.match(/^(Ifc[A-Z][a-zA-Z]+)/);
      if (parentMatch) return parentMatch[1];
    }

    return null;
  }

  public getTypeInfo(ifcType: string): TypeInfo {
    // Lookup case-insensitive
    const key = ifcType.toLowerCase();
    const mapKey = Object.keys(this.currentTypeMap).find(k => k.toLowerCase() === key);
    if (mapKey) {
      return this.currentTypeMap[mapKey];
    }
    return UNMAPPED;
  }

  private getOrCreateMaterial(key: string, info: TypeInfo): THREE.MeshStandardMaterial {
    const cacheKey = `${info.category}-${info.color}`;
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const isGlass = key.toLowerCase().includes('window') || key.toLowerCase().includes('curtainwall') || key.toLowerCase().includes('glazing');
    
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(info.color),
      roughness: isGlass ? 0.05 : 0.6,
      metalness: isGlass ? 0.0 : 0.1,
      transparent: isGlass,
      opacity: isGlass ? 0.32 : 1.0,
      side: isGlass ? THREE.DoubleSide : THREE.FrontSide,
    });

    if (isGlass) {
      mat.depthWrite = false;
    }

    this.materialCache.set(cacheKey, mat);
    return mat;
  }
}

export const typeColorizer = new TypeColorizer();
