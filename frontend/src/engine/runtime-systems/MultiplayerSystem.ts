import { EngineSystem } from '../EngineLoop';
import { MultiplayerSync } from '../../network';

/**
 * MultiplayerSystem - Sincronização multiplayer
 */
export class MultiplayerSystem implements EngineSystem {
  readonly name = 'MultiplayerSystem';
  enabled = false; // Habilitado quando multiplayer for ativado

  constructor(private multiplayerSync: MultiplayerSync | null) {}

  update(dt: number): void {
    if (this.multiplayerSync) {
      this.multiplayerSync.update(dt);
    }
  }

  dispose(): void {
    // MultiplayerSync tem seu próprio dispose
  }
}
