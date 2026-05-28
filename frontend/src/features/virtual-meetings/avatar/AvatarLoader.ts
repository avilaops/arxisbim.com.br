/**
 * AvatarLoader - Carrega modelos GLB e aplica configurações
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Avatar } from './Avatar';
import { AvatarConfig, AVATAR_PARTS_CATALOG } from './AvatarConfig';

export class AvatarLoader {
  private gltfLoader: GLTFLoader;
  private cache: Map<string, THREE.Group> = new Map();
  
  constructor() {
    this.gltfLoader = new GLTFLoader();
  }

  /**
   * Carrega um avatar completo com todas as partes
   */
  public async loadAvatar(config: AvatarConfig): Promise<Avatar> {
    const avatar = new Avatar(config);
    
    // Por enquanto, usa geometria procedural
    // Em produção, carregaria GLBs:
    // await this.loadAvatarParts(avatar);
    
    avatar.createProcedural();
    avatar.createLabel();
    
    return avatar;
  }

  /**
   * Carrega todas as partes do avatar (futuro - quando tiver GLBs)
   */
  private async loadAvatarParts(avatar: Avatar): Promise<void> {
    const { parts } = avatar.config;
    
    const promises: Promise<void>[] = [];
    
    // Hair
    if (parts.hair) {
      promises.push(this.loadPart(parts.hair, avatar));
    }
    
    // Shirt
    if (parts.shirt) {
      promises.push(this.loadPart(parts.shirt, avatar));
    }
    
    // Pants
    if (parts.pants) {
      promises.push(this.loadPart(parts.pants, avatar));
    }
    
    // Helmet (BIM)
    if (parts.helmet) {
      promises.push(this.loadPart(parts.helmet, avatar));
    }
    
    // Vest (BIM)
    if (parts.vest) {
      promises.push(this.loadPart(parts.vest, avatar));
    }
    
    await Promise.all(promises);
  }

  /**
   * Carrega uma parte específica do catálogo
   */
  private async loadPart(partId: string, avatar: Avatar): Promise<void> {
    // Busca no catálogo
    const partMeta = AVATAR_PARTS_CATALOG.find(p => p.id === partId);
    if (!partMeta) {
      console.warn(`⚠️ Parte não encontrada no catálogo: ${partId}`);
      return;
    }
    
    // Checa cache
    let partModel = this.cache.get(partId);
    
    if (!partModel) {
      try {
        const gltf = await this.gltfLoader.loadAsync(partMeta.path);
        partModel = gltf.scene;
        
        // Adiciona ao cache
        this.cache.set(partId, partModel);
        
        console.log(`✅ Parte carregada: ${partMeta.name}`);
      } catch (error) {
        console.error(`❌ Erro ao carregar ${partMeta.name}:`, error);
        return;
      }
    }
    
    if (!partModel) return;
    
    // Clona e adiciona ao avatar
    const clone = partModel.clone();
    
    // Aplica cor (se aplicável)
    this.applyColorToPart(clone, partMeta.category, avatar.config);
    
    avatar.group.add(clone);
  }

  /**
   * Aplica cor a uma parte
   */
  private applyColorToPart(
    model: THREE.Group, 
    category: string, 
    config: AvatarConfig
  ): void {
    const colorMap: Record<string, string | undefined> = {
      hair: config.colors.hair,
      shirt: config.colors.shirt,
      pants: config.colors.pants,
      vest: config.colors.vest
    };
    
    const color = colorMap[category];
    if (!color) return;
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          mat.color.set(color);
        }
      }
    });
  }

  /**
   * Substitui uma parte do avatar (hot-swap)
   */
  public async swapPart(
    avatar: Avatar, 
    partId: string, 
    category: 'hair' | 'shirt' | 'pants' | 'helmet' | 'vest'
  ): Promise<void> {
    // Remove parte antiga
    const oldPart = avatar.group.children.find(
      (child) => child.userData.category === category
    );
    if (oldPart) {
      avatar.group.remove(oldPart);
    }
    
    // Carrega nova parte
    await this.loadPart(partId, avatar);
    
    // Atualiza config
    avatar.config.parts[category] = partId;
    avatar.config.updatedAt = new Date().toISOString();
  }

  /**
   * Limpa cache de modelos
   */
  public clearCache(): void {
    this.cache.clear();
  }
}
