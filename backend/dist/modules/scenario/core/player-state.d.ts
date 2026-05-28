/**
 * Player State Manager
 * Gerencia estado completo do jogador no cenário 3D
 */
import type { PlayerState, Vector3, Rotation, ScenarioConfig } from '../types/index.js';
export declare class PlayerStateManager {
    /**
     * Cria estado inicial do jogador
     */
    createInitialState(config: ScenarioConfig): PlayerState;
    /**
     * Atualiza posição do jogador
     */
    updatePosition(state: PlayerState, newPosition: Vector3): PlayerState;
    /**
     * Atualiza rotação do jogador
     */
    updateRotation(state: PlayerState, newRotation: Rotation): PlayerState;
    /**
     * Atualiza velocidade do jogador
     */
    updateVelocity(state: PlayerState, newVelocity: Vector3): PlayerState;
    /**
     * Define modo agachado
     */
    setCrouching(state: PlayerState, isCrouching: boolean): PlayerState;
    /**
     * Define modo sprint
     */
    setSprinting(state: PlayerState, isSprinting: boolean): PlayerState;
    /**
     * Atualiza múltiplos campos de uma vez
     */
    update(state: PlayerState, updates: Partial<PlayerState>): PlayerState;
    /**
     * Calcula distância percorrida
     */
    calculateDistance(from: Vector3, to: Vector3): number;
    /**
     * Verifica se o jogador está se movendo
     */
    isMoving(state: PlayerState): boolean;
    /**
     * Serializa estado para envio via WebSocket
     */
    serialize(state: PlayerState): string;
    /**
     * Deserializa estado recebido via WebSocket
     */
    deserialize(data: string, currentState: PlayerState): PlayerState;
    /**
     * Clona estado do jogador
     */
    clone(state: PlayerState): PlayerState;
}
//# sourceMappingURL=player-state.d.ts.map