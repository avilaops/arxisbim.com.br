/**
 * Export central das interfaces AVX
 * 
 * IMPORTANTE: Este é o único local que o resto do código deve importar
 * para trabalhar com 3D. Nenhum import direto de Three.js fora de
 * src/engine/adapters/* é permitido.
 */

export * from './IRenderer';
export * from './IScene';
export * from './ICamera';
export * from './IMesh';
export * from './IGeometry';
export * from './IMaterial';
export * from './ILight';

/**
 * Factory principal que retorna implementação atual
 * (Three.js ou AVX dependendo da configuração)
 */
export interface IEngineFactory {
  /**
   * Cria renderer
   */
  createRenderer(canvas?: HTMLCanvasElement): import('./IRenderer').IRenderer;

  /**
   * Cria cena
   */
  createScene(): import('./IScene').IScene;

  /**
   * Cria câmera perspectiva
   */
  createPerspectiveCamera(
    fov: number,
    aspect: number,
    near: number,
    far: number
  ): import('./ICamera').IPerspectiveCamera;

  /**
   * Cria câmera ortográfica
   */
  createOrthographicCamera(
    left: number,
    right: number,
    top: number,
    bottom: number,
    near: number,
    far: number
  ): import('./ICamera').IOrthographicCamera;

  /**
   * Factory de geometrias
   */
  geometry: import('./IGeometry').IGeometryFactory;

  /**
   * Factory de materiais
   */
  material: import('./IMaterial').IMaterialFactory;

  /**
   * Factory de luzes
   */
  light: import('./ILight').ILightFactory;
}
