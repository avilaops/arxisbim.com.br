/**
 * Tipos do pipeline IFC (S11). ModelStatus (negócio) ≠ ProcessingStage (técnico).
 */

/** Etapa técnica do pipeline. */
export type ProcessingStage =
  | 'download'
  | 'parse_structure'
  | 'parse_geometry'
  | 'serialize_glb'
  | 'upload_glb'
  | 'update_db';

export const PROCESSING_STAGES: ProcessingStage[] = [
  'download', 'parse_structure', 'parse_geometry', 'serialize_glb', 'upload_glb', 'update_db',
];

/** Status de negócio do modelo (exposto ao usuário). */
export type ModelStatus = 'draft' | 'queued' | 'processing' | 'ready' | 'failed';

/** Timeouts por etapa (spec S11). */
export const STAGE_TIMEOUT_MS: Record<ProcessingStage, number> = {
  download: 120_000,
  parse_structure: 120_000,
  parse_geometry: 300_000,
  serialize_glb: 120_000,
  upload_glb: 120_000,
  update_db: 30_000,
};
