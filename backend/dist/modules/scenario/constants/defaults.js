/**
 * Default Constants
 * Valores padrão para configuração do cenário
 */
/**
 * Posição inicial padrão (origem)
 */
export const DEFAULT_POSITION = {
    x: 0,
    y: 1.7, // Altura dos olhos humanos (~1.70m)
    z: 0,
};
/**
 * Rotação inicial padrão (olhando para frente)
 */
export const DEFAULT_ROTATION = {
    pitch: 0,
    yaw: 0,
    roll: 0,
};
/**
 * Limites de pitch da câmera (evita gimbal lock)
 */
export const PITCH_LIMITS = {
    MIN: -89,
    MAX: 89,
};
/**
 * Velocidades padrão
 */
export const DEFAULT_SPEEDS = {
    MOVEMENT: 5, // 5 unidades/segundo
    ROTATION: 90, // 90 graus/segundo
    VERTICAL: 5, // 5 unidades/segundo (Q/E)
    CROUCH_MULTIPLIER: 0.5, // 50% da velocidade
    SPRINT_MULTIPLIER: 2.0, // 200% da velocidade
};
/**
 * Configuração padrão do minimapa
 */
export const DEFAULT_MINIMAP_CONFIG = {
    width: 200,
    height: 200,
    position: 'top-left',
    zoom: 1,
    showPlayerDirection: true,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#ffffff',
};
/**
 * Configuração padrão do cenário
 */
export const DEFAULT_SCENARIO_CONFIG = {
    initialPosition: DEFAULT_POSITION,
    initialRotation: DEFAULT_ROTATION,
    movementSpeed: DEFAULT_SPEEDS.MOVEMENT,
    rotationSpeed: DEFAULT_SPEEDS.ROTATION,
    crouchMultiplier: DEFAULT_SPEEDS.CROUCH_MULTIPLIER,
    sprintMultiplier: DEFAULT_SPEEDS.SPRINT_MULTIPLIER,
    verticalSpeed: DEFAULT_SPEEDS.VERTICAL,
    enableMinimap: true,
    minimapConfig: DEFAULT_MINIMAP_CONFIG,
};
/**
 * Mapeamento de teclas para ações
 */
export const KEY_BINDINGS = {
    // Movimento
    FORWARD: 'KeyW',
    BACKWARD: 'KeyS',
    LEFT: 'KeyA',
    RIGHT: 'KeyD',
    UP: 'KeyQ',
    DOWN: 'KeyE',
    // Modificadores
    CROUCH: ['ControlLeft', 'ControlRight'],
    SPRINT: ['ShiftLeft', 'ShiftRight'],
    // Rotação de câmera
    ROTATE_UP: 'ArrowUp',
    ROTATE_DOWN: 'ArrowDown',
    ROTATE_LEFT: 'ArrowLeft',
    ROTATE_RIGHT: 'ArrowRight',
};
/**
 * Taxa de atualização recomendada (FPS)
 */
export const RECOMMENDED_FPS = {
    TARGET: 60,
    DELTA_TIME: 1 / 60, // ~0.0166 segundos
};
/**
 * Limites de velocidade
 */
export const VELOCITY_LIMITS = {
    MIN_SPEED: 0.1,
    MAX_SPEED: 100,
    MIN_ROTATION: 1,
    MAX_ROTATION: 360,
};
/**
 * Paginação padrão
 */
export const DEFAULT_PAGINATION = {
    LIMIT: 10,
    MAX_LIMIT: 100,
    OFFSET: 0,
};
//# sourceMappingURL=defaults.js.map