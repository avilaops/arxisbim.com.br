/**
 * Batch selection service — manages multi-object selection by uuid.
 *
 * Coexists with `selectionService` (single-object). Used by Query Engine
 * UI (Sprint 5) and Advanced Selection features to highlight many results
 * at once without forcing the single-selection inspector into a multi-mode.
 *
 * Pure data layer: no Three.js coupling. Caller is responsible for any
 * visual side-effects (outline, color, etc.) by subscribing.
 */

export interface BatchSelectionState {
  uuids: ReadonlySet<string>;
}

export type BatchSelectionListener = (state: BatchSelectionState) => void;

export class BatchSelectionService {
  private static instance: BatchSelectionService | null = null;
  private uuids = new Set<string>();
  private listeners = new Set<BatchSelectionListener>();

  static getInstance(): BatchSelectionService {
    if (!BatchSelectionService.instance) {
      BatchSelectionService.instance = new BatchSelectionService();
    }
    return BatchSelectionService.instance;
  }

  /** Replace current selection with the given uuids. Dedupes. */
  selectMany(uuids: Iterable<string>): void {
    this.uuids = new Set(uuids);
    this.notify();
  }

  /** Add to the current selection. */
  add(uuids: Iterable<string>): void {
    for (const u of uuids) this.uuids.add(u);
    this.notify();
  }

  /** Remove uuids from the selection. */
  remove(uuids: Iterable<string>): void {
    for (const u of uuids) this.uuids.delete(u);
    this.notify();
  }

  /** Toggle a single uuid. */
  toggle(uuid: string): void {
    if (this.uuids.has(uuid)) this.uuids.delete(uuid);
    else this.uuids.add(uuid);
    this.notify();
  }

  /** Clear the entire batch. */
  clearAll(): void {
    if (this.uuids.size === 0) return;
    this.uuids = new Set();
    this.notify();
  }

  has(uuid: string): boolean {
    return this.uuids.has(uuid);
  }

  size(): number {
    return this.uuids.size;
  }

  getSelectedUuids(): string[] {
    return [...this.uuids];
  }

  /** Subscribe to batch changes. Returns a disposer. */
  onChanged(listener: BatchSelectionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Test-only: drop the singleton so independent test runs don't leak. */
  static _resetForTests(): void {
    BatchSelectionService.instance = null;
  }

  private notify(): void {
    const snapshot: BatchSelectionState = { uuids: new Set(this.uuids) };
    for (const l of this.listeners) {
      try {
        l(snapshot);
      } catch (err) {
        console.error('BatchSelectionService listener error', err);
      }
    }
  }
}

export const batchSelectionService = BatchSelectionService.getInstance();
