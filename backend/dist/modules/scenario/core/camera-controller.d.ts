/**
 * Camera Controller
 * Controle de rotação da câmera (Arrow Keys)
 */
import type { Rotation, InputState } from '../types/index.js';
export declare class CameraController {
    /**
     * Atualiza rotação da câmera baseado nos inputs
     * @param currentRotation Rotação atual da câmera
     * @param inputState Estado dos inputs
     * @param rotationSpeed Velocidade de rotação (graus por segundo)
     * @param deltaTime Tempo decorrido (segundos)
     * @returns Nova rotação
     */
    updateRotation(currentRotation: Readonly<Rotation>, inputState: Readonly<InputState>, rotationSpeed: number, deltaTime: number): Rotation;
    /**
     * Aplica limites de rotação para evitar valores inválidos
     * Pitch: -90° a +90° (não pode virar de cabeça para baixo completamente)
     * Yaw: -180° a +180° (normaliza valores)
     */
    private applyRotationLimits;
    /**
     * Normaliza ângulo para ficar entre -180 e +180 graus
     */
    private normalizeAngle;
    /**
     * Limita valor entre min e max
     */
    private clamp;
    /**
     * Converte rotação para quaternion (útil para renderização 3D)
     */
    toQuaternion(rotation: Rotation): {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    /**
     * Converte rotação para vetor de direção (forward vector)
     */
    getForwardVector(rotation: Rotation): {
        x: number;
        y: number;
        z: number;
    };
    /**
     * Interpolação suave de rotação (smooth camera)
     */
    smoothRotation(current: Rotation, target: Rotation, smoothFactor?: number): Rotation;
    /**
     * Interpolação linear
     */
    private lerp;
    /**
     * Interpolação linear para ângulos (considera wrap-around em 360°)
     */
    private lerpAngle;
}
//# sourceMappingURL=camera-controller.d.ts.map