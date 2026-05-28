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
  pitch: number; // Rotação vertical (cima/baixo) - limitado a -89/+89
  yaw: number;   // Rotação horizontal (esquerda/direita) - 0 a 360
  roll: number;  // Rotação no eixo Z (raramente usado em FPS)
}

/**
 * Estado da câmera
 */
export interface CameraState {
  position: Vector3;
  rotation: Rotation;
  fov: number; // Field of View em graus
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
  // Movement keys (WASD + QE)
  forward: boolean;    // W
  backward: boolean;   // S
  left: boolean;       // A
  right: boolean;      // D
  up: boolean;         // Q (subir eixo Y)
  down: boolean;       // E (descer eixo Y)
  
  // Modifiers
  crouch: boolean;     // Ctrl
  sprint: boolean;     // Shift
  
  // Camera rotation (Arrow keys)
  rotateUp: boolean;   // Arrow Up
  rotateDown: boolean; // Arrow Down
  rotateLeft: boolean; // Arrow Left
  rotateRight: boolean; // Arrow Right
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
  playerRotation: number; // Yaw only
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
  movementSpeed: number;      // Unidades por segundo
  rotationSpeed: number;      // Graus por segundo
  crouchMultiplier: number;   // 0.5 = 50% da velocidade
  sprintMultiplier: number;   // 2.0 = 200% da velocidade
  verticalSpeed: number;      // Velocidade Q/E
  enableMinimap: boolean;
  minimapConfig: MinimapConfig;
}
