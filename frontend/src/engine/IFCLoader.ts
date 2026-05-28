import * as THREE from 'three';
// @ts-ignore - web-ifc-three pode não ter tipos completos
import { IFCLoader as ThreeIFCLoader } from 'web-ifc-three';
import { LODSystem } from '../systems/LODSystem';
import { LayerManager } from '../systems/layers/LayerManager';
import { IFCElementType } from '../systems/layers/LayerTypes';

/**
 * IFC Loader otimizado
 * Carrega arquivos IFC com otimizações de performance e LOD
 */
export class IFCLoader {
  private scene: THREE.Scene;
  private loader: ThreeIFCLoader;
  private lodSystem: LODSystem;
  private layerManager: LayerManager | null = null;
  private loadedModels: THREE.Object3D[] = [];
  private loadingCallbacks: Map<string, (progress: number) => void> = new Map();
  private currentModelID: number = 0; // Armazena o ID do modelo atual

  constructor(scene: THREE.Scene, lodSystem: LODSystem, layerManager?: LayerManager) {
    this.scene = scene;
    this.lodSystem = lodSystem;
    this.layerManager = layerManager || null;
    this.loader = new ThreeIFCLoader();
    
    this.setupLoader();
  }

  private setupLoader(): void {
    // Define o caminho dos arquivos WASM - usando local
    this.loader.ifcManager.setWasmPath('/wasm/');
    
    // Disable workers para evitar erros 404
    this.loader.ifcManager.useWebWorkers(false);
    
    // Otimizações de memória
    this.loader.ifcManager.applyWebIfcConfig({
      COORDINATE_TO_ORIGIN: true, // Centraliza modelo na origem
      USE_FAST_BOOLS: true, // Usa operações booleanas rápidas
    });
    
    console.log('✅ IFCLoader configured: WASM=/wasm/, Workers=DISABLED');
  }

  /**
   * Carrega arquivo IFC
   */
  public async loadIFC(file: File): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Detecta versão IFC antes do carregamento
        const ifcVersion = await this.detectIFCVersion(file);
        console.log(`📋 Detectada versão IFC: ${ifcVersion}`);
        
        // Valida suporte à versão
        if (!this.isSupportedIFCVersion(ifcVersion)) {
          throw new Error(`Versão IFC não suportada: ${ifcVersion}. Suportadas: IFC2X3, IFC4, IFC4X3`);
        }
        
        const url = URL.createObjectURL(file);
        
        // Callback de progresso
        const onProgress = (event: ProgressEvent) => {
          const progress = (event.loaded / event.total) * 100;
          this.updateLoadingProgress(progress);
          
          const callback = this.loadingCallbacks.get(file.name);
          if (callback) callback(progress);
        };

        // Callback de erro
        const onError = (error: ErrorEvent) => {
          console.error('❌ Erro ao carregar IFC:', error);
          URL.revokeObjectURL(url);
          reject(error);
        };

        // Carrega o modelo
        this.loader.load(
          url,
          async (model) => {
            console.log('✅ IFC carregado com sucesso!');
            
            // Valida schema IFC
            const isValid = await this.validateIFCSchema(ifcVersion);
            if (!isValid) {
              console.warn('⚠️ Modelo IFC pode ter problemas de conformidade');
            }

            // Verifica compliance OpenBIM
            const complianceResult = await this.checkOpenBIMCompliance(ifcVersion);
            if (!complianceResult.compliant) {
              console.warn('⚠️ Modelo IFC não está totalmente compliant com OpenBIM');
              console.warn('📋 Issues:', complianceResult.issues);
            }
            
            this.processLoadedModel(model, ifcVersion);
            URL.revokeObjectURL(url);
            resolve();
          },
          onProgress,
          onError
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Processa modelo carregado aplicando otimizações
   */
  private processLoadedModel(model: THREE.Object3D, ifcVersion: string): void {
    // Obtém o modelID do modelo carregado
    const modelID = (model as any).modelID || this.currentModelID;
    console.log(`📋 Modelo IFC carregado - ID: ${modelID}`);
    
    // Cria layers automáticos por tipo IFC se LayerManager disponível
    const layersByType = new Map<string, string>();
    
    // Armazena modelID e expressID em todos os meshes
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Armazena IDs no userData para acesso posterior
        child.userData.modelID = modelID;
        
        // Copia expressID se existir
        if ((child as any).expressID) {
          child.userData.expressID = (child as any).expressID;
          
          // Se tem LayerManager, organiza por tipo
          if (this.layerManager) {
            const ifcType = this.detectIFCType(child);
            
            // Cria layer para este tipo se não existe
            if (!layersByType.has(ifcType)) {
              const layer = this.layerManager.createLayer({
                name: ifcType,
                type: ifcType,
                category: this.getCategoryForType(ifcType),
                color: LayerManager.getDefaultColorForType(ifcType as IFCElementType),
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
    
    // Otimiza geometrias
    this.optimizeGeometries(model);
    
    // Adiciona à cena
    this.scene.add(model);
    this.loadedModels.push(model);
    
    // Incrementa modelID para próximo modelo
    this.currentModelID++;
    
    // Registra no sistema LOD
    this.lodSystem.registerModel(model);
    
    // Calcula bounding box para centralizar visualização
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('📦 Dimensões do modelo (escala 1:1):');
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
   * Detecta tipo IFC do objeto
   */
  private detectIFCType(object: THREE.Object3D): string {
    // Tenta detectar pelo nome
    const name = object.name.toUpperCase();
    
    for (const type of Object.values(IFCElementType)) {
      if (name.includes(type)) {
        return type;
      }
    }
    
    // Tenta detectar pelo userData
    if (object.userData.ifcType) {
      return object.userData.ifcType;
    }
    
    return IFCElementType.OTHER;
  }

  /**
   * Obtém categoria para tipo IFC
   */
  private getCategoryForType(type: string): string {
    const structural = [IFCElementType.WALL, IFCElementType.SLAB, IFCElementType.BEAM, IFCElementType.COLUMN, IFCElementType.ROOF];
    const openings = [IFCElementType.DOOR, IFCElementType.WINDOW];
    const circulation = [IFCElementType.STAIR, IFCElementType.RAILING];
    
    if (structural.includes(type as IFCElementType)) return 'Estrutura';
    if (openings.includes(type as IFCElementType)) return 'Aberturas';
    if (circulation.includes(type as IFCElementType)) return 'Circulação';
    if (type === IFCElementType.FURNITURE) return 'Mobiliário';
    if (type === IFCElementType.SPACE) return 'Espaços';
    
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
   * Detecta versão IFC do arquivo
   */
  private async detectIFCVersion(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const lines = content.split('\n');
          
          // Procura pela linha HEADER
          for (const line of lines) {
            if (line.includes('FILE_SCHEMA')) {
              if (line.includes('IFC2X3')) {
                resolve('IFC2X3');
                return;
              } else if (line.includes('IFC4X3')) {
                resolve('IFC4X3');
                return;
              } else if (line.includes('IFC4')) {
                resolve('IFC4');
                return;
              }
            }
          }
          
          // Se não encontrou, assume IFC4 como padrão
          resolve('IFC4');
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo IFC'));
      
      // Lê apenas o início do arquivo para detectar versão
      const blob = file.slice(0, 1024 * 10); // 10KB deve ser suficiente
      reader.readAsText(blob);
    });
  }

  /**
   * Valida schema IFC básico
   */
  private async validateIFCSchema(ifcVersion: string): Promise<boolean> {
    try {
      // Verifica se há elementos básicos no modelo
      const spatialStructure = await this.loader.ifcManager.getSpatialStructure(0);
      
      if (!spatialStructure || spatialStructure.children.length === 0) {
        console.warn('⚠️ Estrutura espacial IFC vazia ou inválida');
        return false;
      }
      
      // Verifica se há pelo menos um projeto
      const projects = spatialStructure.children.filter((child: any) => 
        child.type === 'IFCPROJECT'
      );
      
      if (projects.length === 0) {
        console.warn('⚠️ Nenhum projeto IFC encontrado');
        return false;
      }
      
      console.log(`✅ Schema IFC validado: ${projects.length} projeto(s) encontrado(s)`);
      return true;
    } catch (error) {
      console.error('❌ Erro na validação do schema IFC:', error);
      return false;
    }
  }

  /**
   * Verifica compliance OpenBIM do modelo
   */
  private async checkOpenBIMCompliance(ifcVersion: string): Promise<{ compliant: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      // 1. Verifica estrutura espacial
      const spatialStructure = await this.loader.ifcManager.getSpatialStructure(0);
      if (!spatialStructure || spatialStructure.children.length === 0) {
        issues.push('Estrutura espacial IFC ausente ou vazia');
      }

      // 2. Verifica presença de projeto
      const projects = spatialStructure.children.filter((child: any) => 
        child.type === 'IFCPROJECT'
      );
      if (projects.length === 0) {
        issues.push('Nenhum projeto IFC (IFCPROJECT) encontrado');
      }

      // 3. Verifica geometria válida
      const geometryIssues = await this.validateGeometryCompliance();
      issues.push(...geometryIssues);

      // 4. Verifica propriedades IFC
      const propertyIssues = await this.validatePropertyCompliance();
      issues.push(...propertyIssues);

      // 5. Verifica relacionamentos
      const relationshipIssues = await this.validateRelationshipCompliance();
      issues.push(...relationshipIssues);

      const compliant = issues.length === 0;
      
      console.log(`🔍 OpenBIM Compliance check: ${compliant ? 'PASSOU' : 'FALHOU'}`);
      if (!compliant) {
        console.log('📋 Issues encontrados:', issues);
      }

      return { compliant, issues };
    } catch (error) {
      issues.push(`Erro na verificação de compliance: ${error}`);
      return { compliant: false, issues };
    }
  }

  /**
   * Valida geometria para compliance OpenBIM
   */
  private async validateGeometryCompliance(): Promise<string[]> {
    const issues: string[] = [];
    
    // Verifica se há meshes com geometria válida
    let totalMeshes = 0;
    let invalidMeshes = 0;

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        totalMeshes++;
        
        if (!child.geometry) {
          invalidMeshes++;
          issues.push(`Mesh sem geometria: ${child.name}`);
        } else if (!child.geometry.attributes.position) {
          invalidMeshes++;
          issues.push(`Mesh sem posições: ${child.name}`);
        }
      }
    });

    if (invalidMeshes > 0) {
      issues.push(`${invalidMeshes}/${totalMeshes} meshes com geometria inválida`);
    }

    return issues;
  }

  /**
   * Valida propriedades IFC para compliance
   */
  private async validatePropertyCompliance(): Promise<string[]> {
    const issues: string[] = [];
    
    // Verifica se elementos têm propriedades básicas
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && (child as any).expressID) {
        const expressID = (child as any).expressID;
        
        // Tenta obter propriedades básicas
        try {
          const properties = this.loader.ifcManager.getItemProperties(0, expressID, false);
          if (!properties || Object.keys(properties).length === 0) {
            issues.push(`Elemento ${expressID} sem propriedades IFC`);
          }
        } catch (e) {
          issues.push(`Erro ao acessar propriedades do elemento ${expressID}`);
        }
      }
    });

    return issues;
  }

  /**
   * Valida relacionamentos IFC para compliance
   */
  private async validateRelationshipCompliance(): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      // Verifica estrutura de agregação
      const spatialStructure = await this.loader.ifcManager.getSpatialStructure(0);
      
      const validateNode = (node: any, path: string = ''): void => {
        if (!node.children || node.children.length === 0) {
          // Nó folha deve ter elementos relacionados
          if (!node.expressID) {
            issues.push(`Nó sem expressID: ${path}/${node.name || 'unnamed'}`);
          }
        } else {
          // Nó pai deve ter filhos válidos
          node.children.forEach((child: any, index: number) => {
            validateNode(child, `${path}/${node.name || 'unnamed'}[${index}]`);
          });
        }
      };

      if (spatialStructure.children) {
        spatialStructure.children.forEach((child: any, index: number) => {
          validateNode(child, `root[${index}]`);
        });
      }
    } catch (error) {
      issues.push(`Erro na validação de relacionamentos: ${error}`);
    }

    return issues;
  }

  /**
   * Gera relatório de compliance OpenBIM
   */
  public async generateComplianceReport(ifcVersion: string): Promise<string> {
    const complianceResult = await this.checkOpenBIMCompliance(ifcVersion);
    
    const report = {
      timestamp: new Date().toISOString(),
      ifcVersion,
      compliant: complianceResult.compliant,
      totalIssues: complianceResult.issues.length,
      issues: complianceResult.issues,
      modelStats: this.getModelStatistics()
    };

    // Gera relatório HTML
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>OpenBIM Compliance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .status { font-size: 24px; font-weight: bold; }
        .status.pass { color: green; }
        .status.fail { color: red; }
        .issues { margin-top: 20px; }
        .issue { background: #ffebee; padding: 10px; margin: 5px 0; border-left: 4px solid #f44336; }
        .stats { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OpenBIM Compliance Report</h1>
        <p><strong>IFC Version:</strong> ${report.ifcVersion}</p>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p class="status ${report.compliant ? 'pass' : 'fail'}">
            Status: ${report.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
        </p>
    </div>

    <div class="stats">
        <h2>Model Statistics</h2>
        <p><strong>Meshes:</strong> ${report.modelStats.meshes}</p>
        <p><strong>Triangles:</strong> ${report.modelStats.triangles.toLocaleString()}</p>
        <p><strong>Materials:</strong> ${report.modelStats.materials}</p>
    </div>

    <div class="issues">
        <h2>Issues Found (${report.totalIssues})</h2>
        ${report.issues.length > 0 
            ? report.issues.map(issue => `<div class="issue">${issue}</div>`).join('')
            : '<p>No issues found - model is fully compliant!</p>'
        }
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Obtém estatísticas do modelo
   */
  private getModelStatistics(): { meshes: number; triangles: number; materials: number } {
    let meshes = 0;
    let triangles = 0;
    let materials = 0;
    const materialSet = new Set<string>();

    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes++;
        
        if (child.geometry.index) {
          triangles += child.geometry.index.count / 3;
        }
        
        // Conta materiais únicos
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => materialSet.add(mat.uuid));
        } else if (child.material) {
          materialSet.add(child.material.uuid);
        }
      }
    });

    materials = materialSet.size;

    return { meshes, triangles: Math.floor(triangles), materials };
  }
}
