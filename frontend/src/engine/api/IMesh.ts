/**
 * Interface abstrata para Mesh (geometria + material)
 * Implementações: ThreeMeshAdapter, AvxMeshAdapter
 */

import { IGeometry } from './IGeometry';
import { IMaterial } from './IMaterial';
import { ISceneObject } from './IScene';

export interface IMesh extends ISceneObject {
  geometry: IGeometry;
  material: IMaterial | IMaterial[];

  /**
   * Calcula bounding box
   */
  computeBoundingBox(): IBoundingBox;

  /**
   * Calcula bounding sphere
   */
  computeBoundingSphere(): IBoundingSphere;

  /**
   * Raycast
   */
  raycast(raycaster: IRaycaster, intersects: Intersection[]): void;
}

export interface IBoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  
  getCenter(): { x: number; y: number; z: number };
  getSize(): { x: number; y: number; z: number };
  containsPoint(point: { x: number; y: number; z: number }): boolean;
  expandByPoint(point: { x: number; y: number; z: number }): void;
}

export interface IBoundingSphere {
  center: { x: number; y: number; z: number };
  radius: number;
  
  containsPoint(point: { x: number; y: number; z: number }): boolean;
}

export interface IRaycaster {
  ray: {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
  };
  near: number;
  far: number;

  setFromCamera(coords: { x: number; y: number }, camera: any): void;
  intersectObjects(objects: ISceneObject[], recursive?: boolean): Intersection[];
}

export interface Intersection {
  distance: number;
  point: { x: number; y: number; z: number };
  face: any;
  faceIndex: number;
  object: ISceneObject;
}
