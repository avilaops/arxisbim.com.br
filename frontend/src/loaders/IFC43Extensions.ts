/**
 * IFC 4.3 Extended Support
 * Suporte expandido para IFC4.3 (buildingSMART)
 * Adiciona novos tipos, propriedades e relacionamentos do IFC4.3
 */

import * as THREE from 'three';

// ============================================================================
// Novos tipos IFC 4.3
// ============================================================================

export const IFC43_NEW_TYPES = [
  // Infrastructure
  'IfcAlignment',
  'IfcAlignmentHorizontal',
  'IfcAlignmentVertical',
  'IfcAlignmentCant',
  'IfcAlignmentSegment',
  'IfcLinearElement',
  'IfcLinearPositioningElement',
  'IfcReferent',
  
  // Ports and Systems
  'IfcDistributionBoard',
  'IfcDistributionBoardType',
  'IfcDistributionCircuit',
  'IfcElectricDistributionBoard',
  'IfcElectricDistributionBoardType',
  
  // Building Elements
  'IfcBearing',
  'IfcBearingType',
  'IfcBuildingElementPart',
  'IfcBuildingElementPartType',
  'IfcDeepFoundation',
  'IfcDeepFoundationType',
  'IfcKerb',
  'IfcKerbType',
  'IfcPavement',
  'IfcPavementType',
  'IfcMooringDevice',
  'IfcMooringDeviceType',
  'IfcNavigationElement',
  'IfcNavigationElementType',
  'IfcRail',
  'IfcRailType',
  'IfcRailway',
  'IfcRoad',
  'IfcTrackElement',
  'IfcTrackElementType',
  
  // Geotechnical
  'IfcGeomodel',
  'IfcGeoslice',
  'IfcSolidStratum',
  'IfcVoidStratum',
  'IfcWaterStratum',
  
  // Impact Protection
  'IfcImpactProtectionDevice',
  'IfcImpactProtectionDeviceType',
  
  // Sign and Signal
  'IfcSign',
  'IfcSignType',
  'IfcSignal',
  'IfcSignalType',
  
  // Courses
  'IfcCourse',
  'IfcCourseType',
  
  // Linear Positioning
  'IfcLinearPlacement',
  'IfcLinearSpanPlacement',
  'IfcPointByDistanceExpression'
];

export const IFC43_INFRASTRUCTURE_TYPES = [
  'IfcBridge',
  'IfcBridgePart',
  'IfcMarineFacility',
  'IfcMarinePart',
  'IfcRailway',
  'IfcRoad',
  'IfcTunnel',
  'IfcTunnelPart'
];

// ============================================================================
// IFC 4.3 Property Sets
// ============================================================================

export interface IFC43PropertySet {
  name: string;
  description: string;
  applicableEntities: string[];
  properties: IFC43Property[];
}

export interface IFC43Property {
  name: string;
  description: string;
  dataType: string;
  unit?: string;
  required?: boolean;
}

export const IFC43_PROPERTY_SETS: IFC43PropertySet[] = [
  {
    name: 'Pset_AlignmentCommon',
    description: 'Common properties for alignment',
    applicableEntities: ['IfcAlignment'],
    properties: [
      { name: 'Reference', description: 'Reference designation', dataType: 'IfcLabel' },
      { name: 'IsMainAlignment', description: 'Main alignment flag', dataType: 'IfcBoolean' },
      { name: 'LinearElementTag', description: 'Tag for linear element', dataType: 'IfcLabel' },
      { name: 'DesignSpeed', description: 'Design speed', dataType: 'IfcLinearVelocityMeasure', unit: 'm/s' }
    ]
  },
  {
    name: 'Pset_RailwayCommon',
    description: 'Common properties for railway',
    applicableEntities: ['IfcRailway'],
    properties: [
      { name: 'Reference', description: 'Railway reference', dataType: 'IfcLabel' },
      { name: 'TrackGauge', description: 'Track gauge', dataType: 'IfcPositiveLengthMeasure', unit: 'mm' },
      { name: 'MaxTrainSpeed', description: 'Maximum train speed', dataType: 'IfcLinearVelocityMeasure', unit: 'km/h' },
      { name: 'Electrified', description: 'Electrification status', dataType: 'IfcBoolean' },
      { name: 'VoltageType', description: 'Voltage type (AC/DC)', dataType: 'IfcLabel' }
    ]
  },
  {
    name: 'Pset_RoadCommon',
    description: 'Common properties for road',
    applicableEntities: ['IfcRoad'],
    properties: [
      { name: 'Reference', description: 'Road reference', dataType: 'IfcLabel' },
      { name: 'RoadClass', description: 'Road classification', dataType: 'IfcLabel' },
      { name: 'NumberOfLanes', description: 'Number of lanes', dataType: 'IfcCountMeasure' },
      { name: 'DesignSpeed', description: 'Design speed', dataType: 'IfcLinearVelocityMeasure', unit: 'km/h' },
      { name: 'SurfaceType', description: 'Surface type', dataType: 'IfcLabel' }
    ]
  },
  {
    name: 'Pset_BridgeCommon',
    description: 'Common properties for bridge',
    applicableEntities: ['IfcBridge'],
    properties: [
      { name: 'Reference', description: 'Bridge reference', dataType: 'IfcLabel' },
      { name: 'BridgeType', description: 'Type of bridge', dataType: 'IfcLabel' },
      { name: 'SpanLength', description: 'Main span length', dataType: 'IfcPositiveLengthMeasure', unit: 'm' },
      { name: 'NumberOfSpans', description: 'Number of spans', dataType: 'IfcCountMeasure' },
      { name: 'DesignLoad', description: 'Design load', dataType: 'IfcForceMeasure', unit: 'kN' }
    ]
  },
  {
    name: 'Pset_GeotechnicalAssemblyCommon',
    description: 'Geotechnical assembly properties',
    applicableEntities: ['IfcGeomodel', 'IfcGeoslice'],
    properties: [
      { name: 'SoilType', description: 'Type of soil', dataType: 'IfcLabel' },
      { name: 'Density', description: 'Soil density', dataType: 'IfcMassDensityMeasure', unit: 'kg/m³' },
      { name: 'Porosity', description: 'Porosity', dataType: 'IfcNormalisedRatioMeasure' },
      { name: 'Permeability', description: 'Permeability', dataType: 'IfcReal', unit: 'm/s' },
      { name: 'FrictionAngle', description: 'Internal friction angle', dataType: 'IfcPlaneAngleMeasure', unit: '°' }
    ]
  },
  {
    name: 'Pset_SignalCommon',
    description: 'Common signal properties',
    applicableEntities: ['IfcSignal'],
    properties: [
      { name: 'SignalType', description: 'Type of signal', dataType: 'IfcLabel' },
      { name: 'SignalFunction', description: 'Signal function', dataType: 'IfcLabel' },
      { name: 'MountingHeight', description: 'Mounting height', dataType: 'IfcPositiveLengthMeasure', unit: 'm' },
      { name: 'LampType', description: 'Lamp type', dataType: 'IfcLabel' },
      { name: 'PowerConsumption', description: 'Power consumption', dataType: 'IfcPowerMeasure', unit: 'W' }
    ]
  }
];

// ============================================================================
// IFC 4.3 Alignment System
// ============================================================================

export interface AlignmentSegment {
  type: 'line' | 'circular' | 'clothoid' | 'cubic' | 'transition';
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  startDirection?: THREE.Vector3;
  endDirection?: THREE.Vector3;
  radius?: number; // para circular/clothoid
  length: number;
  startCurvature?: number;
  endCurvature?: number;
}

export interface AlignmentHorizontal {
  segments: AlignmentSegment[];
  totalLength: number;
}

export interface AlignmentVertical {
  segments: AlignmentSegment[];
  totalLength: number;
}

export interface AlignmentCant {
  segments: { station: number; cant: number }[];
}

export class IFC43AlignmentSystem {
  private alignments: Map<string, {
    horizontal?: AlignmentHorizontal;
    vertical?: AlignmentVertical;
    cant?: AlignmentCant;
    referencePoint: THREE.Vector3;
  }> = new Map();

  constructor() {
    console.log('🛤️ IFC 4.3 Alignment System initialized');
  }

  /**
   * Cria alignment a partir de dados IFC
   */
  public createAlignment(
    id: string,
    referencePoint: THREE.Vector3
  ): void {
    this.alignments.set(id, {
      referencePoint,
      horizontal: undefined,
      vertical: undefined,
      cant: undefined
    });
  }

  /**
   * Define alignment horizontal
   */
  public setHorizontalAlignment(
    id: string,
    segments: AlignmentSegment[]
  ): void {
    const alignment = this.alignments.get(id);
    if (!alignment) return;

    const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
    
    alignment.horizontal = {
      segments,
      totalLength
    };

    console.log(`🛤️ Horizontal alignment set: ${id} (${totalLength.toFixed(2)}m)`);
  }

  /**
   * Define alignment vertical
   */
  public setVerticalAlignment(
    id: string,
    segments: AlignmentSegment[]
  ): void {
    const alignment = this.alignments.get(id);
    if (!alignment) return;

    const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);
    
    alignment.vertical = {
      segments,
      totalLength
    };

    console.log(`🛤️ Vertical alignment set: ${id} (${totalLength.toFixed(2)}m)`);
  }

  /**
   * Calcula ponto no alignment por distância (station)
   */
  public getPointAtStation(
    id: string,
    station: number
  ): { point: THREE.Vector3; direction: THREE.Vector3; cant: number } | null {
    const alignment = this.alignments.get(id);
    if (!alignment || !alignment.horizontal) return null;

    // Find segment
    let currentStation = 0;
    let segment: AlignmentSegment | null = null;
    let segmentStartStation = 0;

    for (const seg of alignment.horizontal.segments) {
      if (station >= currentStation && station <= currentStation + seg.length) {
        segment = seg;
        segmentStartStation = currentStation;
        break;
      }
      currentStation += seg.length;
    }

    if (!segment) return null;

    // Calcula posição no segmento
    const t = (station - segmentStartStation) / segment.length;
    const point = new THREE.Vector3().lerpVectors(
      segment.startPoint,
      segment.endPoint,
      t
    );

    // Direção
    const direction = new THREE.Vector3()
      .subVectors(segment.endPoint, segment.startPoint)
      .normalize();

    // Cant (superelevação)
    let cant = 0;
    if (alignment.cant) {
      // Interpola cant
      for (let i = 0; i < alignment.cant.segments.length - 1; i++) {
        const curr = alignment.cant.segments[i];
        const next = alignment.cant.segments[i + 1];
        
        if (station >= curr.station && station <= next.station) {
          const cantT = (station - curr.station) / (next.station - curr.station);
          cant = curr.cant + (next.cant - curr.cant) * cantT;
          break;
        }
      }
    }

    // Aplica vertical alignment
    if (alignment.vertical) {
      // TODO: Aplicar perfil vertical
    }

    return { point, direction, cant };
  }

  /**
   * Gera geometria de visualização do alignment
   */
  public generateAlignmentGeometry(
    id: string,
    step: number = 1.0
  ): THREE.BufferGeometry | null {
    const alignment = this.alignments.get(id);
    if (!alignment || !alignment.horizontal) return null;

    const points: THREE.Vector3[] = [];
    const totalLength = alignment.horizontal.totalLength;

    for (let station = 0; station <= totalLength; station += step) {
      const result = this.getPointAtStation(id, station);
      if (result) {
        points.push(result.point.clone());
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }

  /**
   * Lista todos os alignments
   */
  public listAlignments(): string[] {
    return Array.from(this.alignments.keys());
  }
}

// ============================================================================
// IFC 4.3 Infrastructure Loader Extension
// ============================================================================

export class IFC43InfrastructureLoader {
  private alignmentSystem: IFC43AlignmentSystem;

  constructor() {
    this.alignmentSystem = new IFC43AlignmentSystem();
    console.log('🏗️ IFC 4.3 Infrastructure Loader initialized');
  }

  /**
   * Processa entidades IFC 4.3
   */
  public processIFC43Entity(
    entity: any,
    scene: THREE.Scene
  ): THREE.Object3D | null {
    const type = entity.type;

    switch (type) {
      case 'IfcAlignment':
        return this.processAlignment(entity, scene);
      
      case 'IfcRailway':
        return this.processRailway(entity, scene);
      
      case 'IfcRoad':
        return this.processRoad(entity, scene);
      
      case 'IfcBridge':
        return this.processBridge(entity, scene);
      
      case 'IfcGeomodel':
        return this.processGeomodel(entity, scene);
      
      case 'IfcSignal':
        return this.processSignal(entity, scene);
      
      default:
        return null;
    }
  }

  /**
   * Processa IfcAlignment
   */
  private processAlignment(entity: any, scene: THREE.Scene): THREE.Object3D {
    const group = new THREE.Group();
    group.name = entity.Name?.value || 'Alignment';
    group.userData.ifcType = 'IfcAlignment';
    group.userData.ifcGuid = entity.GlobalId?.value;

    // Cria alignment no sistema
    const referencePoint = new THREE.Vector3(0, 0, 0);
    this.alignmentSystem.createAlignment(entity.GlobalId?.value, referencePoint);

    // Processa horizontal alignment
    if (entity.Axis?.AlignmentHorizontal) {
      const segments = this.extractHorizontalSegments(entity.Axis.AlignmentHorizontal);
      this.alignmentSystem.setHorizontalAlignment(entity.GlobalId.value, segments);
    }

    // Processa vertical alignment
    if (entity.Axis?.AlignmentVertical) {
      const segments = this.extractVerticalSegments(entity.Axis.AlignmentVertical);
      this.alignmentSystem.setVerticalAlignment(entity.GlobalId.value, segments);
    }

    // Gera visualização
    const geometry = this.alignmentSystem.generateAlignmentGeometry(
      entity.GlobalId.value,
      1.0
    );

    if (geometry) {
      const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      group.add(line);
    }

    scene.add(group);
    console.log(`🛤️ Processed IfcAlignment: ${group.name}`);
    
    return group;
  }

  /**
   * Extrai segmentos horizontais
   */
  private extractHorizontalSegments(horizontal: any): AlignmentSegment[] {
    const segments: AlignmentSegment[] = [];
    
    // TODO: Parse IFC alignment segments
    // Por enquanto, retorna exemplo
    
    return segments;
  }

  /**
   * Extrai segmentos verticais
   */
  private extractVerticalSegments(vertical: any): AlignmentSegment[] {
    const segments: AlignmentSegment[] = [];
    
    // TODO: Parse IFC vertical alignment
    
    return segments;
  }

  /**
   * Processa IfcRailway
   */
  private processRailway(entity: any, scene: THREE.Scene): THREE.Object3D {
    const group = new THREE.Group();
    group.name = entity.Name?.value || 'Railway';
    group.userData.ifcType = 'IfcRailway';
    group.userData.ifcGuid = entity.GlobalId?.value;

    // Adiciona propriedades específicas
    group.userData.properties = {
      trackGauge: entity.TrackGauge?.value,
      electrified: entity.Electrified?.value
    };

    scene.add(group);
    return group;
  }

  /**
   * Processa IfcRoad
   */
  private processRoad(entity: any, scene: THREE.Scene): THREE.Object3D {
    const group = new THREE.Group();
    group.name = entity.Name?.value || 'Road';
    group.userData.ifcType = 'IfcRoad';
    group.userData.ifcGuid = entity.GlobalId?.value;

    scene.add(group);
    return group;
  }

  /**
   * Processa IfcBridge
   */
  private processBridge(entity: any, scene: THREE.Scene): THREE.Object3D {
    const group = new THREE.Group();
    group.name = entity.Name?.value || 'Bridge';
    group.userData.ifcType = 'IfcBridge';
    group.userData.ifcGuid = entity.GlobalId?.value;

    scene.add(group);
    return group;
  }

  /**
   * Processa IfcGeomodel (modelo geotécnico)
   */
  private processGeomodel(entity: any, scene: THREE.Scene): THREE.Object3D {
    const group = new THREE.Group();
    group.name = entity.Name?.value || 'Geomodel';
    group.userData.ifcType = 'IfcGeomodel';
    group.userData.ifcGuid = entity.GlobalId?.value;

    scene.add(group);
    return group;
  }

  /**
   * Processa IfcSignal (sinalização)
   */
  private processSignal(entity: any, scene: THREE.Scene): THREE.Object3D {
    const group = new THREE.Group();
    group.name = entity.Name?.value || 'Signal';
    group.userData.ifcType = 'IfcSignal';
    group.userData.ifcGuid = entity.GlobalId?.value;

    // Cria representação visual simples
    const geometry = new THREE.BoxGeometry(0.5, 2, 0.1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    scene.add(group);
    return group;
  }

  /**
   * Retorna sistema de alignment
   */
  public getAlignmentSystem(): IFC43AlignmentSystem {
    return this.alignmentSystem;
  }
}

// Singleton instances
export const ifc43AlignmentSystem = new IFC43AlignmentSystem();
export const ifc43InfrastructureLoader = new IFC43InfrastructureLoader();
