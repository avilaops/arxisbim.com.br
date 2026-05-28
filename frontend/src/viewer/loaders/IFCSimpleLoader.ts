// IFCSimpleLoader: Loader para arquivos IFC
import * as THREE from 'three';

export default class IFCSimpleLoader {
  async load(file: File | string): Promise<THREE.Object3D> {
    // Mock: retorna um cubo para simular modelo IFC
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'ifc-mock-object';
    return mesh;
  }
}
