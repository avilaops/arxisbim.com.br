/**
 * FederatedLoader - Gerenciador de modelos IFC federados
 * Permite carregar e coordenar múltiplos arquivos IFC simultaneamente
 * 
 * Casos de uso:
 * - Arquitetura + Estrutura + MEP (hidráulica, elétrica, HVAC)
 * - Múltiplos edifícios em um campus
 * - Fases de construção (existente + reforma + ampliação)
 * - Coordenação entre disciplinas
 */

import * as THREE from 'three';
import { IFCLoader } from 'web-ifc-three';
import { ModelSession, LoadedModel } from './ModelSession';
import { eventBus, EventType } from '../../core';
import type { FileHandle, FileLoadResult } from '../file/types';
import type { IFCSimpleLoader } from '../../loaders/IFCSimpleLoader';

/**
 * Modelo federado com metadados de disciplina
 */
export interface FederatedModel extends LoadedModel {
  discipline: ModelDiscipline;
  phase?: ConstructionPhase;
  level?: string; // Pavimento/nível
  zone?: string;  // Zona/setor
}

/**
 * Disciplinas BIM comuns
 */
export enum ModelDiscipline {
  ARCHITECTURE = 'architecture',
  STRUCTURE = 'structure',
  MEP_ELECTRICAL = 'mep_electrical',
  MEP_PLUMBING = 'mep_plumbing',
  MEP_HVAC = 'mep_hvac',
  MEP_FIRE = 'mep_fire',
  LANDSCAPE = 'landscape',
  CIVIL = 'civil',
  INTERIOR = 'interior',
  FURNITURE = 'furniture',
  SITE = 'site',
  OTHER = 'other'
}

/**
 * Fases de construção
 */
export enum ConstructionPhase {
  EXISTING = 'existing',           // Existente
  DEMOLITION = 'demolition',       // Demolição
  NEW_CONSTRUCTION = 'new',        // Nova construção
  RENOVATION = 'renovation',       // Reforma
  FUTURE = 'future'                // Futura expansão
}

/**
 * Opções de coordenação
 */
export interface CoordinationOptions {
  autoAlign?: boolean;              // Alinhar automaticamente por origem IFC
  detectClashes?: boolean;          // Detectar colisões ao carregar
  mergeCommonElements?: boolean;    // Mesclar elementos duplicados
  colorByDiscipline?: boolean;      // Colorir por disciplina
}

/**
 * Resultado de carregamento federado
 */
export interface FederationLoadResult {
  success: boolean;
  modelsLoaded: string[];           // IDs dos modelos carregados
  modelsFailed: string[];           // IDs que falharam
  clashesDetected?: number;
  totalTriangles: number;
  totalMemoryMB: number;
  loadTime: number;
}

/**
 * FederatedLoader - Gerenciador de modelos federados
 */
export class FederatedLoader {
  private session: ModelSession;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private ifcSimpleLoader: IFCSimpleLoader;
  private federatedModels = new Map<string, FederatedModel>();
  
  // Cores por disciplina (para visualização)
  private disciplineColors = new Map<ModelDiscipline, number>([
    [ModelDiscipline.ARCHITECTURE, 0xE0E0E0],    // Cinza claro
    [ModelDiscipline.STRUCTURE, 0xFF6B6B],       // Vermelho
    [ModelDiscipline.MEP_ELECTRICAL, 0xFFD93D],  // Amarelo
    [ModelDiscipline.MEP_PLUMBING, 0x4ECDC4],    // Ciano
    [ModelDiscipline.MEP_HVAC, 0x95E1D3],        // Verde água
    [ModelDiscipline.MEP_FIRE, 0xFF6B9D],        // Rosa
    [ModelDiscipline.LANDSCAPE, 0x6BCF7F],       // Verde
    [ModelDiscipline.CIVIL, 0x8B4513],           // Marrom
    [ModelDiscipline.INTERIOR, 0xB8A9C9],        // Lilás
    [ModelDiscipline.FURNITURE, 0xDEB887],       // Bege
    [ModelDiscipline.SITE, 0xA0522D],            // Sienna
    [ModelDiscipline.OTHER, 0x808080]            // Cinza
  ]);

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    session: ModelSession,
    ifcSimpleLoader: IFCSimpleLoader
  ) {
    this.scene = scene;
    this.camera = camera;
    this.session = session;
    this.ifcSimpleLoader = ifcSimpleLoader;
    
    console.log('🏗️ FederatedLoader initialized');
  }

  /**
   * Configura o loader IFC
   * @deprecated Não mais necessário - usando IFCSimpleLoader compartilhado
   */
  private setupLoader(): void {
    // Removido - usando shared IFCSimpleLoader
  }

  /**
   * Carrega múltiplos arquivos IFC de forma coordenada
   */
  public async loadFederatedModels(
    files: File[],
    disciplines?: ModelDiscipline[],
    options: CoordinationOptions = {}
  ): Promise<FederationLoadResult> {
    console.log(`🏗️ Carregando ${files.length} modelos federados...`);
    
    const startTime = performance.now();
    const result: FederationLoadResult = {
      success: true,
      modelsLoaded: [],
      modelsFailed: [],
      totalTriangles: 0,
      totalMemoryMB: 0,
      loadTime: 0
    };

    // Emite evento de início
    eventBus.emit(EventType.MODEL_LOAD_REQUESTED, {
      kind: 'federation',
      source: 'multiple_files',
      fileCount: files.length
    });

    // Carrega em paralelo (mais rápido)
    const promises = files.map((file, index) => {
      const discipline = disciplines?.[index] || this.detectDiscipline(file.name);
      return this.loadSingleModel(file, discipline, options);
    });

    // Aguarda todos
    const results = await Promise.allSettled(promises);

    // Processa resultados
    results.forEach((res, index) => {
      if (res.status === 'fulfilled' && res.value) {
        result.modelsLoaded.push(res.value.id);
        result.totalTriangles += res.value.triangleCount;
        result.totalMemoryMB += res.value.estimatedMemoryMB;
      } else {
        result.modelsFailed.push(files[index].name);
        result.success = false;
      }
    });

    result.loadTime = performance.now() - startTime;

    // Pós-processamento
    if (options.autoAlign) {
      this.alignModelsToCommonOrigin();
    }

    if (options.colorByDiscipline) {
      this.applyDisciplineColors();
    }

    if (options.detectClashes) {
      result.clashesDetected = await this.detectClashes();
    }

    console.log(`✅ Federação carregada: ${result.modelsLoaded.length}/${files.length} modelos`);
    console.log(`   Triângulos: ${result.totalTriangles.toLocaleString()}`);
    console.log(`   Memória: ${result.totalMemoryMB.toFixed(0)} MB`);
    console.log(`   Tempo: ${(result.loadTime / 1000).toFixed(1)}s`);

    // Emite evento de conclusão
    eventBus.emit(EventType.MODEL_LOAD_COMPLETED, {
      success: result.success,
      modelsLoaded: result.modelsLoaded.length,
      modelsFailed: result.modelsFailed.length
    });

    return result;
  }

  /**
   * Carrega um modelo individual
   */
  private async loadSingleModel(
    file: File,
    discipline: ModelDiscipline,
    options: CoordinationOptions
  ): Promise<FederatedModel | null> {
    console.log(`📦 Carregando: ${file.name} (${discipline})`);

    try {
      // Usa o IFCSimpleLoader compartilhado
      await this.ifcSimpleLoader.load(file);

      // Pega o último modelo carregado da cena
      const model = this.scene.children.find(
        child => child.userData.ifcModel
      ) as THREE.Group | undefined;

      if (!model) {
        throw new Error('Modelo IFC não encontrado após carregamento');
      }

      // Cria handle e resultado
      const handle: FileHandle = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        displayName: file.name,
        kind: 'ifc',
        source: 'file',
        uri: URL.createObjectURL(file),
        sizeBytes: file.size,
        lastModified: new Date(file.lastModified),
        metadata: {
          discipline,
          fileName: file.name
        }
      };

      // Calcula métricas
      const box = new THREE.Box3().setFromObject(model);
      const triangles = this.countTriangles(model);

      const loadResult: FileLoadResult = {
        success: true,
        handle,
        metrics: {
          triangles,
          vertices: triangles * 3,
          materials: this.countMaterials(model),
          objects: this.countObjects(model),
          estimatedMemoryMB: (file.size / 1024 / 1024) * 1.5,
          bounds: box
        }
      };

      // Adiciona à sessão
      const baseModel = this.session.addModel(handle, loadResult, model);

      // Converte para FederatedModel
      const federatedModel: FederatedModel = {
        ...baseModel,
        discipline,
        phase: this.detectPhase(file.name),
        level: this.detectLevel(file.name),
        zone: undefined
      };

      this.federatedModels.set(federatedModel.id, federatedModel);

      return federatedModel;

    } catch (error) {
      console.error(`❌ Erro ao carregar ${file.name}:`, error);
      return null;
    }
  }

  /**
   * Detecta disciplina pelo nome do arquivo
   */
  private detectDiscipline(filename: string): ModelDiscipline {
    const lower = filename.toLowerCase();
    
    if (lower.includes('arq') || lower.includes('arch')) return ModelDiscipline.ARCHITECTURE;
    if (lower.includes('est') || lower.includes('struct')) return ModelDiscipline.STRUCTURE;
    if (lower.includes('ele') || lower.includes('elec')) return ModelDiscipline.MEP_ELECTRICAL;
    if (lower.includes('hid') || lower.includes('plumb')) return ModelDiscipline.MEP_PLUMBING;
    if (lower.includes('hvac') || lower.includes('climatiza')) return ModelDiscipline.MEP_HVAC;
    if (lower.includes('incend') || lower.includes('fire')) return ModelDiscipline.MEP_FIRE;
    if (lower.includes('paisa') || lower.includes('landscape')) return ModelDiscipline.LANDSCAPE;
    if (lower.includes('civil')) return ModelDiscipline.CIVIL;
    if (lower.includes('interior')) return ModelDiscipline.INTERIOR;
    if (lower.includes('mobil') || lower.includes('furniture')) return ModelDiscipline.FURNITURE;
    
    return ModelDiscipline.OTHER;
  }

  /**
   * Detecta fase de construção pelo nome
   */
  private detectPhase(filename: string): ConstructionPhase | undefined {
    const lower = filename.toLowerCase();
    
    if (lower.includes('existente') || lower.includes('existing')) return ConstructionPhase.EXISTING;
    if (lower.includes('demol') || lower.includes('demolition')) return ConstructionPhase.DEMOLITION;
    if (lower.includes('novo') || lower.includes('new')) return ConstructionPhase.NEW_CONSTRUCTION;
    if (lower.includes('reforma') || lower.includes('renovation')) return ConstructionPhase.RENOVATION;
    if (lower.includes('futur') || lower.includes('future')) return ConstructionPhase.FUTURE;
    
    return undefined;
  }

  /**
   * Detecta nível/pavimento pelo nome
   */
  private detectLevel(filename: string): string | undefined {
    const lower = filename.toLowerCase();
    
    const levelMatch = lower.match(/(?:pav|level|floor|andar)[_\s-]*(\d+|terreo|subsolo)/);
    if (levelMatch) return levelMatch[1];
    
    return undefined;
  }

  /**
   * Alinha modelos pela origem comum do IFC
   */
  private alignModelsToCommonOrigin(): void {
    console.log('📐 Alinhando modelos à origem comum...');
    
    // A configuração COORDINATE_TO_ORIGIN já faz isso automaticamente
    // Mas podemos adicionar ajustes manuais se necessário
    
    this.federatedModels.forEach((model) => {
      // Todos os modelos IFC já devem estar na mesma origem
      // Se precisar ajuste manual, pode fazer aqui
    });
  }

  /**
   * Aplica cores por disciplina
   */
  private applyDisciplineColors(): void {
    console.log('🎨 Aplicando cores por disciplina...');
    
    this.federatedModels.forEach((model) => {
      const color = this.disciplineColors.get(model.discipline) || 0x808080;
      
      model.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.color.setHex(color);
                mat.opacity = 0.85;
                mat.transparent = true;
              }
            });
          } else if (obj.material instanceof THREE.MeshStandardMaterial) {
            obj.material.color.setHex(color);
            obj.material.opacity = 0.85;
            obj.material.transparent = true;
          }
        }
      });
    });
  }

  /**
   * Detecta colisões entre modelos (simplificado)
   */
  private async detectClashes(): Promise<number> {
    console.log('⚠️ Detectando colisões...');
    
    // Implementação simplificada usando bounding boxes
    let clashCount = 0;
    const models = Array.from(this.federatedModels.values());
    
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const box1 = models[i].boundsWorld;
        const box2 = models[j].boundsWorld;
        
        if (box1.intersectsBox(box2)) {
          clashCount++;
          console.log(`   Colisão detectada: ${models[i].handle.displayName} ↔ ${models[j].handle.displayName}`);
        }
      }
    }
    
    return clashCount;
  }

  /**
   * Mostra/oculta modelos por disciplina
   */
  public setDisciplineVisibility(discipline: ModelDiscipline, visible: boolean): void {
    this.federatedModels.forEach((model) => {
      if (model.discipline === discipline) {
        model.group.visible = visible;
        model.visible = visible;
      }
    });
  }

  /**
   * Mostra/oculta modelos por fase
   */
  public setPhaseVisibility(phase: ConstructionPhase, visible: boolean): void {
    this.federatedModels.forEach((model) => {
      if (model.phase === phase) {
        model.group.visible = visible;
        model.visible = visible;
      }
    });
  }

  /**
   * Obtém lista de modelos federados
   */
  public getFederatedModels(): FederatedModel[] {
    return Array.from(this.federatedModels.values());
  }

  /**
   * Obtém modelo por ID
   */
  public getModel(id: string): FederatedModel | undefined {
    return this.federatedModels.get(id);
  }

  /**
   * Remove modelo
   */
  public removeModel(id: string): boolean {
    const model = this.federatedModels.get(id);
    if (!model) return false;

    // Remove da cena
    this.scene.remove(model.group);
    
    // Remove da session
    // this.session.removeModel(id); // Seria necessário implementar

    // Remove do mapa
    this.federatedModels.delete(id);

    console.log(`🗑️ Modelo removido: ${model.handle.displayName}`);
    return true;
  }

  // Métodos utilitários
  private countTriangles(object: THREE.Object3D): number {
    let count = 0;
    object.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        if (obj.geometry.index) {
          count += obj.geometry.index.count / 3;
        } else {
          count += obj.geometry.attributes.position.count / 3;
        }
      }
    });
    return Math.floor(count);
  }

  private countMaterials(object: THREE.Object3D): number {
    const materials = new Set();
    object.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => materials.add(m.uuid));
        } else {
          materials.add(obj.material.uuid);
        }
      }
    });
    return materials.size;
  }

  private countObjects(object: THREE.Object3D): number {
    let count = 0;
    object.traverse(() => count++);
    return count;
  }

  /**
   * Limpa todos os modelos
   */
  public dispose(): void {
    this.federatedModels.forEach((model) => {
      this.scene.remove(model.group);
    });
    this.federatedModels.clear();
    console.log('🗑️ FederatedLoader disposed');
  }
}
