/**
 * IMatrix4 - Interface abstrata de matriz 4x4
 */

import { IVector3 } from './IVector3';
import { IQuaternion } from './IQuaternion';

export interface IMatrix4 {
  elements: Float32Array | number[];
  
  // Setters
  set(
    n11: number, n12: number, n13: number, n14: number,
    n21: number, n22: number, n23: number, n24: number,
    n31: number, n32: number, n33: number, n34: number,
    n41: number, n42: number, n43: number, n44: number
  ): this;
  
  identity(): this;
  
  // Composition
  compose(position: IVector3, quaternion: IQuaternion, scale: IVector3): this;
  decompose(position: IVector3, quaternion: IQuaternion, scale: IVector3): this;
  
  // Operations
  multiply(m: IMatrix4): this;
  premultiply(m: IMatrix4): this;
  multiplyMatrices(a: IMatrix4, b: IMatrix4): this;
  
  // Transformations
  makeTranslation(x: number, y: number, z: number): this;
  makeRotationX(theta: number): this;
  makeRotationY(theta: number): this;
  makeRotationZ(theta: number): this;
  makeRotationAxis(axis: IVector3, angle: number): this;
  makeScale(x: number, y: number, z: number): this;
  
  // Projection
  makePerspective(
    left: number, right: number,
    top: number, bottom: number,
    near: number, far: number
  ): this;
  
  makeOrthographic(
    left: number, right: number,
    top: number, bottom: number,
    near: number, far: number
  ): this;
  
  // Inverse & transpose
  invert(): this;
  transpose(): this;
  
  // Determinant
  determinant(): number;
  
  // Clone & copy
  clone(): IMatrix4;
  copy(m: IMatrix4): this;
  
  // Array conversion
  toArray(array?: number[], offset?: number): number[];
  fromArray(array: number[], offset?: number): this;
}
