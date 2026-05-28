/**
 * Domain Types
 * Tipos de domínio do sistema de navegação 3D
 */
/**
 * Vetor 3D (posição, velocidade, direção)
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
/**
 * Rotação 3D (Euler angles)
 */
export interface Rotation {
    pitch: number;
    yaw: number;
    roll: number;
}
/**
 * Estado da câmera
 */
export interface CameraState {
    position: Vector3;
    rotation: Rotation;
    fov: number;
}
/**
 * Estado completo do jogador
 */
export interface PlayerState {
    position: Vector3;
    rotation: Rotation;
    velocity: Vector3;
    isCrouching: boolean;
    isSprinting: boolean;
    movementSpeed: number;
    rotationSpeed: number;
    crouchMultiplier: number;
    sprintMultiplier: number;
}
/**
 * Estado de inputs do teclado
 */
export interface InputState {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    crouch: boolean;
    sprint: boolean;
    rotateUp: boolean;
    rotateDown: boolean;
    rotateLeft: boolean;
    rotateRight: boolean;
}
/**
 * Estado completo do cenário
 */
export interface ScenarioState {
    id: string;
    projectId: string;
    tenantId?: string;
    createdBy?: string;
    name: string;
    description?: string;
    camera: CameraState;
    player: PlayerState;
    config: ScenarioConfig;
    createdAt: string;
    updatedAt: string;
}
/**
 * Atualização parcial de cenário
 */
export interface ScenarioUpdate {
    position?: Vector3;
    rotation?: Rotation;
    velocity?: Vector3;
    isCrouching?: boolean;
    isSprinting?: boolean;
}
/**
 * Dados do minimapa
 */
export interface MinimapData {
    playerPosition: Vector3;
    playerRotation: number;
    bounds: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
    };
    markers?: MinimapMarker[];
}
/**
 * Marcador no minimapa
 */
export interface MinimapMarker {
    position: Vector3;
    label: string;
    color: string;
}
/**
 * Configuração do minimapa
 */
export interface MinimapConfig {
    width: number;
    height: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    zoom: number;
    showPlayerDirection: boolean;
    backgroundColor: string;
    borderColor: string;
}
/**
 * Configuração do cenário
 */
export interface ScenarioConfig {
    initialPosition: Vector3;
    initialRotation: Rotation;
    movementSpeed: number;
    rotationSpeed: number;
    crouchMultiplier: number;
    sprintMultiplier: number;
    verticalSpeed: number;
    enableMinimap: boolean;
    minimapConfig: MinimapConfig;
}
//# sourceMappingURL=domain.types.d.ts.map