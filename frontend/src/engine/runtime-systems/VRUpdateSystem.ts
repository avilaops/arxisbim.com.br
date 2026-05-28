import { EngineSystem } from '../EngineLoop';
import { VRInputManager } from '../../vr/input';
import { VRNotifications } from '../../vr/ui';

/**
 * VRUpdateSystem - Atualiza sistemas VR
 */
export class VRUpdateSystem implements EngineSystem {
  readonly name = 'VRUpdateSystem';
  enabled = false; // Habilitado quando entrar em modo VR

  constructor(
    private vrInputManager: VRInputManager | null,
    private vrNotifications: VRNotifications | null
  ) {}

  update(_dt: number): void {
    if (this.vrInputManager) {
      this.vrInputManager.update();
    }

    if (this.vrNotifications) {
      this.vrNotifications.update();
    }
  }

  dispose(): void {
    // VR systems têm seu próprio dispose no ArxisVR.dispose()
  }
}
