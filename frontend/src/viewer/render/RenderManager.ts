import { WebGPURenderer } from './WebGPURenderer';
import { MeshLoader } from './MeshLoader';
import { InteractionRaycast } from './InteractionRaycast';
import { FilterShaderMaterial } from './FilterShaderMaterial';
import { DataChannelSync } from './DataChannelSync';
import {
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core';

export type RenderMode = 'webgpu' | 'pixel_streaming';

export interface RenderManagerCallbacks {
  /** Disparado quando o usuário seleciona/desseleciona um elemento na cena WebGPU. */
  onSelection?: (expressId: number | null) => void;
  /** Disparado quando o RenderManager faz fallback automático de streaming para WebGPU (S33.15). */
  onFallback?: (reason: string) => void;
  /** Ping (RTT) real medido na sessão de streaming, em ms. */
  onPing?: (rttMs: number | null) => void;
}

/**
 * RenderManager — orquestra o pipeline gráfico de próxima geração (S33).
 *
 * Integra o renderizador WebGPU local (Babylon.js) com seus subsistemas
 * (carregamento de malha, raycast de seleção e filtros) e gerencia o
 * chaveamento dinâmico para Pixel Streaming (Unreal) com fallback automático
 * baseado em latência real medida via WebRTC getStats().
 */
export class RenderManager {
  private localRenderer?: WebGPURenderer;
  private meshLoader = new MeshLoader();
  private raycast?: InteractionRaycast;
  private filters?: FilterShaderMaterial;
  private canvas: HTMLCanvasElement;
  private currentMode: RenderMode = 'webgpu';
  private dataChannelSync?: DataChannelSync;
  private callbacks: RenderManagerCallbacks;

  // Monitoramento de latência / fallback automático (S33.15)
  private peerConnection?: RTCPeerConnection;
  private pingTimer?: ReturnType<typeof setInterval>;
  private highPingSince: number | null = null;
  private lastRtt: number | null = null;
  private readonly PING_THRESHOLD_MS = 150;
  private readonly PING_GRACE_MS = 5000;
  private readonly PING_INTERVAL_MS = 1000;

  constructor(canvas: HTMLCanvasElement, callbacks: RenderManagerCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
  }

  public async initialize(): Promise<void> {
    this.localRenderer = new WebGPURenderer(this.canvas);
    await this.localRenderer.initialize();

    // Subsistemas do pipeline WebGPU (antes órfãos — agora integrados)
    this.raycast = new InteractionRaycast(this.localRenderer.scene);
    this.raycast.setSelectionCallback((expressId) => {
      this.callbacks.onSelection?.(expressId);
    });
    this.filters = new FilterShaderMaterial(this.localRenderer.scene);
  }

  public getRenderer(): WebGPURenderer | undefined {
    return this.localRenderer;
  }

  public getMode(): RenderMode {
    return this.currentMode;
  }

  public getLastPing(): number | null {
    return this.lastRtt;
  }

  // ---- Carregamento de modelo (S33.03) -------------------------------------

  /**
   * Carrega um modelo glTF/GLB na cena WebGPU. Os ExpressIDs são extraídos do
   * nome de cada malha pelo MeshLoader, habilitando seleção e filtros por ID.
   */
  public async loadModel(url: string, onProgress?: (p: number) => void): Promise<void> {
    if (!this.localRenderer) throw new Error('RenderManager não inicializado');
    await this.meshLoader.loadGLTF(this.localRenderer.scene, url, onProgress);
  }

  /**
   * Fallback quando não há GLB disponível: monta uma cena procedural de
   * demonstração com ExpressIDs sintéticos para validar seleção/filtros sem
   * depender do pipeline IFC→GLB do backend.
   */
  public buildPlaceholderScene(count = 24): void {
    if (!this.localRenderer) return;
    const scene = this.localRenderer.scene;
    const cols = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const box = MeshBuilder.CreateBox(`IfcDemo_${1000 + i}`, { size: 1 }, scene);
      box.position = new Vector3((i % cols) * 1.6 - cols, Math.floor(i / cols) * 1.6, 0);
      const mat = new StandardMaterial(`mat_${i}`, scene);
      mat.diffuseColor = new Color3(0.55, 0.62, 0.78);
      box.material = mat;
      box.metadata = { expressId: 1000 + i };
    }
  }

  // ---- Filtros (S33.06) ----------------------------------------------------

  public hideElements(ids: number[]): void {
    this.filters?.hideElements(ids);
  }

  public isolateElements(ids: number[]): void {
    this.filters?.isolateElements(ids);
  }

  public setColorOverride(ids: number[], hexColor: string): void {
    this.filters?.setColorOverride(ids, hexColor);
  }

  public showAllElements(): void {
    this.filters?.showAllElements();
  }

  // ---- Chaveamento de engine ------------------------------------------------

  public switchToWebGPU(): void {
    this.currentMode = 'webgpu';
    this.stopPingMonitor();
    if (this.localRenderer) {
      this.localRenderer.scene.render();
    }
  }

  /**
   * Ativa o modo Pixel Streaming. O RTCPeerConnection é usado para medir a
   * latência real e disparar fallback automático ao WebGPU local se o RTT
   * passar de 150ms por mais de 5s (S33.15).
   */
  public switchToStreaming(dataChannel: RTCDataChannel, peerConnection?: RTCPeerConnection): void {
    this.currentMode = 'pixel_streaming';
    this.peerConnection = peerConnection;
    this.dataChannelSync = new DataChannelSync(dataChannel);

    // Recebe interações originadas no feed da Unreal e repassa ao app (S33.14)
    this.dataChannelSync.setInteractionCallback((payload) => {
      if (payload.type === 'select') {
        this.callbacks.onSelection?.(payload.expressIds[0] ?? null);
      }
    });

    // Sincroniza câmera local → Unreal (S33.13)
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

    this.startPingMonitor();
  }

  /** Propaga seleção/filtro local para a Unreal pelo Data Channel (S33.14). */
  public sendStreamingInteraction(
    type: 'select' | 'hover' | 'hide' | 'isolate',
    expressIds: number[],
    color?: string
  ): void {
    this.dataChannelSync?.syncInteraction({ type, expressIds, color });
  }

  private startPingMonitor(): void {
    this.stopPingMonitor();
    this.highPingSince = null;
    this.pingTimer = setInterval(() => {
      void this.sampleRtt();
    }, this.PING_INTERVAL_MS);
  }

  private stopPingMonitor(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  /** Lê o RTT real do par WebRTC e avalia o gatilho de fallback. */
  private async sampleRtt(): Promise<void> {
    const rtt = await RenderManager.readRtt(this.peerConnection);
    this.lastRtt = rtt;
    this.callbacks.onPing?.(rtt);

    if (rtt === null) return; // sem dados ainda — não conta para o fallback

    if (rtt > this.PING_THRESHOLD_MS) {
      if (this.highPingSince === null) {
        this.highPingSince = performance.now();
      } else if (performance.now() - this.highPingSince >= this.PING_GRACE_MS) {
        const reason = `Latência ${Math.round(rtt)}ms acima de ${this.PING_THRESHOLD_MS}ms por mais de ${this.PING_GRACE_MS / 1000}s`;
        this.switchToWebGPU();
        this.callbacks.onFallback?.(reason);
      }
    } else {
      this.highPingSince = null; // recuperou — zera o relógio de graça
    }
  }

  /** Extrai currentRoundTripTime (ms) do candidate-pair ativo. */
  public static async readRtt(pc?: RTCPeerConnection): Promise<number | null> {
    if (!pc) return null;
    try {
      const stats = await pc.getStats();
      let rttMs: number | null = null;
      stats.forEach((report: any) => {
        if (
          report.type === 'candidate-pair' &&
          (report.nominated || report.state === 'succeeded') &&
          typeof report.currentRoundTripTime === 'number'
        ) {
          rttMs = report.currentRoundTripTime * 1000;
        }
      });
      return rttMs;
    } catch {
      return null;
    }
  }

  public dispose(): void {
    this.stopPingMonitor();
    this.raycast?.dispose();
    this.filters?.dispose();
    this.meshLoader.clear();
    if (this.localRenderer) {
      this.localRenderer.dispose();
    }
  }
}
