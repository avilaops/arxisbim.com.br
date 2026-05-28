/**
 * QueryEngine — evaluates a `Query` against a flat array of `QueryableElement`s.
 *
 * Pure, deterministic, no I/O. All filters are evaluated in-process.
 */

import type {
  PropertyFilter,
  PropertyRef,
  PropertyValue,
  Query,
  QueryableElement,
  QueryFilter,
  QueryResult,
} from './types';

export class QueryEngine {
  execute(elements: QueryableElement[], query: Query): QueryResult {
    const t0 = performance.now();
    const filters: QueryFilter[] = [];
    if (query.from) filters.push({ kind: 'type', ifcType: query.from });
    if (query.where) filters.push(query.where);

    const root: QueryFilter | null =
      filters.length === 0 ? null : filters.length === 1 ? filters[0] : { kind: 'and', filters };

    const out: QueryableElement[] = [];
    let matched = 0;
    const limit = typeof query.limit === 'number' && query.limit >= 0 ? query.limit : Infinity;

    for (const el of elements) {
      if (root && !evalFilter(root, el)) continue;
      matched++;
      if (out.length < limit) out.push(el);
    }

    return { elements: out, matched, durationMs: performance.now() - t0 };
  }
}

function evalFilter(filter: QueryFilter, el: QueryableElement): boolean {
  switch (filter.kind) {
    case 'type':
      return el.ifcType === filter.ifcType;
    case 'property':
      return evalProperty(filter, el);
    case 'bbox':
      return evalBbox(filter.min, filter.max, el);
    case 'not':
      return !evalFilter(filter.filter, el);
    case 'and':
      return filter.filters.every((f) => evalFilter(f, el));
    case 'or':
      return filter.filters.some((f) => evalFilter(f, el));
  }
}

function evalProperty(f: PropertyFilter, el: QueryableElement): boolean {
  const raw = readProperty(el, f.property);
  switch (f.op) {
    case 'IS NULL':
      return raw === undefined || raw === null;
    case 'IS NOT NULL':
      return raw !== undefined && raw !== null;
  }

  if (raw === undefined || raw === null) return false;
  const val = unwrap(raw);

  switch (f.op) {
    case '=':
      return looseEq(val, f.value as string | number | boolean);
    case '!=':
      return !looseEq(val, f.value as string | number | boolean);
    case '>':
    case '>=':
    case '<':
    case '<=': {
      const a = toNumber(val);
      const b = toNumber(f.value as string | number | boolean);
      if (a === null || b === null) return false;
      return f.op === '>' ? a > b : f.op === '>=' ? a >= b : f.op === '<' ? a < b : a <= b;
    }
    case 'IN': {
      const arr = (f.value as Array<string | number | boolean>) ?? [];
      return arr.some((v) => looseEq(val, v));
    }
    case 'LIKE': {
      const pattern = String(f.value ?? '');
      const re = likeToRegex(pattern);
      return re.test(String(val));
    }
  }
  return false;
}

function readProperty(el: QueryableElement, ref: PropertyRef): PropertyValue | undefined {
  if (!el.propertySets) return undefined;
  if (ref.pset) {
    return el.propertySets[ref.pset]?.[ref.name];
  }
  for (const setName of Object.keys(el.propertySets)) {
    const v = el.propertySets[setName][ref.name];
    if (v !== undefined) return v;
  }
  return undefined;
}

function unwrap(v: PropertyValue): number | string | boolean | null {
  if (v === null) return null;
  if (typeof v === 'object') return (v.value as number | string | boolean) ?? null;
  return v;
}

function looseEq(a: unknown, b: unknown): boolean {
  if (typeof a === typeof b) return a === b;
  // numeric coercion when one side is a numeric string
  const na = toNumber(a as string | number | boolean);
  const nb = toNumber(b as string | number | boolean);
  if (na !== null && nb !== null) return na === nb;
  return String(a) === String(b);
}

function toNumber(v: string | number | boolean | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function likeToRegex(pattern: string): RegExp {
  // Escape regex specials, then translate SQL wildcards.
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const translated = escaped.replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp('^' + translated + '$', 'i');
}

function evalBbox(min: [number, number, number], max: [number, number, number], el: QueryableElement): boolean {
  const g = el.geometry;
  if (!g) return false;
  return (
    g.bboxMax[0] >= min[0] && g.bboxMin[0] <= max[0] &&
    g.bboxMax[1] >= min[1] && g.bboxMin[1] <= max[1] &&
    g.bboxMax[2] >= min[2] && g.bboxMin[2] <= max[2]
  );
}
