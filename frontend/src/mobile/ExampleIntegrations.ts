/**
 * Exemplo de Integração Mobile
 * Como adaptar o código existente para funcionar em mobile
 */

import { mobilePlatform } from './NativeBridge';
import { uiStore } from '../app/state/uiStore';

/**
 * EXEMPLO 1: File Picker Mobile-Friendly
 * Substituir input file HTML por picker nativo
 */
export class MobileFilePicker {
  public static async openFilePicker(): Promise<File | null> {
    // Mobile: usar picker nativo
    if (mobilePlatform.isNative) {
      const file = await mobilePlatform.pickIFCFile();
      if (file) {
        console.log('✅ File picked (native):', file.name);
      }
      return file;
    }

    // Web: usar input file tradicional
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.ifc';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        resolve(file || null);
      };
      
      input.click();
    });
  }
}

/**
 * EXEMPLO 2: App Lifecycle - Pausar/Retomar Render
 */
export class MobileRenderOptimizer {
  private animationFrameId?: number;
  private isRendering = true;

  constructor(private renderCallback: () => void) {
    this.initLifecycleListeners();
  }

  private initLifecycleListeners(): void {
    if (!mobilePlatform.isNative) {
      return; // Só em mobile
    }

    mobilePlatform.onAppStateChange((isActive) => {
      if (isActive) {
        console.log('📱 App voltou ao foreground - retomando render');
        this.resume();
      } else {
        console.log('📱 App foi para background - pausando render');
        this.pause();
      }
    });
  }

  public start(): void {
    this.isRendering = true;
    this.render();
  }

  public pause(): void {
    this.isRendering = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  public resume(): void {
    if (!this.isRendering) {
      this.start();
    }
  }

  private render = (): void => {
    if (!this.isRendering) return;

    this.renderCallback();
    this.animationFrameId = requestAnimationFrame(this.render);
  };
}

/**
 * EXEMPLO 3: Back Button Handler (Android)
 */
export class MobileBackButtonHandler {
  public static init(): void {
    if (!mobilePlatform.isAndroid) {
      return;
    }

    mobilePlatform.onBackButton(() => {
      // 1. Se tem modal aberto, fechar
      const state = uiStore.getState();
      if (state.modal.key) {
        uiStore.closeModal();
        return false; // Não fechar app
      }

      // 2. Se sidebar aberta em mobile, fechar
      if (!state.sidebarCollapsed) {
        uiStore.toggleSidebar();
        return false;
      }

      // 3. Se não tem nada aberto, confirmar saída
      const shouldExit = confirm('Deseja sair do ArxisVR?');
      return shouldExit;
    });
  }
}

/**
 * EXEMPLO 4: Performance Adaptativa
 */
export class MobilePerformanceAdapter {
  public static applyOptimizations(renderer: THREE.WebGLRenderer): void {
    if (!mobilePlatform.isNative) {
      return; // Só otimizar em mobile
    }

    console.log('📱 Aplicando otimizações mobile...');

    // 1. Reduzir pixel ratio (menos pixels = mais FPS)
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    console.log(`  - PixelRatio: ${pixelRatio}`);

    // 2. Desabilitar shadows em Android (performance)
    if (mobilePlatform.isAndroid) {
      renderer.shadowMap.enabled = false;
      console.log('  - Shadows: disabled (Android)');
    }

    // 3. Reduzir antialiasing
    // Note: Não pode ser mudado depois de criar renderer
    // Deve ser feito na criação: new WebGLRenderer({ antialias: false })

    // 4. Limitar tamanho do framebuffer
    const maxSize = mobilePlatform.isAndroid ? 2048 : 4096;
    renderer.capabilities.maxTextureSize = maxSize;
    console.log(`  - Max texture size: ${maxSize}`);

    console.log('✅ Otimizações mobile aplicadas');
  }

  public static recommendedSettings() {
    return {
      antialias: !mobilePlatform.isAndroid, // Só em iOS
      powerPreference: 'high-performance',
      precision: 'mediump', // Economizar GPU
      logarithmicDepthBuffer: false, // Melhor performance
      stencil: false // Não usado
    };
  }
}

/**
 * EXEMPLO 5: AR Camera Preview
 */
export class MobileARHelper {
  public static async startARPreview(): Promise<string | null> {
    if (!mobilePlatform.isNative) {
      console.warn('AR só funciona em mobile');
      return null;
    }

    try {
      // Vibração de feedback
      await mobilePlatform.vibrate('light');

      // Abrir câmera
      const photoUri = await mobilePlatform.capturePhoto({
        quality: 90
      });

      if (photoUri) {
        console.log('✅ AR marker capturado:', photoUri);
        // Processar imagem para detectar markers
      }

      return photoUri;

    } catch (error) {
      console.error('❌ AR preview failed:', error);
      return null;
    }
  }
}

/**
 * EXEMPLO 6: GPS Alignment
 */
export class MobileGPSAlignment {
  public static async alignModelToGPS(): Promise<void> {
    if (!mobilePlatform.isNative) {
      console.warn('GPS só funciona em mobile');
      return;
    }

    try {
      const location = await mobilePlatform.getCurrentLocation();
      
      if (!location) {
        throw new Error('Não foi possível obter localização');
      }

      console.log(`📍 GPS: ${location.lat}, ${location.lng}`);
      console.log(`   Precisão: ${location.accuracy}m`);

      // TODO: Alinhar modelo 3D com coordenadas GPS
      // - Converter lat/lng para posição 3D
      // - Rotacionar modelo baseado em norte magnético
      // - Escalar baseado em altitude

    } catch (error) {
      console.error('❌ GPS alignment failed:', error);
    }
  }
}

/**
 * EXEMPLO 7: Share Screenshot
 */
export class MobileShareHelper {
  public static async shareScreenshot(
    canvas: HTMLCanvasElement,
    projectName: string
  ): Promise<void> {
    if (!mobilePlatform.isNative) {
      // Fallback web: download
      const link = document.createElement('a');
      link.download = `${projectName}.png`;
      link.href = canvas.toDataURL();
      link.click();
      return;
    }

    try {
      // 1. Converter canvas para blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!));
      });

      // 2. Salvar temporariamente
      const base64 = await this.blobToBase64(blob);
      const path = `screenshots/${Date.now()}.png`;
      await mobilePlatform.saveFile(path, base64);

      // 3. Compartilhar
      await mobilePlatform.shareContent({
        title: `${projectName} - ArxisVR`,
        text: 'Confira este modelo BIM!',
        files: [path]
      });

      // 4. Limpar arquivo temporário
      setTimeout(() => {
        mobilePlatform.deleteFile(path);
      }, 5000);

    } catch (error) {
      console.error('❌ Share failed:', error);
    }
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

/**
 * EXEMPLO 8: Motion Controls (Gyro/Accelerometer)
 */
export class MobileMotionControls {
  private isTracking = false;
  private lastRotation = { x: 0, y: 0, z: 0 };

  public start(camera: THREE.Camera): void {
    if (!mobilePlatform.isNative) {
      return;
    }

    this.isTracking = true;

    mobilePlatform.onMotion((data) => {
      if (!this.isTracking) return;

      // Suavizar movimento
      const smoothFactor = 0.8;
      this.lastRotation.x = this.lastRotation.x * smoothFactor + data.x * (1 - smoothFactor);
      this.lastRotation.y = this.lastRotation.y * smoothFactor + data.y * (1 - smoothFactor);
      this.lastRotation.z = this.lastRotation.z * smoothFactor + data.z * (1 - smoothFactor);

      // Aplicar rotação na câmera
      camera.rotation.x = this.lastRotation.x * 0.01;
      camera.rotation.y = this.lastRotation.y * 0.01;
      camera.rotation.z = this.lastRotation.z * 0.01;
    });
  }

  public stop(): void {
    this.isTracking = false;
  }
}

/**
 * EXEMPLO 9: Storage de Projetos
 */
export class MobileProjectStorage {
  public static async saveProject(name: string, data: any): Promise<boolean> {
    const jsonData = JSON.stringify(data);

    if (mobilePlatform.isNative) {
      // Mobile: storage nativo
      return await mobilePlatform.saveFile(
        `projects/${name}.json`,
        jsonData
      );
    } else {
      // Web: localStorage
      localStorage.setItem(`project:${name}`, jsonData);
      return true;
    }
  }

  public static async loadProject(name: string): Promise<any | null> {
    if (mobilePlatform.isNative) {
      // Mobile: storage nativo
      const jsonData = await mobilePlatform.readFile(
        `projects/${name}.json`
      );
      return jsonData ? JSON.parse(jsonData) : null;
    } else {
      // Web: localStorage
      const jsonData = localStorage.getItem(`project:${name}`);
      return jsonData ? JSON.parse(jsonData) : null;
    }
  }

  public static async deleteProject(name: string): Promise<boolean> {
    if (mobilePlatform.isNative) {
      return await mobilePlatform.deleteFile(`projects/${name}.json`);
    } else {
      localStorage.removeItem(`project:${name}`);
      return true;
    }
  }
}

// ===== COMO USAR =====

// 1. Inicializar handlers na inicialização do app
export function initMobileFeatures(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
  console.log('📱 Inicializando features mobile...');

  // Performance
  MobilePerformanceAdapter.applyOptimizations(renderer);

  // Back button (Android)
  MobileBackButtonHandler.init();

  // Sensors (opcional - desabilitar por padrão)
  // const motionControls = new MobileMotionControls();
  // motionControls.start(camera);

  console.log('✅ Features mobile inicializadas');
}

// 2. Usar file picker adaptativo
async function handleOpenFile() {
  const file = await MobileFilePicker.openFilePicker();
  if (file) {
    // Carregar arquivo IFC
  }
}

// 3. Compartilhar screenshot
async function handleShare(canvas: HTMLCanvasElement) {
  await MobileShareHelper.shareScreenshot(canvas, 'MeuProjeto');
}
