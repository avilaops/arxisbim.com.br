// GLBLoader: Loader para arquivos GLB
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class GLBLoader {
  async load(file: File | string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      const onLoad = (gltf: any) => {
        resolve(gltf.scene);
      };
      const onError = (err: any) => {
        reject(err);
      };
      if (typeof file === 'string') {
        loader.load(file, onLoad, undefined, onError);
      } else {
        // File: criar URL temporário
        const url = URL.createObjectURL(file);
        loader.load(url, (gltf) => {
          URL.revokeObjectURL(url);
          onLoad(gltf);
        }, undefined, (err) => {
          URL.revokeObjectURL(url);
          onError(err);
        });
      }
    });
  }
}
