/**
 * MarkerCalibration - Sistema de calibração AR baseado em markers
 * 
 * Responsável por:
 * - Tracking de markers (ArUco/AprilTag/Image)
 * - Cálculo da transformação T_world_bim
 * - Estabilização e validação
 * - Criação de âncoras
 * 
 * Uso típico (em dispositivo móvel):
 * ```ts
 * const calibrator = new MarkerCalibration(camera, config);
 * await calibrator.initialize();
 * 
 * const result = await calibrator.calibrate({
 *   markerId: 'marker-123',
 *   onProgress: (progress) => console.log(progress.message)
 * });
 * 
 * // result.anchor contém T_world_bim para usar na sessão
 * ```
 */

import * as THREE from 'three';
import {
  ARMarker,
  ARAnchor,
  CalibrationSession,
  CalibrationOptions,
  CalibrationProgress,
  MarkerDetectionResult,
  ARTrackingConfig,
  TrackingStatistics
} from './ARMarkerTypes';
import { MarkerRegistry } from './MarkerRegistry';

export class MarkerCalibration extends EventTarget {
  private camera: THREE.Camera;
  private config: ARTrackingConfig;
  private registry: MarkerRegistry;
  
  // Tracking state
  private isTracking: boolean = false;
  private currentSession?: CalibrationSession;
  private detectionHistory: MarkerDetectionResult[] = [];
  private frameCount: number = 0;
  
  // Video/AR source
  private videoElement?: HTMLVideoElement;
  private arBackend?: any;  // MindAR ou AR.js instance
  
  // Stabilization
  private positionBuffer: THREE.Vector3[] = [];
  private rotationBuffer: THREE.Quaternion[] = [];

  constructor(
    camera: THREE.Camera,
    registry: MarkerRegistry,
    config?: Partial<ARTrackingConfig>
  ) {
    super();
    this.camera = camera;
    this.registry = registry;
    this.config = {
      minMarkerSize: 50,
      maxMarkerSize: 800,
      searchRadius: 200,
      minConfidence: 0.7,
      minTrackingTime: 1000,
      maxReprojectionError: 5.0,
      stabilizationFrames: 30,
      positionSmoothing: 0.3,
      rotationSmoothing: 0.3,
      cameraFOV: 60,
      cameraNear: 0.1,
      cameraFar: 100,
      maxFPS: 30,
      downscaleFactor: 0.75,
      ...config
    };
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Inicializa sistema de câmera e tracking
   */
  async initialize(backend: 'mindar' | 'arjs' | 'webxr' = 'arjs'): Promise<void> {
    // Solicita permissão de câmera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      // Cria elemento de vídeo
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = stream;
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.play();

      // Aguarda vídeo carregar
      await new Promise<void>((resolve) => {
        this.videoElement!.onloadedmetadata = () => resolve();
      });

      // Inicializa backend AR
      await this.initializeARBackend(backend);

      this.dispatchEvent(new Event('initialized'));
      console.log('MarkerCalibration initialized');
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      throw new Error(`Camera initialization failed: ${error}`);
    }
  }

  /**
   * Inicializa backend de AR (AR.js, MindAR, etc)
   */
  private async initializeARBackend(backend: 'mindar' | 'arjs' | 'webxr'): Promise<void> {
    if (backend === 'arjs') {
      // AR.js initialization
      // PSEUDOCODE - necessita da biblioteca AR.js carregada
      /*
      this.arBackend = new ARController(
        this.videoElement!.videoWidth,
        this.videoElement!.videoHeight,
        cameraParamFile
      );
      */
      console.warn('AR.js backend not yet implemented - marker detection will be simulated');
    } else if (backend === 'mindar') {
      // MindAR initialization
      // PSEUDOCODE - necessita da biblioteca MindAR carregada
      /*
      this.arBackend = new MindARController({
        video: this.videoElement,
        imageTargetSrc: markerImageTarget
      });
      await this.arBackend.initialize();
      */
      console.warn('MindAR backend not yet implemented - marker detection will be simulated');
    } else {
      console.warn('WebXR backend not yet implemented');
    }
  }

  // ============================================
  // CALIBRATION
  // ============================================

  /**
   * Inicia processo de calibração
   */
  async calibrate(options: CalibrationOptions): Promise<ARAnchor> {
    // Busca marker no registry
    const marker = this.registry.getMarker(options.markerId);
    if (!marker) {
      throw new Error(`Marker ${options.markerId} not found in registry`);
    }

    // Cria sessão
    this.currentSession = {
      id: this.generateSessionId(),
      projectId: this.registry['config'].projectId,
      markerId: options.markerId,
      status: 'initializing',
      framesTracked: 0,
      averageConfidence: 0,
      stabilityScore: 0,
      startedAt: Date.now()
    };

    this.frameCount = 0;
    this.detectionHistory = [];
    this.positionBuffer = [];
    this.rotationBuffer = [];

    try {
      // Notifica início
      this.reportProgress(options, {
        phase: 'searching',
        progress: 0,
        message: 'Procurando marker...'
      });

      // Inicia tracking
      if (options.autoStart !== false) {
        await this.startTracking(marker, options);
      }

      // Aguarda estabilização
      const anchor = await this.waitForStableTracking(marker, options);

      // Finaliza sessão
      this.currentSession.status = 'calibrated';
      this.currentSession.completedAt = Date.now();
      this.currentSession.duration = this.currentSession.completedAt - this.currentSession.startedAt;
      this.currentSession.anchor = anchor;

      // Salva âncora no registry
      await this.registry.saveAnchor(anchor);

      // Notifica conclusão
      this.reportProgress(options, {
        phase: 'completed',
        progress: 1.0,
        message: 'Calibração concluída!'
      });

      if (options.onComplete) {
        options.onComplete(anchor);
      }

      this.dispatchEvent(new CustomEvent('calibrated', { detail: anchor }));

      return anchor;
    } catch (error) {
      this.currentSession.status = 'failed';
      this.currentSession.error = String(error);

      if (options.onError) {
        options.onError(error as Error);
      }

      throw error;
    } finally {
      this.stopTracking();
    }
  }

  /**
   * Inicia tracking do marker
   */
  private async startTracking(marker: ARMarker, options: CalibrationOptions): Promise<void> {
    if (this.isTracking) return;

    this.isTracking = true;
    this.currentSession!.status = 'tracking';

    this.reportProgress(options, {
      phase: 'detecting',
      progress: 0.1,
      message: 'Detectando marker...'
    });

    // Loop de tracking
    this.trackingLoop(marker, options);
  }

  /**
   * Loop principal de tracking
   */
  private async trackingLoop(marker: ARMarker, options: CalibrationOptions): Promise<void> {
    const frameDelay = 1000 / this.config.maxFPS;

    const loop = async () => {
      if (!this.isTracking) return;

      try {
        // Detecta marker no frame
        const detection = await this.detectMarker(marker);

        if (detection) {
          this.frameCount++;
          this.detectionHistory.push(detection);
          
          // Adiciona ao buffer de estabilização
          this.positionBuffer.push(detection.position.clone());
          this.rotationBuffer.push(detection.quaternion.clone());

          // Limita tamanho do buffer
          const maxBuffer = this.config.stabilizationFrames;
          if (this.positionBuffer.length > maxBuffer) {
            this.positionBuffer.shift();
            this.rotationBuffer.shift();
          }

          // Atualiza sessão
          this.currentSession!.framesTracked++;
          this.currentSession!.averageConfidence = this.calculateAverageConfidence();
          this.currentSession!.stabilityScore = this.calculateStabilityScore();

          // Notifica progresso
          const trackingTime = Date.now() - this.currentSession!.startedAt;
          const progress = Math.min(0.9, trackingTime / this.config.minTrackingTime);

          this.reportProgress(options, {
            phase: 'tracking',
            progress: 0.1 + progress * 0.5,
            message: `Tracking... (${this.frameCount} frames, ${detection.confidence.toFixed(2)} confiança)`,
            detectionResult: detection
          });

          this.dispatchEvent(new CustomEvent('markerDetected', { detail: detection }));
        }

        // Continue loop
        setTimeout(loop, frameDelay);
      } catch (error) {
        console.error('Tracking error:', error);
        setTimeout(loop, frameDelay);
      }
    };

    loop();
  }

  /**
   * Detecta marker no frame atual
   */
  private async detectMarker(marker: ARMarker): Promise<MarkerDetectionResult | null> {
    if (!this.videoElement || !this.arBackend) {
      // SIMULAÇÃO para desenvolvimento sem AR.js/MindAR
      // Em produção, aqui seria chamado o backend real
      return this.simulateDetection(marker);
    }

    // TODO: Implementação real com AR.js ou MindAR
    // Exemplo com AR.js:
    /*
    const detected = this.arBackend.detectMarker();
    if (detected && detected.id === marker.markerId) {
      return {
        markerId: detected.id,
        confidence: detected.confidence,
        corners: detected.corners,
        center: detected.center,
        position: new THREE.Vector3().fromArray(detected.position),
        rotation: new THREE.Euler().fromArray(detected.rotation),
        quaternion: new THREE.Quaternion().fromArray(detected.quaternion),
        matrix: new THREE.Matrix4().fromArray(detected.matrix),
        reprojectionError: detected.error,
        poseStability: this.calculateStabilityScore()
      };
    }
    */

    return null;
  }

  /**
   * Simula detecção (para desenvolvimento)
   */
  private simulateDetection(marker: ARMarker): MarkerDetectionResult | null {
    // Simula 80% de taxa de detecção
    if (Math.random() > 0.8) return null;

    // Adiciona ruído à pose
    const noise = 0.02;
    const position = marker.positionInBIM.clone();
    position.x += (Math.random() - 0.5) * noise;
    position.y += (Math.random() - 0.5) * noise;
    position.z += (Math.random() - 0.5) * noise;

    const quaternion = marker.quaternionInBIM.clone();
    const confidence = 0.7 + Math.random() * 0.3;

    return {
      markerId: marker.markerId || marker.id,
      confidence,
      corners: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 }
      ],
      center: { x: 150, y: 150 },
      position,
      rotation: new THREE.Euler().setFromQuaternion(quaternion),
      quaternion,
      matrix: new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1)),
      reprojectionError: Math.random() * 2,
      poseStability: this.calculateStabilityScore()
    };
  }

  /**
   * Aguarda tracking estável
   */
  private async waitForStableTracking(
    marker: ARMarker,
    options: CalibrationOptions
  ): Promise<ARAnchor> {
    const requireStability = options.requireStability !== false;
    const stabilityThreshold = options.stabilityThreshold || 0.8;
    const timeout = options.timeout || 30000;

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100;

      const checker = setInterval(() => {
        // Timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checker);
          reject(new Error('Calibration timeout'));
          return;
        }

        const session = this.currentSession!;
        const trackingTime = Date.now() - session.startedAt;

        // Verifica se atingiu requisitos mínimos
        if (trackingTime < this.config.minTrackingTime) return;
        if (session.averageConfidence < this.config.minConfidence) return;
        if (requireStability && session.stabilityScore < stabilityThreshold) return;

        // Tracking estável! Cria âncora
        clearInterval(checker);

        this.reportProgress(options, {
          phase: 'stabilizing',
          progress: 0.9,
          message: 'Finalizando calibração...'
        });

        try {
          const anchor = this.createAnchor(marker);
          resolve(anchor);
        } catch (error) {
          reject(error);
        }
      }, checkInterval);
    });
  }

  /**
   * Cria âncora a partir dos dados estabilizados
   */
  private createAnchor(marker: ARMarker): ARAnchor {
    // Calcula pose média estabilizada
    const T_world_marker = this.calculateStabilizedPose();
    
    // T_bim_marker = pose do marker no BIM
    const T_bim_marker = marker.matrixInBIM.clone();
    
    // T_world_bim = T_world_marker × inv(T_bim_marker)
    const T_world_bim = new THREE.Matrix4()
      .copy(T_world_marker)
      .multiply(new THREE.Matrix4().copy(T_bim_marker).invert());

    // Calcula métricas
    const lastDetection = this.detectionHistory[this.detectionHistory.length - 1];
    const distanceToMarker = lastDetection.position.length();

    const anchor: ARAnchor = {
      id: this.generateAnchorId(),
      projectId: this.registry['config'].projectId,
      sessionId: this.currentSession!.id,
      markerId: marker.id,
      markerType: marker.type,
      T_world_marker,
      T_bim_marker,
      T_world_bim,
      trackingQuality: this.currentSession!.averageConfidence,
      distanceToMarker,
      trackingTime: Date.now() - this.currentSession!.startedAt,
      deviceId: this.getDeviceId(),
      deviceType: this.getDeviceType(),
      browserInfo: navigator.userAgent,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now()
    };

    return anchor;
  }

  /**
   * Calcula pose estabilizada usando média ponderada
   */
  private calculateStabilizedPose(): THREE.Matrix4 {
    if (this.positionBuffer.length === 0) {
      return new THREE.Matrix4();
    }

    // Média de posição
    const avgPosition = new THREE.Vector3();
    this.positionBuffer.forEach(p => avgPosition.add(p));
    avgPosition.divideScalar(this.positionBuffer.length);

    // Média de rotação (SLERP iterativo)
    let avgQuaternion = this.rotationBuffer[0].clone();
    for (let i = 1; i < this.rotationBuffer.length; i++) {
      avgQuaternion.slerp(this.rotationBuffer[i], 1.0 / (i + 1));
    }

    // Monta matriz
    const matrix = new THREE.Matrix4();
    matrix.compose(avgPosition, avgQuaternion, new THREE.Vector3(1, 1, 1));

    return matrix;
  }

  /**
   * Para tracking
   */
  stopTracking(): void {
    this.isTracking = false;
    this.dispatchEvent(new Event('trackingStopped'));
  }

  // ============================================
  // METRICS
  // ============================================

  /**
   * Calcula confiança média
   */
  private calculateAverageConfidence(): number {
    if (this.detectionHistory.length === 0) return 0;

    const sum = this.detectionHistory.reduce((acc, d) => acc + d.confidence, 0);
    return sum / this.detectionHistory.length;
  }

  /**
   * Calcula score de estabilidade (0-1)
   * Menor variância = maior estabilidade
   */
  private calculateStabilityScore(): number {
    if (this.positionBuffer.length < 10) return 0;

    // Calcula variância de posição
    const avgPos = new THREE.Vector3();
    this.positionBuffer.forEach(p => avgPos.add(p));
    avgPos.divideScalar(this.positionBuffer.length);

    let variance = 0;
    this.positionBuffer.forEach(p => {
      variance += p.distanceToSquared(avgPos);
    });
    variance /= this.positionBuffer.length;

    // Mapeia variância para score (0.01m² = 0.5, 0.001m² = 1.0)
    const maxVariance = 0.01;  // 10cm de desvio
    const score = Math.max(0, 1.0 - variance / maxVariance);

    return score;
  }

  /**
   * Retorna estatísticas da sessão atual
   */
  getStatistics(): TrackingStatistics | null {
    if (!this.currentSession) return null;

    const confidences = this.detectionHistory.map(d => d.confidence);

    return {
      sessionId: this.currentSession.id,
      duration: Date.now() - this.currentSession.startedAt,
      totalFrames: this.frameCount,
      framesWithDetection: this.detectionHistory.length,
      detectionRate: (this.detectionHistory.length / Math.max(1, this.frameCount)) * 100,
      averageConfidence: this.currentSession.averageConfidence,
      minConfidence: Math.min(...confidences),
      maxConfidence: Math.max(...confidences),
      positionVariance: this.calculatePositionVariance(),
      rotationVariance: this.calculateRotationVariance(),
      stabilityScore: this.currentSession.stabilityScore,
      averageFPS: this.frameCount / ((Date.now() - this.currentSession.startedAt) / 1000),
      minFPS: 0,  // TODO: track frame times
      maxFPS: this.config.maxFPS
    };
  }

  /**
   * Calcula variância de posição
   */
  private calculatePositionVariance(): THREE.Vector3 {
    if (this.positionBuffer.length === 0) return new THREE.Vector3();

    const avg = new THREE.Vector3();
    this.positionBuffer.forEach(p => avg.add(p));
    avg.divideScalar(this.positionBuffer.length);

    const variance = new THREE.Vector3();
    this.positionBuffer.forEach(p => {
      const diff = p.clone().sub(avg);
      variance.x += diff.x * diff.x;
      variance.y += diff.y * diff.y;
      variance.z += diff.z * diff.z;
    });
    variance.divideScalar(this.positionBuffer.length);

    return variance;
  }

  /**
   * Calcula variância de rotação
   */
  private calculateRotationVariance(): THREE.Euler {
    // Simplificado - em produção usar métrica adequada para quaternions
    return new THREE.Euler(0, 0, 0);
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Reporta progresso
   */
  private reportProgress(options: CalibrationOptions, progress: CalibrationProgress): void {
    if (options.onProgress) {
      options.onProgress(progress);
    }
    this.dispatchEvent(new CustomEvent('progress', { detail: progress }));
  }

  /**
   * Gera ID de sessão
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gera ID de âncora
   */
  private generateAnchorId(): string {
    return `anchor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém ID do dispositivo
   */
  private getDeviceId(): string {
    // Tenta usar ID persistente
    let deviceId = localStorage.getItem('arxis-device-id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('arxis-device-id', deviceId);
    }
    return deviceId;
  }

  /**
   * Detecta tipo de dispositivo
   */
  private getDeviceType(): ARAnchor['deviceType'] {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('hololens')) return 'hololens';
    if (ua.includes('magic leap')) return 'magic-leap';
    if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'mobile';
    return 'unknown';
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopTracking();

    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }

    if (this.arBackend && typeof this.arBackend.dispose === 'function') {
      this.arBackend.dispose();
    }

    this.dispatchEvent(new Event('disposed'));
  }
}
