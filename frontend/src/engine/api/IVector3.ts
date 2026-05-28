/**
 * IVector3 - Interface abstrata de vetor 3D
 */

export interface IVector3 {
  x: number;
  y: number;
  z: number;
  
  // Setters
  set(x: number, y: number, z: number): this;
  setX(x: number): this;
  setY(y: number): this;
  setZ(z: number): this;
  
  // Operations
  add(v: IVector3): this;
  addScalar(s: number): this;
  sub(v: IVector3): this;
  multiply(v: IVector3): this;
  multiplyScalar(s: number): this;
  divide(v: IVector3): this;
  divideScalar(s: number): this;
  
  // Transformations
  applyMatrix4(m: any): this;
  applyQuaternion(q: any): this;
  
  // Measurement
  length(): number;
  lengthSq(): number;
  distanceTo(v: IVector3): number;
  distanceToSquared(v: IVector3): number;
  
  // Normalization
  normalize(): this;
  
  // Products
  dot(v: IVector3): number;
  cross(v: IVector3): this;
  
  // Lerp
  lerp(v: IVector3, alpha: number): this;
  
  // Clone & copy
  clone(): IVector3;
  copy(v: IVector3): this;
  
  // Array conversion
  toArray(array?: number[], offset?: number): number[];
  fromArray(array: number[], offset?: number): this;
}
