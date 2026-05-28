/**
 * AvatarSystem - Sistema principal de gerenciamento de avatares
 * Gerencia criação, sincronização e atualizações de avatares
 */

import * as THREE from 'three';
import { Avatar } from './Avatar';
import { AvatarLoader } from './AvatarLoader';
import { 
  AvatarConfig, 
  AVATAR_PRESET_DEFAULT 
} from './AvatarConfig';

export interface AvatarSystemConfig {
  scene: THREE.Scene;
  enableLocalAvatar?: boolean;  // Criar avatar local do usuário
  enableLabels?: boolean;        // Mostrar nomes
  enableShadows?: boolean;       // Sombras nos avatares
}

export class AvatarSystem {
  private scene: THREE.Scene;
  private loader: AvatarLoader;
  
  // Avatares ativos
  private avatars: Map<string, Avatar> = new Map();
  
  // Avatar do usuário local
  private localAvatar?: Avatar;
  
  // Config
  private config: AvatarSystemConfig;
  
  // Storage key
  private readonly STORAGE_KEY = 'arxisVR_avatarConfig';
  
  constructor(config: AvatarSystemConfig) {
    this.config = config;
    this.scene = config.scene;
    this.loader = new AvatarLoader();
    
    console.log('👥 AvatarSystem inicializado');
  }

  /**
   * Inicializa sistema
   */
  public async init(): Promise<void> {
    // Carrega avatar local do cache ou cria default
    if (this.config.enableLocalAvatar) {
      await this.initLocalAvatar();
    }
  }

  /**
   * Inicializa avatar do usuário local
   */
  private async initLocalAvatar(): Promise<void> {
    const config = this.loadLocalConfig();
    this.localAvatar = await this.createAvatar(config);
    
    // Posiciona fora da view (não vemos nosso próprio avatar em FPS)
    this.localAvatar.group.visible = false;
    
    console.log('👤 Avatar local criado:', config.displayName);
  }

  /**
   * Carrega configuração do localStorage
   */
  private loadLocalConfig(): AvatarConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored) as AvatarConfig;
        console.log('✅ Config de avatar carregada do localStorage');
        return config;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar config de avatar:', error);
    }
    
    // Retorna default
    return { ...AVATAR_PRESET_DEFAULT };
  }

  /**
   * Salva configuração no localStorage
   */
  public saveLocalConfig(config: AvatarConfig): void {
    try {
      config.updatedAt = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      console.log('💾 Config de avatar salva');
    } catch (error) {
      console.error('❌ Erro ao salvar config:', error);
    }
  }

  /**
   * Cria um novo avatar
   */
  public async createAvatar(config: AvatarConfig): Promise<Avatar> {
    const avatar = await this.loader.loadAvatar(config);
    
    // Adiciona à cena
    this.scene.add(avatar.group);
    
    // Registra
    this.avatars.set(config.userId, avatar);
    
    return avatar;
  }

  /**
   * Remove um avatar
   */
  public removeAvatar(userId: string): void {
    const avatar = this.avatars.get(userId);
    if (!avatar) return;
    
    this.scene.remove(avatar.group);
    avatar.dispose();
    this.avatars.delete(userId);
    
    console.log(`🗑️ Avatar removido: ${userId}`);
  }

  /**
   * Atualiza posição de um avatar (para multiplayer)
   */
  public updateAvatarPosition(
    userId: string, 
    x: number, 
    y: number, 
    z: number, 
    yaw: number
  ): void {
    const avatar = this.avatars.get(userId);
    if (!avatar) return;
    
    avatar.setPosition(x, y, z);
    avatar.setRotation(yaw);
  }

  /**
   * Atualiza avatar de outro usuário (recebido via network)
   */
  public async updateRemoteAvatar(config: AvatarConfig): Promise<void> {
    let avatar = this.avatars.get(config.userId);
    
    if (!avatar) {
      // Cria novo avatar remoto
      avatar = await this.createAvatar(config);
      console.log('👤 Avatar remoto adicionado:', config.displayName);
    } else {
      // Atualiza config existente (hot-swap)
      avatar.config = config;
      
      // Recriar visual (em produção, faria hot-swap das partes)
      this.scene.remove(avatar.group);
      avatar.dispose();
      
      avatar = await this.loader.loadAvatar(config);
      this.scene.add(avatar.group);
      this.avatars.set(config.userId, avatar);
    }
  }

  /**
   * Atualiza avatar local
   */
  public async updateLocalAvatar(config: AvatarConfig): Promise<void> {
    if (!this.localAvatar) {
      this.localAvatar = await this.createAvatar(config);
      this.localAvatar.group.visible = false;
    } else {
      // Atualiza
      this.scene.remove(this.localAvatar.group);
      this.localAvatar.dispose();
      
      this.localAvatar = await this.loader.loadAvatar(config);
      this.localAvatar.group.visible = false;
      this.scene.add(this.localAvatar.group);
    }
    
    // Salva
    this.saveLocalConfig(config);
    
    // Notifica rede (em produção)
    this.broadcastAvatarUpdate(config);
  }

  /**
   * Broadcasting para multiplayer
   * (Será chamado pelo WebRTCManager via callback)
   */
  private broadcastCallback?: (config: AvatarConfig) => void;
  
  public setBroadcastCallback(callback: (config: AvatarConfig) => void): void {
    this.broadcastCallback = callback;
  }
  
  private broadcastAvatarUpdate(config: AvatarConfig): void {
    if (this.broadcastCallback) {
      this.broadcastCallback(config);
    }
  }

  /**
   * Obtém avatar local
   */
  public getLocalAvatar(): Avatar | undefined {
    return this.localAvatar;
  }

  /**
   * Obtém config local
   */
  public getLocalConfig(): AvatarConfig | undefined {
    return this.localAvatar?.config;
  }

  /**
   * Lista todos os avatares ativos
   */
  public getActiveAvatars(): Avatar[] {
    return Array.from(this.avatars.values());
  }

  /**
   * Update loop (animações)
   */
  public update(time: number): void {
    this.avatars.forEach((avatar) => {
      if (avatar.group.visible) {
        avatar.update(time);
      }
    });
  }

  /**
   * Toggle labels
   */
  public setLabelsVisible(visible: boolean): void {
    this.config.enableLabels = visible;
    // Implementar se necessário
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.avatars.forEach((avatar) => {
      this.scene.remove(avatar.group);
      avatar.dispose();
    });
    this.avatars.clear();
    this.loader.clearCache();
    
    console.log('🗑️ AvatarSystem disposed');
  }
}
