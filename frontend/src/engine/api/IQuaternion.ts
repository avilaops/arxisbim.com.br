/**
 * IQuaternion - Interface abstrata de quaternion (rotação)
 */

import { IVector3 } from './IVector3';

export interface IQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
  
  // Setters
  set(x: number, y: number, z: number, w: number): this;
  
  // From Euler
  setFromEuler(euler: any): this;
  
  // From axis-angle
  setFromAxisAngle(axis: IVector3, angle: number): this;
  
  // From rotation matrix
  setFromRotationMatrix(m: any): this;
  
  // Operations
  multiply(q: IQuaternion): this;
  premultiply(q: IQuaternion): this;
  
  // Inverse
  invert(): this;
  conjugate(): this;
  
  // Normalization
  normalize(): this;
  
  // Lerp & Slerp
  slerp(q: IQuaternion, t: number): this;
  
  // Clone & copy
  clone(): IQuaternion;
  copy(q: IQuaternion): this;
  
  // Array conversion
  toArray(array?: number[], offset?: number): number[];
  fromArray(array: number[], offset?: number): this;
}
