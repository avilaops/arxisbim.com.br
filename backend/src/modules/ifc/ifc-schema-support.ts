/**
 * Suporte a esquemas IFC — fonte única de verdade sobre o que o pipeline
 * (web-ifc) consegue processar. Usado nos pontos de entrada de upload
 * (rotas v1, IfcService, plugin Revit) e no worker de parse, para rejeitar
 * cedo — com mensagem acionável — o que falharia no meio do processamento.
 *
 * web-ifc 0.0.x suporta IFC2X3, IFC4 e IFC4X1/4X2/4X3. IFC2X2 e anteriores
 * não são suportados; MVDs (Coordination View, Reference View, COBie, etc.)
 * são perfis de conteúdo dentro desses esquemas e não afetam o parse.
 */
import type { IfcSchema } from './ifc-structure.dto.js';

export interface IfcSchemaAssessment {
  /** Identificador cru do FILE_SCHEMA (ex.: 'IFC4X3_ADD2'), ou null se ausente. */
  schema: string | null;
  /** Esquema normalizado do pipeline quando suportado. */
  normalized: IfcSchema | null;
  supported: boolean;
  /** Motivo legível (pt-BR) quando não suportado. */
  reason?: string;
}

export class UnsupportedIfcSchemaError extends Error {
  readonly statusCode = 422;
  readonly code = 'UNSUPPORTED_IFC_SCHEMA';
  constructor(public readonly assessment: IfcSchemaAssessment) {
    super(assessment.reason ?? 'Esquema IFC não suportado');
    this.name = 'UnsupportedIfcSchemaError';
  }
}

const REEXPORT_HINT =
  'Reexporte o modelo como IFC4 (Vista de referência) ou IFC 2x3 (Vista de coordenação 2.0).';

/** Normaliza um identificador FILE_SCHEMA para o esquema do pipeline, ou null. */
export function normalizeIfcSchema(raw: string | null | undefined): IfcSchema | null {
  const s = (raw ?? '').toUpperCase();
  if (s.includes('IFC4X3') || s.includes('IFC4X2') || s.includes('IFC4X1')) return 'IFC4X3';
  // IFC2X4 foi o nome provisório do IFC4 durante os drafts.
  if (s.includes('IFC2X4')) return 'IFC4';
  if (s.includes('IFC4')) return 'IFC4';
  if (s.includes('IFC2X3')) return 'IFC2X3';
  return null;
}

/** Extrai o identificador do FILE_SCHEMA do cabeçalho STEP, ou null. */
export function sniffIfcSchema(headerText: string): string | null {
  const m = headerText.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i);
  return m ? m[1] : null;
}

/** Bytes de cabeçalho suficientes para achar o FILE_SCHEMA (header STEP é pequeno). */
const HEADER_SNIFF_BYTES = 64 * 1024;

function headerTextOf(input: Buffer | ArrayBuffer | string): string {
  if (typeof input === 'string') return input.slice(0, HEADER_SNIFF_BYTES);
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.subarray(0, Math.min(buf.length, HEADER_SNIFF_BYTES)).toString('latin1');
}

/**
 * Avalia se o conteúdo IFC usa um esquema que o pipeline processa.
 * Aceita o buffer inteiro ou só o começo do arquivo.
 */
export function assessIfcSchemaSupport(input: Buffer | ArrayBuffer | string): IfcSchemaAssessment {
  const header = headerTextOf(input);
  const schema = sniffIfcSchema(header);

  if (!schema) {
    return {
      schema: null,
      normalized: null,
      supported: false,
      reason: `Não foi possível identificar o esquema IFC (FILE_SCHEMA ausente no cabeçalho). ${REEXPORT_HINT}`,
    };
  }

  const normalized = normalizeIfcSchema(schema);
  if (!normalized) {
    return {
      schema,
      normalized: null,
      supported: false,
      reason: `Esquema IFC '${schema}' não é suportado (suportados: IFC2X3, IFC4, IFC4X3). ${REEXPORT_HINT}`,
    };
  }

  return { schema, normalized, supported: true };
}

/** Variante que lança UnsupportedIfcSchemaError (statusCode 422) se não suportado. */
export function assertIfcSchemaSupported(input: Buffer | ArrayBuffer | string): IfcSchemaAssessment {
  const assessment = assessIfcSchemaSupport(input);
  if (!assessment.supported) throw new UnsupportedIfcSchemaError(assessment);
  return assessment;
}
