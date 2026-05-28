/**
 * IFC to AI Converter - Converte elementos IFC para formato de IA
 */

import * as THREE from 'three';
import { IFCElement } from '../ai/BIMAIEngine';

export class IFCToAIConverter {
  /**
   * Converte objetos Three.js (IFC) para elementos de IA
   */
  static convertToAIElements(scene: THREE.Scene): IFCElement[] {
    const elements: IFCElement[] = [];
    
    scene.traverse((object) => {
      // Verificar se é um elemento IFC
      if (this.isIFCElement(object)) {
        const element = this.convertSingleElement(object);
        if (element) {
          elements.push(element);
        }
      }
    });
    
    console.log(`✅ Converted ${elements.length} IFC elements to AI format`);
    return elements;
  }

  /**
   * Verificar se é elemento IFC
   */
  private static isIFCElement(object: THREE.Object3D): boolean {
    // Tem expressID ou userData IFC
    const hasExpressID = object.userData?.expressID !== undefined;
    const hasIFCType = object.userData?.type?.startsWith('IFC');
    const isMesh = object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh;
    
    return (hasExpressID || hasIFCType) && isMesh;
  }

  /**
   * Converter elemento individual
   */
  private static convertSingleElement(object: THREE.Object3D): IFCElement | null {
    try {
      const mesh = object as THREE.Mesh;
      
      // ExpressID
      const expressID = object.userData?.expressID || 
                       object.userData?.id || 
                       Math.floor(Math.random() * 1000000);
      
      // Tipo
      const type = object.userData?.type || 
                   object.userData?.ifcType || 
                   this.guessTypeFromName(object.name) ||
                   'IFCBUILDINGELEMENTPROXY';
      
      // Geometria
      let geometry: THREE.BufferGeometry;
      if (mesh.geometry) {
        geometry = mesh.geometry;
      } else {
        // Criar geometria placeholder
        geometry = new THREE.BoxGeometry(1, 1, 1);
      }
      
      // Bounding box
      const boundingBox = new THREE.Box3();
      
      if (mesh.geometry) {
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }
        if (mesh.geometry.boundingBox) {
          boundingBox.copy(mesh.geometry.boundingBox);
          
          // Aplicar transformações do objeto
          const matrix = new THREE.Matrix4();
          matrix.compose(
            object.getWorldPosition(new THREE.Vector3()),
            object.getWorldQuaternion(new THREE.Quaternion()),
            object.getWorldScale(new THREE.Vector3())
          );
          boundingBox.applyMatrix4(matrix);
        }
      }
      
      // Se bounding box está vazia, usar posição do objeto
      if (boundingBox.isEmpty()) {
        const pos = object.getWorldPosition(new THREE.Vector3());
        const scale = object.getWorldScale(new THREE.Vector3());
        boundingBox.setFromCenterAndSize(
          pos,
          scale
        );
      }
      
      // Matrix
      const matrix = new THREE.Matrix4();
      matrix.compose(
        object.getWorldPosition(new THREE.Vector3()),
        object.getWorldQuaternion(new THREE.Quaternion()),
        object.getWorldScale(new THREE.Vector3())
      );
      
      // Propriedades
      const properties: Record<string, any> = {
        name: object.name || 'Unnamed',
        visible: object.visible,
        ...object.userData
      };
      
      // Adicionar material info
      if (mesh.material) {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        if (mat instanceof THREE.Material) {
          properties.Material = mat.name || mat.type;
        }
      }
      
      return {
        expressID,
        type,
        geometry,
        matrix,
        properties,
        boundingBox
      };
    } catch (error) {
      console.warn('Failed to convert element:', error);
      return null;
    }
  }

  /**
   * Adivinhar tipo baseado no nome
   */
  private static guessTypeFromName(name: string): string | null {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('wall') || lowerName.includes('parede')) return 'IFCWALL';
    if (lowerName.includes('slab') || lowerName.includes('laje')) return 'IFCSLAB';
    if (lowerName.includes('column') || lowerName.includes('pilar')) return 'IFCCOLUMN';
    if (lowerName.includes('beam') || lowerName.includes('viga')) return 'IFCBEAM';
    if (lowerName.includes('window') || lowerName.includes('janela')) return 'IFCWINDOW';
    if (lowerName.includes('door') || lowerName.includes('porta')) return 'IFCDOOR';
    if (lowerName.includes('roof') || lowerName.includes('telhado')) return 'IFCROOF';
    if (lowerName.includes('stair') || lowerName.includes('escada')) return 'IFCSTAIR';
    if (lowerName.includes('railing') || lowerName.includes('guarda')) return 'IFCRAILING';
    
    return null;
  }

  /**
   * Estatísticas dos elementos
   */
  static getElementStats(elements: IFCElement[]): {
    total: number;
    byType: Record<string, number>;
    totalVolume: number;
    avgComplexity: number;
  } {
    const byType: Record<string, number> = {};
    let totalVolume = 0;
    let totalComplexity = 0;
    
    elements.forEach(elem => {
      // Contar por tipo
      byType[elem.type] = (byType[elem.type] || 0) + 1;
      
      // Volume
      const size = elem.boundingBox.max.clone().sub(elem.boundingBox.min);
      totalVolume += size.x * size.y * size.z;
      
      // Complexidade (baseado em vértices)
      const vertexCount = elem.geometry?.attributes.position?.count || 0;
      totalComplexity += Math.min(vertexCount / 10000, 1);
    });
    
    return {
      total: elements.length,
      byType,
      totalVolume,
      avgComplexity: totalComplexity / elements.length
    };
  }
}
