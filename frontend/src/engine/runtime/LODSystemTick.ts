import { EngineSystem } from '../core/EngineLoop';
import { LODSystem } from '../../systems/LODSystem';

/**
 * LODSystemTick - Atualiza sistema de Level of Detail
 */
export class LODSystemTick implements EngineSystem {
  readonly name = 'LODSystemTick';
  enabled = true;

  constructor(private lodSystem: LODSystem) {}

  update(_dt: number): void {
    this.lodSystem.update();
  }

  dispose(): void {
    // LODSystem não precisa dispose
  }
}
