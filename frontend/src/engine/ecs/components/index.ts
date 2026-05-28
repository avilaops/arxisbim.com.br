import { Component } from "../Component";
import * as THREE from "three";

/**
 * Transform Component - Position, rotation, scale for 3D objects
 */
export class TransformComponent extends Component {
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public scale: THREE.Vector3;

  constructor(position = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1, 1, 1)) {
    super();
    this.position = position;
    this.rotation = rotation;
    this.scale = scale;
  }
}

/**
 * Mesh Component - Holds Three.js mesh
 */
export class MeshComponent extends Component {
  public mesh: THREE.Mesh;

  constructor(mesh: THREE.Mesh) {
    super();
    this.mesh = mesh;
  }
}

/**
 * LOD Component - Level of Detail information
 */
export class LODComponent extends Component {
  public level: number = 0;
  public maxDistance: number = 100;

  constructor(level = 0, maxDistance = 100) {
    super();
    this.level = level;
    this.maxDistance = maxDistance;
  }
}