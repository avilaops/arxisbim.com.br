/**
 * Movement Controller
 * Controle de movimento 3D (WASD + QE)
 * Inspirado em jogos FPS como Counter-Strike
 */
import type { Vector3, InputState, PlayerState } from '../types/index.js';
export declare class MovementController {
    /**
     * Calcula movimento baseado no input e estado do jogador
     * @param inputState Estado dos inputs do teclado
     * @param playerState Estado atual do jogador
     * @param deltaTime Tempo decorrido desde último frame (em segundos)
     * @returns Nova velocidade do jogador
     */
    calculateMovement(inputState: Readonly<InputState>, playerState: Readonly<PlayerState>, deltaTime: number): Vector3;
    /**
     * Atualiza posição do jogador baseado na velocidade
     * @param position Posição atual
     * @param velocity Velocidade calculada
     * @param deltaTime Tempo decorrido (segundos)
     * @returns Nova posição
     */
    updatePosition(position: Readonly<Vector3>, velocity: Readonly<Vector3>, deltaTime: number): Vector3;
    /**
     * Aplica limites de movimento (bounds do cenário)
     * @param position Posição a ser limitada
     * @param bounds Limites do cenário
     * @returns Posição limitada
     */
    applyBounds(position: Vector3, bounds?: {
        minX?: number;
        maxX?: number;
        minY?: number;
        maxY?: number;
        minZ?: number;
        maxZ?: number;
    }): Vector3;
    /**
     * Limita valor entre min e max
     */
    private clamp;
    /**
     * Calcula velocidade de movimento suave (smooth movement)
     * Aplica interpolação para movimento mais fluido
     */
    smoothMovement(currentVelocity: Vector3, targetVelocity: Vector3, smoothFactor?: number): Vector3;
    /**
     * Interpolação linear
     */
    private lerp;
}
//# sourceMappingURL=movement-controller.d.ts.map