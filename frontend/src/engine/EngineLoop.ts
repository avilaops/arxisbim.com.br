// src/engine/EngineLoop.ts
import { EntityManager } from "./ecs";

export interface EngineSystem {
  name: string;
  enabled: boolean;
  update(dt: number): void;
  dispose?(): void;
}

export class EngineLoop {
  private systems: EngineSystem[] = [];
  public readonly entityManager: EntityManager;

  constructor() {
    this.entityManager = new EntityManager();
  }

  add(system: EngineSystem): this {
    this.systems.push(system);
    return this;
  }

  tick(dt: number): void {
    for (const s of this.systems) {
      if (s.enabled) s.update(dt);
    }
  }

  dispose(): void {
    for (const s of this.systems) s.dispose?.();
    this.systems = [];
  }
}
