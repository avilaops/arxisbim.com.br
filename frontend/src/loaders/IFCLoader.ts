import * as THREE from 'three';
// @ts-ignore - web-ifc-three pode não ter tipos completos
import { IFCLoader as ThreeIFCLoader } from 'web-ifc-three';
import { LODSystem } from '../systems/LODSystem';
import { eventBus, EventType } from '../core';
import { EntityManager, TransformComponent, MeshComponent, LODComponent } from '../engine/ecs';
import { ScaleManager } from '../engine/ScaleManager';
import { CoordinateSystem } from '../engine/CoordinateSystem';
import { ifc43InfrastructureLoader, IFC43_NEW_TYPES, IFC43_INFRASTRUCTURE_TYPES } from './IFC43Extensions';

/**
 * IFC Loader otimizado
 * Carrega arquivos IFC com otimizações de performance e LOD
 */
export class IFCLoader {
  private scene: THREE.Scene;
  private loader: ThreeIFCLoader;
  private lodSystem: LODSystem;
  private layerManager: any | null = null;
  private entityManager: EntityManager;
  private loadedModels: THREE.Object3D[] = [];
  private loadingCallbacks: Map<string, (progress: number) => void> = new Map();
  private onEntitiesCreated?: () => void;
  private scaleManager: ScaleManager;
  private coordinateSystem: CoordinateSystem;
  private currentModelID: number = 0;
  private wasmInitialized: boolean = false;

  constructor(scene: THREE.Scene, lodSystem: LODSystem, entityManager: EntityManager, onEntitiesCreated?: () => void, layerManager?: any) {
    this.scene = scene;
    this.lodSystem = lodSystem;
    this.entityManager = entityManager;
    this.onEntitiesCreated = onEntitiesCreated;
    this.layerManager = layerManager || null;
    this.scaleManager = ScaleManager.getInstance();
    this.coordinateSystem = CoordinateSystem.getInstance();
    this.loader = new ThreeIFCLoader();
    
    this.setupLoader();
  }

  private setupLoader(): void {
    // CRÍTICO: Configuração agressiva para forçar single-thread
    const wasmPath = `${import.meta.env.BASE_URL || '/'}wasm/`;
    
    // 1. Define path ANTES de tudo
    this.loader.ifcManager.setWasmPath(wasmPath);
    
    // 2. Desabilita workers explicitamente MÚLTIPLAS VEZES (bug em versões antigas)
    try {
      this.loader.ifcManager.useWebWorkers(false);
      // @ts-ignore - Força worker=null (fallback)
      if (this.loader.ifcManager.worker) {
        this.loader.ifcManager.worker = null;
      }
    } catch (e) {
      console.warn('Failed to disable workers:', e);
    }
    
    // 3. Força configuração single-thread via applyWebIfcConfig
    this.loader.ifcManager.applyWebIfcConfig({
      COORDINATE_TO_ORIGIN: true,
      USE_FAST_BOOLS: true,
    });
    
    // 4. Log detalhado
    console.log(`✅ IFCLoader configured:`);
    console.log(`   - WASM path: ${wasmPath}`);
    console.log(`   - Workers: FORCE DISABLED`);
    console.log(`   - Expected WASM: ${wasmPath}web-ifc.wasm (single-thread)`);
  }

  /**
   * Carrega arquivo IFC
   */
  public async loadIFC(file: File): Promise<void> {
    console.log(`📦 Loading IFC file: ${file.name}`);
    
    // Emit loading started
    eventBus.emit(EventType.MODEL_LOAD_REQUESTED, {
      kind: 'ifc',
      source: 'file',
      fileName: file.name
    });
    
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      
      // Callback de progresso
      const onProgress = (event: ProgressEvent) => {
        const progress = (event.loaded / event.total) * 100;
        this.updateLoadingProgress(progress);
        
        // Emit progress event
        eventBus.emit(EventType.MODEL_LOAD_PROGRESS, {
          fileName: file.name,
          progress: Math.round(progress)
        });
        
        const callback = this.loadingCallbacks.get(file.name);
        if (callback) callback(progress);
      };

      // Callback de erro
      const onError = (error: ErrorEvent) => {
        console.error('❌ Erro ao carregar IFC:', error);
        
        // Emit error event
        eventBus.emit(EventType.MODEL_LOAD_FAILED, {
          fileName: file.name,
          error: error.message || 'Failed to load IFC file'
        });
        
        URL.revokeObjectURL(url);
        reject(error);
      };

      // Carrega o modelo
      this.loader.load(
        url,
        (model) => {
          console.log('✅ IFC carregado com sucesso!');
          this.processLoadedModel(model, file.name);
          
          // Emit loaded event
          eventBus.emit(EventType.MODEL_LOADED, {
            fileName: file.name,
            assetId: `ifc-${Date.now()}`,
            bounds: new THREE.Box3().setFromObject(model)
          });
          
          URL.revokeObjectURL(url);
          resolve();
        },
        onProgress,
        onError
      );
    });
  }

  /**
   * Processa modelo carregado aplicando otimizações
   */
  private processLoadedModel(model: THREE.Object3D, fileName?: string): void {
    // Obtém o modelID do modelo carregado
    const modelID = (model as any).modelID || this.currentModelID;
    console.log(`📋 Modelo IFC carregado - ID: ${modelID}`);
    
    // Configura unidades métricas baseado no IFC
    this.configureMetricScale(model);
    
    // Aplica escala métrica ao modelo
    this.scaleManager.applyScale(model);
    
    // Cria layers automáticos por tipo IFC se LayerManager disponível
    const layersByType = new Map<string, string>();
    
    // Processa entidades IFC 4.3 (Infrastructure)
    let ifc43EntitiesFound = 0;
    
    // Armazena modelID e expressID em todos os meshes
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Armazena IDs no userData para acesso posterior
        child.userData.modelID = modelID;
        
        // Copia expressID se existir
        if ((child as any).expressID) {
          child.userData.expressID = (child as any).expressID;
          
          // Detecta tipo IFC
          const ifcType = this.detectIFCType(child);
          child.userData.ifcType = ifcType;
          
          // Verifica se é entidade IFC 4.3
          if (IFC43_NEW_TYPES.includes(ifcType) || IFC43_INFRASTRUCTURE_TYPES.includes(ifcType)) {
            console.log(`🏗️ IFC 4.3 entity found: ${ifcType}`);
            ifc43EntitiesFound++;
            
            // Processa com IFC43InfrastructureLoader
            try {
              const entity = {
                type: ifcType,
                GlobalId: { value: child.userData.ifcGuid || child.uuid },
                Name: { value: child.name }
              };
              ifc43InfrastructureLoader.processIFC43Entity(entity, this.scene);
            } catch (error) {
              console.warn(`⚠️ Failed to process IFC 4.3 entity:`, error);
            }
          }
          
          // Se tem LayerManager, organiza por tipo
          if (this.layerManager) {
            
            // Cria layer para este tipo se não existe
            if (!layersByType.has(ifcType)) {
              const layer = this.layerManager.createLayer({
                name: ifcType,
                type: ifcType,
                category: this.getCategoryForType(ifcType),
                color: 0xFFFFFF,
                visible: true,
                locked: false,
                plotable: true
              });
              layersByType.set(ifcType, layer.id);
              console.log(`   ✅ Layer criado: ${ifcType}`);
            }
            
            // Adiciona objeto ao layer
            const layerId = layersByType.get(ifcType)!;
            this.layerManager.addObjectToLayer(child, layerId);
          }
          
          console.log(`   Mesh ${child.name || 'sem nome'} - expressID: ${child.userData.expressID}`);
        }
      }
    });
    
    // Log IFC 4.3 entities
    if (ifc43EntitiesFound > 0) {
      console.log(`🏗️ Total IFC 4.3 entities processed: ${ifc43EntitiesFound}`);
    }
    
    // Otimiza geometrias
    this.optimizeGeometries(model);
    
    // Adiciona à cena
    this.scene.add(model);
    this.loadedModels.push(model);
    
    // Cria entidades ECS para meshes IFC
    this.createECSEntitiesForModel(model);
    
    // Notifica sistemas que novas entidades foram criadas
    if (this.onEntitiesCreated) {
      this.onEntitiesCreated();
    }
    
    // Incrementa modelID para próximo modelo
    this.currentModelID++;
    
    // Registra no sistema LOD
    this.lodSystem.registerModel(model);
    
    // Calcula bounding box para centralizar visualização
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('📦 Dimensões do modelo (precisão métrica 1:1):');
    console.log(`   Largura: ${size.x.toFixed(2)}m`);
    console.log(`   Altura: ${size.y.toFixed(2)}m`);
    console.log(`   Profundidade: ${size.z.toFixed(2)}m`);
    console.log(`   Centro: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`);
    
    if (this.layerManager) {
      console.log(`📚 ${layersByType.size} layers criados automaticamente`);
    }
    
    // Atualiza UI
    this.updateModelInfo(model);
  }

  /**
   * Configura escala métrica baseada no arquivo IFC
   */
  private configureMetricScale(model: THREE.Object3D): void {
    try {
      // Tenta obter informações de unidades do IFC
      const ifcData = this.extractIFCData(model);
      this.scaleManager.setUnitsFromIFC(ifcData);
      
      // Configura sistema de coordenadas
      this.coordinateSystem.loadFromIFC(ifcData);
      
      // Valida medições após aplicação da escala
      this.scaleManager.validateMeasurements(model);
      
    } catch (error) {
      console.warn('⚠️ Não foi possível configurar escala métrica automaticamente:', error);
      console.log('📏 Usando escala padrão (1 unidade = 1 metro)');
    }
  }

  /**
   * Extrai dados IFC do modelo carregado
   */
  private extractIFCData(model: THREE.Object3D): any {
    // Tenta acessar dados IFC através do loader
    const modelID = (model as any).modelID;
    if (modelID !== undefined && this.loader.ifcManager) {
      try {
        // Tenta obter informações do projeto IFC
        const project = this.loader.ifcManager.getSpatialStructure(modelID);
        if (project) {
          return {
            units: this.detectIFCUnits(modelID),
            project: project
          };
        }
      } catch (error) {
        console.warn('Erro ao extrair dados IFC:', error);
      }
    }

    // Fallback: retorna dados básicos
    return {
      units: { type: 'MILLIMETRE' } // Assume milímetros como padrão
    };
  }

  /**
   * Detecta unidades do arquivo IFC
   */
  private detectIFCUnits(modelID: number): any {
    try {
      // Tenta obter unidades do projeto IFC
      const units = this.loader.ifcManager.getUnits(modelID);
      if (units && units.length > 0) {
        return units[0]; // Retorna primeira unidade encontrada
      }
    } catch (error) {
      console.warn('Erro ao detectar unidades IFC:', error);
    }

    // Fallback
    return { type: 'MILLIMETRE' };
  }

  /**
   * Detecta tipo IFC do objeto
   */
  private detectIFCType(object: THREE.Object3D): string {
    // Tenta detectar pelo nome
    const name = object.name.toUpperCase();
    
    const types = ['WALL', 'SLAB', 'BEAM', 'COLUMN', 'DOOR', 'WINDOW', 'ROOF', 'STAIR', 'RAILING', 'FURNITURE', 'SPACE'];
    for (const type of types) {
      if (name.includes(type)) {
        return type;
      }
    }
    
    // Tenta detectar pelo userData
    if (object.userData.ifcType) {
      return object.userData.ifcType;
    }
    
    return 'OTHER';
  }

  /**
   * Obtém categoria para tipo IFC
   */
  private getCategoryForType(type: string): string {
    const structural = ['WALL', 'SLAB', 'BEAM', 'COLUMN', 'ROOF'];
    const openings = ['DOOR', 'WINDOW'];
    const circulation = ['STAIR', 'RAILING'];
    
    if (structural.includes(type)) return 'Estrutura';
    if (openings.includes(type)) return 'Aberturas';
    if (circulation.includes(type)) return 'Circulação';
    if (type === 'FURNITURE') return 'Mobiliário';
    if (type === 'SPACE') return 'Espaços';
    
    return 'Outros';
  }

  /**
   * Otimiza geometrias para melhor performance
   */
  private optimizeGeometries(model: THREE.Object3D): void {
    let meshCount = 0;
    let triangleCount = 0;

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++;

        // Computa normais se necessário
        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }

        // Computa bounding sphere para culling
        child.geometry.computeBoundingSphere();
        child.geometry.computeBoundingBox();

        // Conta triângulos
        if (child.geometry.index) {
          triangleCount += child.geometry.index.count / 3;
        }

        // Habilita frustum culling
        child.frustumCulled = true;

        // Configura recepção e projeção de sombras
        child.castShadow = true;
        child.receiveShadow = true;

        // Otimiza material
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => this.optimizeMaterial(mat));
          } else {
            this.optimizeMaterial(child.material);
          }
        }
      }
    });

    console.log(`🔧 Otimização concluída:`);
    console.log(`   Meshes: ${meshCount}`);
    console.log(`   Triângulos: ${triangleCount.toLocaleString()}`);
  }

  /**
   * Otimiza material para PBR realista
   */
  private optimizeMaterial(material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      // Configurações PBR
      material.roughness = 0.7;
      material.metalness = 0.1;
      material.envMapIntensity = 1.0;
      
      // Habilita flat shading para objetos arquitetônicos (opcional)
      // material.flatShading = true;
    }
  }

  /**
   * Obtém propriedades de um elemento IFC
   */
  public async getProperties(modelID: number, expressID: number): Promise<any> {
    try {
      console.log(`🔍 Buscando propriedades - ModelID: ${modelID}, ExpressID: ${expressID}`);
      const properties = await this.loader.ifcManager.getItemProperties(modelID, expressID);
      console.log('✅ Propriedades encontradas:', properties);
      return properties;
    } catch (error) {
      console.error('❌ Erro ao buscar propriedades:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as propriedades de um elemento (incluindo Psets)
   */
  public async getAllProperties(modelID: number, expressID: number): Promise<any> {
    try {
      console.log(`🔍 Buscando TODAS propriedades - ModelID: ${modelID}, ExpressID: ${expressID}`);
      
      // Obtém propriedades básicas
      const properties = await this.loader.ifcManager.getItemProperties(modelID, expressID, true);
      
      // Tenta obter Psets (Property Sets)
      try {
        const psets = await this.loader.ifcManager.getPropertySets(modelID, expressID, true);
        if (psets && psets.length > 0) {
          properties.psets = psets;
          console.log(`📊 ${psets.length} Property Sets encontrados`);
        }
      } catch (e) {
        console.warn('Nenhum Pset encontrado para este elemento');
      }
      
      // Tenta obter tipo do elemento
      try {
        const type = await this.loader.ifcManager.getTypeProperties(modelID, expressID, true);
        if (type) {
          properties.type = type;
          console.log('🏗️ Tipo do elemento encontrado');
        }
      } catch (e) {
        console.warn('Tipo do elemento não encontrado');
      }
      
      console.log('✅ Todas propriedades carregadas:', properties);
      return properties;
    } catch (error) {
      console.error('❌ Erro ao buscar todas propriedades:', error);
      throw error;
    }
  }

  /**
   * Obtém propriedades espaciais de um elemento
   */
  public async getSpatialStructure(modelID: number): Promise<any> {
    return await this.loader.ifcManager.getSpatialStructure(modelID);
  }

  /**
   * Obtém o IFC Manager para uso avançado
   */
  public getIfcManager(): any {
    return this.loader.ifcManager;
  }

  /**
   * Obtém modelos carregados
   */
  public getLoadedModels(): THREE.Object3D[] {
    return this.loadedModels;
  }

  /**
   * Atualiza progresso do carregamento
   */
  private updateLoadingProgress(progress: number): void {
    const progressBar = document.getElementById('loading-progress');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  /**
   * Atualiza informações do modelo na UI
   */
  private updateModelInfo(model: THREE.Object3D): void {
    let meshCount = 0;
    let triangleCount = 0;

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++;
        if (child.geometry.index) {
          triangleCount += child.geometry.index.count / 3;
        }
      }
    });

    const objectsElement = document.getElementById('objects-count');
    const trianglesElement = document.getElementById('triangles-count');

    if (objectsElement) {
      objectsElement.textContent = `Objetos: ${meshCount.toLocaleString()}`;
    }
    if (trianglesElement) {
      trianglesElement.textContent = `Triângulos: ${Math.floor(triangleCount).toLocaleString()}`;
    }
  }

  /**
   * Registra callback de progresso
   */
  public onLoadProgress(filename: string, callback: (progress: number) => void): void {
    this.loadingCallbacks.set(filename, callback);
  }

  /**
   * Remove modelo da cena
   */
  public removeModel(model: THREE.Object3D): void {
    this.scene.remove(model);
    const index = this.loadedModels.indexOf(model);
    if (index > -1) {
      this.loadedModels.splice(index, 1);
    }
    
    // Limpa recursos
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  /**
   * Remove todos os modelos
   */
  public clear(): void {
    this.loadedModels.forEach(model => this.removeModel(model));
    this.loadedModels = [];
  }

  /**
   * Cria entidades ECS para meshes do modelo IFC
   */
  private createECSEntitiesForModel(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.expressID) {
        // Converte coordenadas locais para globais
        const globalPosition = this.coordinateSystem.localToGlobal(child.position.clone());
        
        // Cria entidade para este mesh
        const entity = this.entityManager.createEntity();

        // Adiciona componentes com coordenadas globais
        entity.addComponent(new TransformComponent(globalPosition, child.rotation.clone(), child.scale.clone()));
        entity.addComponent(new MeshComponent(child));
        entity.addComponent(new LODComponent(0, 100)); // LOD básico

        console.log(`🆕 Entidade ECS criada para mesh IFC: ${child.userData.expressID} at (${globalPosition.x.toFixed(2)}, ${globalPosition.y.toFixed(2)}, ${globalPosition.z.toFixed(2)})`);
      }
    });
  }

  /**
   * Obtém estatísticas de escala métrica
   */
  public getScaleStats() {
    return this.scaleManager.getScaleStats();
  }

  /**
   * Obtém estatísticas do sistema de coordenadas
   */
  public getCoordinateStats() {
    return this.coordinateSystem.getStats();
  }

  /**
   * Obtém o tipo IFC de um elemento (novo método sem duplicação)
   */
  public async getType(modelID: number, expressID: number): Promise<any> {
    try {
      return await this.loader.ifcManager.getTypeProperties(modelID, expressID);
    } catch (error) {
      console.warn(`Erro ao obter tipo do elemento ${expressID}:`, error);
      return null;
    }
  }

  /**
   * Obtém o modelo IFC pelo ID
   */
  public getModel(modelID: number): THREE.Object3D | undefined {
    return this.loadedModels.find((model: any) => model.modelID === modelID);
  }

  /**
   * Obtém o IFC Manager para acesso direto (novo método sem duplicação)
   */
  public getIFCManager() {
    return this.loader.ifcManager;
  }

  public dispose(): void {
    this.clear();
    this.loader.ifcManager.dispose();
    this.loadingCallbacks.clear();
  }
}
