import { EngineSystem } from "../EngineLoop";
import { EntityManager } from "./EntityManager";

/**
 * Base System class for ECS
 * Systems contain the logic that operates on entities with specific components
 */
export abstract class System implements EngineSystem {
  public readonly name: string;
  public enabled: boolean = true;

  protected entityManager: EntityManager;

  constructor(name: string, entityManager: EntityManager) {
    this.name = name;
    this.entityManager = entityManager;
  }

  // EngineSystem methods
  update(dt: number): void {
    if (this.enabled) {
      this.updateEntities(dt);
    }
  }

  dispose?(): void {}

  /**
   * Abstract method to be implemented by subclasses
   * Called during update phase with filtered entities
   */
  protected abstract updateEntities(dt: number): void;

  /**
   * Get entities that have all the specified components
   */
  protected getEntitiesWithComponents(...componentClasses: (new (...args: any[]) => any)[]): Entity[] {
    return this.entityManager.getEntitiesWithComponents(...componentClasses);
  }
}