/**
 * Adapter Three.js → Interface AVX
 * 
 * IMPORTANTE: Este é o ÚNICO arquivo que pode importar Three.js diretamente
 * no contexto de rendering. Implementa IEngineFactory usando Three.js.
 */

import * as THREE from 'three';
import {
  IEngineFactory,
  IRenderer,
  IScene,
  IPerspectiveCamera,
  IOrthographicCamera,
  IGeometryFactory,
  IMaterialFactory,
  ILightFactory,
  ShadowMapType,
  ToneMappingType,
  RenderInfo,
  ISceneObject,
  SceneObjectType,
  IVector3,
  IEuler,
  IGeometry,
  IBufferAttribute,
  IMaterial,
  MaterialType,
  MaterialSide,
  IStandardMaterial,
  IPhysicalMaterial,
  ILight,
  LightType,
  IDirectionalLight,
  IPointLight,
  ISpotLight,
  ICamera,
  CameraType,
  IMesh,
  IBoundingBox,
  IBoundingSphere,
  IRaycaster,
  Intersection
} from '../api';

/**
 * Implementação Three.js do Renderer
 */
class ThreeRendererAdapter implements IRenderer {
  private renderer: THREE.WebGLRenderer;

  constructor(options?: {
    canvas?: HTMLCanvasElement;
    context?: WebGLRenderingContext | WebGL2RenderingContext;
    antialias?: boolean;
    alpha?: boolean;
    precision?: string;
    powerPreference?: string;
    stencil?: boolean;
    depth?: boolean;
    logarithmicDepthBuffer?: boolean;
  }) {
    this.renderer = new THREE.WebGLRenderer({
      canvas: options?.canvas,
      context: options?.context,
      antialias: options?.antialias ?? true,
      alpha: options?.alpha ?? true,
      precision: options?.precision as any ?? 'highp',
      powerPreference: options?.powerPreference as any ?? 'high-performance',
      stencil: options?.stencil ?? true,
      depth: options?.depth ?? true,
      logarithmicDepthBuffer: options?.logarithmicDepthBuffer ?? false
    });

    // Configurações padrão
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  render(scene: IScene, camera: ICamera): void {
    this.renderer.render(
      scene.getNativeScene() as THREE.Scene,
      camera.getNativeCamera() as THREE.Camera
    );
  }

  setSize(width: number, height: number, updateStyle?: boolean): void {
    this.renderer.setSize(width, height, updateStyle);
  }

  setPixelRatio(ratio: number): void {
    this.renderer.setPixelRatio(ratio);
  }

  getDOMElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setShadowsEnabled(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
  }

  setShadowMapType(type: ShadowMapType): void {
    const mapping = {
      [ShadowMapType.Basic]: THREE.BasicShadowMap,
      [ShadowMapType.PCF]: THREE.PCFShadowMap,
      [ShadowMapType.PCFSoft]: THREE.PCFSoftShadowMap,
      [ShadowMapType.VSM]: THREE.VSMShadowMap
    };
    this.renderer.shadowMap.type = mapping[type];
  }

  setToneMapping(type: ToneMappingType, exposure: number = 1.0): void {
    const mapping = {
      [ToneMappingType.None]: THREE.NoToneMapping,
      [ToneMappingType.Linear]: THREE.LinearToneMapping,
      [ToneMappingType.Reinhard]: THREE.ReinhardToneMapping,
      [ToneMappingType.Cineon]: THREE.CineonToneMapping,
      [ToneMappingType.ACESFilmic]: THREE.ACESFilmicToneMapping
    };
    this.renderer.toneMapping = mapping[type];
    this.renderer.toneMappingExposure = exposure;
  }

  getRenderInfo(): RenderInfo {
    const info = this.renderer.info;
    return {
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length || 0,
      calls: info.render.calls,
      points: info.render.points,
      lines: info.render.lines
    };
  }

  captureScreenshot(format: 'png' | 'jpeg' = 'png', quality: number = 1.0): string {
    return this.renderer.domElement.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality
    );
  }

  dispose(): void {
    this.renderer.dispose();
  }

  // Acesso interno (temporário)
  getNativeRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
}

/**
 * Wrapper para Vector3
 */
class ThreeVector3Adapter implements IVector3 {
  constructor(public native: THREE.Vector3) {}

  get x() { return this.native.x; }
  set x(v: number) { this.native.x = v; }
  get y() { return this.native.y; }
  set y(v: number) { this.native.y = v; }
  get z() { return this.native.z; }
  set z(v: number) { this.native.z = v; }

  set(x: number, y: number, z: number): void {
    this.native.set(x, y, z);
  }

  clone(): IVector3 {
    return new ThreeVector3Adapter(this.native.clone());
  }

  copy(v: IVector3): void {
    this.native.copy((v as any).native);
  }

  add(v: IVector3): IVector3 {
    this.native.add((v as any).native);
    return this;
  }

  sub(v: IVector3): IVector3 {
    this.native.sub((v as any).native);
    return this;
  }

  multiply(v: IVector3): IVector3 {
    this.native.multiply((v as any).native);
    return this;
  }

  multiplyScalar(s: number): IVector3 {
    this.native.multiplyScalar(s);
    return this;
  }

  normalize(): IVector3 {
    this.native.normalize();
    return this;
  }

  length(): number {
    return this.native.length();
  }

  distanceTo(v: IVector3): number {
    return this.native.distanceTo((v as any).native);
  }

  toArray(): [number, number, number] {
    return this.native.toArray() as [number, number, number];
  }
}

/**
 * Wrapper para Euler
 */
class ThreeEulerAdapter implements IEuler {
  constructor(public native: THREE.Euler) {}

  get x() { return this.native.x; }
  set x(v: number) { this.native.x = v; }
  get y() { return this.native.y; }
  set y(v: number) { this.native.y = v; }
  get z() { return this.native.z; }
  set z(v: number) { this.native.z = v; }
  get order() { return this.native.order as any; }
  set order(v: any) { this.native.order = v; }

  set(x: number, y: number, z: number, order?: string): void {
    this.native.set(x, y, z, order as any);
  }

  clone(): IEuler {
    return new ThreeEulerAdapter(this.native.clone());
  }

  copy(e: IEuler): void {
    this.native.copy((e as any).native);
  }

  toArray(): [number, number, number] {
    return [this.native.x, this.native.y, this.native.z];
  }
}

/**
 * Implementação Three.js do Scene
 */
class ThreeSceneAdapter implements IScene {
  private scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
  }

  add(object: ISceneObject): void {
    this.scene.add(object.getNativeObject());
  }

  remove(object: ISceneObject): void {
    this.scene.remove(object.getNativeObject());
  }

  traverse(callback: (object: ISceneObject) => void): void {
    this.scene.traverse((obj) => {
      callback(wrapObject3D(obj));
    });
  }

  getObjectByName(name: string): ISceneObject | undefined {
    const obj = this.scene.getObjectByName(name);
    return obj ? wrapObject3D(obj) : undefined;
  }

  getObjectByUUID(uuid: string): ISceneObject | undefined {
    const obj = this.scene.getObjectByProperty('uuid', uuid);
    return obj ? wrapObject3D(obj) : undefined;
  }

  setBackgroundColor(color: number | string): void {
    this.scene.background = new THREE.Color(color);
  }

  setFog(color: number, near: number, far: number): void {
    this.scene.fog = new THREE.Fog(color, near, far);
  }

  clearFog(): void {
    this.scene.fog = null;
  }

  getNativeScene(): THREE.Scene {
    return this.scene;
  }
}

/**
 * Wrapper genérico para Object3D
 */
function wrapObject3D(obj: THREE.Object3D): ISceneObject {
  return {
    uuid: obj.uuid,
    name: obj.name,
    visible: obj.visible,
    position: new ThreeVector3Adapter(obj.position),
    rotation: new ThreeEulerAdapter(obj.rotation),
    scale: new ThreeVector3Adapter(obj.scale),
    userData: obj.userData,
    parent: obj.parent ? wrapObject3D(obj.parent) : null,
    children: obj.children.map(wrapObject3D),
    
    add(child: ISceneObject): void {
      obj.add(child.getNativeObject());
    },
    
    remove(child: ISceneObject): void {
      obj.remove(child.getNativeObject());
    },
    
    traverse(callback: (o: ISceneObject) => void): void {
      obj.traverse((o) => callback(wrapObject3D(o)));
    },
    
    getType(): SceneObjectType {
      if (obj instanceof THREE.Mesh) return SceneObjectType.Mesh;
      if (obj instanceof THREE.Group) return SceneObjectType.Group;
      if (obj instanceof THREE.Light) return SceneObjectType.Light;
      if (obj instanceof THREE.Camera) return SceneObjectType.Camera;
      if (obj instanceof THREE.Line) return SceneObjectType.Line;
      if (obj instanceof THREE.Points) return SceneObjectType.Points;
      return SceneObjectType.Object3D;
    },
    
    getNativeObject(): any {
      return obj;
    }
  };
}

/**
 * Implementação Three.js de PerspectiveCamera
 */
class ThreePerspectiveCameraAdapter implements IPerspectiveCamera {
  private camera: THREE.PerspectiveCamera;

  constructor(fov: number, aspect: number, near: number, far: number) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  get position(): IVector3 {
    return new ThreeVector3Adapter(this.camera.position);
  }

  get rotation() {
    return { x: this.camera.rotation.x, y: this.camera.rotation.y, z: this.camera.rotation.z };
  }

  get fov() { return this.camera.fov; }
  set fov(v: number) { this.camera.fov = v; }
  get aspect() { return this.camera.aspect; }
  set aspect(v: number) { this.camera.aspect = v; }
  get near() { return this.camera.near; }
  set near(v: number) { this.camera.near = v; }
  get far() { return this.camera.far; }
  set far(v: number) { this.camera.far = v; }

  getProjectionMatrix(): number[] {
    return this.camera.projectionMatrix.toArray();
  }

  getViewMatrix(): number[] {
    return this.camera.matrixWorldInverse.toArray();
  }

  updateMatrixWorld(force?: boolean): void {
    this.camera.updateMatrixWorld(force);
  }

  getWorldDirection(target: IVector3): IVector3 {
    const v = new THREE.Vector3();
    this.camera.getWorldDirection(v);
    target.set(v.x, v.y, v.z);
    return target;
  }

  getType(): CameraType {
    return CameraType.Perspective;
  }

  updateProjectionMatrix(): void {
    this.camera.updateProjectionMatrix();
  }

  getNativeCamera(): THREE.Camera {
    return this.camera;
  }
}

/**
 * Factory principal usando Three.js
 */
export class ThreeEngineFactory implements IEngineFactory {
  createRenderer(canvas?: HTMLCanvasElement): IRenderer {
    return new ThreeRendererAdapter(canvas);
  }

  createScene(): IScene {
    return new ThreeSceneAdapter();
  }

  createPerspectiveCamera(
    fov: number,
    aspect: number,
    near: number,
    far: number
  ): IPerspectiveCamera {
    return new ThreePerspectiveCameraAdapter(fov, aspect, near, far);
  }

  createOrthographicCamera(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number
  ): IOrthographicCamera {
    // TODO: Implementar
    throw new Error('Not implemented yet');
  }

  geometry: IGeometryFactory = {
    createBox: (w, h, d) => {
      // TODO: Implementar wrapper
      throw new Error('Not implemented yet');
    },
    createSphere: (r, ws, hs) => {
      throw new Error('Not implemented yet');
    },
    createPlane: (w, h) => {
      throw new Error('Not implemented yet');
    },
    createCustom: (vertices, indices) => {
      throw new Error('Not implemented yet');
    }
  };

  material: IMaterialFactory = {
    createBasic: (options) => {
      throw new Error('Not implemented yet');
    },
    createStandard: (options) => {
      throw new Error('Not implemented yet');
    },
    createPhysical: (options) => {
      throw new Error('Not implemented yet');
    }
  };

  light: ILightFactory = {
    createAmbient: (color, intensity) => {
      throw new Error('Not implemented yet');
    },
    createDirectional: (color, intensity) => {
      throw new Error('Not implemented yet');
    },
    createPoint: (color, intensity, distance) => {
      throw new Error('Not implemented yet');
    },
    createSpot: (color, intensity, distance, angle) => {
      throw new Error('Not implemented yet');
    }
  };
}

// Singleton instance
export const threeEngine = new ThreeEngineFactory();

// ============================================================================
// FACTORY FUNCTIONS - Exports convenientes para uso direto
// ============================================================================

/**
 * Cria renderer via adapter
 */
export function createRenderer(options?: {
  canvas?: HTMLCanvasElement;
  context?: WebGLRenderingContext | WebGL2RenderingContext;
  antialias?: boolean;
  alpha?: boolean;
  precision?: string;
  powerPreference?: string;
  stencil?: boolean;
  depth?: boolean;
  logarithmicDepthBuffer?: boolean;
}): IRenderer {
  return new ThreeRendererAdapter(options);
}

/**
 * Cria cena
 */
export function createScene(): IScene {
  return new ThreeSceneAdapter();
}

/**
 * Cria câmera perspectiva
 */
export function createPerspectiveCamera(
  fov: number,
  aspect: number,
  near: number,
  far: number
): IPerspectiveCamera {
  return new ThreePerspectiveCameraAdapter(fov, aspect, near, far);
}

/**
 * Cria Vector3
 */
export function createVector3(x?: number, y?: number, z?: number): IVector3 {
  const v = new THREE.Vector3(x, y, z);
  return {
    x: v.x,
    y: v.y,
    z: v.z,
    set: (x, y, z) => { v.set(x, y, z); return v as any; },
    add: (other) => { v.add(other as any); return v as any; },
    sub: (other) => { v.sub(other as any); return v as any; },
    multiply: (scalar) => { v.multiplyScalar(scalar); return v as any; },
    divide: (scalar) => { v.divideScalar(scalar); return v as any; },
    dot: (other) => v.dot(other as any),
    cross: (other) => { v.cross(other as any); return v as any; },
    length: () => v.length(),
    lengthSquared: () => v.lengthSq(),
    normalize: () => { v.normalize(); return v as any; },
    distanceTo: (other) => v.distanceTo(other as any),
    distanceToSquared: (other) => v.distanceToSquared(other as any),
    lerp: (other, t) => { v.lerp(other as any, t); return v as any; },
    clone: () => createVector3(v.x, v.y, v.z),
    equals: (other) => v.equals(other as any),
    toArray: () => v.toArray()
  };
}

/**
 * Cria BoundingBox
 */
export function createBox3(min?: IVector3, max?: IVector3): IBoundingBox {
  const box = new THREE.Box3(
    min ? new THREE.Vector3(min.x, min.y, min.z) : undefined,
    max ? new THREE.Vector3(max.x, max.y, max.z) : undefined
  );
  return {
    min: { x: box.min.x, y: box.min.y, z: box.min.z } as IVector3,
    max: { x: box.max.x, y: box.max.y, z: box.max.z } as IVector3,
    setFromObject: (obj: any) => { 
      box.setFromObject(obj);
      return box as any;
    },
    containsPoint: (point) => box.containsPoint(point as any),
    containsBox: (other) => box.containsBox(other as any),
    intersectsBox: (other) => box.intersectsBox(other as any),
    getCenter: () => {
      const center = box.getCenter(new THREE.Vector3());
      return { x: center.x, y: center.y, z: center.z };
    },
    getSize: () => {
      const size = box.getSize(new THREE.Vector3());
      return { x: size.x, y: size.y, z: size.z };
    },
    expandByPoint: (point) => { 
      box.expandByPoint(point as any);
      return box as any;
    },
    expandByScalar: (scalar) => {
      box.expandByScalar(scalar);
      return box as any;
    },
    isEmpty: () => box.isEmpty(),
    makeEmpty: () => {
      box.makeEmpty();
      return box as any;
    }
  };
}

/**
 * Cria Color
 */
export function createColor(color: number | string): any {
  return new THREE.Color(color);
}

/**
 * Cria Fog
 */
export function createFog(color: number, near: number, far: number): any {
  return new THREE.Fog(color, near, far);
}

/**
 * Cria Ambient Light
 */
export function createAmbientLight(color: number, intensity?: number): ILight {
  const light = new THREE.AmbientLight(color, intensity);
  return {
    type: LightType.Ambient,
    color,
    intensity: intensity || 1,
    position: createVector3(),
    castShadow: false,
    getNativeLight: () => light
  };
}

/**
 * Cria Directional Light
 */
export function createDirectionalLight(color: number, intensity?: number): ILight {
  const light = new THREE.DirectionalLight(color, intensity);
  return {
    type: LightType.Directional,
    color,
    intensity: intensity || 1,
    position: createVector3(light.position.x, light.position.y, light.position.z),
    castShadow: light.castShadow,
    getNativeLight: () => light
  };
}
