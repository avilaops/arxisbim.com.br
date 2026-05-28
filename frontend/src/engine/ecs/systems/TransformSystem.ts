import { System } from "../System";
import { TransformComponent, MeshComponent } from "../components";

/**
 * TransformSystem - Synchronizes TransformComponent with Three.js meshes
 */
export class TransformSystem extends System {
  constructor(entityManager: EntityManager) {
    super("TransformSystem", entityManager);
  }

  protected updateEntities(dt: number): void {
    const entities = this.getEntitiesWithComponents(TransformComponent, MeshComponent);

    for (const entity of entities) {
      const transform = entity.getComponent(TransformComponent);
      const meshComp = entity.getComponent(MeshComponent);

      if (transform && meshComp) {
        meshComp.mesh.position.copy(transform.position);
        meshComp.mesh.rotation.copy(transform.rotation);
        meshComp.mesh.scale.copy(transform.scale);
      }
    }
  }
}