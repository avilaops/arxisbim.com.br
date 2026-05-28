/**
 * Interface abstrata para Camera
 * Implementações: ThreeCameraAdapter, AvxCameraAdapter
 */

import { IVector3 } from './IScene';

export interface ICamera {
  position: IVector3;
  rotation: { x: number; y: number; z: number };
  
  /**
   * Retorna matriz de projeção
   */
  getProjectionMatrix(): number[];

  /**
   * Retorna matriz de view
   */
  getViewMatrix(): number[];

  /**
   * Atualiza matrizes
   */
  updateMatrixWorld(force?: boolean): void;

  /**
   * Retorna direção da câmera
   */
  getWorldDirection(target: IVector3): IVector3;

  /**
   * Retorna tipo de câmera
   */
  getType(): CameraType;

  /**
   * Retorna implementação nativa
   */
  getNativeCamera(): any;
}

export interface IPerspectiveCamera extends ICamera {
  fov: number;
  aspect: number;
  near: number;
  far: number;
  
  /**
   * Atualiza matriz de projeção
   */
  updateProjectionMatrix(): void;
}

export interface IOrthographicCamera extends ICamera {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  zoom: number;

  /**
   * Atualiza matriz de projeção
   */
  updateProjectionMatrix(): void;
}

export enum CameraType {
  Perspective = 'PerspectiveCamera',
  Orthographic = 'OrthographicCamera'
}
