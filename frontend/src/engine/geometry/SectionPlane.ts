import * as THREE from 'three';

/**
 * SectionPlane - Representa um plano de seção ou clipping
 *
 * Suporte a três tipos de planos:
 * - Section planes: Para visualização de seções (com linhas visuais)
 * - Clipping planes: Para ocultar geometria
 * - Both: Seção + clipping simultâneo
 */
export class SectionPlane {
  public position: number;
  public axis: 'x' | 'y' | 'z';
  public enabled: boolean = true;
  public inverted: boolean = false; // For box clipping (invert normal direction)

  constructor(axis: 'x' | 'y' | 'z', position: number = 0) {
    this.axis = axis;
    this.position = position;
  }

  /**
   * Converte para THREE.Plane para uso com clipping
   */
  toThreePlane(): THREE.Plane {
    let normal: THREE.Vector3;
    let constant: number;

    switch (this.axis) {
      case 'x':
        normal = new THREE.Vector3(this.inverted ? -1 : 1, 0, 0);
        constant = this.inverted ? this.position : -this.position;
        break;
      case 'y':
        normal = new THREE.Vector3(0, this.inverted ? -1 : 1, 0);
        constant = this.inverted ? this.position : -this.position;
        break;
      case 'z':
        normal = new THREE.Vector3(0, 0, this.inverted ? -1 : 1);
        constant = this.inverted ? this.position : -this.position;
        break;
    }

    return new THREE.Plane(normal, constant);
  }

  /**
   * Calcula distância de um ponto ao plano
   */
  distanceToPoint(point: THREE.Vector3): number {
    const plane = this.toThreePlane();
    return plane.distanceToPoint(point);
  }

  /**
   * Verifica se um ponto está do lado positivo do plano
   */
  isPointOnPositiveSide(point: THREE.Vector3): boolean {
    return this.distanceToPoint(point) >= 0;
  }

  /**
   * Obtém a orientação do plano como quaternion
   */
  getOrientation(): THREE.Quaternion {
    const plane = this.toThreePlane();
    const quaternion = new THREE.Quaternion();

    // Cria uma rotação que alinha Z com a normal do plano
    const up = new THREE.Vector3(0, 1, 0);
    const normal = plane.normal.clone();

    // Se normal é oposta ao up, usa right vector
    if (Math.abs(normal.dot(up)) > 0.999) {
      quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    } else {
      const right = new THREE.Vector3().crossVectors(up, normal).normalize();
      const newUp = new THREE.Vector3().crossVectors(normal, right).normalize();

      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeBasis(right, newUp, normal);
      quaternion.setFromRotationMatrix(rotationMatrix);
    }

    return quaternion;
  }

  /**
   * Cria uma matriz de transformação para o plano
   */
  getTransformMatrix(): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    const position = this.getPositionVector();
    const quaternion = this.getOrientation();

    matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
    return matrix;
  }

  /**
   * Obtém vetor de posição do plano
   */
  getPositionVector(): THREE.Vector3 {
    switch (this.axis) {
      case 'x':
        return new THREE.Vector3(this.position, 0, 0);
      case 'y':
        return new THREE.Vector3(0, this.position, 0);
      case 'z':
        return new THREE.Vector3(0, 0, this.position);
    }
  }
  
  /**
   * Invert plane normal (for box clipping)
   */
  invertNormal(): void {
    this.inverted = !this.inverted;
  }

  /**
   * Clona o plano
   */
  clone(): SectionPlane {
    const cloned = new SectionPlane(this.axis, this.position);
    cloned.enabled = this.enabled;
    cloned.inverted = this.inverted;
    return cloned;
  }

  /**
   * Serializa para JSON
   */
  toJSON(): object {
    return {
      axis: this.axis,
      position: this.position,
      enabled: this.enabled
    };
  }

  /**
   * Desserializa de JSON
   */
  static fromJSON(data: any): SectionPlane {
    const plane = new SectionPlane(data.axis, data.position);
    plane.enabled = data.enabled !== false;
    return plane;
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.axis.toUpperCase()}=${this.position.toFixed(2)}`;
  }
}