/**
 * IBufferAttribute - Interface abstrata de atributo de buffer
 */

export interface IBufferAttribute {
  array: ArrayLike<number>;
  itemSize: number;
  count: number;
  normalized: boolean;
  usage: number;
  
  // Update range
  updateRange: {
    offset: number;
    count: number;
  };
  
  // Version
  version: number;
  
  // Getters
  getX(index: number): number;
  getY(index: number): number;
  getZ(index: number): number;
  getW(index: number): number;
  
  // Setters
  setX(index: number, x: number): this;
  setY(index: number, y: number): this;
  setZ(index: number, z: number): this;
  setW(index: number, w: number): this;
  setXY(index: number, x: number, y: number): this;
  setXYZ(index: number, x: number, y: number, z: number): this;
  setXYZW(index: number, x: number, y: number, z: number, w: number): this;
  
  // Array operations
  copyArray(array: ArrayLike<number>): this;
  copyAt(index1: number, attribute: IBufferAttribute, index2: number): this;
  
  // Update
  needsUpdate: boolean;
  
  // Clone
  clone(): IBufferAttribute;
  copy(source: IBufferAttribute): this;
}
