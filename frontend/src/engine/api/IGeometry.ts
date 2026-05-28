/**
 * Interface abstrata para Geometry
 * Implementações: ThreeGeometryAdapter, AvxGeometryAdapter
 */

export interface IGeometry {
  /**
   * Retorna atributos da geometria
   */
  getAttribute(name: string): IBufferAttribute | undefined;

  /**
   * Define atributo
   */
  setAttribute(name: string, attribute: IBufferAttribute): void;

  /**
   * Retorna índices
   */
  getIndex(): IBufferAttribute | null;

  /**
   * Define índices
   */
  setIndex(index: IBufferAttribute | number[] | null): void;

  /**
   * Computa normais
   */
  computeVertexNormals(): void;

  /**
   * Computa bounding box
   */
  computeBoundingBox(): void;

  /**
   * Computa bounding sphere
   */
  computeBoundingSphere(): void;

  /**
   * Retorna número de vértices
   */
  getVertexCount(): number;

  /**
   * Retorna implementação nativa
   */
  getNativeGeometry(): any;

  /**
   * Limpa recursos
   */
  dispose(): void;
}

export interface IBufferAttribute {
  array: Float32Array | Uint16Array | Uint32Array;
  itemSize: number;
  count: number;
  normalized: boolean;

  getX(index: number): number;
  getY(index: number): number;
  getZ(index: number): number;
  setXYZ(index: number, x: number, y: number, z: number): void;
  
  /**
   * Marca como atualizado
   */
  needsUpdate(): void;
}

export interface IGeometryFactory {
  /**
   * Cria geometria de caixa
   */
  createBox(width: number, height: number, depth: number): IGeometry;

  /**
   * Cria geometria de esfera
   */
  createSphere(radius: number, widthSegments?: number, heightSegments?: number): IGeometry;

  /**
   * Cria geometria de plano
   */
  createPlane(width: number, height: number): IGeometry;

  /**
   * Cria geometria customizada
   */
  createCustom(vertices: Float32Array, indices?: Uint32Array): IGeometry;
}
