/**
 * Selection (S09) — estado de seleção/hover DESACOPLADO do motor gráfico.
 *
 * Spec S09: trabalha SÓ com expressID; nunca expõe Mesh/Object3D/Material fora do
 * Viewer. Assim S13/S15/S22 consomem seleção sem depender do Three.js. Pura,
 * testável headless. O Viewer liga o highlight visual reagindo a onSelect/onHover.
 */
export type SelectionCallback = (id: number | null) => void;

export class Selection {
  private selected: number | null = null;
  private hovered: number | null = null;
  private selectCbs = new Set<SelectionCallback>();
  private hoverCbs = new Set<SelectionCallback>();

  getSelected(): number | null { return this.selected; }
  getHovered(): number | null { return this.hovered; }

  /** Seleciona um elemento. Idempotente: re-selecionar o mesmo não re-dispara. */
  select(expressID: number): void {
    if (this.selected === expressID) return;
    this.selected = expressID;
    this.emit(this.selectCbs, expressID);
  }

  /** Clique no vazio → deseleciona. No-op se já vazio. */
  clear(): void {
    if (this.selected === null) return;
    this.selected = null;
    this.emit(this.selectCbs, null);
  }

  /** Alterna: clicar no já-selecionado deseleciona (UX comum de viewer). */
  toggle(expressID: number): void {
    if (this.selected === expressID) this.clear();
    else this.select(expressID);
  }

  /** Hover temporário — NÃO altera a seleção (spec). */
  hover(expressID: number | null): void {
    if (this.hovered === expressID) return;
    this.hovered = expressID;
    this.emit(this.hoverCbs, expressID);
  }

  onSelect(cb: SelectionCallback): () => void { this.selectCbs.add(cb); return () => this.selectCbs.delete(cb); }
  onHover(cb: SelectionCallback): () => void { this.hoverCbs.add(cb); return () => this.hoverCbs.delete(cb); }

  private emit(cbs: Set<SelectionCallback>, id: number | null): void {
    for (const cb of cbs) cb(id);
  }
}
