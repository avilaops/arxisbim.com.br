/**
 * Avatar - Representa um avatar individual customizável
 */

import * as THREE from 'three';
import { AvatarConfig } from './AvatarConfig';

export class Avatar {
  public group: THREE.Group;
  public config: AvatarConfig;
  
  private body?: THREE.Mesh;
  private head?: THREE.Mesh;
  private hairMesh?: THREE.Mesh;
  private shirtMesh?: THREE.Mesh;
  private pantsMesh?: THREE.Mesh;
  private helmetMesh?: THREE.Mesh;
  private vestMesh?: THREE.Mesh;
  
  // Label (nome do usuário)
  private label?: THREE.Sprite;
  
  constructor(config: AvatarConfig) {
    this.config = config;
    this.group = new THREE.Group();
    this.group.name = `Avatar_${config.userId}`;
    
    // UserData para identificação
    this.group.userData.isAvatar = true;
    this.group.userData.userId = config.userId;
    this.group.userData.displayName = config.displayName;
  }

  /**
   * Cria geometria base procedural (placeholder até ter GLBs)
   */
  public createProcedural(): void {
    const { morphs, colors } = this.config;
    
    // Base height scale
    const heightScale = 0.8 + (morphs.height * 0.4); // 0.8 - 1.2
    const widthScale = 0.8 + (morphs.weight * 0.4);
    
    // Body (torso)
    const bodyGeo = new THREE.BoxGeometry(0.5 * widthScale, 0.8 * heightScale, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: colors.shirt,
      roughness: 0.7,
      metalness: 0.1
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.9 * heightScale;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);
    
    // Head
    const headSize = 0.2 + (morphs.headSize * 0.1);
    const headGeo = new THREE.SphereGeometry(headSize, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ 
      color: colors.skin,
      roughness: 0.6
    });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.5 * heightScale;
    this.head.castShadow = true;
    this.group.add(this.head);
    
    // Hair (simple cap)
    const hairGeo = new THREE.SphereGeometry(headSize * 1.05, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hairMat = new THREE.MeshStandardMaterial({ 
      color: colors.hair,
      roughness: 0.8
    });
    this.hairMesh = new THREE.Mesh(hairGeo, hairMat);
    this.hairMesh.position.y = 1.5 * heightScale;
    this.hairMesh.castShadow = true;
    this.group.add(this.hairMesh);
    
    // Legs (simplified)
    const legGeo = new THREE.BoxGeometry(0.18, 0.8 * heightScale, 0.18);
    const pantsMat = new THREE.MeshStandardMaterial({ 
      color: colors.pants,
      roughness: 0.8
    });
    
    const legLeft = new THREE.Mesh(legGeo, pantsMat);
    legLeft.position.set(-0.12, 0.4 * heightScale, 0);
    legLeft.castShadow = true;
    this.group.add(legLeft);
    
    const legRight = new THREE.Mesh(legGeo, pantsMat.clone());
    legRight.position.set(0.12, 0.4 * heightScale, 0);
    legRight.castShadow = true;
    this.group.add(legRight);
    
    // BIM specific: Helmet
    if (this.config.parts.helmet) {
      const helmetGeo = new THREE.CylinderGeometry(headSize * 1.1, headSize * 1.15, headSize * 0.6, 16);
      const helmetMat = new THREE.MeshStandardMaterial({ 
        color: '#FFD700',
        roughness: 0.3,
        metalness: 0.5
      });
      this.helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
      this.helmetMesh.position.y = 1.7 * heightScale;
      this.helmetMesh.castShadow = true;
      this.group.add(this.helmetMesh);
    }
    
    // BIM specific: Safety Vest
    if (this.config.parts.vest && colors.vest) {
      const vestGeo = new THREE.BoxGeometry(0.55 * widthScale, 0.6 * heightScale, 0.32);
      const vestMat = new THREE.MeshStandardMaterial({ 
        color: colors.vest,
        roughness: 0.5,
        emissive: colors.vest,
        emissiveIntensity: 0.2
      });
      this.vestMesh = new THREE.Mesh(vestGeo, vestMat);
      this.vestMesh.position.y = 0.95 * heightScale;
      this.vestMesh.castShadow = true;
      this.group.add(this.vestMesh);
    }
    
    console.log(`👤 Avatar criado: ${this.config.displayName}`);
  }

  /**
   * Cria label com nome do usuário
   */
  public createLabel(): void {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Text
    context.font = 'Bold 24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(this.config.displayName, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      depthTest: false,
      depthWrite: false
    });
    
    this.label = new THREE.Sprite(material);
    this.label.scale.set(1, 0.25, 1);
    this.label.position.y = 2.2;
    this.group.add(this.label);
  }

  /**
   * Atualiza posição do avatar
   */
  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  /**
   * Atualiza rotação do avatar
   */
  public setRotation(yaw: number): void {
    this.group.rotation.y = yaw;
  }

  /**
   * Anima avatar (idle bobbing simples)
   */
  public update(time: number): void {
    // Breathing animation (sutil)
    if (this.body) {
      this.body.scale.y = 1 + Math.sin(time * 2) * 0.02;
    }
  }

  /**
   * Aplica morph (quando usar GLBs reais)
   */
  public applyMorph(morphName: keyof AvatarConfig['morphs'], value: number): void {
    this.config.morphs[morphName] = value;
    
    // Recriar procedural com novos morphs
    // Em produção, isso aplicaria blend shapes no modelo GLB
    this.dispose();
    this.createProcedural();
    this.createLabel();
  }

  /**
   * Troca cor de uma parte
   */
  public setPartColor(part: 'skin' | 'hair' | 'shirt' | 'pants' | 'vest', color: string): void {
    this.config.colors[part] = color;
    
    const colorObj = new THREE.Color(color);
    
    switch (part) {
      case 'skin':
        if (this.head) (this.head.material as THREE.MeshStandardMaterial).color = colorObj;
        break;
      case 'hair':
        if (this.hairMesh) (this.hairMesh.material as THREE.MeshStandardMaterial).color = colorObj;
        break;
      case 'shirt':
        if (this.body) (this.body.material as THREE.MeshStandardMaterial).color = colorObj;
        break;
      case 'vest':
        if (this.vestMesh) {
          const mat = this.vestMesh.material as THREE.MeshStandardMaterial;
          mat.color = colorObj;
          mat.emissive = colorObj;
        }
        break;
    }
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Sprite) {
        child.material.dispose();
        if (child.material.map) child.material.map.dispose();
      }
    });
    this.group.clear();
  }
}
