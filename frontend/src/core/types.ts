/**
 * Tipos compartilhados do ArxisVR
 */

export enum NavigationMode {
  FLY = 'FLY',
  WALK = 'WALK',
  VR = 'VR'
}

export enum ToolType {
  NONE = 'NONE',
  SELECTION = 'SELECTION',
  MEASUREMENT = 'MEASUREMENT',
  CUT = 'CUT',
  ANNOTATION = 'ANNOTATION',
  NAVIGATION = 'NAVIGATION',
  LAYER = 'LAYER'
}

export enum RenderQuality {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  ULTRA = 'ULTRA'
}

/**
 * Tipos de elementos IFC mais comuns
 */
export enum IFCElementType {
  WALL = 'IFCWALL',
  SLAB = 'IFCSLAB',
  BEAM = 'IFCBEAM',
  COLUMN = 'IFCCOLUMN',
  DOOR = 'IFCDOOR',
  WINDOW = 'IFCWINDOW',
  STAIR = 'IFCSTAIR',
  ROOF = 'IFCROOF',
  RAILING = 'IFCRAILING',
  CURTAIN_WALL = 'IFCCURTAINWALL',
  COVERING = 'IFCCOVERING',
  FOOTING = 'IFCFOOTING',
  PILE = 'IFCPILE',
  SPACE = 'IFCSPACE',
  FURNITURE = 'IFCFURNISHINGELEMENT',
  BUILDING = 'IFCBUILDING',
  STOREY = 'IFCBUILDINGSTOREY',
  SITE = 'IFCSITE',
  OTHER = 'IFCBUILDINGELEMENTPROXY'
}

export interface IFCProperty {
  name: string;
  value: string | number | boolean;
}

/**
 * Propriedades BIM avançadas para elementos IFC
 */
export interface BIMProperties {
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    volume?: number;
    area?: number;
  };
  material?: string;
  ifcType?: IFCElementType;
  customProperties: Record<string, any>;
  structural?: {
    isLoadBearing?: boolean;
    loadCapacity?: number;
  };
  thermal?: {
    thermalTransmittance?: number;
    thermalResistance?: number;
  };
  cost?: {
    unitCost?: number;
    totalCost?: number;
    currency?: string;
  };
  scheduling?: {
    startDate?: string;
    endDate?: string;
    duration?: number;
  };
}

export interface IFCElement {
  expressID: number;
  type: string;
  globalId: string;
  name: string;
  properties: IFCProperty[];
  bimProperties?: BIMProperties;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: string;
  opacity: number;
}

export interface ProjectContext {
  projectName: string;
  projectPath: string;
  modelLoaded: boolean;
  modelName: string;
}

export interface UserSession {
  userId?: string;
  userName?: string;
  isAuthenticated: boolean;
}

export interface GraphicsSettings {
  quality: RenderQuality;
  shadowsEnabled: boolean;
  antialiasing: boolean;
  ambient: number;
  exposure: number;
  maxPixelRatio: number;
}
