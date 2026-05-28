import * as THREE from "three";
import { eventBus, appState } from "../core";
import { EntityManager } from "./ecs";

export type EngineContext = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;

  // Core singletons existentes
  eventBus: typeof eventBus;
  appState: typeof appState;

  // ECS
  entityManager: EntityManager;

  // opcional: app controller
  app?: unknown;
};

export type SystemPhase = "init" | "start" | "update" | "lateUpdate" | "dispose";

export interface ISystem {
  readonly name: string;
  enabled: boolean;

  init?(ctx: EngineContext): void;
  start?(ctx: EngineContext): void;
  update?(ctx: EngineContext, dt: number): void;
  lateUpdate?(ctx: EngineContext, dt: number): void;
  dispose?(ctx: EngineContext): void;
}
