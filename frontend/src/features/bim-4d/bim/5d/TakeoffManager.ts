/**
 * TakeoffManager — orchestrates QuantityExtractor + QuantityRulesEngine
 * over a set of IFC elements, returning a TakeoffResult aggregated by type.
 *
 * Emits lifecycle events via a tiny pub/sub so the UI can show progress
 * without coupling to a specific framework.
 */

import { QuantityExtractor } from './QuantityExtractor';
import { QuantityRulesEngine } from './QuantityRulesEngine';
import type {
  IfcElementSource,
  MeasurementUnit,
  Quantity,
  QuantityRule,
  TakeoffResult,
} from './types';

export type TakeoffEvent =
  | { type: 'start'; total: number }
  | { type: 'progress'; processed: number; total: number }
  | { type: 'done'; result: TakeoffResult }
  | { type: 'error'; error: unknown };

export type TakeoffListener = (event: TakeoffEvent) => void;

export interface RunOptions {
  /** Enable bbox fallback when no IFC quantity + no rule matches. Default true. */
  enableGeometryFallback?: boolean;
  /** Rules override IFC quantities for the same element+name pair. Default false. */
  rulesOverride?: boolean;
  /** Yield to the event loop every N elements (0 disables). Default 0. */
  yieldEvery?: number;
}

export class TakeoffManager {
  private readonly listeners = new Set<TakeoffListener>();

  constructor(
    private readonly extractor: QuantityExtractor = new QuantityExtractor(),
    private readonly rules: QuantityRulesEngine = new QuantityRulesEngine(),
  ) {}

  on(listener: TakeoffListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  registerRule(rule: QuantityRule): void {
    this.rules.register(rule);
  }

  async run(elements: IfcElementSource[], options: RunOptions = {}): Promise<TakeoffResult> {
    const { enableGeometryFallback = true, rulesOverride = false, yieldEvery = 0 } = options;
    const t0 = performance.now();
    this.emit({ type: 'start', total: elements.length });

    try {
      // Phase 1: IFC native + geometry fallback (per element, allows progress)
      const ifcQuantities: Quantity[] = [];
      const skipped: Array<string | number> = [];
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const qs = this.extractor.extract(el, { enableGeometryFallback });
        if (qs.length === 0) skipped.push(el.expressID);
        else ifcQuantities.push(...qs);

        if (yieldEvery > 0 && (i + 1) % yieldEvery === 0) {
          this.emit({ type: 'progress', processed: i + 1, total: elements.length });
          await Promise.resolve();
        }
      }

      // Phase 2: rules engine — fills gaps (or overrides if requested)
      const ruleEval = this.rules.apply(elements, {
        overrideExisting: rulesOverride,
        existingQuantities: ifcQuantities,
      });

      // If overriding, drop IFC duplicates (same element + name)
      let merged = ifcQuantities;
      if (rulesOverride && ruleEval.quantities.length > 0) {
        const overridden = new Set(
          ruleEval.quantities.map((q) => `${q.elementId}::${q.name}`),
        );
        merged = ifcQuantities.filter(
          (q) => !overridden.has(`${q.elementId}::${q.name}`),
        );
      }
      const all = [...merged, ...ruleEval.quantities];

      // Recompute skipped: elements that ended up with at least one quantity are no longer skipped
      const produced = new Set(all.map((q) => q.elementId));
      const finalSkipped = skipped.filter((id) => !produced.has(id));

      const result: TakeoffResult = {
        quantities: all,
        byType: groupByType(all),
        skippedElementIds: finalSkipped,
        durationMs: performance.now() - t0,
      };

      this.emit({ type: 'done', result });
      return result;
    } catch (error) {
      this.emit({ type: 'error', error });
      throw error;
    }
  }

  private emit(event: TakeoffEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch {
        // listener errors must not break the pipeline
      }
    }
  }
}

function groupByType(quantities: Quantity[]): TakeoffResult['byType'] {
  const out: TakeoffResult['byType'] = {};
  for (const q of quantities) {
    const byName = (out[q.ifcType] ??= {});
    const slot = byName[q.name];
    if (!slot) {
      byName[q.name] = { sum: q.value, unit: q.unit, count: 1 };
    } else if (slot.unit === q.unit) {
      slot.sum += q.value;
      slot.count += 1;
    } else {
      // Unit mismatch: keep first unit, store under a disambiguated key
      const altKey = `${q.name} (${q.unit as MeasurementUnit})`;
      const alt = byName[altKey];
      if (alt) {
        alt.sum += q.value;
        alt.count += 1;
      } else {
        byName[altKey] = { sum: q.value, unit: q.unit, count: 1 };
      }
    }
  }
  return out;
}
