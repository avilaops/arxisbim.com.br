/**
 * ViewerFacade (S09) — fachada pública do viewer. Troca APENAS `expressID` e
 * `CameraState`; NUNCA tipos do Three.js. Consumers (S12/S13/S15/S22/S31) usam só
 * isto → liberdade de trocar Three.js por Babylon/WebGPU sem quebrar a aplicação.
 *
 * (O `ViewerHost` legado expõe PerspectiveCamera/Object3D direto — viola o contrato.
 *  Esta fachada é o alvo de migração: a camada de render deve rotear por aqui.)
 *
 * A camada de render (renderer/OrbitControls/raycaster/BVH/outline) chama os
 * hooks `pickObject`/`applyHighlight`; a fachada nunca cria nem expõe esses tipos.
 */
import { Camera } from './Camera';
import { Selection } from './Selection';
import { ElementIndex } from './ElementIndex';
import type { CameraState } from './CameraState';
import type { CameraPreset, BoundingBoxLike } from './CameraPresets';
import type { IdentifiableObject, GeometryManifest } from './MeshReference';

export interface CameraFacade {
  getState(): CameraState;
  setState(state: CameraState, animated?: boolean): void;
  setPreset(preset: CameraPreset): void;
  reset(): void;
}

export interface SelectionFacade {
  select(expressID: number): void;
  clear(): void;
  toggle(expressID: number): void;
  get(): number | null;
  onSelect(cb: (id: number | null) => void): () => void;
  onHover(cb: (id: number | null) => void): () => void;
}

/** A camada de render injeta isto: anima câmera + pinta highlight. Opcional. */
export interface RenderBridge {
  animateCamera?(state: CameraState, durationMs: number): void;
  applyState?(state: CameraState): void;
  highlightSelected?(id: number | null): void;
  highlightHovered?(id: number | null): void;
}

export class ViewerFacade {
  private camera = new Camera();
  private selection = new Selection();
  private index: ElementIndex | null = null;
  private bounds: BoundingBoxLike | null = null;
  private bridge: RenderBridge;

  constructor(bridge: RenderBridge = {}) {
    this.bridge = bridge;
    this.selection.onSelect((id) => this.bridge.highlightSelected?.(id));
    this.selection.onHover((id) => this.bridge.highlightHovered?.(id));
  }

  /** Carrega o modelo: índice de identidade + bounds p/ presets. */
  loadModel(manifest: GeometryManifest): void {
    this.index = new ElementIndex(manifest);
    this.bounds = { min: manifest.modelBounds.min, max: manifest.modelBounds.max };
    this.camera.reset(this.bounds);
  }

  readonly cameraApi: CameraFacade = {
    getState: () => this.camera.getState(),
    setState: (state, animated = false) => {
      if (animated && this.bridge.animateCamera) this.bridge.animateCamera(state, 300);
      else { this.camera.setState(state); this.bridge.applyState?.(state); }
    },
    setPreset: (preset) => {
      if (!this.bounds) return;
      const state = this.camera.setPreset(this.bounds, preset);
      this.bridge.applyState?.(state);
    },
    reset: () => {
      if (!this.bounds) return;
      const state = this.camera.reset(this.bounds);
      this.bridge.applyState?.(state);
    },
  };

  readonly selectionApi: SelectionFacade = {
    select: (id) => this.selection.select(id),
    clear: () => this.selection.clear(),
    toggle: (id) => this.selection.toggle(id),
    get: () => this.selection.getSelected(),
    onSelect: (cb) => this.selection.onSelect(cb),
    onHover: (cb) => this.selection.onHover(cb),
  };

  /**
   * Ponte raycast→seleção: a camada de render passa o objeto atingido (opaco);
   * a fachada resolve p/ expressID via ElementIndex e seleciona. Objeto fora do
   * modelo (grid/gizmo) → clear (clique no vazio deseleciona). Retorna o id.
   */
  pickObject(object: IdentifiableObject | null): number | null {
    const id = this.index?.resolveExpressID(object) ?? null;
    if (id == null) this.selection.clear();
    else this.selection.select(id);
    return id;
  }

  /** Hover via objeto raycastado (não persiste seleção). */
  hoverObject(object: IdentifiableObject | null): number | null {
    const id = this.index?.resolveExpressID(object) ?? null;
    this.selection.hover(id);
    return id;
  }
}
