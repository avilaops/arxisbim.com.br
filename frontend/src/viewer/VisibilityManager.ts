/**
 * VisibilityManager (S10) — resolve e aplica VisibilityState.
 *
 * Opera SÓ com expressID/groupKey, NUNCA Mesh/Object3D (mantém o desacoplamento
 * do S09). A resolução `isVisible(expressID)` é pura/testável; a aplicação no
 * scene é feita pela camada de render via callback `onApply(id, visible)`.
 *
 * Toggle por GRUPO (disciplina) — não elemento a elemento — p/ ficar <100ms em
 * 10k elementos (spec). Floors usam storeyId da hierarquia do S07.
 */
import {
  defaultVisibilityState, VISIBILITY_STATE_VERSION,
  type VisibilityState, type ToggleableGroup,
} from './VisibilityState';
import type { DisciplineResolver } from './DisciplineTaxonomy';

/** Metadados mínimos por elemento (vêm do IFCStructure do S07 + tipo). */
export interface VisibilityElement {
  expressID: number;
  type: string;
  storeyId: number | null;
}

export type ApplyCallback = (expressID: number, visible: boolean) => void;

export class VisibilityManager {
  private state: VisibilityState = defaultVisibilityState();
  private hidden = new Set<number>();
  private applyCbs = new Set<ApplyCallback>();

  constructor(
    private elements: VisibilityElement[],
    private disciplineOf: DisciplineResolver,
  ) {}

  /** Registra quem aplica a visibilidade no scene (render layer). */
  onApply(cb: ApplyCallback): () => void { this.applyCbs.add(cb); return () => this.applyCbs.delete(cb); }

  /** Resolução PURA: um elemento está visível sob o estado atual? */
  isVisible(expressID: number): boolean {
    if (this.hidden.has(expressID)) return false;
    const el = this.elements.find((e) => e.expressID === expressID);
    if (!el) return true; // desconhecido: não esconde
    return this.isElementVisible(el);
  }

  private isElementVisible(el: VisibilityElement): boolean {
    if (this.hidden.has(el.expressID)) return false;
    const group = this.disciplineOf(el.type);
    if (group !== 'other' && this.state.groups[group as ToggleableGroup] === false) return false;
    if (this.state.floors.length > 0) {
      if (el.storeyId == null || !this.state.floors.includes(el.storeyId)) return false;
    }
    return true;
  }

  // ── Mutações ────────────────────────────────────────────────────────────────
  setGroup(group: ToggleableGroup, visible: boolean): void {
    this.state.groups[group] = visible;
    this.recompute();
  }

  /** storeyIds visíveis; array vazio = todos. */
  setFloors(storeyIds: number[]): void {
    this.state.floors = [...storeyIds];
    this.recompute();
  }

  hide(expressID: number): void { this.hidden.add(expressID); this.applyOne(expressID); }
  show(expressID: number): void { this.hidden.delete(expressID); this.applyOne(expressID); }

  setClippingPlane(plane: VisibilityState['clippingPlane']): void { this.state.clippingPlane = plane; }

  // ── Serialização ──────────────────────────────────────────────────────────
  getState(): VisibilityState {
    return {
      version: VISIBILITY_STATE_VERSION,
      groups: { ...this.state.groups },
      floors: [...this.state.floors],
      hiddenElements: [...this.hidden].sort((a, b) => a - b),
      clippingPlane: this.state.clippingPlane ? { normal: [...this.state.clippingPlane.normal], constant: this.state.clippingPlane.constant } : null,
    };
  }

  /** Restaura configuração exata (grupos + pavimentos + ocultos + corte). */
  setState(s: VisibilityState): void {
    this.state = {
      version: VISIBILITY_STATE_VERSION,
      groups: { ...s.groups },
      floors: [...s.floors],
      hiddenElements: [...s.hiddenElements],
      clippingPlane: s.clippingPlane ? { normal: [...s.clippingPlane.normal], constant: s.clippingPlane.constant } : null,
    };
    this.hidden = new Set(s.hiddenElements);
    this.recompute();
  }

  /** Recalcula a visibilidade de TODOS os elementos e aplica (toggle por grupo). */
  private recompute(): void {
    for (const el of this.elements) this.emit(el.expressID, this.isElementVisible(el));
  }

  private applyOne(expressID: number): void { this.emit(expressID, this.isVisible(expressID)); }
  private emit(id: number, visible: boolean): void { for (const cb of this.applyCbs) cb(id, visible); }
}
