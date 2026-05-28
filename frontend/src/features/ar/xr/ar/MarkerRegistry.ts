/**
 * MarkerRegistry - Gerenciamento de markers AR
 * 
 * Responsável por:
 * - Registro/remoção de markers
 * - Persistência no servidor
 * - Cache local
 * - Validação de markers
 */

import * as THREE from 'three';
import {
  ARMarker,
  ARAnchor,
  FloorLevel,
  MarkerType,
  ValidationRecord,
  AROperationLog
} from './ARMarkerTypes';

export interface MarkerRegistryConfig {
  serverUrl: string;
  projectId: string;
  autoSync?: boolean;
  syncInterval?: number;  // ms
  cacheEnabled?: boolean;
}

export class MarkerRegistry extends EventTarget {
  private config: MarkerRegistryConfig;
  private markers: Map<string, ARMarker>;
  private anchors: Map<string, ARAnchor>;
  private floors: Map<string, FloorLevel>;
  private logs: AROperationLog[];
  private syncTimer?: number;

  constructor(config: MarkerRegistryConfig) {
    super();
    this.config = {
      autoSync: true,
      syncInterval: 30000,  // 30s
      cacheEnabled: true,
      ...config
    };

    this.markers = new Map();
    this.anchors = new Map();
    this.floors = new Map();
    this.logs = [];

    if (this.config.autoSync) {
      this.startAutoSync();
    }

    this.loadFromCache();
  }

  // ============================================
  // MARKER MANAGEMENT
  // ============================================

  /**
   * Registra novo marker no BIM
   */
  async registerMarker(marker: Omit<ARMarker, 'id'>): Promise<ARMarker> {
    const id = this.generateMarkerId();
    const fullMarker: ARMarker = {
      ...marker,
      id,
      active: true,
      lastCalibrated: undefined,
      calibrationConfidence: undefined,
      validationHistory: []
    };

    // Valida marker
    this.validateMarker(fullMarker);

    // Salva localmente
    this.markers.set(id, fullMarker);

    // Persiste no servidor
    try {
      await this.uploadMarker(fullMarker);
      this.log('registerMarker', { markerId: id }, true);
    } catch (error) {
      this.markers.delete(id);
      this.log('registerMarker', { markerId: id, error: String(error) }, false);
      throw error;
    }

    this.saveToCache();
    this.dispatchEvent(new CustomEvent('markerRegistered', { detail: fullMarker }));

    return fullMarker;
  }

  /**
   * Atualiza marker existente
   */
  async updateMarker(id: string, updates: Partial<ARMarker>): Promise<ARMarker> {
    const marker = this.markers.get(id);
    if (!marker) {
      throw new Error(`Marker ${id} not found`);
    }

    const updated: ARMarker = {
      ...marker,
      ...updates,
      id  // Garante que ID não muda
    };

    this.validateMarker(updated);

    this.markers.set(id, updated);

    try {
      await this.uploadMarker(updated);
      this.log('updateMarker', { markerId: id }, true);
    } catch (error) {
      this.markers.set(id, marker);  // Rollback
      this.log('updateMarker', { markerId: id, error: String(error) }, false);
      throw error;
    }

    this.saveToCache();
    this.dispatchEvent(new CustomEvent('markerUpdated', { detail: updated }));

    return updated;
  }

  /**
   * Remove marker
   */
  async deleteMarker(id: string): Promise<void> {
    const marker = this.markers.get(id);
    if (!marker) {
      throw new Error(`Marker ${id} not found`);
    }

    this.markers.delete(id);

    try {
      await this.deleteMarkerFromServer(id);
      this.log('deleteMarker', { markerId: id }, true);
    } catch (error) {
      this.markers.set(id, marker);  // Rollback
      this.log('deleteMarker', { markerId: id, error: String(error) }, false);
      throw error;
    }

    this.saveToCache();
    this.dispatchEvent(new CustomEvent('markerDeleted', { detail: { id } }));
  }

  /**
   * Busca marker por ID
   */
  getMarker(id: string): ARMarker | undefined {
    return this.markers.get(id);
  }

  /**
   * Lista todos os markers
   */
  getAllMarkers(): ARMarker[] {
    return Array.from(this.markers.values());
  }

  /**
   * Busca markers por andar
   */
  getMarkersByFloor(floorId: string): ARMarker[] {
    return this.getAllMarkers().filter(m => m.floorLevel.id === floorId);
  }

  /**
   * Busca markers ativos
   */
  getActiveMarkers(): ARMarker[] {
    return this.getAllMarkers().filter(m => m.active);
  }

  /**
   * Busca markers por tipo
   */
  getMarkersByType(type: MarkerType): ARMarker[] {
    return this.getAllMarkers().filter(m => m.type === type);
  }

  /**
   * Busca marker master de um andar
   */
  getMasterMarker(floorId: string): ARMarker | undefined {
    return this.getMarkersByFloor(floorId).find(m => m.role === 'master' && m.active);
  }

  // ============================================
  // ANCHOR MANAGEMENT
  // ============================================

  /**
   * Salva âncora calibrada
   */
  async saveAnchor(anchor: ARAnchor): Promise<void> {
    this.anchors.set(anchor.id, anchor);

    // Atualiza marker com dados de calibração
    const marker = this.markers.get(anchor.markerId);
    if (marker) {
      marker.lastCalibrated = anchor.createdAt;
      marker.calibrationConfidence = anchor.trackingQuality;
      this.markers.set(marker.id, marker);
    }

    try {
      await this.uploadAnchor(anchor);
      this.log('saveAnchor', { anchorId: anchor.id, markerId: anchor.markerId }, true);
    } catch (error) {
      this.anchors.delete(anchor.id);
      this.log('saveAnchor', { anchorId: anchor.id, error: String(error) }, false);
      throw error;
    }

    this.saveToCache();
    this.dispatchEvent(new CustomEvent('anchorSaved', { detail: anchor }));
  }

  /**
   * Busca âncora ativa para projeto/sessão
   */
  getActiveAnchor(projectId?: string, sessionId?: string): ARAnchor | undefined {
    const now = Date.now();
    const anchors = Array.from(this.anchors.values()).filter(a => {
      if (a.expiresAt && a.expiresAt < now) return false;
      if (projectId && a.projectId !== projectId) return false;
      if (sessionId && a.sessionId !== sessionId) return false;
      return true;
    });

    // Retorna a mais recente
    anchors.sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);
    return anchors[0];
  }

  /**
   * Lista âncoras de um marker
   */
  getAnchorsByMarker(markerId: string): ARAnchor[] {
    return Array.from(this.anchors.values())
      .filter(a => a.markerId === markerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // ============================================
  // FLOOR MANAGEMENT
  // ============================================

  /**
   * Registra andar
   */
  registerFloor(floor: FloorLevel): void {
    this.floors.set(floor.id, floor);
    this.saveToCache();
    this.dispatchEvent(new CustomEvent('floorRegistered', { detail: floor }));
  }

  /**
   * Lista andares
   */
  getAllFloors(): FloorLevel[] {
    return Array.from(this.floors.values()).sort((a, b) => b.elevation - a.elevation);
  }

  /**
   * Busca andar por ID
   */
  getFloor(id: string): FloorLevel | undefined {
    return this.floors.get(id);
  }

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Adiciona registro de validação a um marker
   */
  async addValidation(markerId: string, validation: ValidationRecord): Promise<void> {
    const marker = this.markers.get(markerId);
    if (!marker) {
      throw new Error(`Marker ${markerId} not found`);
    }

    if (!marker.validationHistory) {
      marker.validationHistory = [];
    }

    marker.validationHistory.push(validation);
    marker.lastCalibrated = validation.timestamp;
    marker.calibrationConfidence = validation.confidence;

    await this.updateMarker(markerId, marker);
  }

  /**
   * Valida estrutura do marker
   */
  private validateMarker(marker: ARMarker): void {
    if (!marker.name) {
      throw new Error('Marker must have a name');
    }

    if (marker.physicalSize <= 0) {
      throw new Error('Physical size must be positive');
    }

    if (!marker.positionInBIM) {
      throw new Error('Marker must have position in BIM');
    }

    if (!marker.floorLevel) {
      throw new Error('Marker must have floor level');
    }

    // Valida IDs únicos
    if (marker.type === MarkerType.ARUCO || marker.type === MarkerType.APRILTAG) {
      if (marker.markerId === undefined) {
        throw new Error(`${marker.type} marker must have numeric ID`);
      }

      const existing = this.getAllMarkers().find(m => 
        m.id !== marker.id &&
        m.type === marker.type &&
        m.markerId === marker.markerId &&
        m.dictionary === marker.dictionary
      );

      if (existing) {
        throw new Error(`Marker with type ${marker.type} and ID ${marker.markerId} already exists`);
      }
    }
  }

  // ============================================
  // SYNC & PERSISTENCE
  // ============================================

  /**
   * Sincroniza com servidor
   */
  async sync(): Promise<void> {
    try {
      const response = await fetch(`${this.config.serverUrl}/api/ar/markers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Project-Id': this.config.projectId
        }
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Atualiza markers
      if (data.markers) {
        data.markers.forEach((m: ARMarker) => {
          this.markers.set(m.id, this.deserializeMarker(m));
        });
      }

      // Atualiza anchors
      if (data.anchors) {
        data.anchors.forEach((a: ARAnchor) => {
          this.anchors.set(a.id, this.deserializeAnchor(a));
        });
      }

      this.saveToCache();
      this.log('sync', {}, true);
    } catch (error) {
      this.log('sync', { error: String(error) }, false);
      throw error;
    }
  }

  /**
   * Upload marker para servidor
   */
  private async uploadMarker(marker: ARMarker): Promise<void> {
    const response = await fetch(`${this.config.serverUrl}/api/ar/markers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Id': this.config.projectId
      },
      body: JSON.stringify(this.serializeMarker(marker))
    });

    if (!response.ok) {
      throw new Error(`Failed to upload marker: ${response.statusText}`);
    }
  }

  /**
   * Delete marker do servidor
   */
  private async deleteMarkerFromServer(id: string): Promise<void> {
    const response = await fetch(`${this.config.serverUrl}/api/ar/markers/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Project-Id': this.config.projectId
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete marker: ${response.statusText}`);
    }
  }

  /**
   * Upload anchor para servidor
   */
  private async uploadAnchor(anchor: ARAnchor): Promise<void> {
    const response = await fetch(`${this.config.serverUrl}/api/ar/anchors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Project-Id': this.config.projectId
      },
      body: JSON.stringify(this.serializeAnchor(anchor))
    });

    if (!response.ok) {
      throw new Error(`Failed to upload anchor: ${response.statusText}`);
    }
  }

  /**
   * Inicia sync automático
   */
  private startAutoSync(): void {
    if (this.syncTimer) return;

    this.syncTimer = window.setInterval(() => {
      this.sync().catch(error => {
        console.error('Auto-sync failed:', error);
      });
    }, this.config.syncInterval);
  }

  /**
   * Para sync automático
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Salva no cache local
   */
  private saveToCache(): void {
    if (!this.config.cacheEnabled) return;

    try {
      const data = {
        markers: Array.from(this.markers.entries()).map(([id, m]) => [id, this.serializeMarker(m)]),
        anchors: Array.from(this.anchors.entries()).map(([id, a]) => [id, this.serializeAnchor(a)]),
        floors: Array.from(this.floors.entries()),
        timestamp: Date.now()
      };

      localStorage.setItem(`arxis-ar-markers-${this.config.projectId}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  /**
   * Carrega do cache local
   */
  private loadFromCache(): void {
    if (!this.config.cacheEnabled) return;

    try {
      const cached = localStorage.getItem(`arxis-ar-markers-${this.config.projectId}`);
      if (!cached) return;

      const data = JSON.parse(cached);

      // Carrega markers
      if (data.markers) {
        data.markers.forEach(([id, m]: [string, any]) => {
          this.markers.set(id, this.deserializeMarker(m));
        });
      }

      // Carrega anchors
      if (data.anchors) {
        data.anchors.forEach(([id, a]: [string, any]) => {
          this.anchors.set(id, this.deserializeAnchor(a));
        });
      }

      // Carrega floors
      if (data.floors) {
        data.floors.forEach(([id, f]: [string, FloorLevel]) => {
          this.floors.set(id, f);
        });
      }

      console.log(`Loaded ${this.markers.size} markers from cache`);
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }

  // ============================================
  // SERIALIZATION
  // ============================================

  /**
   * Serializa marker para JSON
   */
  private serializeMarker(marker: ARMarker): any {
    return {
      ...marker,
      positionInBIM: marker.positionInBIM.toArray(),
      rotationInBIM: [marker.rotationInBIM.x, marker.rotationInBIM.y, marker.rotationInBIM.z, marker.rotationInBIM.order],
      quaternionInBIM: marker.quaternionInBIM.toArray(),
      matrixInBIM: marker.matrixInBIM.toArray()
    };
  }

  /**
   * Deserializa marker de JSON
   */
  private deserializeMarker(data: any): ARMarker {
    return {
      ...data,
      positionInBIM: new THREE.Vector3().fromArray(data.positionInBIM),
      rotationInBIM: new THREE.Euler(data.rotationInBIM[0], data.rotationInBIM[1], data.rotationInBIM[2], data.rotationInBIM[3]),
      quaternionInBIM: new THREE.Quaternion().fromArray(data.quaternionInBIM),
      matrixInBIM: new THREE.Matrix4().fromArray(data.matrixInBIM)
    };
  }

  /**
   * Serializa anchor para JSON
   */
  private serializeAnchor(anchor: ARAnchor): any {
    const serialized: any = {
      ...anchor,
      T_world_marker: anchor.T_world_marker.toArray(),
      T_bim_marker: anchor.T_bim_marker.toArray(),
      T_world_bim: anchor.T_world_bim.toArray()
    };

    if (anchor.userOffset) {
      serialized.userOffset = {
        position: anchor.userOffset.position.toArray(),
        rotation: [
          anchor.userOffset.rotation.x,
          anchor.userOffset.rotation.y,
          anchor.userOffset.rotation.z,
          anchor.userOffset.rotation.order
        ]
      };
    }

    return serialized;
  }

  /**
   * Deserializa anchor de JSON
   */
  private deserializeAnchor(data: any): ARAnchor {
    const anchor: ARAnchor = {
      ...data,
      T_world_marker: new THREE.Matrix4().fromArray(data.T_world_marker),
      T_bim_marker: new THREE.Matrix4().fromArray(data.T_bim_marker),
      T_world_bim: new THREE.Matrix4().fromArray(data.T_world_bim)
    };

    if (data.userOffset) {
      anchor.userOffset = {
        position: new THREE.Vector3().fromArray(data.userOffset.position),
        rotation: new THREE.Euler(
          data.userOffset.rotation[0],
          data.userOffset.rotation[1],
          data.userOffset.rotation[2],
          data.userOffset.rotation[3]
        )
      };
    }

    return anchor;
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Gera ID único para marker
   */
  private generateMarkerId(): string {
    return `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra operação no log
   */
  private log(operation: string, metadata: Record<string, any>, success: boolean): void {
    const logEntry: AROperationLog = {
      timestamp: Date.now(),
      operation,
      success,
      metadata
    };

    this.logs.push(logEntry);

    // Mantém últimas 1000 entradas
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  /**
   * Obtém logs
   */
  getLogs(limit = 100): AROperationLog[] {
    return this.logs.slice(-limit);
  }

  /**
   * Limpa cache e dados
   */
  clearCache(): void {
    this.markers.clear();
    this.anchors.clear();
    this.floors.clear();
    this.logs = [];
    
    if (this.config.cacheEnabled) {
      try {
        localStorage.removeItem(`arxis-ar-markers-${this.config.projectId}`);
      } catch (error) {
        console.error('Failed to clear cache:', error);
      }
    }
  }

  /**
   * Estatísticas
   */
  getStatistics() {
    return {
      totalMarkers: this.markers.size,
      activeMarkers: this.getActiveMarkers().length,
      totalAnchors: this.anchors.size,
      totalFloors: this.floors.size,
      logEntries: this.logs.length,
      markersByType: {
        aruco: this.getMarkersByType(MarkerType.ARUCO).length,
        apriltag: this.getMarkersByType(MarkerType.APRILTAG).length,
        qr: this.getMarkersByType(MarkerType.QR).length,
        image: this.getMarkersByType(MarkerType.IMAGE).length,
        custom: this.getMarkersByType(MarkerType.CUSTOM).length
      },
      markersByRole: {
        master: this.getAllMarkers().filter(m => m.role === 'master').length,
        auxiliary: this.getAllMarkers().filter(m => m.role === 'auxiliary').length,
        temporary: this.getAllMarkers().filter(m => m.role === 'temporary').length
      }
    };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopAutoSync();
    this.clearCache();
    this.dispatchEvent(new Event('disposed'));
  }
}
