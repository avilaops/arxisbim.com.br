/**
 * IRaycaster - Interface abstrata de raycasting
 */

import { IVector3 } from './IVector3';
import { ICamera } from './ICamera';

export interface Intersection {
  distance: number;
  point: IVector3;
  face?: {
    a: number;
    b: number;
    c: number;
    normal: IVector3;
    materialIndex: number;
  };
  faceIndex?: number;
  object: any; // Object3D/IMesh
  uv?: { x: number; y: number };
  uv2?: { x: number; y: number };
  instanceId?: number;
}

export interface IRaycaster {
  // Ray
  ray: {
    origin: IVector3;
    direction: IVector3;
  };
  
  // Near/Far
  near: number;
  far: number;
  
  // Camera
  camera: ICamera | null;
  
  // Layers
  layers: any;
  
  // Configuration
  params: {
    Mesh?: any;
    Line?: any;
    LOD?: any;
    Points?: { threshold: number };
    Sprite?: any;
  };
  
  // Set from camera
  setFromCamera(coords: { x: number; y: number }, camera: ICamera): void;
  
  // Set from ray
  set(origin: IVector3, direction: IVector3): void;
  
  // Intersect
  intersectObject(
    object: any,
    recursive?: boolean,
    optionalTarget?: Intersection[]
  ): Intersection[];
  
  intersectObjects(
    objects: any[],
    recursive?: boolean,
    optionalTarget?: Intersection[]
  ): Intersection[];
}
