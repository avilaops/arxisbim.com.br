/**
 * Player State Manager
 * Gerencia estado completo do jogador no cenário 3D
 */

import type { PlayerState, Vector3, Rotation, ScenarioConfig } from '../types/index.js';
import { DEFAULT_POSITION, DEFAULT_ROTATION, DEFAULT_SPEEDS } from '../constants/defaults.js';

export class PlayerStateManager {
  /**
   * Cria estado inicial do jogador
   */
  createInitialState(config: ScenarioConfig): PlayerState {
    return {
      position: { ...config.initialPosition },
      rotation: { ...config.initialRotation },
      velocity: { x: 0, y: 0, z: 0 },
      isCrouching: false,
      isSprinting: false,
      movementSpeed: config.movementSpeed,
      rotationSpeed: config.rotationSpeed,
      crouchMultiplier: config.crouchMultiplier,
      sprintMultiplier: config.sprintMultiplier,
    };
  }

  /**
   * Atualiza posição do jogador
   */
  updatePosition(state: PlayerState, newPosition: Vector3): PlayerState {
    return {
      ...state,
      position: { ...newPosition },
    };
  }

  /**
   * Atualiza rotação do jogador
   */
  updateRotation(state: PlayerState, newRotation: Rotation): PlayerState {
    return {
      ...state,
      rotation: { ...newRotation },
    };
  }

  /**
   * Atualiza velocidade do jogador
   */
  updateVelocity(state: PlayerState, newVelocity: Vector3): PlayerState {
    return {
      ...state,
      velocity: { ...newVelocity },
    };
  }

  /**
   * Define modo agachado
   */
  setCrouching(state: PlayerState, isCrouching: boolean): PlayerState {
    return {
      ...state,
      isCrouching,
    };
  }

  /**
   * Define modo sprint
   */
  setSprinting(state: PlayerState, isSprinting: boolean): PlayerState {
    return {
      ...state,
      isSprinting,
    };
  }

  /**
   * Atualiza múltiplos campos de uma vez
   */
  update(state: PlayerState, updates: Partial<PlayerState>): PlayerState {
    return {
      ...state,
      ...updates,
    };
  }

  /**
   * Calcula distância percorrida
   */
  calculateDistance(from: Vector3, to: Vector3): number {
    return Math.sqrt(
      Math.pow(to.x - from.x, 2) +
      Math.pow(to.y - from.y, 2) +
      Math.pow(to.z - from.z, 2)
    );
  }

  /**
   * Verifica se o jogador está se movendo
   */
  isMoving(state: PlayerState): boolean {
    const threshold = 0.01; // Threshold para considerar parado
    return (
      Math.abs(state.velocity.x) > threshold ||
      Math.abs(state.velocity.y) > threshold ||
      Math.abs(state.velocity.z) > threshold
    );
  }

  /**
   * Serializa estado para envio via WebSocket
   */
  serialize(state: PlayerState): string {
    return JSON.stringify({
      pos: [state.position.x, state.position.y, state.position.z],
      rot: [state.rotation.pitch, state.rotation.yaw, state.rotation.roll],
      vel: [state.velocity.x, state.velocity.y, state.velocity.z],
      flags: (state.isCrouching ? 1 : 0) | (state.isSprinting ? 2 : 0),
    });
  }

  /**
   * Deserializa estado recebido via WebSocket
   */
  deserialize(data: string, currentState: PlayerState): PlayerState {
    try {
      const parsed = JSON.parse(data);
      return {
        ...currentState,
        position: {
          x: parsed.pos[0],
          y: parsed.pos[1],
          z: parsed.pos[2],
        },
        rotation: {
          pitch: parsed.rot[0],
          yaw: parsed.rot[1],
          roll: parsed.rot[2],
        },
        velocity: {
          x: parsed.vel[0],
          y: parsed.vel[1],
          z: parsed.vel[2],
        },
        isCrouching: (parsed.flags & 1) !== 0,
        isSprinting: (parsed.flags & 2) !== 0,
      };
    } catch {
      return currentState;
    }
  }

  /**
   * Clona estado do jogador
   */
  clone(state: PlayerState): PlayerState {
    return {
      position: { ...state.position },
      rotation: { ...state.rotation },
      velocity: { ...state.velocity },
      isCrouching: state.isCrouching,
      isSprinting: state.isSprinting,
      movementSpeed: state.movementSpeed,
      rotationSpeed: state.rotationSpeed,
      crouchMultiplier: state.crouchMultiplier,
      sprintMultiplier: state.sprintMultiplier,
    };
  }
}
