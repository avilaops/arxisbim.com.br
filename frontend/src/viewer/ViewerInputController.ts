/**
 * ViewerInputController (S09) — liga eventos de ponteiro à seleção da fachada.
 *
 * pointerup (se clique, não arrasto) → NDC → `rayPick` (raycast da camada de
 * render) → `ViewerFacade.pickObject`. Arrasto = orbit/pan, não seleciona.
 * `rayPick` é injetado (o raycaster/cena/câmera vivem na camada de render) →
 * o controlador fica engine-agnóstico e testável headless.
 */
import { ViewerInput, type PointerSample } from './ViewerInput';
import type { ViewerFacade } from './ViewerFacade';
import type { IdentifiableObject } from './MeshReference';

/** Resolve um NDC (-1..1) p/ o objeto atingido na cena (raycast da render layer). */
export type RayPick = (ndcX: number, ndcY: number) => IdentifiableObject | null;

export interface CanvasSize { width: number; height: number; }

export class ViewerInputController {
  private input = new ViewerInput();

  constructor(
    private facade: ViewerFacade,
    private rayPick: RayPick,
    private size: () => CanvasSize,
  ) {}

  pointerDown(p: PointerSample): void { this.input.pointerDown(p); }

  /** Retorna o expressID selecionado (ou null se vazio/arrasto). */
  pointerUp(p: PointerSample): number | null {
    const { width, height } = this.size();
    const ndc = this.input.pointerUp(p, width, height);
    if (!ndc) return this.facade.selectionApi.get(); // arrasto: seleção inalterada
    const hit = this.rayPick(ndc.ndcX, ndc.ndcY);
    return this.facade.pickObject(hit); // clique no vazio (hit null) → clear
  }

  /** Hover: move o ponteiro sem clicar. */
  pointerMove(p: PointerSample): number | null {
    const { width, height } = this.size();
    const ndc = { ndcX: (p.x / width) * 2 - 1, ndcY: -((p.y / height) * 2 - 1) };
    const hit = this.rayPick(ndc.ndcX, ndc.ndcY);
    return this.facade.hoverObject(hit);
  }
}
