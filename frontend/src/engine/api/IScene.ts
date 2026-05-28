/**
 * Interface abstrata para Scene
 * Implementações: ThreeSceneAdapter, AvxSceneAdapter
 */

import { IMesh } from './IMesh';
import { ILight } from './ILight';
import { ICamera } from './ICamera';

export interface IScene {
  /**
   * Adiciona objeto à cena
   */
  add(object: ISceneObject): void;

  /**
   * Remove objeto da cena
   */
  remove(object: ISceneObject): void;

  /**
   * Percorre hierarquia da cena
   */
  traverse(callback: (object: ISceneObject) => void): void;

  /**
   * Retorna objeto pelo nome
   */
  getObjectByName(name: string): ISceneObject | undefined;

  /**
   * Retorna objeto pelo UUID
   */
  getObjectByUUID(uuid: string): ISceneObject | undefined;

  /**
   * Define cor de fundo
   */
  setBackgroundColor(color: number | string): void;

  /**
   * Define ambiente/fog
   */
  setFog(color: number, near: number, far: number): void;

  /**
   * Limpa fog
   */
  clearFog(): void;

  /**
   * Retorna implementação nativa (para interop temporária)
   * TODO: Remover quando migração estiver completa
   */
  getNativeScene(): any;
}

export interface ISceneObject {
  uuid: string;
  name: string;
  visible: boolean;
  position: IVector3;
  rotation: IEuler;
  scale: IVector3;
  userData: Record<string, any>;
  parent: ISceneObject | null;
  children: ISceneObject[];

  /**
   * Adiciona filho
   */
  add(object: ISceneObject): void;

  /**
   * Remove filho
   */
  remove(object: ISceneObject): void;

  /**
   * Percorre hierarquia
   */
  traverse(callback: (object: ISceneObject) => void): void;

  /**
   * Retorna tipo do objeto
   */
  getType(): SceneObjectType;

  /**
   * Retorna implementação nativa
   */
  getNativeObject(): any;
}

export enum SceneObjectType {
  Object3D = 'Object3D',
  Mesh = 'Mesh',
  Group = 'Group',
  Light = 'Light',
  Camera = 'Camera',
  Line = 'Line',
  Points = 'Points'
}

export interface IVector3 {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): void;
  clone(): IVector3;
  copy(v: IVector3): void;
  add(v: IVector3): IVector3;
  sub(v: IVector3): IVector3;
  multiply(v: IVector3): IVector3;
  multiplyScalar(s: number): IVector3;
  normalize(): IVector3;
  length(): number;
  distanceTo(v: IVector3): number;
  toArray(): [number, number, number];
}

export interface IEuler {
  x: number;
  y: number;
  z: number;
  order: 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY';
  set(x: number, y: number, z: number, order?: string): void;
  clone(): IEuler;
  copy(e: IEuler): void;
  toArray(): [number, number, number];
}
