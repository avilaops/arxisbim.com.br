/**
 * PropertyExtractor - Extrai propriedades de elementos IFC
 * 
 * Integra com web-ifc para extrair propriedades reais do modelo IFC
 * Suporta:
 * - IfcPropertySets (Pset_*)
 * - IfcElementQuantity (Qto_*)
 * - IfcRelationships
 * - IfcClassification
 * - IfcMaterial
 */

import * as THREE from 'three';
import { 
  IFCElement, 
  IFCProperty, 
  IFCPropertyType, 
  PropertyCategory,
  PropertySection,
  InspectionData
} from './PropertyTypes';

export class PropertyExtractor {
  private ifcLoader: any = null;
  private ifcManager: any = null;
  private scene: THREE.Scene | null = null;
  private cache: Map<number, InspectionData> = new Map();
  private meshCache: Map<number, THREE.Mesh> = new Map();
  
  /**
   * Injeta referência ao IFC Loader
   */
  public setIfcLoader(loader: any): void {
    this.ifcLoader = loader;
    this.ifcManager = loader?.ifcManager || loader?.loader?.ifcManager;
    console.log('🔧 IFC Loader injetado no PropertyExtractor', {
      hasLoader: !!this.ifcLoader,
      hasManager: !!this.ifcManager
    });
  }
  
  /**
   * Injeta referência à scene Three.js para busca de meshes
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    this.rebuildMeshCache();
  }
  
  /**
   * Reconstrói cache de meshes por expressID
   */
  private rebuildMeshCache(): void {
    if (!this.scene) return;
    
    this.meshCache.clear();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData?.expressID !== undefined) {
        this.meshCache.set(obj.userData.expressID, obj);
      }
    });
    
    console.log(`🔄 Mesh cache rebuilt: ${this.meshCache.size} meshes indexed`);
  }
  
  /**
   * Extrai propriedades completas de um elemento IFC
   */
  public async extractProperties(
    expressID: number,
    modelID: number = 0
  ): Promise<InspectionData> {
    // Verificar cache
    const cached = this.cache.get(expressID);
    if (cached && cached.modelID === modelID) {
      return cached;
    }
    
    const element = await this.extractElement(expressID, modelID);
    const sections = this.buildPropertySections(element);
    
    const data: InspectionData = {
      element,
      sections,
      modelID,
      timestamp: Date.now()
    };
    
    // Cachear resultado
    this.cache.set(expressID, data);
    
    return data;
  }
  
  /**
   * Extrai elemento IFC completo
   */
  private async extractElement(expressID: number, modelID: number): Promise<IFCElement> {
    const element: IFCElement = {
      expressID,
      globalID: '',
      type: 'Unknown',
      name: undefined,
      description: undefined
    };
    
    if (!this.ifcLoader) {
      console.warn('⚠️ IFC Loader não disponível');
      return this.createFallbackElement(expressID);
    }
    
    try {
      // Obter propriedades básicas via web-ifc
      const props = await this.getIfcProperties(expressID, modelID);
      
      // Identity
      element.globalID = props.GlobalId?.value || `ID_${expressID}`;
      element.type = props.constructor?.name || 'IfcElement';
      element.name = props.Name?.value;
      element.description = props.Description?.value;
      element.objectType = props.ObjectType?.value;
      element.tag = props.Tag?.value;
      
      // Property Sets
      element.propertySets = await this.extractPropertySets(expressID, modelID);
      
      // Quantity Sets
      element.quantitySets = await this.extractQuantitySets(expressID, modelID);
      
      // Material
      element.materials = await this.extractMaterials(expressID, modelID);
      
      // Geometry (básico)
      element.geometry = await this.extractGeometry(expressID, modelID);
      
      // Placement
      element.placement = await this.extractPlacement(expressID, modelID);
      
      // Relationships
      element.relationships = await this.extractRelationships(expressID, modelID);
      
      // Classification
      element.classification = await this.extractClassification(expressID, modelID);
      
    } catch (error) {
      console.error(`❌ Erro ao extrair propriedades IFC ${expressID}:`, error);
    }
    
    return element;
  }
  
  /**
   * Cria elemento fallback quando IFC Loader não está disponível
   */
  private createFallbackElement(expressID: number): IFCElement {
    return {
      expressID,
      globalID: `ID_${expressID}`,
      type: 'IfcElement',
      name: `Element ${expressID}`,
      description: 'IFC Loader not available - Limited properties'
    };
  }
  
  /**
   * Obtém propriedades IFC via web-ifc
   */
  private async getIfcProperties(expressID: number, modelID: number): Promise<any> {
    try {
      // Usar web-ifc API diretamente
      if (this.ifcManager && this.ifcManager.getItemProperties) {
        const props = await this.ifcManager.getItemProperties(modelID, expressID, true);
        return props;
      }
      
      // Fallback: userData do mesh
      const mesh = this.findMeshByExpressID(expressID);
      if (mesh?.userData) {
        return mesh.userData;
      }
      
      return {};
    } catch (error) {
      console.warn(`⚠️ Erro ao obter propriedades via web-ifc (ExpressID: ${expressID}):`, error);
      return {};
    }
  }
  
  /**
   * Extrai Property Sets (IfcPropertySet)
   */
  private async extractPropertySets(
    expressID: number, 
    modelID: number
  ): Promise<Array<{ name: string; properties: Record<string, any> }>> {
    const psets: Array<{ name: string; properties: Record<string, any> }> = [];
    
    try {
      if (!this.ifcManager) return psets;
      
      // Buscar IfcRelDefinesByProperties
      const propRels = await this.ifcManager.getPropertySets(modelID, expressID, true);
      
      if (!propRels || propRels.length === 0) {
        // Fallback: tentar extrair de userData
        const mesh = this.findMeshByExpressID(expressID);
        if (mesh?.userData?.psets) {
          return this.parsePsetsFromUserData(mesh.userData.psets);
        }
        return psets;
      }
      
      for (const psetId of propRels) {
        try {
          const psetProps = await this.ifcManager.getItemProperties(modelID, psetId, true);
          
          if (psetProps && psetProps.HasProperties) {
            const pset: { name: string; properties: Record<string, any> } = {
              name: psetProps.Name?.value || 'Unnamed PropertySet',
              properties: {}
            };
            
            for (const propId of psetProps.HasProperties) {
              const prop = await this.ifcManager.getItemProperties(modelID, propId.value, false);
              const propName = prop.Name?.value;
              const propValue = this.extractPropertyValue(prop);
              
              if (propName && propValue !== undefined) {
                pset.properties[propName] = propValue;
              }
            }
            
            if (Object.keys(pset.properties).length > 0) {
              psets.push(pset);
            }
          }
        } catch (propError) {
          console.warn(`⚠️ Erro ao processar PropertySet ${psetId}:`, propError);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao extrair Property Sets:', error);
    }
    
    return psets;
  }
  
  /**
   * Parse PropertySets de userData (fallback)
   */
  private parsePsetsFromUserData(psets: any): Array<{ name: string; properties: Record<string, any> }> {
    if (!Array.isArray(psets)) return [];
    
    return psets.map((pset: any) => ({
      name: pset.Name || pset.name || 'Unnamed PropertySet',
      properties: pset.HasProperties || pset.properties || {}
    }));
  }
  
  /**
   * Extrai Quantity Sets (IfcElementQuantity)
   */
  private async extractQuantitySets(
    expressID: number,
    modelID: number
  ): Promise<Array<{ name: string; quantities: Record<string, any> }>> {
    const qsets: Array<{ name: string; quantities: Record<string, any> }> = [];
    
    try {
      if (!this.ifcManager) return qsets;
      
      // Buscar IfcElementQuantity através de relações
      // Nota: web-ifc não tem getQuantities direto, precisa buscar manualmente
      const props = await this.ifcManager.getItemProperties(modelID, expressID, true);
      
      if (props && props.IsDefinedBy) {
        for (const relId of props.IsDefinedBy) {
          try {
            const rel = await this.ifcManager.getItemProperties(modelID, relId.value, false);
            
            if (rel && rel.type === 'IfcRelDefinesByProperties') {
              const relatedObj = await this.ifcManager.getItemProperties(modelID, rel.RelatingPropertyDefinition.value, false);
              
              if (relatedObj && relatedObj.type === 'IfcElementQuantity') {
                const quantitySet: { name: string; quantities: Record<string, any> } = {
                  name: relatedObj.Name?.value || 'Unnamed QuantitySet',
                  quantities: {}
                };
                
                if (relatedObj.Quantities) {
                  for (const qtyRef of relatedObj.Quantities) {
                    const qty = await this.ifcManager.getItemProperties(modelID, qtyRef.value, false);
                    const qtyName = qty.Name?.value;
                    const qtyValue = this.extractQuantityValue(qty);
                    
                    if (qtyName && qtyValue !== undefined) {
                      quantitySet.quantities[qtyName] = qtyValue;
                    }
                  }
                }
                
                if (Object.keys(quantitySet.quantities).length > 0) {
                  qsets.push(quantitySet);
                }
              }
            }
          } catch (relError) {
            console.warn(`⚠️ Erro ao processar relação ${relId.value}:`, relError);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao extrair Quantity Sets:', error);
    }
    
    return qsets;
  }
  
  /**
   * Extrai materiais
   */
  private async extractMaterials(
    expressID: number,
    modelID: number
  ): Promise<Array<{ name: string; type: string; layerThickness?: number }> | undefined> {
    try {
      if (!this.ifcManager) return undefined;
      
      const materials: Array<{ name: string; type: string; layerThickness?: number }> = [];
      
      // Buscar IfcMaterial via relações
      const props = await this.ifcManager.getItemProperties(modelID, expressID, true);
      
      if (props && props.HasAssociations) {
        for (const assocId of props.HasAssociations) {
          try {
            const assoc = await this.ifcManager.getItemProperties(modelID, assocId.value, false);
            
            if (assoc && assoc.type === 'IfcRelAssociatesMaterial') {
              const matDef = await this.ifcManager.getItemProperties(modelID, assoc.RelatingMaterial.value, false);
              
              if (matDef) {
                // IfcMaterial (single material)
                if (matDef.type === 'IfcMaterial') {
                  materials.push({
                    name: matDef.Name?.value || 'Unnamed Material',
                    type: 'Single'
                  });
                }
                // IfcMaterialLayerSetUsage (múltiplas camadas)
                else if (matDef.type === 'IfcMaterialLayerSetUsage' || matDef.type === 'IfcMaterialLayerSet') {
                  const layerSet = matDef.type === 'IfcMaterialLayerSetUsage' 
                    ? await this.ifcManager.getItemProperties(modelID, matDef.ForLayerSet.value, false)
                    : matDef;
                  
                  if (layerSet && layerSet.MaterialLayers) {
                    for (const layerRef of layerSet.MaterialLayers) {
                      const layer = await this.ifcManager.getItemProperties(modelID, layerRef.value, false);
                      const mat = await this.ifcManager.getItemProperties(modelID, layer.Material.value, false);
                      
                      materials.push({
                        name: mat.Name?.value || 'Unnamed Material',
                        type: 'Layer',
                        layerThickness: layer.LayerThickness?.value
                      });
                    }
                  }
                }
                // IfcMaterialList (lista de materiais)
                else if (matDef.type === 'IfcMaterialList') {
                  if (matDef.Materials) {
                    for (const matRef of matDef.Materials) {
                      const mat = await this.ifcManager.getItemProperties(modelID, matRef.value, false);
                      materials.push({
                        name: mat.Name?.value || 'Unnamed Material',
                        type: 'List Item'
                      });
                    }
                  }
                }
              }
            }
          } catch (matError) {
            console.warn(`⚠️ Erro ao processar material ${assocId.value}:`, matError);
          }
        }
      }
      
      return materials.length > 0 ? materials : undefined;
    } catch (error) {
      console.warn('⚠️ Erro ao extrair materiais:', error);
      return undefined;
    }
  }
  
  /**
   * Extrai geometria básica
   */
  private async extractGeometry(
    expressID: number,
    _modelID: number
  ): Promise<IFCElement['geometry'] | undefined> {
    try {
      const mesh = this.findMeshByExpressID(expressID);
      if (!mesh || !mesh.geometry) return undefined;
      
      const geometry = mesh.geometry;
      const bbox = new THREE.Box3().setFromObject(mesh);
      
      return {
        type: geometry.type,
        vertices: geometry.attributes.position?.count || 0,
        faces: geometry.index ? geometry.index.count / 3 : 0,
        boundingBox: {
          min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
          max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z }
        }
      };
    } catch (error) {
      return undefined;
    }
  }
  
  /**
   * Extrai placement (posição, eixo, direção)
   */
  private async extractPlacement(
    expressID: number,
    _modelID: number
  ): Promise<IFCElement['placement'] | undefined> {
    try {
      const mesh = this.findMeshByExpressID(expressID);
      if (!mesh) return undefined;
      
      const pos = mesh.position;
      
      return {
        location: { x: pos.x, y: pos.y, z: pos.z }
      };
    } catch (error) {
      return undefined;
    }
  }
  
  /**
   * Extrai relacionamentos
   */
  private async extractRelationships(
    expressID: number,
    modelID: number
  ): Promise<IFCElement['relationships'] | undefined> {
    try {
      if (!this.ifcManager) return undefined;
      
      const relationships: IFCElement['relationships'] = {
        spatialStructure: [],
        decomposes: [],
        groups: []
      };
      
      const props = await this.ifcManager.getItemProperties(modelID, expressID, true);
      
      // Estrutura espacial (IfcRelContainedInSpatialStructure)
      if (props && props.ContainedInStructure) {
        for (const relId of props.ContainedInStructure) {
          try {
            const rel = await this.ifcManager.getItemProperties(modelID, relId.value, false);
            if (rel && rel.RelatingStructure) {
              const structure = await this.ifcManager.getItemProperties(modelID, rel.RelatingStructure.value, false);
              relationships.spatialStructure.push({
                type: structure.type,
                name: structure.Name?.value || structure.type,
                expressID: structure.expressID
              });
            }
          } catch (err) {
            console.warn('⚠️ Erro ao extrair spatial structure:', err);
          }
        }
      }
      
      // Decomposição (IfcRelAggregates)
      if (props && props.Decomposes) {
        for (const relId of props.Decomposes) {
          try {
            const rel = await this.ifcManager.getItemProperties(modelID, relId.value, false);
            if (rel && rel.RelatingObject) {
              const obj = await this.ifcManager.getItemProperties(modelID, rel.RelatingObject.value, false);
              relationships.decomposes.push({
                type: obj.type,
                name: obj.Name?.value || obj.type,
                expressID: obj.expressID
              });
            }
          } catch (err) {
            console.warn('⚠️ Erro ao extrair decomposes:', err);
          }
        }
      }
      
      // Grupos (IfcRelAssignsToGroup)
      if (props && props.HasAssignments) {
        for (const relId of props.HasAssignments) {
          try {
            const rel = await this.ifcManager.getItemProperties(modelID, relId.value, false);
            if (rel && rel.type === 'IfcRelAssignsToGroup' && rel.RelatingGroup) {
              const group = await this.ifcManager.getItemProperties(modelID, rel.RelatingGroup.value, false);
              relationships.groups.push({
                type: group.type,
                name: group.Name?.value || group.type,
                expressID: group.expressID
              });
            }
          } catch (err) {
            console.warn('⚠️ Erro ao extrair groups:', err);
          }
        }
      }
      
      // Retornar apenas se houver algum relacionamento
      if (relationships.spatialStructure.length > 0 || 
          relationships.decomposes.length > 0 || 
          relationships.groups.length > 0) {
        return relationships;
      }
      
      return undefined;
    } catch (error) {
      console.warn('⚠️ Erro ao extrair relacionamentos:', error);
      return undefined;
    }
  }
  
  /**
   * Extrai classificação
   */
  private async extractClassification(
    expressID: number,
    modelID: number
  ): Promise<IFCElement['classification'] | undefined> {
    try {
      if (!this.ifcManager) return undefined;
      
      const props = await this.ifcManager.getItemProperties(modelID, expressID, true);
      
      if (props && props.HasAssociations) {
        for (const assocId of props.HasAssociations) {
          try {
            const assoc = await this.ifcManager.getItemProperties(modelID, assocId.value, false);
            
            if (assoc && assoc.type === 'IfcRelAssociatesClassification') {
              const classRef = await this.ifcManager.getItemProperties(modelID, assoc.RelatingClassification.value, false);
              
              if (classRef && classRef.type === 'IfcClassificationReference') {
                const classification: IFCElement['classification'] = {
                  system: '',
                  code: classRef.Identification?.value || classRef.ItemReference?.value || '',
                  name: classRef.Name?.value || ''
                };
                
                // Buscar sistema de classificação
                if (classRef.ReferencedSource) {
                  try {
                    const classSystem = await this.ifcManager.getItemProperties(modelID, classRef.ReferencedSource.value, false);
                    if (classSystem && classSystem.type === 'IfcClassification') {
                      classification.system = classSystem.Name?.value || classSystem.Source?.value || 'Unnamed System';
                    }
                  } catch (sysError) {
                    console.warn('⚠️ Erro ao buscar sistema de classificação:', sysError);
                  }
                }
                
                return classification;
              }
            }
          } catch (classError) {
            console.warn(`⚠️ Erro ao processar classificação ${assocId.value}:`, classError);
          }
        }
      }
      
      return undefined;
    } catch (error) {
      console.warn('⚠️ Erro ao extrair classificação:', error);
      return undefined;
    }
  }
  
  /**
   * Extrai valor de uma propriedade IFC
   */
  private extractPropertyValue(prop: any): any {
    if (!prop) return null;
    
    // IfcPropertySingleValue
    if (prop.NominalValue) {
      return prop.NominalValue.value;
    }
    
    // IfcPropertyEnumeratedValue
    if (prop.EnumerationValues && prop.EnumerationValues.length > 0) {
      return prop.EnumerationValues.map((v: any) => v.value);
    }
    
    // IfcPropertyListValue
    if (prop.ListValues && prop.ListValues.length > 0) {
      return prop.ListValues.map((v: any) => v.value);
    }
    
    // IfcPropertyBoundedValue
    if (prop.UpperBoundValue || prop.LowerBoundValue) {
      return {
        upper: prop.UpperBoundValue?.value,
        lower: prop.LowerBoundValue?.value
      };
    }
    
    return null;
  }
  
  /**
   * Extrai valor de uma quantidade IFC
   */
  private extractQuantityValue(qty: any): any {
    if (!qty) return null;
    
    // IfcQuantityLength, IfcQuantityArea, IfcQuantityVolume, etc.
    if (qty.LengthValue !== undefined) return qty.LengthValue.value;
    if (qty.AreaValue !== undefined) return qty.AreaValue.value;
    if (qty.VolumeValue !== undefined) return qty.VolumeValue.value;
    if (qty.CountValue !== undefined) return qty.CountValue.value;
    if (qty.WeightValue !== undefined) return qty.WeightValue.value;
    if (qty.TimeValue !== undefined) return qty.TimeValue.value;
    
    return null;
  }
  
  /**
   * Encontra mesh Three.js por expressID
   */
  private findMeshByExpressID(expressID: number): THREE.Mesh | null {
    // Buscar no cache primeiro
    if (this.meshCache.has(expressID)) {
      return this.meshCache.get(expressID) || null;
    }
    
    // Se não encontrou, reconstruir cache e tentar novamente
    if (this.scene) {
      this.rebuildMeshCache();
      return this.meshCache.get(expressID) || null;
    }
    
    return null;
  }
  
  /**
   * Limpa cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.meshCache.clear();
    console.log('🧹 PropertyExtractor cache cleared');
  }
  
  /**
   * Constrói seções de propriedades organizadas por categoria
   */
  private buildPropertySections(element: IFCElement): PropertySection[] {
    const sections: PropertySection[] = [];
    
    // Identity section
    sections.push(this.buildIdentitySection(element));
    
    // Classification section (se disponível)
    if (element.classification) {
      sections.push(this.buildClassificationSection(element));
    }
    
    // Geometry section (se disponível)
    if (element.geometry) {
      sections.push(this.buildGeometrySection(element));
    }
    
    // Placement section (se disponível)
    if (element.placement) {
      sections.push(this.buildPlacementSection(element));
    }
    
    // Material section (se disponível)
    if (element.materials && element.materials.length > 0) {
      sections.push(this.buildMaterialSection(element));
    }
    
    // Quantities section (se disponível)
    if (element.quantities) {
      sections.push(this.buildQuantitiesSection(element));
    }
    
    // Property Sets
    if (element.propertySets && element.propertySets.length > 0) {
      sections.push(...this.buildPropertySetSections(element));
    }
    
    // Quantity Sets
    if (element.quantitySets && element.quantitySets.length > 0) {
      sections.push(...this.buildQuantitySetSections(element));
    }
    
    // Relationships section (se disponível)
    if (element.relationships) {
      sections.push(this.buildRelationshipsSection(element));
    }
    
    return sections;
  }
  
  private buildIdentitySection(element: IFCElement): PropertySection {
    return {
      category: PropertyCategory.IDENTITY,
      title: 'Identity',
      icon: '🆔',
      expanded: true,
      properties: [
        { name: 'ExpressID', value: element.expressID, type: IFCPropertyType.INTEGER, category: PropertyCategory.IDENTITY },
        { name: 'GlobalID', value: element.globalID, type: IFCPropertyType.STRING, category: PropertyCategory.IDENTITY },
        { name: 'Type', value: element.type, type: IFCPropertyType.STRING, category: PropertyCategory.IDENTITY },
        ...(element.name ? [{ name: 'Name', value: element.name, type: IFCPropertyType.STRING, category: PropertyCategory.IDENTITY }] : []),
        ...(element.description ? [{ name: 'Description', value: element.description, type: IFCPropertyType.STRING, category: PropertyCategory.IDENTITY }] : []),
        ...(element.objectType ? [{ name: 'Object Type', value: element.objectType, type: IFCPropertyType.STRING, category: PropertyCategory.IDENTITY }] : []),
        ...(element.tag ? [{ name: 'Tag', value: element.tag, type: IFCPropertyType.STRING, category: PropertyCategory.IDENTITY }] : [])
      ]
    };
  }
  
  private buildClassificationSection(element: IFCElement): PropertySection {
    const classification = element.classification!;
    return {
      category: PropertyCategory.CLASSIFICATION,
      title: 'Classification',
      icon: '🏷️',
      expanded: false,
      properties: [
        { name: 'System', value: classification.system, type: IFCPropertyType.STRING, category: PropertyCategory.CLASSIFICATION },
        { name: 'Code', value: classification.code, type: IFCPropertyType.STRING, category: PropertyCategory.CLASSIFICATION },
        { name: 'Name', value: classification.name, type: IFCPropertyType.STRING, category: PropertyCategory.CLASSIFICATION }
      ]
    };
  }
  
  private buildGeometrySection(element: IFCElement): PropertySection {
    const geometry = element.geometry!;
    return {
      category: PropertyCategory.GEOMETRY,
      title: 'Geometry',
      icon: '📐',
      expanded: false,
      properties: [
        { name: 'Type', value: geometry.type, type: IFCPropertyType.STRING, category: PropertyCategory.GEOMETRY },
        { name: 'Vertices', value: geometry.vertices, type: IFCPropertyType.INTEGER, category: PropertyCategory.GEOMETRY },
        { name: 'Faces', value: geometry.faces, type: IFCPropertyType.INTEGER, category: PropertyCategory.GEOMETRY },
        ...(geometry.boundingBox ? [
          { name: 'BBox Min X', value: geometry.boundingBox.min.x.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.GEOMETRY },
          { name: 'BBox Min Y', value: geometry.boundingBox.min.y.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.GEOMETRY },
          { name: 'BBox Min Z', value: geometry.boundingBox.min.z.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.GEOMETRY },
          { name: 'BBox Max X', value: geometry.boundingBox.max.x.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.GEOMETRY },
          { name: 'BBox Max Y', value: geometry.boundingBox.max.y.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.GEOMETRY },
          { name: 'BBox Max Z', value: geometry.boundingBox.max.z.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.GEOMETRY }
        ] : [])
      ]
    };
  }
  
  private buildPlacementSection(element: IFCElement): PropertySection {
    const placement = element.placement!;
    return {
      category: PropertyCategory.PLACEMENT,
      title: 'Placement',
      icon: '📍',
      expanded: false,
      properties: [
        { name: 'Location X', value: placement.location.x.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.PLACEMENT },
        { name: 'Location Y', value: placement.location.y.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.PLACEMENT },
        { name: 'Location Z', value: placement.location.z.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.PLACEMENT }
      ]
    };
  }
  
  private buildMaterialSection(element: IFCElement): PropertySection {
    const materials = element.materials!;
    const properties: IFCProperty[] = materials.flatMap((mat, idx) => [
      { name: `Material ${idx + 1} Name`, value: mat.name, type: IFCPropertyType.STRING, category: PropertyCategory.MATERIAL },
      { name: `Material ${idx + 1} Type`, value: mat.type, type: IFCPropertyType.STRING, category: PropertyCategory.MATERIAL },
      ...(mat.layerThickness ? [{ name: `Material ${idx + 1} Thickness`, value: mat.layerThickness, type: IFCPropertyType.REAL, unit: 'mm', category: PropertyCategory.MATERIAL }] : [])
    ]);
    
    return {
      category: PropertyCategory.MATERIAL,
      title: 'Material',
      icon: '🧱',
      expanded: false,
      properties
    };
  }
  
  private buildQuantitiesSection(element: IFCElement): PropertySection {
    const quantities = element.quantities!;
    const properties: IFCProperty[] = [];
    
    if (quantities.length !== undefined) properties.push({ name: 'Length', value: quantities.length.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.QUANTITIES });
    if (quantities.width !== undefined) properties.push({ name: 'Width', value: quantities.width.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.QUANTITIES });
    if (quantities.height !== undefined) properties.push({ name: 'Height', value: quantities.height.toFixed(3), type: IFCPropertyType.REAL, unit: 'm', category: PropertyCategory.QUANTITIES });
    if (quantities.area !== undefined) properties.push({ name: 'Area', value: quantities.area.toFixed(3), type: IFCPropertyType.REAL, unit: 'm²', category: PropertyCategory.QUANTITIES });
    if (quantities.volume !== undefined) properties.push({ name: 'Volume', value: quantities.volume.toFixed(3), type: IFCPropertyType.REAL, unit: 'm³', category: PropertyCategory.QUANTITIES });
    if (quantities.weight !== undefined) properties.push({ name: 'Weight', value: quantities.weight.toFixed(3), type: IFCPropertyType.REAL, unit: 'kg', category: PropertyCategory.QUANTITIES });
    
    return {
      category: PropertyCategory.QUANTITIES,
      title: 'Quantities',
      icon: '📊',
      expanded: false,
      properties
    };
  }
  
  private buildPropertySetSections(element: IFCElement): PropertySection[] {
    return element.propertySets!.map(pset => ({
      category: PropertyCategory.PSET,
      title: pset.name,
      icon: '📦',
      expanded: false,
      properties: Object.entries(pset.properties).map(([key, value]) => ({
        name: key,
        value: value,
        type: this.inferPropertyType(value),
        category: PropertyCategory.PSET
      }))
    }));
  }
  
  private buildQuantitySetSections(element: IFCElement): PropertySection[] {
    return element.quantitySets!.map(qset => ({
      category: PropertyCategory.QSET,
      title: qset.name,
      icon: '📏',
      expanded: false,
      properties: Object.entries(qset.quantities).map(([key, value]) => ({
        name: key,
        value: value,
        type: IFCPropertyType.REAL,
        category: PropertyCategory.QSET
      }))
    }));
  }
  
  private buildRelationshipsSection(element: IFCElement): PropertySection {
    const rel = element.relationships!;
    const properties: IFCProperty[] = [];
    
    if (rel.containedIn) properties.push({ name: 'Contained In', value: rel.containedIn, type: IFCPropertyType.REFERENCE, category: PropertyCategory.RELATIONSHIPS });
    if (rel.contains) properties.push({ name: 'Contains', value: `${rel.contains.length} elements`, type: IFCPropertyType.LIST, category: PropertyCategory.RELATIONSHIPS });
    if (rel.relatedTo) properties.push({ name: 'Related To', value: `${rel.relatedTo.length} elements`, type: IFCPropertyType.LIST, category: PropertyCategory.RELATIONSHIPS });
    
    return {
      category: PropertyCategory.RELATIONSHIPS,
      title: 'Relationships',
      icon: '🔗',
      expanded: false,
      properties
    };
  }
  
  /**
   * Infere tipo de propriedade baseado no valor
   */
  private inferPropertyType(value: any): IFCPropertyType {
    if (value === null || value === undefined) return IFCPropertyType.NULL;
    if (typeof value === 'boolean') return IFCPropertyType.BOOLEAN;
    if (typeof value === 'number') {
      return Number.isInteger(value) ? IFCPropertyType.INTEGER : IFCPropertyType.REAL;
    }
    if (typeof value === 'string') return IFCPropertyType.STRING;
    if (Array.isArray(value)) return IFCPropertyType.LIST;
    return IFCPropertyType.STRING;
  }
  
  /**
   * Obtém estatísticas do cache
   */
  public getCacheStats(): { size: number; keys: number[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton
export const propertyExtractor = new PropertyExtractor();

