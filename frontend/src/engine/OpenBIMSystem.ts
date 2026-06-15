/**
 * OpenBIM Compliance System
 * Suporte completo para padrões OpenBIM:
 * - BCF (BIM Collaboration Format) 2.1 e 3.0
 * - COBie (Construction Operations Building information exchange)
 * - IDS (Information Delivery Specification)
 * - ISO 19650 (Information Management)
 */



// ============================================================================
// BCF (BIM Collaboration Format)
// ============================================================================

export interface BCFTopic {
  guid: string;
  title: string;
  description?: string;
  author: string;
  creationDate: Date;
  modifiedDate?: Date;
  modifiedAuthor?: string;
  priority?: 'Low' | 'Normal' | 'High' | 'Critical';
  status?: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
  topicType?: string;
  stage?: string;
  labels?: string[];
  assignedTo?: string;
  dueDate?: Date;
  relatedTopics?: string[];
  referenceLinks?: string[];
  comments?: BCFComment[];
  viewpoints?: BCFViewpoint[];
}

export interface BCFComment {
  guid: string;
  date: Date;
  author: string;
  comment: string;
  modifiedDate?: Date;
  modifiedAuthor?: string;
  viewpointGuid?: string;
}

export interface BCFViewpoint {
  guid: string;
  title?: string;
  snapshot?: string; // base64 image
  index?: number;
  camera?: BCFCamera;
  components?: BCFComponents;
  clippingPlanes?: BCFClippingPlane[];
  lines?: BCFLine[];
  bitmaps?: BCFBitmap[];
}

export interface BCFCamera {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  upVector: THREE.Vector3;
  fieldOfView?: number; // perspective
  aspectRatio?: number; // perspective
  orthogonalScale?: number; // orthogonal
}

export interface BCFComponents {
  selection?: BCFComponent[];
  visibility?: {
    defaultVisibility: boolean;
    exceptions?: BCFComponent[];
  };
  coloring?: BCFColoring[];
}

export interface BCFComponent {
  ifcGuid: string;
  originatingSystem?: string;
  authoringToolId?: string;
}

export interface BCFColoring {
  color: string; // hex
  components: BCFComponent[];
}

export interface BCFClippingPlane {
  location: THREE.Vector3;
  direction: THREE.Vector3;
}

export interface BCFLine {
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
}

export interface BCFBitmap {
  guid: string;
  bitmapType: 'PNG' | 'JPG';
  location: THREE.Vector3;
  normal: THREE.Vector3;
  up: THREE.Vector3;
  height: number;
  reference: string; // base64 or URL
}

export class BCFManager {
  private topics: Map<string, BCFTopic> = new Map();
  private version: '2.1' | '3.0' = '3.0';

  constructor() {
    console.log('📋 BCF Manager initialized (version 3.0)');
  }

  /**
   * Cria novo topic BCF
   */
  public createTopic(data: Partial<BCFTopic>): BCFTopic {
    const topic: BCFTopic = {
      guid: this.generateGuid(),
      title: data.title || 'Untitled',
      description: data.description,
      author: data.author || 'Unknown',
      creationDate: new Date(),
      priority: data.priority || 'Normal',
      status: data.status || 'Open',
      topicType: data.topicType,
      stage: data.stage,
      labels: data.labels || [],
      comments: [],
      viewpoints: []
    };

    this.topics.set(topic.guid, topic);
    console.log(`📋 BCF Topic created: ${topic.guid} - ${topic.title}`);
    
    return topic;
  }

  /**
   * Adiciona comentário a um topic
   */
  public addComment(
    topicGuid: string,
    author: string,
    comment: string,
    viewpointGuid?: string
  ): BCFComment | null {
    const topic = this.topics.get(topicGuid);
    if (!topic) return null;

    const bcfComment: BCFComment = {
      guid: this.generateGuid(),
      date: new Date(),
      author,
      comment,
      viewpointGuid
    };

    topic.comments = topic.comments || [];
    topic.comments.push(bcfComment);
    topic.modifiedDate = new Date();
    topic.modifiedAuthor = author;

    return bcfComment;
  }

  /**
   * Adiciona viewpoint a um topic
   */
  public addViewpoint(
    topicGuid: string,
    camera: THREE.Camera,
    scene: THREE.Scene,
    selectedObjects?: THREE.Object3D[]
  ): BCFViewpoint | null {
    const topic = this.topics.get(topicGuid);
    if (!topic) return null;

    const viewpoint: BCFViewpoint = {
      guid: this.generateGuid(),
      title: `View ${(topic.viewpoints?.length || 0) + 1}`,
      camera: this.captureCameraState(camera),
      components: this.captureComponents(scene, selectedObjects)
    };

    topic.viewpoints = topic.viewpoints || [];
    topic.viewpoints.push(viewpoint);

    console.log(`📋 Viewpoint added to topic ${topicGuid}`);
    return viewpoint;
  }

  /**
   * Captura estado da câmera
   */
  private captureCameraState(camera: THREE.Camera): BCFCamera {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    const bcfCamera: BCFCamera = {
      position: camera.position.clone(),
      direction,
      upVector: camera.up.clone()
    };

    if (camera instanceof THREE.PerspectiveCamera) {
      bcfCamera.fieldOfView = camera.fov;
      bcfCamera.aspectRatio = camera.aspect;
    } else if (camera instanceof THREE.OrthographicCamera) {
      bcfCamera.orthogonalScale = camera.zoom;
    }

    return bcfCamera;
  }

  /**
   * Captura componentes visíveis/selecionados
   */
  private captureComponents(
    scene: THREE.Scene,
    selectedObjects?: THREE.Object3D[]
  ): BCFComponents {
    const selection: BCFComponent[] = [];
    const visibilityExceptions: BCFComponent[] = [];

    if (selectedObjects) {
      selectedObjects.forEach((obj) => {
        if (obj.userData.ifcGuid) {
          selection.push({
            ifcGuid: obj.userData.ifcGuid,
            originatingSystem: 'ArxisVR',
            authoringToolId: obj.userData.ifcId
          });
        }
      });
    }

    // Captura objetos invisíveis
    scene.traverse((obj) => {
      if (!obj.visible && obj.userData.ifcGuid) {
        visibilityExceptions.push({
          ifcGuid: obj.userData.ifcGuid,
          originatingSystem: 'ArxisVR'
        });
      }
    });

    return {
      selection: selection.length > 0 ? selection : undefined,
      visibility: {
        defaultVisibility: true,
        exceptions: visibilityExceptions.length > 0 ? visibilityExceptions : undefined
      }
    };
  }

  /**
   * Exporta BCF para JSON
   */
  public exportBCF(): string {
    const bcfData = {
      version: this.version,
      topics: Array.from(this.topics.values())
    };

    return JSON.stringify(bcfData, null, 2);
  }

  /**
   * Importa BCF de JSON
   */
  public importBCF(json: string): boolean {
    try {
      const data = JSON.parse(json);
      
      if (data.topics && Array.isArray(data.topics)) {
        data.topics.forEach((topic: BCFTopic) => {
          // Converte datas
          topic.creationDate = new Date(topic.creationDate);
          if (topic.modifiedDate) {
            topic.modifiedDate = new Date(topic.modifiedDate);
          }
          if (topic.dueDate) {
            topic.dueDate = new Date(topic.dueDate);
          }
          
          this.topics.set(topic.guid, topic);
        });
        
        console.log(`📋 Imported ${data.topics.length} BCF topics`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Failed to import BCF:', error);
      return false;
    }
  }

  /**
   * Lista todos os topics
   */
  public listTopics(): BCFTopic[] {
    return Array.from(this.topics.values());
  }

  /**
   * Retorna topic específico
   */
  public getTopic(guid: string): BCFTopic | undefined {
    return this.topics.get(guid);
  }

  /**
   * Atualiza status de um topic
   */
  public updateTopicStatus(
    guid: string,
    status: BCFTopic['status'],
    author: string
  ): boolean {
    const topic = this.topics.get(guid);
    if (!topic) return false;

    topic.status = status;
    topic.modifiedDate = new Date();
    topic.modifiedAuthor = author;

    return true;
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// ============================================================================
// COBie (Construction Operations Building information exchange)
// ============================================================================

export interface COBieSheet {
  name: string;
  rows: object[];
}

export interface COBieComponent {
  name: string;
  createdBy: string;
  createdOn: Date;
  category: string;
  floor: string;
  space?: string;
  description?: string;
  extSystem?: string;
  extObject?: string;
  extIdentifier?: string;
  serialNumber?: string;
  installationDate?: Date;
  warrantyStartDate?: Date;
  tagNumber?: string;
  barCode?: string;
  assetIdentifier?: string;
}

export interface COBieType {
  name: string;
  createdBy: string;
  createdOn: Date;
  category: string;
  description?: string;
  manufacturer?: string;
  modelNumber?: string;
  warrantyDuration?: number;
  warrantyDurationUnit?: string;
  replacementCost?: number;
  expectedLife?: number;
  nominalLength?: number;
  nominalWidth?: number;
  nominalHeight?: number;
  modelReference?: string;
  shape?: string;
  size?: string;
  color?: string;
  finish?: string;
  grade?: string;
  material?: string;
  features?: string;
}

export class COBieManager {
  private components: Map<string, COBieComponent> = new Map();
  private types: Map<string, COBieType> = new Map();
  private facilities: object[] = [];
  private floors: object[] = [];
  private spaces: object[] = [];
  private zones: object[] = [];
  private systems: object[] = [];

  constructor() {
    console.log('🏗️ COBie Manager initialized');
  }

  /**
   * Adiciona componente COBie
   */
  public addComponent(component: COBieComponent): void {
    this.components.set(component.name, component);
  }

  /**
   * Adiciona tipo COBie
   */
  public addType(type: COBieType): void {
    this.types.set(type.name, type);
  }

  /**
   * Exporta para formato COBie (Spreadsheet structure)
   */
  public exportCOBie(): COBieSheet[] {
    const sheets: COBieSheet[] = [];

    // Facility sheet
    sheets.push({
      name: 'Facility',
      rows: this.facilities
    });

    // Floor sheet
    sheets.push({
      name: 'Floor',
      rows: this.floors
    });

    // Space sheet
    sheets.push({
      name: 'Space',
      rows: this.spaces
    });

    // Zone sheet
    sheets.push({
      name: 'Zone',
      rows: this.zones
    });

    // Type sheet
    sheets.push({
      name: 'Type',
      rows: Array.from(this.types.values())
    });

    // Component sheet
    sheets.push({
      name: 'Component',
      rows: Array.from(this.components.values())
    });

    // System sheet
    sheets.push({
      name: 'System',
      rows: this.systems
    });

    console.log(`🏗️ Exported COBie with ${sheets.length} sheets`);
    return sheets;
  }

  /**
   * Importa modelo IFC e extrai dados COBie
   */
  public extractFromIFC(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (!object.userData.ifcType) return;

      const ifcType = object.userData.ifcType;
      
      // Extrai componente
      if (this.isComponentType(ifcType)) {
        const component: COBieComponent = {
          name: object.name || object.userData.ifcGuid || 'Unnamed',
          createdBy: object.userData.ownerHistory?.owningUser || 'Unknown',
          createdOn: new Date(),
          category: ifcType,
          floor: object.userData.buildingStorey || 'Unknown',
          space: object.userData.space,
          description: object.userData.description,
          extSystem: 'IFC',
          extObject: ifcType,
          extIdentifier: object.userData.ifcGuid,
          serialNumber: object.userData.serialNumber,
          tagNumber: object.userData.tag
        };

        this.addComponent(component);
      }

      // Extrai tipo
      if (object.userData.objectType) {
        const type: COBieType = {
          name: object.userData.objectType,
          createdBy: 'System',
          createdOn: new Date(),
          category: ifcType,
          description: object.userData.description,
          manufacturer: object.userData.manufacturer,
          modelNumber: object.userData.modelReference
        };

        if (!this.types.has(type.name)) {
          this.addType(type);
        }
      }
    });

    console.log(`🏗️ Extracted ${this.components.size} components and ${this.types.size} types from IFC`);
  }

  /**
   * Verifica se tipo IFC é um componente COBie
   */
  private isComponentType(ifcType: string): boolean {
    const componentTypes = [
      'IfcDoor',
      'IfcWindow',
      'IfcWall',
      'IfcSlab',
      'IfcColumn',
      'IfcBeam',
      'IfcStair',
      'IfcRoof',
      'IfcPlate',
      'IfcMember',
      'IfcCurtainWall',
      'IfcRailing',
      'IfcBuildingElementProxy',
      'IfcFlowTerminal',
      'IfcFlowSegment',
      'IfcFlowFitting',
      'IfcFlowController',
      'IfcEnergyConversionDevice',
      'IfcFlowStorageDevice',
      'IfcFlowTreatmentDevice',
      'IfcFlowMovingDevice'
    ];

    return componentTypes.includes(ifcType);
  }

  /**
   * Exporta para JSON
   */
  public toJSON(): string {
    return JSON.stringify(this.exportCOBie(), null, 2);
  }
}

// ============================================================================
// IDS (Information Delivery Specification)
// ============================================================================

export interface IDSSpecification {
  identifier: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  date?: Date;
  purpose?: string;
  milestone?: string;
  requirements: IDSRequirement[];
}

export interface IDSRequirement {
  applicability: IDSApplicability;
  requirements: IDSRequirementRule[];
}

export interface IDSApplicability {
  entity?: string; // IFC entity type
  predefinedType?: string;
  partOf?: string;
  classification?: IDSClassification;
  attribute?: IDSAttribute;
  property?: IDSProperty;
  material?: string;
}

export interface IDSClassification {
  system: string;
  value: string;
}

export interface IDSAttribute {
  name: string;
  value?: any;
}

export interface IDSProperty {
  propertySet: string;
  name: string;
  value?: any;
  dataType?: string;
}

export interface IDSRequirementRule {
  cardinality: 'required' | 'optional' | 'prohibited';
  type: 'attribute' | 'property' | 'classification' | 'material' | 'partOf';
  data: unknown;
}

export class IDSValidator {
  private specifications: Map<string, IDSSpecification> = new Map();

  constructor() {
    console.log('✅ IDS Validator initialized');
  }

  /**
   * Adiciona especificação IDS
   */
  public addSpecification(spec: IDSSpecification): void {
    this.specifications.set(spec.identifier, spec);
    console.log(`✅ IDS Specification added: ${spec.name}`);
  }

  /**
   * Valida objeto contra especificações IDS
   */
  public validate(
    object: THREE.Object3D,
    specificationId?: string
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const specs = specificationId
      ? [this.specifications.get(specificationId)].filter(Boolean)
      : Array.from(this.specifications.values());

    specs.forEach((spec) => {
      if (!spec) return;

      spec.requirements.forEach((req) => {
        // Verifica aplicabilidade
        if (!this.checkApplicability(object, req.applicability)) {
          return; // Não se aplica a este objeto
        }

        // Valida requirements
        req.requirements.forEach((rule) => {
          const result = this.validateRule(object, rule);
          
          if (!result.valid) {
            if (rule.cardinality === 'required') {
              errors.push(result.message || 'Requirement not met');
            } else if (rule.cardinality === 'optional') {
              warnings.push(result.message || 'Optional requirement not met');
            }
          }

          if (result.valid && rule.cardinality === 'prohibited') {
            errors.push(result.message || 'Prohibited element found');
          }
        });
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Verifica se requirement é aplicável ao objeto
   */
  private checkApplicability(
    object: THREE.Object3D,
    applicability: IDSApplicability
  ): boolean {
    if (applicability.entity) {
      if (object.userData.ifcType !== applicability.entity) {
        return false;
      }
    }

    if (applicability.predefinedType) {
      if (object.userData.predefinedType !== applicability.predefinedType) {
        return false;
      }
    }

    if (applicability.classification) {
      // TODO: Check classification
    }

    return true;
  }

  /**
   * Valida regra específica
   */
  private validateRule(
    object: THREE.Object3D,
    rule: IDSRequirementRule
  ): { valid: boolean; message?: string } {
    switch (rule.type) {
      case 'attribute':
        return this.validateAttribute(object, rule.data as IDSAttribute);
      case 'property':
        return this.validateProperty(object, rule.data as IDSProperty);
      case 'classification':
        return this.validateClassification(object, rule.data as IDSClassification);
      default:
        return { valid: true };
    }
  }

  private validateAttribute(
    object: THREE.Object3D,
    attribute: IDSAttribute
  ): { valid: boolean; message?: string } {
    const value = object.userData[attribute.name];
    
    if (value === undefined) {
      return {
        valid: false,
        message: `Missing attribute: ${attribute.name}`
      };
    }

    if (attribute.value !== undefined && value !== attribute.value) {
      return {
        valid: false,
        message: `Attribute ${attribute.name} has wrong value: expected ${attribute.value}, got ${value}`
      };
    }

    return { valid: true };
  }

  private validateProperty(
    object: THREE.Object3D,
    property: IDSProperty
  ): { valid: boolean; message?: string } {
    const psetData = object.userData.propertySets?.[property.propertySet];
    
    if (!psetData) {
      return {
        valid: false,
        message: `Missing property set: ${property.propertySet}`
      };
    }

    const value = psetData[property.name];
    
    if (value === undefined) {
      return {
        valid: false,
        message: `Missing property: ${property.propertySet}.${property.name}`
      };
    }

    if (property.value !== undefined && value !== property.value) {
      return {
        valid: false,
        message: `Property ${property.name} has wrong value`
      };
    }

    return { valid: true };
  }

  private validateClassification(
    _object: THREE.Object3D,
    _classification: IDSClassification
  ): { valid: boolean; message?: string } {
    // TODO: Implement classification validation
    return { valid: true };
  }

  /**
   * Valida toda a cena
   */
  public validateScene(scene: THREE.Scene): {
    totalObjects: number;
    validObjects: number;
    invalidObjects: number;
    errors: Map<string, string[]>;
    warnings: Map<string, string[]>;
  } {
    const results = {
      totalObjects: 0,
      validObjects: 0,
      invalidObjects: 0,
      errors: new Map<string, string[]>(),
      warnings: new Map<string, string[]>()
    };

    scene.traverse((object) => {
      if (!object.userData.ifcType) return;

      results.totalObjects++;
      const validation = this.validate(object);

      if (validation.valid) {
        results.validObjects++;
      } else {
        results.invalidObjects++;
      }

      if (validation.errors.length > 0) {
        results.errors.set(
          object.userData.ifcGuid || object.uuid,
          validation.errors
        );
      }

      if (validation.warnings.length > 0) {
        results.warnings.set(
          object.userData.ifcGuid || object.uuid,
          validation.warnings
        );
      }
    });

    console.log(`✅ IDS Validation completed:`, {
      total: results.totalObjects,
      valid: results.validObjects,
      invalid: results.invalidObjects
    });

    return results;
  }
}

// Singleton instances
export const bcfManager = new BCFManager();
export const cobieManager = new COBieManager();
export const idsValidator = new IDSValidator();

/**
 * ISO 19650 Information Management
 * Padrão internacional para gestão de informações em BIM
 */
export interface ISO19650Container {
  id: string;
  name: string;
  status: 'WIP' | 'SHARED' | 'PUBLISHED' | 'ARCHIVED';
  version: string;
  revision: string;
  classification: string;
  suitability: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
  purpose: string;
  author: string;
  createdDate: Date;
  modifiedDate: Date;
  approver?: string;
  approvedDate?: Date;
  metadata: Record<string, any>;
}

export type ISO19650Suitability =
  | 'S0' // Work in progress
  | 'S1' // Suitable for coordination
  | 'S2' // Suitable for information
  | 'S3' // Suitable for review and comment
  | 'S4' // Suitable for stage approval
  | 'S5' // Suitable for contractor design
  | 'S6' // Suitable for production
  | 'S7' // Suitable for operation and maintenance
  | 'S8'; // Suitable for demolition

export interface ISO19650Project {
  name: string;
  code: string;
  originator: string; // Organization responsible
  volume?: string;
  level?: string;
  type: string;
  role: string;
  number: string;
  containers: Map<string, ISO19650Container>;
}

export class ISO19650Manager {
  private project: ISO19650Project | null = null;
  private containers: Map<string, ISO19650Container> = new Map();
  private workflows: Map<string, ISO19650Workflow> = new Map();

  constructor() {
    console.log('📋 ISO 19650 Manager initialized');
  }

  /**
   * Define projeto ISO 19650
   */
  public setProject(project: ISO19650Project): void {
    this.project = project;
    console.log(`📋 ISO 19650 Project set: ${project.name} (${project.code})`);
  }

  /**
   * Cria container de informação
   */
  public createContainer(data: Partial<ISO19650Container>): ISO19650Container {
    const container: ISO19650Container = {
      id: data.id || this.generateContainerCode(),
      name: data.name || 'Untitled',
      status: data.status || 'WIP',
      version: data.version || 'v01',
      revision: data.revision || 'P01',
      classification: data.classification || '',
      suitability: data.suitability || 'S0',
      purpose: data.purpose || '',
      author: data.author || 'Unknown',
      createdDate: data.createdDate || new Date(),
      modifiedDate: data.modifiedDate || new Date(),
      metadata: data.metadata || {}
    };

    this.containers.set(container.id, container);
    console.log(`📋 Container created: ${container.id} (${container.suitability})`);
    
    return container;
  }

  /**
   * Gera código do container seguindo ISO 19650
   * Formato: [Project]-[Originator]-[Volume]-[Level]-[Type]-[Role]-[Number]-[Version]-[Revision]
   */
  private generateContainerCode(): string {
    if (!this.project) return `CONT-${Date.now()}`;

    const parts = [
      this.project.code,
      this.project.originator,
      this.project.volume || 'XX',
      this.project.level || 'XX',
      this.project.type,
      this.project.role,
      this.project.number,
      'v01',
      'P01'
    ];

    return parts.join('-');
  }

  /**
   * Atualiza suitability de container
   */
  public updateSuitability(
    containerId: string,
    suitability: ISO19650Suitability,
    approver?: string
  ): boolean {
    const container = this.containers.get(containerId);
    if (!container) return false;

    container.suitability = suitability;
    container.modifiedDate = new Date();

    if (approver) {
      container.approver = approver;
      container.approvedDate = new Date();
    }

    // Atualiza status baseado em suitability
    if (suitability === 'S0') {
      container.status = 'WIP';
    } else if (['S1', 'S2', 'S3'].includes(suitability)) {
      container.status = 'SHARED';
    } else if (['S4', 'S5', 'S6', 'S7'].includes(suitability)) {
      container.status = 'PUBLISHED';
    }

    console.log(`📋 Container ${containerId} updated to ${suitability}`);
    return true;
  }

  /**
   * Cria nova versão de container
   */
  public createVersion(
    containerId: string,
    author: string,
    reason: string
  ): ISO19650Container | null {
    const original = this.containers.get(containerId);
    if (!original) return null;

    // Parse version (v01 -> v02)
    const versionMatch = original.version.match(/v(\d+)/);
    if (!versionMatch) return null;

    const versionNum = parseInt(versionMatch[1]) + 1;
    const newVersion = `v${versionNum.toString().padStart(2, '0')}`;

    const newContainer: ISO19650Container = {
      ...original,
      version: newVersion,
      revision: 'P01', // Reset revision
      status: 'WIP',
      suitability: 'S0',
      author,
      createdDate: new Date(),
      modifiedDate: new Date(),
      metadata: {
        ...original.metadata,
        versionHistory: [
          ...(original.metadata.versionHistory || []),
          {
            version: original.version,
            revision: original.revision,
            date: original.modifiedDate,
            reason
          }
        ]
      }
    };

    const newId = containerId.replace(original.version, newVersion);
    newContainer.id = newId;

    this.containers.set(newId, newContainer);
    console.log(`📋 New version created: ${newId}`);
    
    return newContainer;
  }

  /**
   * Cria nova revisão de container (dentro da mesma versão)
   */
  public createRevision(
    containerId: string,
    author: string,
    changes: string
  ): ISO19650Container | null {
    const original = this.containers.get(containerId);
    if (!original) return null;

    // Parse revision (P01 -> P02)
    const revisionMatch = original.revision.match(/P(\d+)/);
    if (!revisionMatch) return null;

    const revisionNum = parseInt(revisionMatch[1]) + 1;
    const newRevision = `P${revisionNum.toString().padStart(2, '0')}`;

    const newContainer: ISO19650Container = {
      ...original,
      revision: newRevision,
      author,
      modifiedDate: new Date(),
      metadata: {
        ...original.metadata,
        revisionHistory: [
          ...(original.metadata.revisionHistory || []),
          {
            revision: original.revision,
            date: original.modifiedDate,
            changes
          }
        ]
      }
    };

    const newId = containerId.replace(original.revision, newRevision);
    newContainer.id = newId;

    this.containers.set(newId, newContainer);
    console.log(`📋 New revision created: ${newId}`);
    
    return newContainer;
  }

  /**
   * Valida nomenclatura ISO 19650
   */
  public validateNaming(containerId: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Formato esperado: PROJECT-ORG-VOL-LEV-TYPE-ROLE-NUM-VER-REV
    const parts = containerId.split('-');

    if (parts.length < 9) {
      errors.push('Container ID must have at least 9 parts separated by hyphens');
      return { valid: false, errors };
    }

    // Verifica versão (vXX)
    if (!parts[7].match(/^v\d{2}$/)) {
      errors.push('Version must be in format vXX (e.g., v01)');
    }

    // Verifica revisão (PXX)
    if (!parts[8].match(/^P\d{2}$/)) {
      errors.push('Revision must be in format PXX (e.g., P01)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Retorna todos os containers
   */
  public listContainers(): ISO19650Container[] {
    return Array.from(this.containers.values());
  }

  /**
   * Exporta relatório ISO 19650
   */
  public exportReport(): string {
    const report = {
      project: this.project,
      containers: Array.from(this.containers.values()),
      statistics: {
        total: this.containers.size,
        byStatus: this.getStatsByStatus(),
        bySuitability: this.getStatsBySuitability()
      }
    };

    return JSON.stringify(report, null, 2);
  }

  private getStatsByStatus(): Record<string, number> {
    const stats: Record<string, number> = {
      WIP: 0,
      SHARED: 0,
      PUBLISHED: 0,
      ARCHIVED: 0
    };

    this.containers.forEach((container) => {
      stats[container.status]++;
    });

    return stats;
  }

  private getStatsBySuitability(): Record<string, number> {
    const stats: Record<string, number> = {
      S0: 0, S1: 0, S2: 0, S3: 0, S4: 0, S5: 0, S6: 0, S7: 0, S8: 0
    };

    this.containers.forEach((container) => {
      stats[container.suitability]++;
    });

    return stats;
  }
}

export interface ISO19650Workflow {
  id: string;
  name: string;
  stages: ISO19650WorkflowStage[];
}

export interface ISO19650WorkflowStage {
  name: string;
  requiredSuitability: ISO19650Suitability;
  approvers: string[];
  checklistItems: string[];
}

/**
 * Sistema unificado OpenBIM
 */
export class OpenBIMSystem {
  public bcf = bcfManager;
  public cobie = cobieManager;
  public ids = idsValidator;
  public iso19650: ISO19650Manager;

  constructor() {
    this.iso19650 = new ISO19650Manager();
    console.log('🌐 OpenBIM System initialized');
  }

  /**
   * Verifica conformidade ISO 19650 (expandido)
   */
  public checkISO19650Compliance(): {
    compliant: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 1. Verifica projeto definido
    const containers = this.iso19650.listContainers();
    if (containers.length === 0) {
      issues.push('No information containers defined (ISO 19650 requirement)');
    }

    // 2. Verifica nomenclatura
    containers.forEach((container) => {
      const validation = this.iso19650.validateNaming(container.id);
      if (!validation.valid) {
        warnings.push(`Container ${container.id}: ${validation.errors.join(', ')}`);
      }
    });

    // 3. Verifica suitability codes
    const wipContainers = containers.filter((c) => c.suitability === 'S0' && c.status !== 'WIP');
    if (wipContainers.length > 0) {
      warnings.push(`${wipContainers.length} containers have S0 suitability but are not WIP status`);
    }

    // 4. Verifica aprovações
    const publishedWithoutApproval = containers.filter(
      (c) => c.status === 'PUBLISHED' && !c.approver
    );
    if (publishedWithoutApproval.length > 0) {
      issues.push(`${publishedWithoutApproval.length} published containers lack approval records`);
    }

    // 5. Verifica BCF para colaboração
    if (this.bcf.listTopics().length === 0) {
      recommendations.push('Consider using BCF for team collaboration and issue tracking');
    }

    // 6. Verifica COBie para asset management
    const cobieData = this.cobie.exportCOBie();
    if (cobieData.length === 0) {
      recommendations.push('COBie data recommended for asset management (ISO 19650 Part 3)');
    }

    // 7. Verifica IDS para validação
    // (IDS validation would be checked here)

    // 8. Verifica versionamento
    const noVersionHistory = containers.filter(
      (c) => !c.metadata.versionHistory || c.metadata.versionHistory.length === 0
    );
    if (noVersionHistory.length > 0) {
      warnings.push(`${noVersionHistory.length} containers lack version history`);
    }

    return {
      compliant: issues.length === 0,
      issues,
      warnings,
      recommendations
    };
  }

  /**
   * Gera relatório completo OpenBIM
   */
  public generateComplianceReport(): {
    iso19650: {
      containers: ISO19650Container[];
      compliance: {
        compliant: boolean;
        issues: string[];
        warnings: string[];
        recommendations: string[];
      };
    };
    bcf: {
      topics: BCFTopic[];
      openTopics: number;
      resolvedTopics: number;
    };
    cobie: {
      sheets: COBieSheet[];
      components: number;
      types: number;
    };
    ids: object;
    summary: {
      overallCompliance: boolean;
      score: number;
      totalIssues: number;
      totalWarnings: number;
    };
  } {
    const iso19650Check = this.checkISO19650Compliance();
    const bcfTopics = this.bcf.listTopics();
    const cobieData = this.cobie.exportCOBie();

    const totalIssues =
      iso19650Check.issues.length +
      bcfTopics.filter((t) => t.status === 'Open').length;

    const totalWarnings = iso19650Check.warnings.length;

    // Score (0-100)
    const maxPoints = 100;
    let score = maxPoints;
    score -= totalIssues * 10; // -10 por issue
    score -= totalWarnings * 3; // -3 por warning
    score = Math.max(0, score);

    return {
      iso19650: {
        containers: this.iso19650.listContainers(),
        compliance: iso19650Check
      },
      bcf: {
        topics: bcfTopics,
        openTopics: bcfTopics.filter((t) => t.status === 'Open').length,
        resolvedTopics: bcfTopics.filter((t) => t.status === 'Resolved').length
      },
      cobie: {
        sheets: cobieData,
        components: cobieData.find((s) => s.name === 'Component')?.rows.length || 0,
        types: cobieData.find((s) => s.name === 'Type')?.rows.length || 0
      },
      ids: {
        // IDS validation results would go here
      },
      summary: {
        overallCompliance: iso19650Check.compliant && totalIssues === 0,
        score,
        totalIssues,
        totalWarnings
      }
    };
  }
}

export const openBIM = new OpenBIMSystem();
