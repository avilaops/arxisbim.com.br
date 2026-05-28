import { EngineSystem } from '../core/EngineLoop';
import { appController } from '../../app/AppController';

/**
 * DebugSystemTick - Sistema de debug e HUD
 * Executado após render para atualizar overlays
 */
export class DebugSystemTick implements EngineSystem {
  readonly name = 'DebugSystemTick';
  enabled = true;

  private smoothedFPS: number = 60;
  private readonly smoothingFactor: number = 0.9;

  update(dt: number): void {
    // Calcula FPS com smoothing (EMA - Exponential Moving Average)
    const currentFPS = Math.round(1 / dt);
    this.smoothedFPS = this.smoothingFactor * this.smoothedFPS + (1 - this.smoothingFactor) * currentFPS;

    // Atualiza AppController
    appController.updateFPS(Math.round(this.smoothedFPS));

    // Atualiza HUD
    this.updateFPSDisplay(Math.round(this.smoothedFPS));
  }

  private updateFPSDisplay(fps: number): void {
    const fpsElement = document.getElementById('fps-counter');
    if (fpsElement) {
      fpsElement.textContent = `${fps} FPS`;
    }
  }

  dispose(): void {
    // Nada a fazer
  }
}
