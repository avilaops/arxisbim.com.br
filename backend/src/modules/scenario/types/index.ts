/**
 * Types Index
 * Exporta todos os tipos do módulo
 */

// Domain types
export type {
  Vector3,
  Rotation,
  CameraState,
  PlayerState,
  InputState,
  ScenarioState,
  ScenarioUpdate,
  MinimapData,
  MinimapMarker,
  MinimapConfig,
  ScenarioConfig,
} from './domain.types.js';

// DTO types
export type {
  CreateScenarioDTO,
  UpdateScenarioDTO,
  TeleportDTO,
  PositionUpdateDTO,
  InputEventDTO,
  ScenarioQueryDTO,
  ScenarioResponseDTO,
  PaginatedResponseDTO,
  ErrorResponseDTO,
  SuccessResponseDTO,
} from './dto.types.js';
