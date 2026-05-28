/**
 * Interface abstrata para Renderer
 * Implementações: ThreeRendererAdapter, AvxRendererAdapter
 * 
 * REGRA: Nenhum código fora de src/engine/adapters/* pode importar Three.js diretamente
 */

import { IScene } from './IScene';
import { ICamera } from './ICamera';

export interface IRenderer {
  /**
   * Renderiza a cena com a câmera especificada
   */
  render(scene: IScene, camera: ICamera): void;

  /**
   * Define o tamanho do renderer
   */
  setSize(width: number, height: number, updateStyle?: boolean): void;

  /**
   * Define o pixel ratio
   */
  setPixelRatio(ratio: number): void;

  /**
   * Retorna o elemento DOM canvas
   */
  getDOMElement(): HTMLCanvasElement;

  /**
   * Ativa/desativa sombras
   */
  setShadowsEnabled(enabled: boolean): void;

  /**
   * Define tipo de shadow map
   */
  setShadowMapType(type: ShadowMapType): void;

  /**
   * Define tone mapping
   */
  setToneMapping(type: ToneMappingType, exposure?: number): void;

  /**
   * Retorna informações de rendering
   */
  getRenderInfo(): RenderInfo;

  /**
   * Captura screenshot
   */
  captureScreenshot(format?: 'png' | 'jpeg', quality?: number): string;

  /**
   * Limpa recursos
   */
  dispose(): void;
}

export enum ShadowMapType {
  Basic = 0,
  PCF = 1,
  PCFSoft = 2,
  VSM = 3
}

export enum ToneMappingType {
  None = 0,
  Linear = 1,
  Reinhard = 2,
  Cineon = 3,
  ACESFilmic = 4
}

export interface RenderInfo {
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  calls: number;
  points: number;
  lines: number;
}
