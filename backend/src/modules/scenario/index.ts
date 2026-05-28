/**
 * Scenario Module Index
 * Exporta todos os componentes do módulo de cenário
 */

// Core Controllers
export {
  InputHandler,
  MovementController,
  CameraController,
  PlayerStateManager,
} from './core/index.js';

// Rendering
export { MinimapSystem } from './rendering/index.js';

// Service
export { ScenarioService } from './scenario.service.js';

// API
export {
  ScenarioController,
  scenarioRoutes,
} from './api/index.js';

// Schemas (Zod validators)
export * from './api/scenario.schemas.js';

// Types
export type * from './types/index.js';

// Constants
export * from './constants/index.js';
