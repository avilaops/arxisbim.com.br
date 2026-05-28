/**
 * Default Constants
 * Valores padrão para configuração do cenário
 */
import type { Vector3, Rotation, MinimapConfig, ScenarioConfig } from '../types/index.js';
/**
 * Posição inicial padrão (origem)
 */
export declare const DEFAULT_POSITION: Vector3;
/**
 * Rotação inicial padrão (olhando para frente)
 */
export declare const DEFAULT_ROTATION: Rotation;
/**
 * Limites de pitch da câmera (evita gimbal lock)
 */
export declare const PITCH_LIMITS: {
    MIN: number;
    MAX: number;
};
/**
 * Velocidades padrão
 */
export declare const DEFAULT_SPEEDS: {
    MOVEMENT: number;
    ROTATION: number;
    VERTICAL: number;
    CROUCH_MULTIPLIER: number;
    SPRINT_MULTIPLIER: number;
};
/**
 * Configuração padrão do minimapa
 */
export declare const DEFAULT_MINIMAP_CONFIG: MinimapConfig;
/**
 * Configuração padrão do cenário
 */
export declare const DEFAULT_SCENARIO_CONFIG: ScenarioConfig;
/**
 * Mapeamento de teclas para ações
 */
export declare const KEY_BINDINGS: {
    readonly FORWARD: "KeyW";
    readonly BACKWARD: "KeyS";
    readonly LEFT: "KeyA";
    readonly RIGHT: "KeyD";
    readonly UP: "KeyQ";
    readonly DOWN: "KeyE";
    readonly CROUCH: readonly ["ControlLeft", "ControlRight"];
    readonly SPRINT: readonly ["ShiftLeft", "ShiftRight"];
    readonly ROTATE_UP: "ArrowUp";
    readonly ROTATE_DOWN: "ArrowDown";
    readonly ROTATE_LEFT: "ArrowLeft";
    readonly ROTATE_RIGHT: "ArrowRight";
};
/**
 * Taxa de atualização recomendada (FPS)
 */
export declare const RECOMMENDED_FPS: {
    TARGET: number;
    DELTA_TIME: number;
};
/**
 * Limites de velocidade
 */
export declare const VELOCITY_LIMITS: {
    MIN_SPEED: number;
    MAX_SPEED: number;
    MIN_ROTATION: number;
    MAX_ROTATION: number;
};
/**
 * Paginação padrão
 */
export declare const DEFAULT_PAGINATION: {
    LIMIT: number;
    MAX_LIMIT: number;
    OFFSET: number;
};
//# sourceMappingURL=defaults.d.ts.map