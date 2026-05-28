/**
 * BIM 4D - Temporal Planning & Schedule Visualization
 * 
 * Sistema completo de visualização de cronogramas 4D:
 * - Importação de cronogramas (CSV, JSON, MS Project, Primavera P6)
 * - Vinculação tarefa ↔ elemento IFC
 * - Simulação temporal de construção (timeline)
 * - Controle de playback (play, pause, seek)
 * - Gerenciamento de visibilidade baseado em cronograma
 * 
 * @module bim/4d
 * @see {@link https://docs.arxisvr.com/bim-4d}
 */

// Types
export * from './types';

// Core Components
export { ScheduleManager } from './ScheduleManager';
export { TimelineController } from './TimelineController';
export { VisibilityManager } from './VisibilityManager';

// Controlled fixtures
export { CONTROLLED_BIM4D_SCHEDULE, cloneControlledBIM4DSchedule } from './fixtures/controlledSchedule';
export { BIM4DIntegration as BIM4DManager } from './BIM4DIntegration';
