/**
 * Input Handler
 * Gerenciamento de inputs do teclado para navegação 3D
 */
import type { InputState } from '../types/index.js';
export declare class InputHandler {
    private inputState;
    private keyMap;
    /**
     * Processa evento de tecla pressionada
     */
    handleKeyDown(keyCode: string): void;
    /**
     * Processa evento de tecla solta
     */
    handleKeyUp(keyCode: string): void;
    /**
     * Retorna estado atual dos inputs
     */
    getInputState(): Readonly<InputState>;
    /**
     * Verifica se alguma tecla de movimento está pressionada
     */
    isMoving(): boolean;
    /**
     * Verifica se alguma tecla de rotação está pressionada
     */
    isRotating(): boolean;
    /**
     * Reseta todos os inputs
     */
    reset(): void;
    /**
     * Processa múltiplos eventos de input de uma vez
     * Útil para sincronização via WebSocket
     */
    processInputBatch(inputs: Partial<InputState>): void;
}
//# sourceMappingURL=input-handler.d.ts.map