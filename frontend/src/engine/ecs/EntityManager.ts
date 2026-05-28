import { Entity } from "./Entity";

/**
 * EntityManager - Manages all entities and provides query functionality
 */
export class EntityManager {
  private entities: Map<number, Entity> = new Map();
  private componentEntityMap: Map<string, Set<Entity>> = new Map();

  /**
   * Create a new entity
   */
  createEntity(): Entity {
    const entity = new Entity(this);
    this.entities.set(entity.id, entity);
    return entity;
  }

  /**
   * Destroy an entity
   */
  destroyEntity(entity: Entity): void {
    if (this.entities.has(entity.id)) {
      // Remove from component maps
      for (const [componentName, entities] of this.componentEntityMap) {
        entities.delete(entity);
      }
      entity.destroy();
      this.entities.delete(entity.id);
    }
  }

  /**
   * Get entity by ID
   */
  getEntity(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get entities that have all specified components
   */
  getEntitiesWithComponents(...componentClasses: (new (...args: any[]) => any)[]): Entity[] {
    if (componentClasses.length === 0) return this.getAllEntities();

    const componentNames = componentClasses.map(cls => cls.name);
    let result: Set<Entity> | undefined;

    for (const name of componentNames) {
      const entitiesWithComponent = this.componentEntityMap.get(name);
      if (!entitiesWithComponent) return [];

      if (!result) {
        result = new Set(entitiesWithComponent);
      } else {
        // Intersection
        for (const entity of result) {
          if (!entitiesWithComponent.has(entity)) {
            result.delete(entity);
          }
        }
      }
    }

    return result ? Array.from(result) : [];
  }

  /**
   * Register component addition to entity (called internally)
   */
  _registerComponent(entity: Entity, component: any): void {
    const componentName = component.constructor.name;
    if (!this.componentEntityMap.has(componentName)) {
      this.componentEntityMap.set(componentName, new Set());
    }
    this.componentEntityMap.get(componentName)!.add(entity);
  }

  /**
   * Unregister component removal from entity (called internally)
   */
  _unregisterComponent(entity: Entity, componentClass: new (...args: any[]) => any): void {
    const componentName = componentClass.name;
    const entitiesWithComponent = this.componentEntityMap.get(componentName);
    if (entitiesWithComponent) {
      entitiesWithComponent.delete(entity);
    }
  }
}