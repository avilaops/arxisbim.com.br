import { ISystem, EngineContext } from "../types";

export class InputSystem implements ISystem {
  name = "InputSystem";
  enabled = true;

  init(ctx: EngineContext): void {
    // Ponte para controls/tools existentes
    // Ex: integrar com InputSystem atual ou OrbitControls
  }

  update(_ctx: EngineContext, _dt: number): void {
    // Processar input e despachar eventos
  }
}
