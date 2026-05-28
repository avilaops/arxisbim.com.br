/**
 * Camera Controller
 * Controle de rotação da câmera (Arrow Keys)
 */

import type { Rotation, InputState } from '../types/index.js';
import { PITCH_LIMITS } from '../constants/defaults.js';

export class CameraController {
  /**
   * Atualiza rotação da câmera baseado nos inputs
   * @param currentRotation Rotação atual da câmera
   * @param inputState Estado dos inputs
   * @param rotationSpeed Velocidade de rotação (graus por segundo)
   * @param deltaTime Tempo decorrido (segundos)
   * @returns Nova rotação
   */
  updateRotation(
    currentRotation: Readonly<Rotation>,
    inputState: Readonly<InputState>,
    rotationSpeed: number,
    deltaTime: number
  ): Rotation {
    const rotation: Rotation = { ...currentRotation };
    const rotationDelta = rotationSpeed * deltaTime;

    // Rotação vertical (Pitch) - Setas para cima/baixo
    if (inputState.rotateUp) {
      rotation.pitch += rotationDelta;
    }
    
    if (inputState.rotateDown) {
      rotation.pitch -= rotationDelta;
    }

    // Rotação horizontal (Yaw) - Setas para esquerda/direita
    if (inputState.rotateLeft) {
      rotation.yaw -= rotationDelta;
    }
    
    if (inputState.rotateRight) {
      rotation.yaw += rotationDelta;
    }

    // Aplicar limites
    return this.applyRotationLimits(rotation);
  }

  /**
   * Aplica limites de rotação para evitar valores inválidos
   * Pitch: -90° a +90° (não pode virar de cabeça para baixo completamente)
   * Yaw: -180° a +180° (normaliza valores)
   */
  private applyRotationLimits(rotation: Rotation): Rotation {
    return {
      pitch: this.clamp(rotation.pitch, -89, 89), // Limite vertical
      yaw: this.normalizeAngle(rotation.yaw),      // Normaliza horizontal
      roll: rotation.roll, // Roll geralmente não é usado em FPS
    };
  }

  /**
   * Normaliza ângulo para ficar entre -180 e +180 graus
   */
  private normalizeAngle(angle: number): number {
    angle = angle % 360;
    
    if (angle > 180) {
      angle -= 360;
    } else if (angle < -180) {
      angle += 360;
    }
    
    return angle;
  }

  /**
   * Limita valor entre min e max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Converte rotação para quaternion (útil para renderização 3D)
   */
  toQuaternion(rotation: Rotation): {
    x: number;
    y: number;
    z: number;
    w: number;
  } {
    const pitch = (rotation.pitch * Math.PI) / 180;
    const yaw = (rotation.yaw * Math.PI) / 180;
    const roll = (rotation.roll * Math.PI) / 180;

    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);

    return {
      w: cr * cp * cy + sr * sp * sy,
      x: sr * cp * cy - cr * sp * sy,
      y: cr * sp * cy + sr * cp * sy,
      z: cr * cp * sy - sr * sp * cy,
    };
  }

  /**
   * Converte rotação para vetor de direção (forward vector)
   */
  getForwardVector(rotation: Rotation): { x: number; y: number; z: number } {
    const pitchRad = (rotation.pitch * Math.PI) / 180;
    const yawRad = (rotation.yaw * Math.PI) / 180;

    return {
      x: Math.sin(yawRad) * Math.cos(pitchRad),
      y: -Math.sin(pitchRad),
      z: Math.cos(yawRad) * Math.cos(pitchRad),
    };
  }

  /**
   * Interpolação suave de rotação (smooth camera)
   */
  smoothRotation(
    current: Rotation,
    target: Rotation,
    smoothFactor: number = 0.1
  ): Rotation {
    return {
      pitch: this.lerp(current.pitch, target.pitch, smoothFactor),
      yaw: this.lerpAngle(current.yaw, target.yaw, smoothFactor),
      roll: this.lerp(current.roll, target.roll, smoothFactor),
    };
  }

  /**
   * Interpolação linear
   */
  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  /**
   * Interpolação linear para ângulos (considera wrap-around em 360°)
   */
  private lerpAngle(start: number, end: number, factor: number): number {
    let diff = end - start;
    
    // Pega o caminho mais curto
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }
    
    return this.normalizeAngle(start + diff * factor);
  }
}
