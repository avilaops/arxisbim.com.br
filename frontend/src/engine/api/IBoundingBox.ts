/**
 * IBoundingBox - Interface abstrata de caixa delimitadora
 */

import { IVector3 } from './IVector3';

export interface IBoundingBox {
  min: IVector3;
  max: IVector3;
  
  // Construction
  set(min: IVector3, max: IVector3): this;
  setFromPoints(points: IVector3[]): this;
  setFromCenterAndSize(center: IVector3, size: IVector3): this;
  
  // Expansion
  expandByPoint(point: IVector3): this;
  expandByVector(vector: IVector3): this;
  expandByScalar(scalar: number): this;
  
  // Containment tests
  containsPoint(point: IVector3): boolean;
  containsBox(box: IBoundingBox): boolean;
  
  // Intersection
  intersectsBox(box: IBoundingBox): boolean;
  
  // Properties
  getCenter(target: IVector3): IVector3;
  getSize(target: IVector3): IVector3;
  
  // Union
  union(box: IBoundingBox): this;
  
  // Transform
  applyMatrix4(matrix: any): this;
  
  // Empty check
  isEmpty(): boolean;
  makeEmpty(): this;
  
  // Clone & copy
  clone(): IBoundingBox;
  copy(box: IBoundingBox): this;
}
