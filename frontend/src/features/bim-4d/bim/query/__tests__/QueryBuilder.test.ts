import { describe, it, expect } from 'vitest';
import { q } from '../QueryBuilder';

describe('QueryBuilder', () => {
  it('builds a simple SELECT FROM', () => {
    expect(q().from('IfcWall').build()).toEqual({ from: 'IfcWall' });
  });

  it('wraps multiple wheres in AND', () => {
    const query = q()
      .from('IfcWall')
      .where('FireRating', '=', '60min')
      .where('Pset_WallCommon.LoadBearing', '=', true)
      .limit(5)
      .build();

    expect(query).toEqual({
      from: 'IfcWall',
      where: {
        kind: 'and',
        filters: [
          { kind: 'property', property: { name: 'FireRating' }, op: '=', value: '60min' },
          {
            kind: 'property',
            property: { pset: 'Pset_WallCommon', name: 'LoadBearing' },
            op: '=',
            value: true,
          },
        ],
      },
      limit: 5,
    });
  });

  it('parses qualified property references', () => {
    const query = q().where('Pset_Common.Height', '>', 2).build();
    expect(query.where).toEqual({
      kind: 'property',
      property: { pset: 'Pset_Common', name: 'Height' },
      op: '>',
      value: 2,
    });
  });

  it('supports whereBbox', () => {
    const query = q().whereBbox([0, 0, 0], [10, 10, 10]).build();
    expect(query.where).toEqual({ kind: 'bbox', min: [0, 0, 0], max: [10, 10, 10] });
  });

  it('emits a property ref object directly', () => {
    const query = q()
      .where({ pset: 'Qto', name: 'NetVolume' }, '>=', 1)
      .build();
    expect(query.where).toEqual({
      kind: 'property',
      property: { pset: 'Qto', name: 'NetVolume' },
      op: '>=',
      value: 1,
    });
  });

  it('builds an empty query', () => {
    expect(q().build()).toEqual({});
  });
});
