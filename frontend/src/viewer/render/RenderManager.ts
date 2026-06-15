import { WebGPURenderer } from './WebGPURenderer';
import { DataChannelSync } from './DataChannelSync';

export class RenderManager {
  private localRenderer?: WebGPURenderer;
  private canvas: HTMLCanvasElement;
  private currentMode: 'webgpu' | 'pixel_streaming' = 'webgpu';
  private dataChannelSync?: DataChannelSync;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public async initialize(): Promise<void> {
    this.localRenderer = new WebGPURenderer(this.canvas);
    await this.localRenderer.initialize();
  }

  public getRenderer(): WebGPURenderer | undefined {
    return this.localRenderer;
  }

  public getMode(): 'webgpu' | 'pixel_streaming' {
    return this.currentMode;
  }

  public switchToWebGPU(): void {
    this.currentMode = 'webgpu';
    if (this.localRenderer) {
      this.localRenderer.scene.render();
    }
  }

  public switchToStreaming(dataChannel: RTCDataChannel): void {
    this.currentMode = 'pixel_streaming';
    this.dataChannelSync = new DataChannelSync(dataChannel);

    // Conectando os callbacks de eventos
    this.dataChannelSync.setInteractionCallback((payload) => {
      console.log('[RenderManager] Received interaction from stream:', payload);
      // Aqui, repassamos os eventos do fluxo para o visualizador local se necessário
    });

    // Inicia a sincronização de câmera caso o renderer local mude de posição
    if (this.localRenderer) {
      this.localRenderer.scene.onAfterRenderObservable.add(() => {
        if (this.currentMode === 'pixel_streaming' && this.dataChannelSync) {
          const camera = this.localRenderer!.camera;
          this.dataChannelSync.syncCamera({
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
            fov: camera.fov,
          });
        }
      });
    }
  }

  public dispose(): void {
    if (this.localRenderer) {
      this.localRenderer.dispose();
    }
  }
}
