import * as THREE from 'three';

/**
 * Interface Universal de Ferramenta
 * Todas as ferramentas do ArxisVR seguem este contrato
 */
export interface Tool {
  readonly name: string;
  readonly type: string;
  
  /**
   * Ativa a ferramenta
   */
  activate(): void;
  
  /**
   * Desativa a ferramenta
   */
  deactivate(): void;
  
  /**
   * Handler de pointer down
   */
  onPointerDown(event: PointerEvent, raycaster: THREE.Raycaster): void;
  
  /**
   * Handler de pointer move
   */
  onPointerMove(event: PointerEvent, raycaster: THREE.Raycaster): void;
  
  /**
   * Handler de pointer up
   */
  onPointerUp(event: PointerEvent, raycaster: THREE.Raycaster): void;
  
  /**
   * Handler de teclas
   */
  onKeyDown(event: KeyboardEvent): void;
  
  /**
   * Handler de teclas (release)
   */
  onKeyUp(event: KeyboardEvent): void;
  
  /**
   * Update loop (opcional)
   */
  update?(delta: number): void;
  
  /**
   * Cleanup
   */
  dispose(): void;
}

/**
 * Classe base abstrata para ferramentas
 */
export abstract class BaseTool implements Tool {
  public abstract readonly name: string;
  public abstract readonly type: string;
  
  protected isActive: boolean = false;

  public activate(): void {
    this.isActive = true;
    console.log(`🔧 ${this.name} activated`);
  }

  public deactivate(): void {
    this.isActive = false;
    console.log(`🔧 ${this.name} deactivated`);
  }

  public onPointerDown(_event: PointerEvent, _raycaster: THREE.Raycaster): void {
    // Override in subclass if needed
  }

  public onPointerMove(_event: PointerEvent, _raycaster: THREE.Raycaster): void {
    // Override in subclass if needed
  }

  public onPointerUp(_event: PointerEvent, _raycaster: THREE.Raycaster): void {
    // Override in subclass if needed
  }

  public onKeyDown(_event: KeyboardEvent): void {
    // Override in subclass if needed
  }

  public onKeyUp(_event: KeyboardEvent): void {
    // Override in subclass if needed
  }

  public update?(_delta: number): void {
    // Override in subclass if needed
  }

  public dispose(): void {
    this.isActive = false;
  }
}
