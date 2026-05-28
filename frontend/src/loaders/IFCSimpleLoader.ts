import * as THREE from 'three';
import { eventBus, EventType } from '../core';
import { PropertyExtractor } from '../features/bim-4d/bim/inspector/PropertyExtractor';

// Lazy load web-ifc-three - defer loading until IFC file is actually loaded
let ThreeIFCLoader: any = null;

export interface IFCLoadResult {
  model: THREE.Group;
  meshCount: number;
  boundingBox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
}

/**
 * IFCSimpleLoader - Loader IFC SIMPLES e FUNCIONAL
 * Sem otimizações complexas, apenas carrega e mostra o modelo
 */
export class IFCSimpleLoader {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private controls: any;
  private loader: any = null;
  private propertyExtractor = new PropertyExtractor();
  private loadedModel: THREE.Group | null = null;
  private initialized: boolean = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    controls?: any
  ) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    // Don't instantiate loader immediately - will be lazy loaded
  }

  /**
   * Setup básico do loader
   */
  private setupLoader(): void {
    console.log('🔧 Configurando IFC Loader...');
    
    // IMPORTANTE: Desabilitar web workers PRIMEIRO (antes de setWasmPath)
    this.loader.ifcManager.useWebWorkers(false);
    console.log('📍 Web Workers: DESABILITADO (modo single-thread)');
    
    // Caminho absoluto para WASM files
    const wasmPath = '/wasm/';
    console.log('📂 WASM Path:', wasmPath);
    this.loader.ifcManager.setWasmPath(wasmPath);
    
    this.loader.ifcManager.applyWebIfcConfig({
      COORDINATE_TO_ORIGIN: true,
      USE_FAST_BOOLS: true,
    });

    console.log('✅ IFCSimpleLoader configurado (aguardando inicialização)');
  }

  /**
   * Inicializa o IFC Manager (carrega WASM) - lazy loads web-ifc-three
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✅ IFC Manager já inicializado');
      return;
    }

    console.log('⚙️ Inicializando IFC Manager (lazy loading web-ifc-three)...');
    
    // Dynamic import web-ifc-three only when needed
    if (!ThreeIFCLoader) {
      console.log('📦 Dynamic import: web-ifc-three...');
      const module = await import('web-ifc-three');
      ThreeIFCLoader = module.IFCLoader;
      console.log('✅ web-ifc-three carregado');
    }
    
    this.loader = new ThreeIFCLoader();
    this.setupLoader();
    
    this.initialized = true;
    console.log('✅ IFC Manager pronto (WASM será carregado sob demanda)');
  }

  /**
   * Carrega arquivo IFC - VERSÃO SIMPLES
   */
  public async load(file: File): Promise<IFCLoadResult> {
    console.log(`🚀 Carregando ${file.name}...`);
    console.log(`📦 Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    
    // IMPORTANTE: Inicializar WASM antes de carregar
    await this.initialize();
    
    console.log(`🔧 Loader configurado:`, {
      hasIfcManager: !!this.loader.ifcManager,
      webWorkersEnabled: false,
      wasmPath: '/wasm/',
      initialized: this.initialized
    });

    eventBus.emit(EventType.MODEL_LOAD_REQUESTED, {
      kind: 'ifc',
      source: 'file',
      fileName: file.name
    });

    const url = URL.createObjectURL(file);
    console.log(`🔗 Blob URL: ${url}`);
    console.log(`⏳ Iniciando carregamento via loader.load()...`);

    return new Promise((resolve, reject) => {
      // Timeout para detectar travamento
      const timeout = setTimeout(() => {
        console.error('⏱️ TIMEOUT: Carregamento travou após 60s');
        console.error('💡 Possíveis causas:');
        console.error('   - Arquivos WASM não carregados');
        console.error('   - Arquivo IFC muito grande ou corrompido');
        console.error('   - Problema de CORS ou headers HTTP');
        URL.revokeObjectURL(url);
        reject(new Error('Timeout: O carregamento está demorando muito. Verifique se os arquivos WASM estão disponíveis.'));
      }, 60000);

      console.log(`📡 Chamando this.loader.load()...`);
      
      this.loader.load(
        url,
        (model) => {
          clearTimeout(timeout);
          console.log('✅ Modelo IFC carregado!');
          console.log('📦 Modelo:', model);
          console.log('📊 Children:', model.children.length);
          
          // Calcular bounding box
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          
          console.log('📏 Dimensões:', size);
          console.log('📍 Centro original:', center);
          console.log('📊 Bounding Box:', { min: box.min, max: box.max });
          
          // AJUSTAR MODELO PARA FICAR APOIADO NO GRID (Y=0)
          // Move o modelo para cima para que a parte inferior fique em Y=0
          const offsetY = -box.min.y;
          model.position.y = offsetY;
          console.log(`⬆️ Modelo ajustado: Y offset = ${offsetY.toFixed(2)} (base agora em Y=0)`);
          
          // Recalcular bounding box após ajuste
          box.setFromObject(model);
          const newCenter = box.getCenter(new THREE.Vector3());
          console.log('📍 Centro ajustado:', newCenter);
          
          // Contar meshes
          let meshCount = 0;
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              meshCount++;
              
              // Garantir que tem material visível
              if (child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                  mat.side = THREE.DoubleSide;
                  if (!mat.color) {
                    mat.color = new THREE.Color(0xcccccc);
                  }
                });
              }
            }
          });
          
          console.log(`🔺 Total de meshes: ${meshCount}`);

          const finalSize = box.getSize(new THREE.Vector3());
          const finalCenter = box.getCenter(new THREE.Vector3());
          const maxFinalDim = Math.max(finalSize.x, finalSize.y, finalSize.z);

          if (meshCount === 0 || !Number.isFinite(maxFinalDim) || maxFinalDim <= 0) {
            URL.revokeObjectURL(url);
            reject(new Error('IFC carregou sem geometria renderizável. Verifique o arquivo ou o parser IFC.'));
            return;
          }
          
          // Adicionar à cena
          this.scene.add(model);
          this.loadedModel = model;
          
          console.log('✅ Modelo adicionado à cena!');
          console.log('🎬 Cena tem', this.scene.children.length, 'objetos');
          
          // Ajustar câmera (usar bounding box já ajustado)
          this.focusCamera(model, newCenter);
          
          // Ajustar ambiente BIM (se disponível)
          this.adjustBIMEnvironment(box);
          
          // Conectar PropertyExtractor ao IFC Manager
          this.connectPropertyExtractor();
          
          // Liberar URL
          URL.revokeObjectURL(url);
          
          // Emitir evento de sucesso
          eventBus.emit(EventType.MODEL_LOADED, {
            kind: 'ifc',
            fileName: file.name,
            meshCount,
            size: finalSize,
            center: finalCenter
          });
          
          resolve({
            model,
            meshCount,
            boundingBox: box.clone(),
            size: finalSize.clone(),
            center: finalCenter.clone(),
          });
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`📊 Progresso: ${percent.toFixed(1)}% (${progress.loaded}/${progress.total} bytes)`);
        },
        (error) => {
          clearTimeout(timeout);
          console.error('❌ Erro ao carregar IFC:', error);
          console.error('💡 Dica: Verifique se os arquivos WASM estão em /wasm/');
          console.error('💡 Esperado: /wasm/web-ifc.wasm e /wasm/web-ifc-mt.wasm');
          
          URL.revokeObjectURL(url);
          
          eventBus.emit(EventType.MODEL_LOAD_FAILED, {
            type: 'load_error',
            message: 'Falha ao carregar arquivo IFC',
            error
          });
          
          reject(error);
        }
      );
    });
  }

  /**
   * Ajusta câmera para focar no modelo
   */
  private focusCamera(model: THREE.Object3D, precomputedCenter?: THREE.Vector3): void {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = precomputedCenter || box.getCenter(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (this.camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 2; // Zoom out para ver melhor
    
    // Posicionar câmera (perspectiva isométrica)
    this.camera.position.set(
      center.x + cameraZ * 0.7,
      center.y + cameraZ * 0.7,
      center.z + cameraZ * 0.7
    );
    this.camera.lookAt(center);
    
    // Atualizar controls
    if (this.controls && this.controls.target) {
      this.controls.target.copy(center);
      this.controls.update();
    }
    
    console.log('📷 Câmera ajustada');
    console.log('  - Posição:', this.camera.position);
    console.log('  - Target:', center);
  }

  /**
   * Ajusta ambiente BIM para o modelo
   */
  private adjustBIMEnvironment(boundingBox: THREE.Box3): void {
    // Tentar acessar ViewerHost via DI ou scene
    try {
      const scene = this.scene as any;
      if (scene.parent?.bimEnvironment) {
        scene.parent.bimEnvironment.fitToModel(boundingBox);
      }
    } catch (error) {
      // Ignora se não conseguir ajustar (não crítico)
    }
  }

  /**
   * Conecta PropertyExtractor ao IFC Manager
   */
  private connectPropertyExtractor(): void {
    try {
      console.log('🔗 Conectando PropertyExtractor ao IFC Manager...');
      
      // Injetar loader e ifcManager
      this.propertyExtractor.setIfcLoader(this.loader);
      
      // Injetar scene para busca de meshes
      this.propertyExtractor.setScene(this.scene);
      
      // Armazenar no window para acesso global (temporário)
      (window as any).__propertyExtractor = this.propertyExtractor;
      
      console.log('✅ PropertyExtractor conectado!', {
        hasLoader: !!this.loader,
        hasIfcManager: !!this.loader.ifcManager,
        hasScene: !!this.scene
      });
    } catch (error) {
      console.warn('⚠️ Erro ao conectar PropertyExtractor:', error);
    }
  }

  /**
   * Obtém PropertyExtractor
   */
  public getPropertyExtractor(): PropertyExtractor {
    return this.propertyExtractor;
  }

  /**
   * Remove modelo da cena
   */
  public dispose(): void {
    if (this.loadedModel) {
      this.loadedModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();

          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material?.dispose?.());
        }
      });

      this.scene.remove(this.loadedModel);
      this.loadedModel = null;
    }
    this.propertyExtractor.clearCache();
  }

  /**
   * Obtém modelo carregado
   */
  public getModel(): THREE.Group | null {
    return this.loadedModel;
  }
}
