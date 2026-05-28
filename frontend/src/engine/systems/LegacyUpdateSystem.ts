import { ISystem, EngineContext } from "../types";
import * as THREE from "three";

/**
 * LegacyUpdateSystem
 * Encapsula toda a lógica de update do loop antigo para migração gradual.
 * Será gradualmente desmembrado em systems especializados.
 */
export class LegacyUpdateSystem implements ISystem {
  name = "LegacyUpdateSystem";
  enabled = true;

  private legacyCallbacks: Array<(delta: number) => void> = [];
  private clock: THREE.Clock;

  constructor() {
    this.clock = new THREE.Clock();
  }

  /**
   * Registra um callback legacy para ser executado no update
   */
  registerCallback(callback: (delta: number) => void): void {
    this.legacyCallbacks.push(callback);
  }

  update(_ctx: EngineContext, dt: number): void {
    // Executa todos os callbacks registrados
    for (const callback of this.legacyCallbacks) {
      callback(dt);
    }
  }
}
