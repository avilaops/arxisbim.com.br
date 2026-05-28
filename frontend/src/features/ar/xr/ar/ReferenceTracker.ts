/**
 * ReferenceTracker - Sistema de Alinhamento AR para Campo
 * 
 * Permite alinhar o modelo digital AR com a construção física real
 * Essencial para verificação em obra e conferência de execução
 * 
 * Métodos de Alinhamento:
 * 1. Manual (3 pontos) - Preciso mas manual
 * 2. GPS + Bússola - Rápido mas menos preciso
 * 3. Múltiplos QR Codes - Balanceado
 */

import { Vector3, Matrix4, Quaternion, Euler } from 'three';
import { eventBus, EventType } from '../../../../core';

/**
 * Ponto de alinhamento (par digital ↔ real)
 */
export interface AlignmentPoint {
  id: string;
  label: string;
  digitalPosition: Vector3;    // Posição no modelo 3D
  realWorldPosition?: Vector3;  // Posição no mundo real (AR)
  timestamp: Date;
}

/**
 * Resultado do alinhamento
 */
export interface AlignmentResult {
  success: boolean;
  transform: Matrix4;              // Transformação calculada
  translation: Vector3;            // Componente de translação
  rotation: Quaternion;            // Componente de rotação
  scale: Vector3;                  // Componente de escala (normalmente 1,1,1)
  error: number;                   // Erro médio em metros
  rmse: number;                    // Root Mean Square Error
  alignmentMethod: 'manual' | 'gps' | 'markers';
  timestamp: Date;
}

/**
 * Dados salvos de alinhamento (para persistência)
 */
export interface SavedAlignment {
  projectId: string;
  transform: number[];             // Matrix4 serializado (16 elementos)
  alignmentPoints: AlignmentPoint[];
  result: AlignmentResult;
  createdAt: Date;
  expiresAt?: Date;                // Alinhamento pode expirar
}

/**
 * Estado do alinhamento
 */
export enum AlignmentStatus {
  NOT_ALIGNED = 'not_aligned',
  ALIGNING = 'aligning',
  ALIGNED = 'aligned',
  ERROR = 'error'
}

/**
 * ReferenceTracker - Sistema principal de alinhamento
 */
export class ReferenceTracker extends EventTarget {
  private alignmentPoints: AlignmentPoint[] = [];
  private currentAlignment: AlignmentResult | null = null;
  private status: AlignmentStatus = AlignmentStatus.NOT_ALIGNED;
  
  // Limiar de pontos para alinhamento
  private readonly MIN_POINTS_MANUAL = 3;
  private readonly MIN_POINTS_GPS = 1;
  private readonly MIN_POINTS_MARKERS = 2;

  constructor() {
    super();
    this.loadSavedAlignment();
  }

  /**
   * Adiciona ponto digital do modelo
   */
  public addDigitalPoint(position: Vector3, label: string = ''): AlignmentPoint {
    const id = `point-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const point: AlignmentPoint = {
      id,
      label: label || `Point ${this.alignmentPoints.length + 1}`,
      digitalPosition: position.clone(),
      timestamp: new Date()
    };

    this.alignmentPoints.push(point);
    
    this.dispatchEvent(new CustomEvent('pointAdded', { detail: point }));
    eventBus.emit(EventType.AR_ALIGNMENT_POINT_ADDED, { point });

    console.log(`📍 Digital point added: ${point.label}`, position);
    
    return point;
  }

  /**
   * Associa posição do mundo real a um ponto digital
   */
  public setRealWorldPosition(pointId: string, realPosition: Vector3): void {
    const point = this.alignmentPoints.find(p => p.id === pointId);
    
    if (!point) {
      console.warn(`Point ${pointId} not found`);
      return;
    }

    point.realWorldPosition = realPosition.clone();
    
    this.dispatchEvent(new CustomEvent('pointUpdated', { detail: point }));
    console.log(`🌍 Real-world position set for: ${point.label}`, realPosition);

    // Se temos pontos suficientes, tenta alinhar automaticamente
    this.tryAutoAlign();
  }

  /**
   * Tenta alinhamento automático quando possível
   */
  private tryAutoAlign(): void {
    const completePoints = this.alignmentPoints.filter(p => p.realWorldPosition);
    
    if (completePoints.length >= this.MIN_POINTS_MANUAL) {
      console.log(`✅ Sufficient points (${completePoints.length}/${this.MIN_POINTS_MANUAL}). Auto-aligning...`);
      this.calculateAlignment('manual');
    } else {
      console.log(`⏳ Waiting for more points (${completePoints.length}/${this.MIN_POINTS_MANUAL})`);
    }
  }

  /**
   * Calcula transformação de alinhamento
   */
  public calculateAlignment(method: 'manual' | 'gps' | 'markers' = 'manual'): AlignmentResult {
    const completePoints = this.alignmentPoints.filter(p => p.realWorldPosition);

    // Valida número de pontos
    const minPoints = method === 'manual' ? this.MIN_POINTS_MANUAL 
                     : method === 'gps' ? this.MIN_POINTS_GPS 
                     : this.MIN_POINTS_MARKERS;

    if (completePoints.length < minPoints) {
      const result: AlignmentResult = {
        success: false,
        transform: new Matrix4(),
        translation: new Vector3(),
        rotation: new Quaternion(),
        scale: new Vector3(1, 1, 1),
        error: Infinity,
        rmse: Infinity,
        alignmentMethod: method,
        timestamp: new Date()
      };
      
      this.status = AlignmentStatus.ERROR;
      console.error(`❌ Insufficient points: need ${minPoints}, have ${completePoints.length}`);
      
      return result;
    }

    this.status = AlignmentStatus.ALIGNING;

    try {
      // Calcula centroides
      const digitalCentroid = this.calculateCentroid(
        completePoints.map(p => p.digitalPosition)
      );
      
      const realCentroid = this.calculateCentroid(
        completePoints.map(p => p.realWorldPosition!)
      );

      // Calcula rotação usando Kabsch algorithm (SVD)
      const rotation = this.calculateRotation(completePoints, digitalCentroid, realCentroid);

      // Translação = realCentroid - (rotation * digitalCentroid)
      const rotatedDigitalCentroid = digitalCentroid.clone().applyQuaternion(rotation);
      const translation = realCentroid.clone().sub(rotatedDigitalCentroid);

      // Monta matriz de transformação
      const transform = new Matrix4();
      transform.compose(translation, rotation, new Vector3(1, 1, 1));

      // Calcula erro médio
      const error = this.calculateError(completePoints, transform);
      const rmse = this.calculateRMSE(completePoints, transform);

      const result: AlignmentResult = {
        success: error < 1.0, // Success se erro < 1 metro
        transform,
        translation,
        rotation,
        scale: new Vector3(1, 1, 1),
        error,
        rmse,
        alignmentMethod: method,
        timestamp: new Date()
      };

      this.currentAlignment = result;
      this.status = result.success ? AlignmentStatus.ALIGNED : AlignmentStatus.ERROR;

      this.dispatchEvent(new CustomEvent('alignmentCalculated', { detail: result }));
      eventBus.emit(EventType.AR_ALIGNMENT_UPDATED, { result });

      if (result.success) {
        console.log(`✅ Alignment successful!`);
        console.log(`   Translation: (${translation.x.toFixed(2)}, ${translation.y.toFixed(2)}, ${translation.z.toFixed(2)}) m`);
        console.log(`   Error: ${error.toFixed(3)} m (RMSE: ${rmse.toFixed(3)} m)`);
      } else {
        console.warn(`⚠️ Alignment failed: error ${error.toFixed(3)} m > 1.0 m threshold`);
      }

      return result;

    } catch (error) {
      console.error('❌ Error calculating alignment:', error);
      
      this.status = AlignmentStatus.ERROR;
      
      return {
        success: false,
        transform: new Matrix4(),
        translation: new Vector3(),
        rotation: new Quaternion(),
        scale: new Vector3(1, 1, 1),
        error: Infinity,
        rmse: Infinity,
        alignmentMethod: method,
        timestamp: new Date()
      };
    }
  }

  /**
   * Calcula centróide de pontos
   */
  private calculateCentroid(points: Vector3[]): Vector3 {
    const centroid = new Vector3();
    
    points.forEach(p => centroid.add(p));
    centroid.divideScalar(points.length);
    
    return centroid;
  }

  /**
   * Calcula rotação usando Kabsch algorithm
   * Simplified SVD approach for 3D point cloud alignment
   */
  private calculateRotation(
    points: AlignmentPoint[],
    digitalCentroid: Vector3,
    realCentroid: Vector3
  ): Quaternion {
    // Simplificação: usar primeiro vetor para calcular rotação aproximada
    // Em produção, usar SVD completo (library: ml-matrix, numeric.js)
    
    if (points.length < 2) {
      return new Quaternion(); // Identity
    }

    // Calcula vetores centrados
    const digitalVec = points[0].digitalPosition.clone().sub(digitalCentroid);
    const realVec = points[0].realWorldPosition!.clone().sub(realCentroid);

    // Normaliza
    digitalVec.normalize();
    realVec.normalize();

    // Calcula quaternion de rotação entre vetores
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(digitalVec, realVec);

    return quaternion;
  }

  /**
   * Calcula erro médio de alinhamento
   */
  private calculateError(points: AlignmentPoint[], transform: Matrix4): number {
    let totalError = 0;

    points.forEach(point => {
      const transformedDigital = point.digitalPosition.clone().applyMatrix4(transform);
      const distance = transformedDigital.distanceTo(point.realWorldPosition!);
      totalError += distance;
    });

    return totalError / points.length;
  }

  /**
   * Calcula Root Mean Square Error
   */
  private calculateRMSE(points: AlignmentPoint[], transform: Matrix4): number {
    let sumSquaredErrors = 0;

    points.forEach(point => {
      const transformedDigital = point.digitalPosition.clone().applyMatrix4(transform);
      const distance = transformedDigital.distanceTo(point.realWorldPosition!);
      sumSquaredErrors += distance * distance;
    });

    return Math.sqrt(sumSquaredErrors / points.length);
  }

  /**
   * Aplica alinhamento a um objeto 3D
   */
  public applyAlignment(object: any): boolean {
    if (!this.currentAlignment || !this.currentAlignment.success) {
      console.warn('⚠️ No valid alignment to apply');
      return false;
    }

    object.matrixAutoUpdate = false;
    object.matrix.copy(this.currentAlignment.transform);
    object.matrixWorldNeedsUpdate = true;

    console.log('✅ Alignment applied to object');
    return true;
  }

  /**
   * Salva alinhamento atual
   */
  public saveAlignment(projectId: string): void {
    if (!this.currentAlignment) {
      console.warn('⚠️ No alignment to save');
      return;
    }

    const saved: SavedAlignment = {
      projectId,
      transform: this.currentAlignment.transform.toArray(),
      alignmentPoints: this.alignmentPoints,
      result: this.currentAlignment,
      createdAt: new Date(),
      expiresAt: undefined // Pode implementar expiração
    };

    localStorage.setItem(
      `arxisvr-alignment-${projectId}`,
      JSON.stringify(saved)
    );

    console.log('💾 Alignment saved to localStorage');
  }

  /**
   * Carrega alinhamento salvo
   */
  public loadAlignment(projectId: string): boolean {
    const saved = localStorage.getItem(`arxisvr-alignment-${projectId}`);
    
    if (!saved) {
      console.log('📭 No saved alignment found');
      return false;
    }

    try {
      const data: SavedAlignment = JSON.parse(saved);
      
      // Reconstrói Matrix4
      const transform = new Matrix4();
      transform.fromArray(data.transform);

      // Reconstrói alignment result
      this.currentAlignment = {
        ...data.result,
        transform,
        timestamp: new Date(data.result.timestamp)
      };

      // Reconstrói pontos
      this.alignmentPoints = data.alignmentPoints.map(p => ({
        ...p,
        digitalPosition: new Vector3().fromArray(p.digitalPosition as any),
        realWorldPosition: p.realWorldPosition 
          ? new Vector3().fromArray(p.realWorldPosition as any)
          : undefined,
        timestamp: new Date(p.timestamp)
      }));

      this.status = AlignmentStatus.ALIGNED;

      console.log('📂 Alignment loaded from localStorage');
      console.log(`   Error: ${this.currentAlignment.error.toFixed(3)} m`);

      return true;

    } catch (error) {
      console.error('❌ Error loading alignment:', error);
      return false;
    }
  }

  /**
   * Carrega alinhamento do projeto ativo
   */
  private loadSavedAlignment(): void {
    // Tenta carregar do último projeto
    // TODO: integrar com ProjectManager
    const lastProjectId = localStorage.getItem('arxisvr-last-project-id');
    
    if (lastProjectId) {
      this.loadAlignment(lastProjectId);
    }
  }

  /**
   * Reseta alinhamento
   */
  public reset(): void {
    this.alignmentPoints = [];
    this.currentAlignment = null;
    this.status = AlignmentStatus.NOT_ALIGNED;

    this.dispatchEvent(new CustomEvent('alignmentReset'));
    eventBus.emit(EventType.AR_ALIGNMENT_RESET, {});

    console.log('🔄 Alignment reset');
  }

  /**
   * Remove um ponto
   */
  public removePoint(pointId: string): boolean {
    const index = this.alignmentPoints.findIndex(p => p.id === pointId);
    
    if (index === -1) {
      return false;
    }

    const removed = this.alignmentPoints.splice(index, 1)[0];
    
    this.dispatchEvent(new CustomEvent('pointRemoved', { detail: removed }));
    console.log(`🗑️ Point removed: ${removed.label}`);

    return true;
  }

  /**
   * Getters
   */
  public getPoints(): AlignmentPoint[] {
    return [...this.alignmentPoints];
  }

  public getCurrentAlignment(): AlignmentResult | null {
    return this.currentAlignment;
  }

  public getStatus(): AlignmentStatus {
    return this.status;
  }

  public getAlignmentError(): number {
    return this.currentAlignment?.error ?? Infinity;
  }

  public isAligned(): boolean {
    return this.status === AlignmentStatus.ALIGNED && 
           this.currentAlignment !== null &&
           this.currentAlignment.success;
  }
}

/**
 * Singleton instance
 */
export const referenceTracker = new ReferenceTracker();
