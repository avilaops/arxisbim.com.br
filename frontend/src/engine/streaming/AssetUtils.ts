import * as THREE from 'three';

/**
 * Estima o tamanho em bytes de um THREE.Object3D
 * Calcula geometrias, índices e texturas
 */
export function estimateAssetSize(object: THREE.Object3D): number {
  let size = 0;
  
  object.traverse((child: any) => {
    if (child.isMesh) {
      const mesh = child as THREE.Mesh;
      
      // Geometria
      if (mesh.geometry) {
        const attributes = mesh.geometry.attributes;
        for (const key in attributes) {
          const attribute = attributes[key];
          size += attribute.array.byteLength;
        }
        
        if (mesh.geometry.index) {
          size += mesh.geometry.index.array.byteLength;
        }
      }
      
      // Texturas
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material: THREE.Material) => {
          if (material instanceof THREE.MeshStandardMaterial) {
            const maps = [
              material.map,
              material.normalMap,
              material.roughnessMap,
              material.metalnessMap,
              material.aoMap,
              material.emissiveMap
            ];
            
            maps.forEach((map) => {
              if (map && map.image) {
                size += map.image.width * map.image.height * 4;
              }
            });
          }
        });
      }
    }
  });
  
  return size;
}

/**
 * Formata bytes em formato legível (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

/**
 * Libera recursos de um THREE.Object3D
 * Dispose geometrias, materiais e texturas
 */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child: any) => {
    if (child.isMesh) {
      const mesh = child as THREE.Mesh;
      
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material: THREE.Material) => {
          material.dispose();
          
          // Dispose texturas
          if (material instanceof THREE.MeshStandardMaterial) {
            const maps = [
              material.map,
              material.normalMap,
              material.roughnessMap,
              material.metalnessMap,
              material.aoMap,
              material.emissiveMap
            ];
            
            maps.forEach((map) => {
              if (map) map.dispose();
            });
          }
        });
      }
    }
  });
}
