/**
 * Entity Component System (ECS) Implementation
 * Provides a flexible and performant way to manage game objects and their behaviors
 */

import { EntityManager } from "./EntityManager";

export class Entity {
  private static nextId = 0;
  public readonly id: number;
  private components: Map<string, any> = new Map();
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.id = Entity.nextId++;
    this.entityManager = entityManager;
  }

  addComponent<T>(component: T): this {
    const componentName = component.constructor.name;
    this.components.set(componentName, component);
    this.entityManager._registerComponent(this, component);
    return this;
  }

  getComponent<T>(componentClass: new (...args: any[]) => T): T | undefined {
    const componentName = componentClass.name;
    return this.components.get(componentName);
  }

  hasComponent<T>(componentClass: new (...args: any[]) => T): boolean {
    const componentName = componentClass.name;
    return this.components.has(componentName);
  }

  removeComponent<T>(componentClass: new (...args: any[]) => T): boolean {
    const componentName = componentClass.name;
    if (this.components.has(componentName)) {
      this.components.delete(componentName);
      this.entityManager._unregisterComponent(this, componentClass);
      return true;
    }
    return false;
  }

  getAllComponents(): Map<string, any> {
    return new Map(this.components);
  }

  destroy(): void {
    this.components.clear();
  }
}