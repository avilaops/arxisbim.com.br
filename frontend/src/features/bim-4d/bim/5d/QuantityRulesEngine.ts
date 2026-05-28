/**
 * QuantityRulesEngine — applies configurable per-IfcType rules.
 *
 * Rules are evaluated AFTER the QuantityExtractor's native IFC pass:
 * they either complement missing quantities or override them when
 * `overrideExisting` is set. Each rule is scoped to a single IFC type
 * and produces a single Quantity record (or null to skip the element).
 */

import type { IfcElementSource, Quantity, QuantityRule } from './types';

export interface RuleEvaluation {
  /** Quantities produced by rules (source: 'rule-engine'). */
  quantities: Quantity[];
  /** How many elements were touched by at least one rule. */
  matchedElementCount: number;
}

export interface ApplyRulesOptions {
  /**
   * When true, rule output replaces any existing Quantity for the same
   * element + name pair. Default false (only fills gaps).
   */
  overrideExisting?: boolean;
  /**
   * Existing quantities (from QuantityExtractor) used to detect gaps.
   * Required when `overrideExisting` is false.
   */
  existingQuantities?: Quantity[];
}

export class QuantityRulesEngine {
  private readonly rulesByType = new Map<string, QuantityRule[]>();

  constructor(rules: QuantityRule[] = []) {
    for (const rule of rules) this.register(rule);
  }

  register(rule: QuantityRule): void {
    const bucket = this.rulesByType.get(rule.ifcType) ?? [];
    bucket.push(rule);
    this.rulesByType.set(rule.ifcType, bucket);
  }

  clear(): void {
    this.rulesByType.clear();
  }

  /** Returns rules registered for an IFC type (empty array if none). */
  getRules(ifcType: string): readonly QuantityRule[] {
    return this.rulesByType.get(ifcType) ?? [];
  }

  apply(elements: IfcElementSource[], options: ApplyRulesOptions = {}): RuleEvaluation {
    const { overrideExisting = false, existingQuantities = [] } = options;
    const existingKey = new Set<string>();
    if (!overrideExisting) {
      for (const q of existingQuantities) {
        existingKey.add(`${q.elementId}::${q.name}`);
      }
    }

    const out: Quantity[] = [];
    const matched = new Set<string | number>();

    for (const el of elements) {
      const rules = this.rulesByType.get(el.ifcType);
      if (!rules || rules.length === 0) continue;
      for (const rule of rules) {
        const key = `${el.expressID}::${rule.name}`;
        if (!overrideExisting && existingKey.has(key)) continue;
        const value = rule.compute(el);
        if (value === null || !Number.isFinite(value)) continue;
        out.push({
          elementId: el.expressID,
          ifcType: el.ifcType,
          name: rule.name,
          value,
          unit: rule.unit,
          source: 'rule-engine',
        });
        matched.add(el.expressID);
      }
    }

    return { quantities: out, matchedElementCount: matched.size };
  }
}
