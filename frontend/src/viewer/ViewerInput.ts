/**
 * ViewerInput (S09) — decide clique-vs-arrasto e converte p/ NDC.
 *
 * Spec S09: seleção em pointerup com THRESHOLD de tolerância; touch em mobile
 * precisa de ÁREA MAIOR. Lógica pura (sem DOM, sem Three.js) → testável headless.
 * O controlador de render liga: pointerup → (se clique) NDC → raycast → facade.pick.
 *
 * Convenção NDC: x∈[-1,1] (esq→dir), y∈[-1,1] (BAIXO→cima, invertido vs tela).
 */
export type PointerKind = 'mouse' | 'touch' | 'pen';

export interface PointerSample {
  x: number;        // px relativo ao canvas (clientX - rect.left)
  y: number;        // px relativo ao canvas (clientY - rect.top)
  kind: PointerKind;
}

export interface ClickResult {
  ndcX: number;
  ndcY: number;
}

// Movimento máximo (px) p/ ainda contar como clique, não arrasto.
const MOUSE_THRESHOLD = 4;
const TOUCH_THRESHOLD = 12; // dedo é impreciso → área maior

export function clickThreshold(kind: PointerKind): number {
  return kind === 'touch' ? TOUCH_THRESHOLD : MOUSE_THRESHOLD;
}

/** Converte px do canvas (origem topo-esq) p/ NDC (origem centro, y p/ cima). */
export function toNDC(x: number, y: number, width: number, height: number): ClickResult {
  return {
    ndcX: (x / width) * 2 - 1,
    ndcY: -((y / height) * 2 - 1),
  };
}

export class ViewerInput {
  private down: PointerSample | null = null;

  /** Registra o pointerdown (início de gesto). */
  pointerDown(p: PointerSample): void { this.down = p; }

  /**
   * Avalia o pointerup. Retorna NDC do clique se o movimento ficou dentro do
   * threshold (= clique), ou null se foi arrasto/sem down prévio (orbit/pan).
   */
  pointerUp(p: PointerSample, width: number, height: number): ClickResult | null {
    const start = this.down;
    this.down = null;
    if (!start) return null;
    const dist = Math.hypot(p.x - start.x, p.y - start.y);
    // Usa o maior threshold entre os dois pointers (down/up podem diferir em pen/touch).
    if (dist > Math.max(clickThreshold(start.kind), clickThreshold(p.kind))) return null;
    return toNDC(p.x, p.y, width, height);
  }

  cancel(): void { this.down = null; }
}
