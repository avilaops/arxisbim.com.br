/**
 * Input Handler
 * Gerenciamento de inputs do teclado para navegação 3D
 */

import type { InputState } from '../types/index.js';
import { KEY_BINDINGS } from '../constants/defaults.js';

export class InputHandler {
  private inputState: InputState = {
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

  private keyMap = {
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
  } as const;

  /**
   * Processa evento de tecla pressionada
   */
  handleKeyDown(keyCode: string): void {
    const action = this.keyMap[keyCode as keyof typeof this.keyMap];
    if (action) {
      this.inputState[action as keyof InputState] = true;
    }
  }

  /**
   * Processa evento de tecla solta
   */
  handleKeyUp(keyCode: string): void {
    const action = this.keyMap[keyCode as keyof typeof this.keyMap];
    if (action) {
      this.inputState[action as keyof InputState] = false;
    }
  }

  /**
   * Retorna estado atual dos inputs
   */
  getInputState(): Readonly<InputState> {
    return { ...this.inputState };
  }

  /**
   * Verifica se alguma tecla de movimento está pressionada
   */
  isMoving(): boolean {
    return (
      this.inputState.forward ||
      this.inputState.backward ||
      this.inputState.left ||
      this.inputState.right ||
      this.inputState.up ||
      this.inputState.down
    );
  }

  /**
   * Verifica se alguma tecla de rotação está pressionada
   */
  isRotating(): boolean {
    return (
      this.inputState.rotateUp ||
      this.inputState.rotateDown ||
      this.inputState.rotateLeft ||
      this.inputState.rotateRight
    );
  }

  /**
   * Reseta todos os inputs
   */
  reset(): void {
    Object.keys(this.inputState).forEach((key) => {
      this.inputState[key as keyof InputState] = false;
    });
  }

  /**
   * Processa múltiplos eventos de input de uma vez
   * Útil para sincronização via WebSocket
   */
  processInputBatch(inputs: Partial<InputState>): void {
    Object.assign(this.inputState, inputs);
  }
}
