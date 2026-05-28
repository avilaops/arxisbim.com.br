/**
 * QueryBuilder — fluent API to construct a `Query` without writing AST by hand.
 *
 *   q().from('IfcWall').where('FireRating', '=', '60min').limit(10).build()
 */

import type {
  AndFilter,
  ComparisonOp,
  PropertyRef,
  Query,
  QueryFilter,
} from './types';

type Primitive = number | string | boolean;

export class QueryBuilder {
  private _from?: string;
  private _filters: QueryFilter[] = [];
  private _limit?: number;

  from(ifcType: string): this {
    this._from = ifcType;
    return this;
  }

  where(property: string | PropertyRef, op: ComparisonOp, value?: Primitive | Primitive[]): this {
    const ref: PropertyRef = typeof property === 'string'
      ? parsePropertyRef(property)
      : property;
    this._filters.push({ kind: 'property', property: ref, op, value });
    return this;
  }

  whereType(ifcType: string): this {
    this._filters.push({ kind: 'type', ifcType });
    return this;
  }

  whereBbox(min: [number, number, number], max: [number, number, number]): this {
    this._filters.push({ kind: 'bbox', min, max });
    return this;
  }

  not(filter: QueryFilter): this {
    this._filters.push({ kind: 'not', filter });
    return this;
  }

  or(...filters: QueryFilter[]): this {
    this._filters.push({ kind: 'or', filters });
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  build(): Query {
    const where: QueryFilter | undefined =
      this._filters.length === 0
        ? undefined
        : this._filters.length === 1
          ? this._filters[0]
          : ({ kind: 'and', filters: this._filters } satisfies AndFilter);

    const q: Query = {};
    if (this._from) q.from = this._from;
    if (where) q.where = where;
    if (typeof this._limit === 'number') q.limit = this._limit;
    return q;
  }
}

export function q(): QueryBuilder {
  return new QueryBuilder();
}

function parsePropertyRef(raw: string): PropertyRef {
  const idx = raw.indexOf('.');
  if (idx < 0) return { name: raw };
  return { pset: raw.slice(0, idx), name: raw.slice(idx + 1) };
}
