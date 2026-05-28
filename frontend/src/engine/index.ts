/**
 * Engine Layer - Barrel Export
 * Camada de renderização e simulação 3D
 */

// Engine Core (NEW ARCHITECTURE - FASE 5)
export { EngineLoop } from "./EngineLoop";
export type { EngineSystem } from "./EngineLoop";

// ECS
export * from "./ecs";

// Runtime Systems
export * from "./runtime-systems";

// Legacy Engine Core (mantido para compatibilidade)
export { Engine } from "./Engine";
export { Time } from "./Time";
export type { ISystem, EngineContext, SystemPhase } from "./types";

// Systems
export * from "./systems";

// Existing modules
export * from './Renderer';
export * from './SceneManager';
export * from './CameraSystem';
export * from './InputSystem';

