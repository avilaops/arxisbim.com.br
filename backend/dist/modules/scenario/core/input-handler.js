/**
 * Input Handler
 * Gerenciamento de inputs do teclado para navegação 3D
 */
export class InputHandler {
    inputState = {
        // Movement (WASD + QE)
        forward: false,
        backward: false,
        left: false,
        right: false,
        up: false,
        down: false,
        // Modifiers
        crouch: false,
        sprint: false,
        // Camera rotation (Arrow keys)
        rotateUp: false,
        rotateDown: false,
        rotateLeft: false,
        rotateRight: false,
    };
    keyMap = {
        // Movement keys
        'KeyW': 'forward',
        'KeyS': 'backward',
        'KeyA': 'left',
        'KeyD': 'right',
        'KeyQ': 'up',
        'KeyE': 'down',
        // Modifiers
        'ControlLeft': 'crouch',
        'ControlRight': 'crouch',
        'ShiftLeft': 'sprint',
        'ShiftRight': 'sprint',
        // Arrow keys for camera rotation
        'ArrowUp': 'rotateUp',
        'ArrowDown': 'rotateDown',
        'ArrowLeft': 'rotateLeft',
        'ArrowRight': 'rotateRight',
    };
    /**
     * Processa evento de tecla pressionada
     */
    handleKeyDown(keyCode) {
        const action = this.keyMap[keyCode];
        if (action) {
            this.inputState[action] = true;
        }
    }
    /**
     * Processa evento de tecla solta
     */
    handleKeyUp(keyCode) {
        const action = this.keyMap[keyCode];
        if (action) {
            this.inputState[action] = false;
        }
    }
    /**
     * Retorna estado atual dos inputs
     */
    getInputState() {
        return { ...this.inputState };
    }
    /**
     * Verifica se alguma tecla de movimento está pressionada
     */
    isMoving() {
        return (this.inputState.forward ||
            this.inputState.backward ||
            this.inputState.left ||
            this.inputState.right ||
            this.inputState.up ||
            this.inputState.down);
    }
    /**
     * Verifica se alguma tecla de rotação está pressionada
     */
    isRotating() {
        return (this.inputState.rotateUp ||
            this.inputState.rotateDown ||
            this.inputState.rotateLeft ||
            this.inputState.rotateRight);
    }
    /**
     * Reseta todos os inputs
     */
    reset() {
        Object.keys(this.inputState).forEach((key) => {
            this.inputState[key] = false;
        });
    }
    /**
     * Processa múltiplos eventos de input de uma vez
     * Útil para sincronização via WebSocket
     */
    processInputBatch(inputs) {
        Object.assign(this.inputState, inputs);
    }
}
//# sourceMappingURL=input-handler.js.map