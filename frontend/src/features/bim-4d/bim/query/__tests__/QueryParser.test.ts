import { describe, it, expect } from 'vitest';
import { QueryParser } from '../QueryParser';
import { QueryEngine } from '../QueryEngine';
import type { QueryableElement } from '../types';

const parser = new QueryParser();

describe('QueryParser', () => {
  it('parses SELECT * FROM IfcWall', () => {
    expect(parser.parse('SELECT * FROM IfcWall')).toEqual({ from: 'IfcWall' });
  });

  it('parses WHERE with string equality (double and single quotes)', () => {
    expect(parser.parse('SELECT * FROM IfcWall WHERE FireRating = "60min"')).toEqual({
      from: 'IfcWall',
      where: { kind: 'property', property: { name: 'FireRating' }, op: '=', value: '60min' },
    });
    expect(parser.parse("SELECT * FROM IfcWall WHERE FireRating = '60min'").where).toEqual({
      kind: 'property',
      property: { name: 'FireRating' },
      op: '=',
      value: '60min',
    });
  });

  it('parses numeric comparisons and booleans', () => {
    const q = parser.parse('SELECT * FROM IfcWall WHERE Height >= 3 AND LoadBearing = TRUE');
    expect(q.where).toEqual({
      kind: 'and',
      filters: [
        { kind: 'property', property: { name: 'Height' }, op: '>=', value: 3 },
        { kind: 'property', property: { name: 'LoadBearing' }, op: '=', value: true },
      ],
    });
  });

  it('parses qualified property names (Pset.Field)', () => {
    const q = parser.parse('SELECT * FROM IfcWall WHERE Pset_WallCommon.FireRating = "60min"');
    expect((q.where as any).property).toEqual({ pset: 'Pset_WallCommon', name: 'FireRating' });
  });

  it('parses OR and parentheses', () => {
    const q = parser.parse(
      'SELECT * FROM IfcWall WHERE (FireRating = "60min" OR FireRating = "120min") AND LoadBearing = TRUE',
    );
    expect(q.where).toEqual({
      kind: 'and',
      filters: [
        {
          kind: 'or',
          filters: [
            { kind: 'property', property: { name: 'FireRating' }, op: '=', value: '60min' },
            { kind: 'property', property: { name: 'FireRating' }, op: '=', value: '120min' },
          ],
        },
        { kind: 'property', property: { name: 'LoadBearing' }, op: '=', value: true },
      ],
    });
  });

  it('parses NOT', () => {
    const q = parser.parse('SELECT * FROM IfcWall WHERE NOT LoadBearing = TRUE');
    expect(q.where).toEqual({
      kind: 'not',
      filter: { kind: 'property', property: { name: 'LoadBearing' }, op: '=', value: true },
    });
  });

  it('parses IN', () => {
    const q = parser.parse('SELECT * FROM IfcWall WHERE FireRating IN ("60min", "120min")');
    expect(q.where).toEqual({
      kind: 'property',
      property: { name: 'FireRating' },
      op: 'IN',
      value: ['60min', '120min'],
    });
  });

  it('parses LIKE', () => {
    const q = parser.parse('SELECT * FROM IfcSlab WHERE Name LIKE "Laje%"');
    expect(q.where).toEqual({
      kind: 'property',
      property: { name: 'Name' },
      op: 'LIKE',
      value: 'Laje%',
    });
  });

  it('parses IS NULL / IS NOT NULL', () => {
    expect(parser.parse('SELECT * FROM IfcDoor WHERE FireRating IS NULL').where).toEqual({
      kind: 'property',
      property: { name: 'FireRating' },
      op: 'IS NULL',
    });
    expect(parser.parse('SELECT * FROM IfcDoor WHERE FireRating IS NOT NULL').where).toEqual({
      kind: 'property',
      property: { name: 'FireRating' },
      op: 'IS NOT NULL',
    });
  });

  it('parses LIMIT', () => {
    expect(parser.parse('SELECT * FROM IfcWall LIMIT 10').limit).toBe(10);
  });

  it('case-insensitive keywords', () => {
    expect(parser.parse('select * from IfcWall where Height > 1 limit 2')).toEqual({
      from: 'IfcWall',
      where: { kind: 'property', property: { name: 'Height' }, op: '>', value: 1 },
      limit: 2,
    });
  });

  it('throws on syntax errors', () => {
    expect(() => parser.parse('SELECT FROM IfcWall')).toThrow();
    expect(() => parser.parse('SELECT * IfcWall')).toThrow();
    expect(() => parser.parse('SELECT * FROM IfcWall WHERE Height')).toThrow();
    expect(() => parser.parse('SELECT * FROM IfcWall LIMIT abc')).toThrow();
  });

  it('round-trips through the engine end-to-end', () => {
    const elements: QueryableElement[] = [
      {
        expressID: 1,
        ifcType: 'IfcWall',
        propertySets: { Pset: { FireRating: '60min', LoadBearing: true } },
      },
      {
        expressID: 2,
        ifcType: 'IfcWall',
        propertySets: { Pset: { FireRating: '120min', LoadBearing: false } },
      },
    ];
    const q = parser.parse(
      'SELECT * FROM IfcWall WHERE FireRating = "60min" AND LoadBearing = TRUE',
    );
    const r = new QueryEngine().execute(elements, q);
    expect(r.elements.map((e) => e.expressID)).toEqual([1]);
  });
});
