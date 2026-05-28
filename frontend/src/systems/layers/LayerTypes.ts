import * as THREE from 'three';

/**
 * Tipos de elementos IFC para categorização automática
 */
export enum IFCElementType {
  WALL = 'IFCWALL',
  SLAB = 'IFCSLAB',
  BEAM = 'IFCBEAM',
  COLUMN = 'IFCCOLUMN',
  DOOR = 'IFCDOOR',
  WINDOW = 'IFCWINDOW',
  ROOF = 'IFCROOF',
  STAIR = 'IFCSTAIR',
  RAILING = 'IFCRAILING',
  FURNITURE = 'IFCFURNISHINGELEMENT',
  SPACE = 'IFCSPACE',
  SITE = 'IFCSITE',
  BUILDING = 'IFCBUILDING',
  FLOOR = 'IFCBUILDINGSTOREY',
  OTHER = 'OTHER'
}

/**
 * Modos de mesclagem (inspirado no Photoshop)
 */
export enum BlendMode {
  NORMAL = 'normal',
  MULTIPLY = 'multiply',
  SCREEN = 'screen',
  OVERLAY = 'overlay',
  ADD = 'add'
}

/**
 * Configuração de cor para layers
 */
export interface LayerColor {
  base: THREE.Color;
  emissive?: THREE.Color;
  selected?: THREE.Color;
}

/**
 * Interface principal de Layer
 * Combina características do AutoCAD e Photoshop
 */
export interface ILayer {
  // Identificação
  id: string;
  name: string;
  description?: string;
  
  // Organização (AutoCAD-style)
  type: IFCElementType | string;
  category?: string; // "Arquitetura", "Estrutura", "MEP", etc
  discipline?: string;
  
  // Propriedades visuais (Photoshop-style)
  color: LayerColor;
  opacity: number; // 0-1
  blendMode: BlendMode;
  
  // Controle de estado (AutoCAD-style)
  visible: boolean;
  frozen: boolean; // Não renderiza (economia de performance)
  locked: boolean; // Não editável/selecionável
  isolated: boolean; // Modo isolado (só este layer visível)
  
  // Impressão/Exportação (AutoCAD-style)
  plotable: boolean; // Imprime/exporta
  
  // Hierarquia (Photoshop-style)
  parentId?: string;
  children?: string[];
  expanded?: boolean; // Para grupos
  
  // Objetos 3D
  objects: THREE.Object3D[];
  objectIds: Set<string>; // UUIDs dos objetos
  
  // Metadados
  count: number; // Número de objetos
  created: Date;
  modified: Date;
  
  // Material override
  materialOverride?: THREE.Material;
  
  // Filtros e seleção
  selectable: boolean;
  highlightable: boolean;
}

/**
 * Configuração para criação de layer
 */
export interface LayerConfig {
  name: string;
  type?: IFCElementType | string;
  category?: string;
  color?: THREE.Color | number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  plotable?: boolean;
  parentId?: string;
}

/**
 * Grupo de layers (como pasta no Photoshop)
 */
export interface LayerGroup extends ILayer {
  isGroup: true;
  children: string[];
}

/**
 * Preset de layer (configurações pré-definidas)
 */
export interface LayerPreset {
  name: string;
  description: string;
  layers: LayerConfig[];
}

/**
 * Filtro de layers
 */
export interface LayerFilter {
  types?: IFCElementType[];
  categories?: string[];
  visible?: boolean;
  locked?: boolean;
  searchTerm?: string;
}

/**
 * Estatísticas de layer
 */
export interface LayerStats {
  totalLayers: number;
  visibleLayers: number;
  frozenLayers: number;
  lockedLayers: number;
  totalObjects: number;
  visibleObjects: number;
  byType: Map<IFCElementType | string, number>;
}

/**
 * Evento de mudança de layer
 */
export interface LayerChangeEvent {
  type: 'visibility' | 'opacity' | 'color' | 'lock' | 'freeze' | 'add' | 'remove' | 'modify';
  layerId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
}

/**
 * Configuração de salvamento
 */
export interface LayerConfiguration {
  version: string;
  timestamp: Date;
  layers: ILayer[];
  groups: LayerGroup[];
  activeLayerId?: string;
}

/**
 * LayerDTO - Data Transfer Object para serialização JSON
 * Resolve problema de THREE.Color, Set, Date não serem JSON-serializáveis
 */
export interface LayerDTO {
  id: string;
  name: string;
  description?: string;
  
  // Organização
  type: IFCElementType | string;
  category?: string;
  discipline?: string;
  
  // Propriedades visuais (serializáveis)
  color: {
    base: number;        // hex: 0xFFFFFF
    emissive?: number;
    selected?: number;
  };
  opacity: number;
  blendMode: BlendMode;
  
  // Controle de estado
  visible: boolean;
  frozen: boolean;
  locked: boolean;
  isolated: boolean;
  plotable: boolean;
  
  // Hierarquia
  parentId?: string;
  children?: string[];
  expanded?: boolean;
  
  // Objetos (apenas IDs, não objetos 3D)
  objectIds: string[];
  
  // Metadados (timestamps como epoch)
  count: number;
  createdEpoch: number;
  modifiedEpoch: number;
  
  // Filtros e seleção
  selectable: boolean;
  highlightable: boolean;
}

/**
 * LayerConfigurationDTO - Data Transfer Object para export/import
 */
export interface LayerConfigurationDTO {
  version: string;
  timestampEpoch: number;
  layers: LayerDTO[];
  groups: LayerDTO[];  // Groups também são layers
  activeLayerId?: string;
}

/**
 * Converte ILayer para LayerDTO (serializável)
 */
export function toLayerDTO(layer: ILayer): LayerDTO {
  return {
    id: layer.id,
    name: layer.name,
    description: layer.description,
    type: layer.type,
    category: layer.category,
    discipline: layer.discipline,
    color: {
      base: layer.color.base.getHex(),
      emissive: layer.color.emissive?.getHex(),
      selected: layer.color.selected?.getHex()
    },
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    visible: layer.visible,
    frozen: layer.frozen,
    locked: layer.locked,
    isolated: layer.isolated,
    plotable: layer.plotable,
    parentId: layer.parentId,
    children: layer.children,
    expanded: layer.expanded,
    objectIds: Array.from(layer.objectIds),
    count: layer.count,
    createdEpoch: layer.created.getTime(),
    modifiedEpoch: layer.modified.getTime(),
    selectable: layer.selectable,
    highlightable: layer.highlightable
  };
}

/**
 * Converte LayerDTO para ILayer (rehidrata objetos)
 * Retorna layer sem 'objects' - devem ser re-linkados após carregamento do modelo
 */
export function fromLayerDTO(dto: LayerDTO): Omit<ILayer, 'objects'> {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    type: dto.type,
    category: dto.category,
    discipline: dto.discipline,
    color: {
      base: new THREE.Color(dto.color.base),
      emissive: dto.color.emissive ? new THREE.Color(dto.color.emissive) : new THREE.Color(0x000000),
      selected: dto.color.selected ? new THREE.Color(dto.color.selected) : new THREE.Color(0x00ff88)
    },
    opacity: dto.opacity,
    blendMode: dto.blendMode,
    visible: dto.visible,
    frozen: dto.frozen,
    locked: dto.locked,
    isolated: dto.isolated,
    plotable: dto.plotable,
    parentId: dto.parentId,
    children: dto.children,
    expanded: dto.expanded,
    objectIds: new Set(dto.objectIds),
    count: dto.count,
    created: new Date(dto.createdEpoch),
    modified: new Date(dto.modifiedEpoch),
    selectable: dto.selectable,
    highlightable: dto.highlightable
  };
}
