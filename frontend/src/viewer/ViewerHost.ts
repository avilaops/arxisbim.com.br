
/**
 * ViewerHost - Canvas Three.js + controls
 * Inicializa scene/camera/renderer e expõe API interna
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FPSControls } from './FPSControls';
import { ThirdPersonControls } from './ThirdPersonControls';
import { DroneControls } from './DroneControls';
import { HDRIManager } from './HDRIManager';
import { BackgroundManager } from './BackgroundManager';
import { BIMEnvironment, BIM_PRESET_DEFAULT } from './BIMEnvironment';
import { ClippingGeometry } from '../engine/geometry/ClippingGeometry';
import { WebRTCManager } from '../network/WebRTCManager';
import { di } from '../app/di';
import { eventBus, EventType } from '../core';
import { AvatarSystem } from '../features/virtual-meetings/avatar/AvatarSystem';
import { IFCUploadManager } from '../systems/model/IFCUploadManager';
import IFCSimpleLoader from './loaders/IFCSimpleLoader';
import GLBLoader from './loaders/GLBLoader';
import { ifcModelCache } from '../systems/model/IFCModelCache.js';
import { ProceduralClouds } from './ProceduralClouds.js';
import { OcclusionCullingSystem } from '../engine/optimization/OcclusionCullingSystem.js';
import { ifcMaterialLibrary } from './IFCMaterialLibrary.js';
import { typeColorizer } from './TypeColorizer.js';
import { TypeLegend } from './TypeLegend.js';
import { Stars } from './Stars.js';
import { SunPositionCalculator, COMMON_LOCATIONS } from './SunPositionCalculator.js';
import { PostProcessingPipeline, PostProcessQuality } from '../engine/PostProcessingPipeline.js';
import { CascadedShadowManager } from '../engine/CascadedShadowManager.js';
import { AdaptiveQualityManager, AdaptiveMode } from '../engine/AdaptiveQualityManager.js';
import type { CameraState } from './CameraState';


/**
 * ViewerHost component
 */
export class ViewerHost {
  public onSelectionChanged?: (object: THREE.Object3D | null) => void;
  public onModelLoaded?: (model: THREE.Object3D) => void;
  public onError?: (error: Error) => void;

  private container: HTMLElement;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;
  public fpsControls!: FPSControls;
  public thirdPersonControls!: ThirdPersonControls;
  public droneControls!: DroneControls;
  public webrtcManager?: WebRTCManager;
  public hdriManager!: HDRIManager;
  public backgroundManager!: BackgroundManager;
  public clippingGeometry!: ClippingGeometry;
  public ifcUploadManager!: IFCUploadManager;
  public postProcess!: PostProcessingPipeline;
  public csm!: CascadedShadowManager;
  public adaptiveQuality!: AdaptiveQualityManager;
  public clouds!: ProceduralClouds;
  public occlusionCulling!: OcclusionCullingSystem;
  public stars!: Stars;
  private clock!: THREE.Clock;
  private typeMapUnsubscribe?: () => void;
  private typeLegend?: TypeLegend;

  /**
   * Seleciona objeto pelo ID (ex: expressID IFC)
   */
  /** true se o viewer subiu sem WebGL (jsdom/SSR) — render desativado. */
  public get isHeadless(): boolean { return this.headless; }

  // ── API S09-compliant (expressID + CameraState; NÃO vaza Three.js) ──────────
  // Alvo de migração: consumers devem usar isto em vez de `.camera`/`Object3D`.
  private s09SelectCbs = new Set<(id: number | null) => void>();

  /** Estado de câmera serializável (S09). Lê position/target/fov/near/far. */
  public getCameraState(): CameraState {
    const p = this.camera.position;
    const t = this.controls?.target ?? new THREE.Vector3(0, 0, 0);
    return {
      version: 1,
      position: [p.x, p.y, p.z],
      target: [t.x, t.y, t.z],
      fov: this.camera.fov,
      near: this.camera.near,
      far: this.camera.far,
    };
  }

  /** Restaura a câmera a partir de um CameraState (S09). */
  public setCameraState(s: CameraState): void {
    this.camera.position.set(s.position[0], s.position[1], s.position[2]);
    this.camera.fov = s.fov; this.camera.near = s.near; this.camera.far = s.far;
    if (this.controls) { this.controls.target.set(s.target[0], s.target[1], s.target[2]); this.controls.update?.(); }
    this.camera.lookAt(s.target[0], s.target[1], s.target[2]);
    this.camera.updateProjectionMatrix();
  }

  /** Seleciona por expressID (nodes do GLB têm name = expressID). */
  public selectByExpressId(expressID: number): void { this.selectObject(String(expressID)); }

  /** Assina seleção por expressID (S09) — sem expor Object3D. */
  public onSelect(cb: (id: number | null) => void): () => void {
    this.s09SelectCbs.add(cb);
    return () => this.s09SelectCbs.delete(cb);
  }

  private notifyS09Select(object: THREE.Object3D | null): void {
    const id = object ? (((object.userData as any)?.expressID as number | undefined) ?? Number(object.name)) : null;
    const norm = typeof id === 'number' && Number.isFinite(id) ? id : null;
    for (const cb of this.s09SelectCbs) cb(norm);
  }

  public selectObject(id: string): void {
    // Busca objeto na cena por ID
    const object = this.scene.getObjectByName(id);
    if (object) {
      // Exemplo: destacar visualmente
      this.highlightObject(id);
      if (this.onSelectionChanged) this.onSelectionChanged(object);
    } else {
      if (this.onSelectionChanged) this.onSelectionChanged(null);
    }
    this.notifyS09Select(object ?? null);
  }

  /**
   * Destaca objeto visualmente
   */
  public highlightObject(id: string): void {
    const object = this.scene.getObjectByName(id);
    if (object) {
      // Exemplo simples: alterar cor do material
      if ((object as any).material && (object as any).material.color) {
        (object as any).material.color.set(0xffcc00); // Amarelo destaque
      }
      // Poderia adicionar outline, bounding box, etc.
    }
  }

  /**
   * Define nível de detalhe (LOD)
   */


  /**
   * Carrega modelo 3D (IFC ou GLB) e adiciona à cena
   * @param file Arquivo ou URL
   * @param type Tipo do modelo ('ifc' | 'glb')
   */

  public async loadModel(file: File | string, type: 'ifc' | 'glb'): Promise<THREE.Object3D | null> {
    try {
      let loader;
      let model: THREE.Object3D | null = null;
      if (type === 'ifc') {
        // ── IFC cache: evitar re-processar o mesmo arquivo ────────────────────
        if (file instanceof File) {
          const buffer = await file.arrayBuffer();
          const hash   = await ifcModelCache.hash(buffer);
          const cached = await ifcModelCache.get(hash);

          if (cached) {
            // Cache hit — pular processamento pesado, usar dados cacheados
            console.log(`⚡ IFC cache hit: ${file.name} — carregando do IndexedDB`);
            // Reconstituir File do cache para o loader
            const cachedFile = new File([cached.data], cached.name, { type: 'application/octet-stream' });
            loader = new IFCSimpleLoader();
            model  = await loader.load(cachedFile);
          } else {
            // Cache miss — processar normalmente e salvar
            loader = new IFCSimpleLoader();
            model  = await loader.load(file);
            // Salvar no cache em background (não bloqueia)
            ifcModelCache.set({ hash, name: file.name, size: buffer.byteLength, data: buffer, cachedAt: Date.now() })
              .catch(() => {}); // silencioso se cache falhar
          }
        } else {
          loader = new IFCSimpleLoader();
          model  = await loader.load(file);
        }
      } else if (type === 'glb') {
        loader = new GLBLoader();
        model = await loader.load(file);
      } else {
        throw new Error('Tipo de modelo não suportado: ' + type);
      }
      if (model) {
        this.scene.add(model);
        if (this.onModelLoaded) this.onModelLoaded(model);
        // Aplicar materiais PBR por tipo IFC (concreto, vidro, metal, etc.)
        typeColorizer.applyColorizer(model);
        // Ativar AO após primeiro modelo carregado (SAO precisa de geometria)
        this.postProcess?.enableAO();
        // CSM uniforms nos materiais do modelo (depois de PBR)
        this.csm?.applyToObject(model);
        // Reconstruir occlusion culling com nova geometria
        this.occlusionCulling?.updateOccluders();
        // Ajustar sombras e sky para o tamanho do modelo
        const box = new THREE.Box3().setFromObject(model);
        this.csm?.fitToModel?.(box);
        this.backgroundManager?.fitToModel?.(box);
      }
      return model;
    } catch (error: any) {
      if (this.onError) this.onError(error);
      console.error('Erro ao carregar modelo:', error);
      return null;
    }
  }


  private destroyed = false;
  /** true quando WebGL não está disponível (ex.: jsdom/SSR). Sem render, mas
   *  scene+camera existem e a API de seleção/câmera funciona. Em produção
   *  (WebGL real) NUNCA é true — o try/catch abaixo só dispara sem GPU. */
  private headless = false;

  constructor(container: HTMLElement) {
    this.container = container;
    try {
      this.init();
    } catch (err) {
      this.headless = true;
      console.warn('[ViewerHost] WebGL indisponível — modo headless (sem render).', err);
    }
    this.registerServices();

    this.typeMapUnsubscribe = typeColorizer.registerOnTypeMapChanged(() => {
      this.reapplyColors();
    });

    if (!this.headless) {
      this.typeLegend = new TypeLegend(this.container);

      // Garantir que canvas usará dimensões corretas após layout
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (this.destroyed) return;
          this.onResize();
          console.log('✅ Resize forçado após RAF duplo');
        });
      });
      this.startRenderLoop();
    }
  }

  private init(): void {
    // Canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'viewer-canvas-el';
    canvas.className = 'viewer-host__canvas';
    this.container.appendChild(canvas);
    
    // Usar dimensões seguras do container. Durante montagem inicial o layout pode
    // reportar 0x0; nesse caso usamos viewport como fallback e o ResizeObserver
    // corrige assim que o container estabilizar.
    const { width, height } = this.getSafeViewportSize();
    
    console.log('🎨 Canvas criado (após RAF duplo):', {
      containerWidth: width,
      containerHeight: height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    });

    // Scene
    this.scene = new THREE.Scene();

    // Clock
    this.clock = new THREE.Clock();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
    this.camera.position.set(10, 10, 10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    
    // Tone mapping para cores mais naturais
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Controls (Orbit - desativado inicialmente)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 0, 0);
    this.controls.enabled = false; // Desativado - modo FPS é padrão

    // FPS Controls (ativado por padrão para movimento WASD estilo Counter-Strike)
    this.fpsControls = new FPSControls(this.camera, this.container);
    this.fpsControls.setEnabled(true); // Ativado por padrão

    // Third Person Controls (avatar 360°)
    this.thirdPersonControls = new ThirdPersonControls(this.camera, this.container, this.scene);
    this.thirdPersonControls.setEnabled(false);

    // Drone Controls (voo livre para inspeção aérea)
    this.droneControls = new DroneControls(this.camera, this.container);
    this.droneControls.setEnabled(false);

    this.controlMode = 'fps'; // Inicia em modo FPS

    console.log('🎮 FPS Mode ativo (WASD para mover, 1/2/3 alternam câmera, V alterna Orbit)');

    // Atalhos globais de modo sem conflitar com navegação estilo CS
    // Handler persistente para cleanup correto
    this.keyHandler = (e: KeyboardEvent) => {
      if (this.isTypingInInput()) return;

      if (e.code === 'Digit1' || e.code === 'Numpad1') {
        this.setControlMode('fps');
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        this.setControlMode('third-person');
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        this.setControlMode('drone');
      } else if (e.code === 'KeyV') {
        this.toggleControlMode();
      }
    };
    document.addEventListener('keydown', this.keyHandler);
    
    console.log('💡 Pressione 1=FPS, 2=3ª Pessoa, 3=Drone, V=Orbit/FPS');
    console.log('🎮 Modo FPS ativo: Use WASD para mover');

    // BIM Environment (iluminação profissional BIM/CAD)
    this.bimEnvironment = new BIMEnvironment(this.scene, BIM_PRESET_DEFAULT);

    // HDRI Manager (skybox/environment)
    // NOTA: DESABILITADO TEMPORARIAMENTE - conflita com BackgroundManager
    // O HDRIManager sobrescreve scene.background, causando que o gradiente do BackgroundManager desapareça
    // TODO: Refatorar para BackgroundManager e HDRIManager funcionarem juntos
    this.hdriManager = new HDRIManager(this.scene, this.renderer);
    
    // NÃO carregar HDRI por padrão - deixar BackgroundManager controlar o background
    // const defaultHDRI = import.meta.env.VITE_DEFAULT_HDRI || 'neutral';
    // this.hdriManager.loadPreset(defaultHDRI).then(() => {
    //   console.log('🌄 HDRI carregado');
    // }).catch((err) => {
    //   console.warn('⚠️ Erro ao carregar HDRI, usando fallback:', err);
    // });
    
    console.log('ℹ️ HDRI desabilitado - usando BackgroundManager para controle de fundo');

    // Avatar System (inicialização assíncrona será feita depois)
    this.avatarSystem = new AvatarSystem({
      scene: this.scene,
      enableLocalAvatar: true,
      enableLabels: true,
      enableShadows: true
    });
    
    // Inicializar avatars (assíncrono)
    this.avatarSystem.init().then(() => {
      console.log('👥 Avatar System pronto');
    });
    
    // Expor avatarSystem globalmente para AvatarCustomizer
    (window as any).__avatarSystem = this.avatarSystem;
    
    // WebRTC Manager (opcional - só inicializa se usuário quiser multiplayer)
    // Usar variável de ambiente ou config
    const enableMultiplayer = import.meta.env.VITE_ENABLE_MULTIPLAYER === 'true';
    const signalingServer = import.meta.env.VITE_SIGNALING_SERVER || 'ws://localhost:3002';
    
    if (enableMultiplayer) {
      this.initWebRTC(signalingServer);
    }

    // ── Post-processing pipeline AAA ──────────────────────────────────────────
    const savedQuality = (localStorage.getItem('arxis:renderQuality') as PostProcessQuality) || 'high';
    this.postProcess = new PostProcessingPipeline(this.renderer, this.scene, this.camera, savedQuality);
    (window as any).__postProcess = this.postProcess;
    console.log(`✨ PostProcessingPipeline ativo [${savedQuality}]`);

    // ── Cascaded Shadow Maps (4 cascatas) ─────────────────────────────────────
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.csm = new CascadedShadowManager(this.renderer, this.scene, this.camera, {
      maxFar:         500,
      cascades:       4,
      shadowMapSize:  1024,
      fade:           true,
      lightIntensity: 1.0,  // intensidade correta — não multiplicar por 4 cascatas
    });
    (window as any).__csm = this.csm;
    console.log('🌑 CSM ativo (4 cascatas)');

    // ── Adaptive Quality (dynamic resolution + quality scaling) ───────────────
    const savedMode = (localStorage.getItem('arxis:adaptiveMode') as AdaptiveMode) || 'balanced';
    this.adaptiveQuality = new AdaptiveQualityManager(
      this.renderer, savedMode, this.postProcess, this.csm,
    );
    (window as any).__adaptiveQuality = this.adaptiveQuality;
    console.log(`⚡ AdaptiveQuality ativo [${savedMode}]`);

    // Cache de modelos IFC (IndexedDB)
    (window as any).__ifcCache = ifcModelCache;
    ifcModelCache.getStats().then(s =>
      console.log(`💾 IFC cache: ${s.entries} modelos, ${s.totalMB}MB`),
    );

    // ── Background Manager ────────────────────────────────────────────────────
    const savedPreset = localStorage.getItem('arxis:backgroundPreset');
    const defaultBackground = savedPreset || import.meta.env.VITE_DEFAULT_BACKGROUND || 'SKY_NOON';
    this.backgroundManager = new BackgroundManager(this.scene, this.camera, defaultBackground, this.renderer);

    // Sincronizar direção do sol do PhysicalSky com o CSM
    this.backgroundManager.onSunDirectionChanged = (dir: THREE.Vector3) => {
      this.csm?.setSunDirection(dir);
    };

    // ── Nuvens procedurais ────────────────────────────────────────────────────
    this.clouds = new ProceduralClouds(this.scene, 'partial');
    (window as any).__clouds = this.clouds;

    // ── Estrelas (visíveis quando sol abaixo do horizonte) ────────────────────
    this.stars = new Stars(this.scene, 3000);
    (window as any).__stars = this.stars;

    // ── Sun Calculator API ────────────────────────────────────────────────────
    (window as any).__sunCalc = SunPositionCalculator;
    (window as any).__locations = COMMON_LOCATIONS;

    // Helper: aplicar posição do sol por GPS+horário
    (window as any).setSunByLocation = (locKey: string, date?: Date) => {
      const loc = COMMON_LOCATIONS[locKey];
      if (!loc) { console.warn('Local não encontrado:', Object.keys(COMMON_LOCATIONS)); return; }
      const pos = SunPositionCalculator.calculate(date ?? new Date(), loc);
      const presetKey = SunPositionCalculator.suggestSkyPreset(pos.elevation);
      console.log(`☀️ Sol em ${locKey}: elev=${pos.elevation.toFixed(1)}° azim=${pos.azimuth.toFixed(1)}° → ${presetKey}`);
      // Aplica preset e ajusta sun position manualmente
      const physSky = (this.backgroundManager as any).physicalSky;
      if (physSky) {
        physSky.setSunPosition?.(pos.elevation, pos.azimuth);
        this.stars?.updateBySunElevation(pos.elevation);
      }
      return pos;
    };

    // ── Occlusion Culling ─────────────────────────────────────────────────────
    this.occlusionCulling = new OcclusionCullingSystem(this.scene, this.camera, {
      enabled:            true,
      testInterval:       3,    // testa a cada 3 frames (não todo frame)
      maxDistance:        150,
      occluderThreshold:  4,
    });
    (window as any).__occlusionCulling = this.occlusionCulling;
    
    // Garantir que o grid é visível após criação (fix para sidebar iniciar fechada)
    setTimeout(() => {
      if (this.destroyed) return;
      if (this.backgroundManager) {
        this.backgroundManager.ensureGridVisible();
        console.log('✅ Grid verificado após inicialização');
      }
    }, 200);
    
    // Expor backgroundManager globalmente para settings e debug
    (window as any).__backgroundManager = this.backgroundManager;
    
    // ClippingGeometry - Sistema de seções e clipping 3D
    this.clippingGeometry = new ClippingGeometry(this.scene, this.renderer);
    console.log('✂️ ClippingGeometry initialized with GPU acceleration');
    
    // Expor clippingGeometry globalmente para debug
    (window as any).__clippingGeometry = this.clippingGeometry;
    
    // IFC Upload Manager - Sistema de upload e gerenciamento de modelos IFC
    // Inicializado externamente via app-main.ts após API Client estar pronto
    // this.ifcUploadManager = IFCUploadManager.getInstance();
    
    // Debug commands for grid troubleshooting
    (window as any).fixGrid = () => {
      console.log('🔧 Fixing grid...');
      this.backgroundManager.ensureGridVisible();
    };
    
    (window as any).toggleGrid = () => {
      console.log('🔲 Toggling grid...');
      this.backgroundManager.toggleGrid();
    };

    (window as any).setGridConfig = (config: { enabled?: boolean; size?: number }) => {
      const applied = this.backgroundManager.setGridConfig(config || {});
      console.log('🛠️ Grid config applied:', applied, '(max size: 2000m)');
      return applied;
    };

    (window as any).getGridConfig = () => {
      const cfg = this.backgroundManager.getGridConfig();
      console.log('📐 Grid config:', cfg);
      return cfg;
    };
    
    (window as any).debugScene = () => {
      console.log('🔍 Scene Debug:', {
        sceneChildren: this.scene.children.length,
        children: this.scene.children.map(c => ({
          name: c.name || '(unnamed)',
          type: c.type,
          visible: c.visible,
          position: c.position
        })),
        gridInScene: this.scene.getObjectByName('ground-grid'),
        backgroundManager: !!this.backgroundManager,
        currentPreset: (this.backgroundManager as any)?.currentPreset?.name
      });
    };
    
    console.log('💡 Debug commands: fixGrid() | toggleGrid() | setGridConfig({ enabled, size }) | getGridConfig() | debugScene()');

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      if (this.destroyed) return;
      console.log('📐 Resize detected:', {
        width: this.container.clientWidth,
        height: this.container.clientHeight,
        gridVisible: this.backgroundManager ? (this.backgroundManager as any).gridHelper?.visible : 'N/A'
      });
      this.onResize();
      
      // Garantir que o grid permanece visível após resize
      if (this.backgroundManager) {
        this.backgroundManager.ensureGridVisible();
      }
    });
    this.resizeObserver.observe(this.container);
    
    // Force resize inicial após DOM estar pronto
    setTimeout(() => {
      if (this.destroyed) return;
      console.log('🔄 Resize inicial forçado');
      this.onResize();
      
      // Garantir grid após resize inicial
      if (this.backgroundManager) {
        this.backgroundManager.ensureGridVisible();
        console.log('✅ Grid verificado após resize inicial');
      }
    }, 100);
    
    // Verificação final do grid após tudo estar estável (fix para sidebar colapsada)
    setTimeout(() => {
      if (this.destroyed) return;
      if (this.backgroundManager) {
        this.backgroundManager.ensureGridVisible();
        console.log('✅ Grid verificação final completada');
      }
    }, 500);
  }
  
  /**
   * Verifica se está digitando em input
   */
  private isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea';
  }

  private registerServices(): void {
    // Register Three.js objects in DI
    di.register('scene', this.scene);
    di.register('camera', this.camera);
    di.register('renderer', this.renderer);
    
    // Connect ClippingGeometry to SectionManager (lazy - will be done when appController initializes)
    // The appController.sectionManager.setClippingGeometry will be called from AppController.init
    di.register('clippingGeometry' as any, this.clippingGeometry);
    console.log('✂️ ClippingGeometry registered in DI for SectionManager');
    
    // Register IFC Upload Manager
    di.register('ifcUploadManager' as any, this.ifcUploadManager);
    console.log('📦 IFC Upload Manager registered in DI');
  }

  private startRenderLoop(): void {
    const animate = () => {
      if (this.destroyed) return;

      this.animationFrameId = requestAnimationFrame(animate);

      const delta = this.clock.getDelta();
      const time = performance.now() / 1000;

      // Atualizar controles baseado no modo
      if (this.controlMode === 'fps') {
        this.fpsControls.update(delta);
      } else if (this.controlMode === 'third-person') {
        this.thirdPersonControls.update(delta);
      } else if (this.controlMode === 'drone') {
        this.droneControls.update(delta);
      } else {
        this.controls.update();
      }
      
      // Atualizar avatars (animações)
      this.avatarSystem.update(time);

      // CSM — atualizar frustum splits antes de renderizar
      this.csm?.update();

      // Nuvens procedurais — animar drift de vento
      this.clouds?.update();

      // Occlusion culling — esconder objetos atrás de outros
      this.occlusionCulling?.update();

      // Adaptive quality — mede FPS e ajusta resolução/qualidade
      this.adaptiveQuality?.tick();

      // Post-processing pipeline (SSAO + Bloom + DoF + SMAA + Vignette)
      if (this.postProcess) {
        this.postProcess.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  /**
   * Alterna entre Orbit e FPS, mantendo V como atalho rápido de inspeção.
   * Para os três modos principais use setControlMode('fps' | 'third-person' | 'drone') ou teclas 1/2/3.
   */
  public toggleControlMode(): void {
    if (this.controlMode === 'orbit') {
      this.setControlMode('fps');
    } else {
      this.setControlMode('orbit');
    }
  }

  /**
   * Define explicitamente o modo de câmera ativo.
   */
  public setControlMode(mode: ViewerControlMode): void {
    if (this.controlMode === mode) return;

    const previousMode = this.controlMode;

    if (mode === 'fps' && previousMode === 'third-person') {
      const avatarPosition = this.thirdPersonControls.getAvatarPosition();
      const eyeHeight = this.fpsControls.getNavigationState().eyeHeight;
      this.camera.position.set(avatarPosition.x, avatarPosition.y + eyeHeight, avatarPosition.z);
    }

    this.controls.enabled = false;
    this.fpsControls.setEnabled(false);
    this.thirdPersonControls.setEnabled(false);
    this.droneControls.setEnabled(false);

    this.controlMode = mode;

    if (mode === 'orbit') {
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      this.controls.target.copy(this.camera.position).add(direction.multiplyScalar(10));
      this.controls.enabled = true;
      this.controls.update();
      console.log('🖱️ Modo Orbit ativado (mouse orbital)');
    } else if (mode === 'fps') {
      this.fpsControls.setEnabled(true);
      console.log('🎮 Modo Primeira Pessoa ativado (WASD + Gravity)');
    } else if (mode === 'third-person') {
      this.thirdPersonControls.setGroundY(this.fpsControls.getNavigationState().groundY);
      this.thirdPersonControls.setGravity(this.fpsControls.getNavigationState().gravity);
      this.thirdPersonControls.setEnabled(true);
      console.log('🧍 Modo Terceira Pessoa ativado (avatar 360°)');
    } else if (mode === 'drone') {
      this.droneControls.setEnabled(true);
      console.log('🚁 Modo Drone ativado (voo livre)');
    }

    eventBus.emit(EventType.NAVIGATION_MODE_CHANGED, { newMode: this.getControlModeLabel(mode), mode });
  }

  private getControlModeLabel(mode: ViewerControlMode): string {
    if (mode === 'fps') return 'FPS';
    if (mode === 'third-person') return 'THIRD_PERSON';
    if (mode === 'drone') return 'DRONE';
    return 'ORBIT';
  }

  /**
   * Obtém modo de controle atual
   */
  public getControlMode(): ViewerControlMode {
    return this.controlMode;
  }

  /**
   * Alterna modo de navegação (alias para setControlMode conforme spec)
   */
  public setControls(mode: 'fps' | 'drone' | 'orbit'): void {
    // Mapear nomes da spec para tipos internos
    const modeMap: Record<string, ViewerControlMode> = {
      'fps': 'fps',
      'drone': 'drone',
      'orbit': 'orbit',
    };
    this.setControlMode(modeMap[mode] || 'orbit');
  }

  /**
   * Libera recursos e encerra viewer (alias para destroy conforme spec)
   */
  public dispose(): void {
    this.destroy();
  }

  /**
   * Evento de performance stats (conforme spec)
   */
  public onPerformanceStats?: (stats: { fps: number; memory: number }) => void;

  /**
   * Atualiza métricas de performance e dispara evento
   */
  private updatePerformanceStats(): void {
    if (!this.onPerformanceStats) return;

    // Calcular FPS aproximado
    const fps = Math.round(1 / this.clock.getDelta());

    // Obter uso de memória (se disponível)
    let memory = 0;
    if ((performance as any).memory) {
      memory = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }

    this.onPerformanceStats({ fps, memory });
  }

  private onResize(): void {
    if (this.headless || !this.renderer) return;
    const { width, height, usedFallback } = this.getSafeViewportSize();

    if (usedFallback) {
      console.warn('⚠️ ViewerHost usando fallback de dimensões:', {
        containerWidth: this.container.clientWidth,
        containerHeight: this.container.clientHeight,
        width,
        height
      });
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.postProcess?.setSize(width, height);
  }

  private getSafeViewportSize(): { width: number; height: number; usedFallback: boolean } {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;

    if (containerWidth > 0 && containerHeight > 0) {
      return { width: containerWidth, height: containerHeight, usedFallback: false };
    }

    const fallbackWidth = Math.max(window.innerWidth || 0, 1);
    const fallbackHeight = Math.max(window.innerHeight || 0, 1);

    return {
      width: fallbackWidth,
      height: fallbackHeight,
      usedFallback: true
    };
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.typeMapUnsubscribe) {
      this.typeMapUnsubscribe();
      this.typeMapUnsubscribe = undefined;
    }

    if (this.typeLegend) {
      this.typeLegend.destroy();
      this.typeLegend = undefined;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    // Remover event listener dos atalhos de câmera
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = undefined;
    }

    // Optional-chaining: em modo headless os subsistemas de GPU não existem.
    this.controls?.dispose();
    this.fpsControls?.dispose();
    this.thirdPersonControls?.dispose();
    this.droneControls?.dispose();
    this.bimEnvironment?.dispose();
    this.avatarSystem?.dispose();

    if (this.hdriManager) {
      this.hdriManager.dispose();
    }

    if (this.webrtcManager) {
      this.webrtcManager.disconnect();
    }

    this.renderer?.dispose();
  }
  
  /**
   * Inicializa WebRTC (multiplayer)
   */
  private async initWebRTC(signalingServerUrl: string): Promise<void> {
    const userId = this.generateUserId();
    
    this.webrtcManager = new WebRTCManager({
      signalingServerUrl,
      userId,
      scene: this.scene,
      camera: this.camera
    });
    
    // Integra avatar broadcast com signaling
    this.avatarSystem.setBroadcastCallback((_avatarConfig: unknown) => {
      // Broadcasting será feito via signaling service
      if (this.webrtcManager?.isConnected()) {
        // O WebRTCManager já tem acesso ao signaling service internamente
        console.log('📡 Avatar update será transmitido via WebRTC');
      }
    });
    
    try {
      await this.webrtcManager.connect();
      console.log('✅ WebRTC conectado e pronto');
    } catch (error) {
      console.error('❌ Erro ao conectar WebRTC:', error);
      this.webrtcManager = undefined;
    }
  }
  
  /**
   * Gera user ID único (em produção, viria de auth service)
   */
  private generateUserId(): string {
    // Em produção, usar auth real
    const stored = localStorage.getItem('arxisVR_userId');
    if (stored) return stored;
    
    const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('arxisVR_userId', userId);
    return userId;
  }
  
  /**
   * Ajusta ambiente para modelo carregado
   */
  public fitEnvironmentToModel(boundingBox: THREE.Box3): void {
    this.bimEnvironment?.fitToModel(boundingBox);
  }

  /**
   * Reaplica as cores com base no type map atual
   */
  public reapplyColors(): void {
    typeColorizer.applyColorizer(this.scene);
  }
}
