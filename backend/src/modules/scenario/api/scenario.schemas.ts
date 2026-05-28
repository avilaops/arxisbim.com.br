/**
 * Scenario Schemas
 * Schemas Zod para validação de dados do módulo de cenário
 */

import { z } from 'zod';
import { DEFAULT_SCENARIO_CONFIG, DEFAULT_PAGINATION, VELOCITY_LIMITS } from '../constants/defaults.js';

// Vector3 Schema
export const vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// Rotation Schema
export const rotationSchema = z.object({
  pitch: z.number().min(-90).max(90),
  yaw: z.number(),
  roll: z.number(),
});

// Minimap Config Schema
export const minimapConfigSchema = z.object({
  width: z.number().min(100).max(500).default(200),
  height: z.number().min(100).max(500).default(200),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).default('top-left'),
  zoom: z.number().min(0.1).max(10).default(1),
  showPlayerDirection: z.boolean().default(true),
  backgroundColor: z.string().default('rgba(0, 0, 0, 0.7)'),
  borderColor: z.string().default('#ffffff'),
});

// Scenario Config Schema
export const scenarioConfigSchema = z.object({
  initialPosition: vector3Schema.default({ x: 0, y: 0, z: 0 }),
  initialRotation: rotationSchema.default({ pitch: 0, yaw: 0, roll: 0 }),
  movementSpeed: z.number().min(0.1).max(100).default(5), // Unidades/segundo
  rotationSpeed: z.number().min(1).max(360).default(90), // Graus/segundo
  crouchMultiplier: z.number().min(0.1).max(1).default(0.5),
  sprintMultiplier: z.number().min(1).max(5).default(2),
  verticalSpeed: z.number().min(0.1).max(100).default(5),
  enableMinimap: z.boolean().default(true),
  minimapConfig: minimapConfigSchema.default({
    width: 200,
    height: 200,
    position: 'bottom-right',
    zoom: 1,
    showPlayerDirection: true,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: '#ffffff',
  }),
});

// Create Scenario Schema
export const createScenarioSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  presetId: z.string().max(80).optional(),
  config: scenarioConfigSchema.default({
    initialPosition: { x: 0, y: 0, z: 0 },
    initialRotation: { pitch: 0, yaw: 0, roll: 0 },
    movementSpeed: 5,
    rotationSpeed: 90,
    crouchMultiplier: 0.5,
    sprintMultiplier: 2,
    verticalSpeed: 5,
    enableMinimap: true,
    minimapConfig: {
      width: 200,
      height: 200,
      position: 'bottom-right',
      zoom: 1,
      showPlayerDirection: true,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderColor: '#ffffff',
    },
  }),
});

// Update Scenario Schema
export const updateScenarioSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  config: scenarioConfigSchema.partial().optional(),
});

// Input Event Schema (para WebSocket)
export const inputEventSchema = z.object({
  type: z.enum(['keydown', 'keyup']),
  keyCode: z.string(),
  timestamp: z.number().optional(),
});

// Position Update Schema
export const positionUpdateSchema = z.object({
  position: vector3Schema.optional(),
  rotation: rotationSchema.optional(),
});

// Teleport Schema
export const teleportSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// Scenario Query Schema
export const scenarioQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
});

// Export types
export type CreateScenarioInput = z.infer<typeof createScenarioSchema>;
export type UpdateScenarioInput = z.infer<typeof updateScenarioSchema>;
export type InputEventInput = z.infer<typeof inputEventSchema>;
export type PositionUpdateInput = z.infer<typeof positionUpdateSchema>;
export type TeleportInput = z.infer<typeof teleportSchema>;
export type ScenarioQueryInput = z.infer<typeof scenarioQuerySchema>;
