import * as THREE from 'three';

/**
 * GestureRecognizer - Reconhecimento de gestos em VR
 * Detecta padrões de movimento dos controllers
 * 
 * Features:
 * - Swipe detection (left, right, up, down)
 * - Circle gestures
 * - Pinch detection
 * - Wave detection
 * - Throw detection
 * - Custom gesture registration
 * 
 * Preparado para Hand Tracking API
 */
export class GestureRecognizer {
  // Histórico de posições
  private positionHistory: {
    controller1: THREE.Vector3[];
    controller2: THREE.Vector3[];
  } = {
    controller1: [],
    controller2: []
  };
  
  // Configurações
  private readonly MAX_HISTORY_SIZE = 30; // frames
  private readonly SWIPE_THRESHOLD = 0.5; // metros
  private readonly SWIPE_SPEED_THRESHOLD = 2.0; // m/s
  private readonly CIRCLE_THRESHOLD = 0.3; // metros
  
  // Gestos detectados
  private lastGesture: {
    type: GestureType | null;
    controller: 'controller1' | 'controller2' | null;
    timestamp: number;
  } = {
    type: null,
    controller: null,
    timestamp: 0
  };
  
  // Callbacks
  private gestureCallbacks: Map<GestureType, ((data: GestureData) => void)[]> = new Map();
  
  constructor() {
    console.log('✋ Gesture Recognizer initialized');
  }
  
  /**
   * Atualiza posição do controller
   */
  public updatePosition(controllerId: 'controller1' | 'controller2', position: THREE.Vector3): void {
    const history = this.positionHistory[controllerId];
    
    // Adiciona nova posição
    history.push(position.clone());
    
    // Limita tamanho do histórico
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.shift();
    }
    
    // Detecta gestos
    if (history.length >= 10) {
      this.detectGestures(controllerId);
    }
  }
  
  /**
   * Detecta gestos baseado no histórico
   */
  private detectGestures(controllerId: 'controller1' | 'controller2'): void {
    const history = this.positionHistory[controllerId];
    if (history.length < 10) return;
    
    // Swipe detection
    const swipe = this.detectSwipe(history);
    if (swipe) {
      this.emitGesture(swipe, controllerId, { direction: swipe });
      return;
    }
    
    // Circle detection
    if (this.detectCircle(history)) {
      this.emitGesture('circle', controllerId, {});
      return;
    }
    
    // Wave detection
    if (this.detectWave(history)) {
      this.emitGesture('wave', controllerId, {});
      return;
    }
  }
  
  /**
   * Detecta movimento de swipe
   */
  private detectSwipe(history: THREE.Vector3[]): GestureType | null {
    if (history.length < 10) return null;
    
    const start = history[0];
    const end = history[history.length - 1];
    
    const delta = new THREE.Vector3().subVectors(end, start);
    const distance = delta.length();
    
    // Verifica se movimento é rápido o suficiente
    const timeSpan = history.length / 60; // assumindo 60 FPS
    const speed = distance / timeSpan;
    
    if (distance < this.SWIPE_THRESHOLD || speed < this.SWIPE_SPEED_THRESHOLD) {
      return null;
    }
    
    // Determina direção
    const absX = Math.abs(delta.x);
    const absY = Math.abs(delta.y);
    const absZ = Math.abs(delta.z);
    
    if (absX > absY && absX > absZ) {
      return delta.x > 0 ? 'swipe_right' : 'swipe_left';
    } else if (absY > absX && absY > absZ) {
      return delta.y > 0 ? 'swipe_up' : 'swipe_down';
    } else if (absZ > absX && absZ > absY) {
      return delta.z > 0 ? 'swipe_forward' : 'swipe_backward';
    }
    
    return null;
  }
  
  /**
   * Detecta movimento circular
   */
  private detectCircle(history: THREE.Vector3[]): boolean {
    if (history.length < 20) return false;
    
    // Calcula centro médio
    const center = new THREE.Vector3();
    history.forEach((pos) => center.add(pos));
    center.divideScalar(history.length);
    
    // Calcula variância das distâncias ao centro
    const distances = history.map((pos) => pos.distanceTo(center));
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    
    // Se variância é baixa, pode ser círculo
    if (variance < 0.01 && avgDistance > this.CIRCLE_THRESHOLD) {
      // Verifica se completou volta (ângulo total > 2π)
      let totalAngle = 0;
      for (let i = 1; i < history.length - 1; i++) {
        const v1 = new THREE.Vector3().subVectors(history[i], center).normalize();
        const v2 = new THREE.Vector3().subVectors(history[i + 1], center).normalize();
        const angle = Math.acos(v1.dot(v2));
        totalAngle += angle;
      }
      
      return totalAngle > Math.PI * 1.5; // 270 graus
    }
    
    return false;
  }
  
  /**
   * Detecta aceno (wave)
   */
  private detectWave(history: THREE.Vector3[]): boolean {
    if (history.length < 15) return false;
    
    // Detecta oscilação lateral rápida
    let crossings = 0;
    let lastDir = 0;
    
    for (let i = 1; i < history.length; i++) {
      const delta = history[i].x - history[i - 1].x;
      const dir = Math.sign(delta);
      
      if (dir !== 0 && dir !== lastDir && lastDir !== 0) {
        crossings++;
      }
      
      if (dir !== 0) {
        lastDir = dir;
      }
    }
    
    // Se cruzou a linha central múltiplas vezes
    return crossings >= 3;
  }
  
  /**
   * Emite evento de gesto
   */
  private emitGesture(
    type: GestureType,
    controller: 'controller1' | 'controller2',
    data: any
  ): void {
    // Evita detectar mesmo gesto múltiplas vezes
    const now = Date.now();
    if (
      this.lastGesture.type === type &&
      this.lastGesture.controller === controller &&
      now - this.lastGesture.timestamp < 500
    ) {
      return;
    }
    
    this.lastGesture = { type, controller, timestamp: now };
    
    console.log(`✋ Gesture detected: ${type} (${controller})`);
    
    // Chama callbacks
    const callbacks = this.gestureCallbacks.get(type);
    if (callbacks) {
      const gestureData: GestureData = { type, controller, ...data };
      callbacks.forEach((callback) => callback(gestureData));
    }
  }
  
  /**
   * Registra callback para gesto
   */
  public onGesture(type: GestureType, callback: (data: GestureData) => void): void {
    if (!this.gestureCallbacks.has(type)) {
      this.gestureCallbacks.set(type, []);
    }
    
    this.gestureCallbacks.get(type)!.push(callback);
  }
  
  /**
   * Remove callback de gesto
   */
  public offGesture(type: GestureType, callback: (data: GestureData) => void): void {
    const callbacks = this.gestureCallbacks.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  /**
   * Limpa histórico
   */
  public clearHistory(): void {
    this.positionHistory.controller1 = [];
    this.positionHistory.controller2 = [];
  }
  
  /**
   * Retorna último gesto detectado
   */
  public getLastGesture(): {
    type: GestureType | null;
    controller: 'controller1' | 'controller2' | null;
    timestamp: number;
  } {
    return { ...this.lastGesture };
  }
}

/**
 * Tipos de gestos suportados
 */
export type GestureType =
  | 'swipe_left'
  | 'swipe_right'
  | 'swipe_up'
  | 'swipe_down'
  | 'swipe_forward'
  | 'swipe_backward'
  | 'circle'
  | 'wave'
  | 'pinch'
  | 'throw';

/**
 * Dados do gesto detectado
 */
export interface GestureData {
  type: GestureType;
  controller: 'controller1' | 'controller2';
  direction?: string;
  [key: string]: any;
}
