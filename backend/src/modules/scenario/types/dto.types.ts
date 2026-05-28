/**
 * Data Transfer Objects (DTOs)
 * Tipos para comunicação com API REST
 */

import type { Vector3, Rotation, ScenarioConfig } from './domain.types.js';

/**
 * DTO para criar cenário
 */
export interface CreateScenarioDTO {
  projectId: string;
  name: string;
  description?: string;
  config?: Partial<ScenarioConfig>;
}

/**
 * DTO para atualizar cenário
 */
export interface UpdateScenarioDTO {
  name?: string;
  description?: string;
  config?: Partial<ScenarioConfig>;
}

/**
 * DTO para teleporte
 */
export interface TeleportDTO {
  x: number;
  y: number;
  z: number;
}

/**
 * DTO para atualização de posição
 */
export interface PositionUpdateDTO {
  position?: Vector3;
  rotation?: Rotation;
}

/**
 * DTO para evento de input
 */
export interface InputEventDTO {
  type: 'keydown' | 'keyup';
  keyCode: string;
  timestamp?: number;
}

/**
 * DTO para query de cenários
 */
export interface ScenarioQueryDTO {
  projectId?: string;
  limit?: number;
  offset?: number;
}

/**
 * DTO de resposta de cenário
 */
export interface ScenarioResponseDTO {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  camera: {
    position: Vector3;
    rotation: Rotation;
    fov: number;
  };
  player: {
    position: Vector3;
    rotation: Rotation;
    velocity: Vector3;
    isCrouching: boolean;
    isSprinting: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO de resposta paginada
 */
export interface PaginatedResponseDTO<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * DTO de erro
 */
export interface ErrorResponseDTO {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * DTO de sucesso
 */
export interface SuccessResponseDTO<T> {
  success: true;
  data: T;
}
