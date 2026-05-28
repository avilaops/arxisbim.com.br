import { ISystem, EngineContext } from "../types";
import { NavigationManager } from "../../app/NavigationManager";

export class NavigationSystem implements ISystem {
  name = "NavigationSystem";
  enabled = true;

  private nav?: NavigationManager;

  init(ctx: EngineContext): void {
    // Conectar ao NavigationManager quando disponível
    this.nav = NavigationManager.getInstance();
  }

  update(_ctx: EngineContext, _dt: number): void {
    // Atualizar navegação por frame
    // Ex: processar queue de movimentos, transições de câmera
  }
}
