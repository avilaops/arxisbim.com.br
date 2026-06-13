/**
 * ModelLoader (S08) — carrega o GLB (cache de render do S08) e reconstrói a cena
 * Three.js + o ElementIndex.
 *
 * REGRA DURA (spec S08): ZERO lógica BIM aqui. Só Three.js + o GeometryManifest.
 * Não parseia IFC, não conhece property sets, disciplinas nem custos. Isso protege
 * S13/S19/S22/S27 de acoplar ao Three.js. Toda semântica BIM entra via manifest.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ElementIndex } from './ElementIndex';
import type { GeometryManifest } from './MeshReference';

export interface LoadedModel {
  scene: THREE.Group;
  elementIndex: ElementIndex;
  /** bounds/sphere do modelo, do manifest (já em metros). */
  manifest: GeometryManifest;
}

export class ModelLoader {
  private loader = new GLTFLoader();

  /**
   * Reconstrói a cena a partir do GLB + manifest. Garante que cada objeto
   * carregue `userData.expressID` (a identidade vem dos `extras` do node GLB;
   * reforçada aqui pelo nome do node como fallback) → habilita clique→expressID.
   */
  async load(glb: ArrayBuffer, manifest: GeometryManifest): Promise<LoadedModel> {
    const gltf = await this.parse(glb);
    const scene = gltf.scene;

    scene.traverse((obj) => {
      // GLTFLoader copia node.extras → object.userData. Reforça expressID numérico
      // a partir dos extras OU do nome do node (que escrevemos = `${expressID}`).
      const fromExtras = (obj.userData as any)?.expressID;
      if (typeof fromExtras !== 'number') {
        const n = Number(obj.name);
        if (Number.isFinite(n) && obj.name !== '') {
          (obj.userData as any).expressID = n;
        }
      }
    });

    const elementIndex = new ElementIndex(manifest);
    return { scene, elementIndex, manifest };
  }

  private parse(glb: ArrayBuffer): Promise<{ scene: THREE.Group }> {
    return new Promise((resolve, reject) => {
      this.loader.parse(glb, '', (gltf) => resolve(gltf as unknown as { scene: THREE.Group }), reject);
    });
  }

  /** Caixa + esfera do modelo p/ enquadrar a câmera (framing inicial). */
  static modelBox(manifest: GeometryManifest): THREE.Box3 {
    const b = manifest.modelBounds;
    return new THREE.Box3(
      new THREE.Vector3(b.min[0], b.min[1], b.min[2]),
      new THREE.Vector3(b.max[0], b.max[1], b.max[2]),
    );
  }
}
