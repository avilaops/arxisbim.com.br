import { describe, it, expect } from 'vitest';
import {
  assessIfcSchemaSupport,
  assertIfcSchemaSupported,
  normalizeIfcSchema,
  sniffIfcSchema,
  UnsupportedIfcSchemaError,
} from '../../src/modules/ifc/ifc-schema-support.js';

function stepHeader(schema: string): string {
  return [
    'ISO-10303-21;',
    'HEADER;',
    "FILE_DESCRIPTION((''),'2;1');",
    "FILE_NAME('m.ifc','2026-01-01T00:00:00',(''),(''),'','','');",
    `FILE_SCHEMA(('${schema}'));`,
    'ENDSEC;',
    'DATA;',
    'ENDSEC;',
    'END-ISO-10303-21;',
  ].join('\n');
}

describe('ifc-schema-support · normalizeIfcSchema', () => {
  it('normaliza os esquemas suportados', () => {
    expect(normalizeIfcSchema('IFC2X3')).toBe('IFC2X3');
    expect(normalizeIfcSchema('IFC4')).toBe('IFC4');
    expect(normalizeIfcSchema('IFC4X1')).toBe('IFC4X3');
    expect(normalizeIfcSchema('IFC4X2')).toBe('IFC4X3');
    expect(normalizeIfcSchema('IFC4X3')).toBe('IFC4X3');
    expect(normalizeIfcSchema('IFC4X3_ADD2')).toBe('IFC4X3');
    // Nome provisório do IFC4 nos drafts.
    expect(normalizeIfcSchema('IFC2X4')).toBe('IFC4');
    // Case-insensitive.
    expect(normalizeIfcSchema('ifc4')).toBe('IFC4');
  });

  it('devolve null para esquemas não suportados', () => {
    expect(normalizeIfcSchema('IFC2X2_FINAL')).toBeNull();
    expect(normalizeIfcSchema('IFC2X2')).toBeNull();
    expect(normalizeIfcSchema('IFC20_FINAL')).toBeNull();
    expect(normalizeIfcSchema('')).toBeNull();
    expect(normalizeIfcSchema(null)).toBeNull();
  });
});

describe('ifc-schema-support · sniffIfcSchema', () => {
  it('extrai o FILE_SCHEMA do cabeçalho STEP', () => {
    expect(sniffIfcSchema(stepHeader('IFC4'))).toBe('IFC4');
    expect(sniffIfcSchema(stepHeader('IFC2X3'))).toBe('IFC2X3');
    // Tolerante a espaçamento.
    expect(sniffIfcSchema("FILE_SCHEMA ( ( 'IFC4X3_ADD2' ) );")).toBe('IFC4X3_ADD2');
  });

  it('devolve null sem FILE_SCHEMA', () => {
    expect(sniffIfcSchema('ISO-10303-21;\nHEADER;\nDATA;')).toBeNull();
  });
});

describe('ifc-schema-support · assessIfcSchemaSupport', () => {
  it('aceita 2x3, 4 e 4x3 (string ou Buffer)', () => {
    for (const s of ['IFC2X3', 'IFC4', 'IFC4X3_ADD2']) {
      const fromString = assessIfcSchemaSupport(stepHeader(s));
      expect(fromString.supported).toBe(true);
      expect(fromString.schema).toBe(s);

      const fromBuffer = assessIfcSchemaSupport(Buffer.from(stepHeader(s), 'utf-8'));
      expect(fromBuffer.supported).toBe(true);
    }
  });

  it('rejeita IFC2X2 com motivo acionável', () => {
    const res = assessIfcSchemaSupport(stepHeader('IFC2X2_FINAL'));
    expect(res.supported).toBe(false);
    expect(res.schema).toBe('IFC2X2_FINAL');
    expect(res.normalized).toBeNull();
    expect(res.reason).toMatch(/não é suportado/i);
    expect(res.reason).toMatch(/Reexporte/i);
  });

  it('rejeita arquivo sem FILE_SCHEMA', () => {
    const res = assessIfcSchemaSupport('isto não é um IFC');
    expect(res.supported).toBe(false);
    expect(res.schema).toBeNull();
    expect(res.reason).toMatch(/FILE_SCHEMA/);
  });
});

describe('ifc-schema-support · assertIfcSchemaSupported', () => {
  it('devolve o assessment quando suportado', () => {
    const res = assertIfcSchemaSupported(stepHeader('IFC4'));
    expect(res.normalized).toBe('IFC4');
  });

  it('lança UnsupportedIfcSchemaError (422) quando não suportado', () => {
    try {
      assertIfcSchemaSupported(stepHeader('IFC2X2_FINAL'));
      expect.unreachable('deveria ter lançado');
    } catch (err) {
      expect(err).toBeInstanceOf(UnsupportedIfcSchemaError);
      const e = err as UnsupportedIfcSchemaError;
      expect(e.statusCode).toBe(422);
      expect(e.code).toBe('UNSUPPORTED_IFC_SCHEMA');
      expect(e.assessment.schema).toBe('IFC2X2_FINAL');
    }
  });
});
