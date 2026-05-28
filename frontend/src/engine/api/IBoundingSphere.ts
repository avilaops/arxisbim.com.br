/**
 * IBoundingSphere - Interface abstrata de esfera delimitadora
 */

import { IVector3 } from './IVector3';

export interface IBoundingSphere {
  center: IVector3;
  radius: number;
  
  // Construction
  set(center: IVector3, radius: number): this;
  setFromPoints(points: IVector3[], optionalCenter?: IVector3): this;
  
  // Expansion
  expandByPoint(point: IVector3): this;
  
  // Containment
  containsPoint(point: IVector3): boolean;
  
  // Intersection
  intersectsSphere(sphere: IBoundingSphere): boolean;
  intersectsBox(box: any): boolean;
  intersectsPlane(plane: any): boolean;
  
  // Distance
  distanceToPoint(point: IVector3): number;
  
  // Transform
  applyMatrix4(matrix: any): this;
  
  // Union
  union(sphere: IBoundingSphere): this;
  
  // Empty check
  isEmpty(): boolean;
  makeEmpty(): this;
  
  // Clone & copy
  clone(): IBoundingSphere;
  copy(sphere: IBoundingSphere): this;
}
