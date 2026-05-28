/**
 * Interface abstrata para Lights
 * Implementações: ThreeLightAdapter, AvxLightAdapter
 */

import { ISceneObject, IVector3 } from './IScene';

export interface ILight extends ISceneObject {
  color: number;
  intensity: number;

  /**
   * Retorna tipo de luz
   */
  getLightType(): LightType;
}

export enum LightType {
  Ambient = 'AmbientLight',
  Directional = 'DirectionalLight',
  Point = 'PointLight',
  Spot = 'SpotLight',
  Hemisphere = 'HemisphereLight'
}

export interface IDirectionalLight extends ILight {
  target: IVector3;
  castShadow: boolean;
  shadow: {
    mapSize: { width: number; height: number };
    camera: {
      near: number;
      far: number;
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
  };
}

export interface IPointLight extends ILight {
  distance: number;
  decay: number;
  castShadow: boolean;
}

export interface ISpotLight extends ILight {
  target: IVector3;
  angle: number;
  penumbra: number;
  distance: number;
  decay: number;
  castShadow: boolean;
}

export interface ILightFactory {
  /**
   * Cria luz ambiente
   */
  createAmbient(color: number, intensity: number): ILight;

  /**
   * Cria luz direcional
   */
  createDirectional(color: number, intensity: number): IDirectionalLight;

  /**
   * Cria luz pontual
   */
  createPoint(color: number, intensity: number, distance?: number): IPointLight;

  /**
   * Cria luz spot
   */
  createSpot(color: number, intensity: number, distance?: number, angle?: number): ISpotLight;
}
