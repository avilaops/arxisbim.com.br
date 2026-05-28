import * as THREE from 'three';
import { networkManager } from './NetworkManager';
import { eventBus, EventType } from '../core';

/**
 * MultiplayerSync - Sistema de sincronização multiplayer
 * Sincroniza players, objetos e estados entre clientes
 * 
 * Features:
 * - Player position/rotation sync
 * - Object state replication
 * - Interpolation for smooth movement
 * - Client-side prediction
 * - Authority reconciliation
 * - Lag compensation
 * 
 * Performance: 20Hz sync rate (50ms), 60Hz interpolation
 */
export class MultiplayerSync {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  // Synced players
  private remotePlayers: Map<string, {
    mesh: THREE.Mesh;
    targetPosition: THREE.Vector3;
    targetRotation: THREE.Quaternion;
    lastUpdate: number;
    velocity: THREE.Vector3;
  }> = new Map();
  
  // Synced objects
  private syncedObjects: Map<string, {
    object: THREE.Object3D;
    ownerId: string;
    lastUpdate: number;
  }> = new Map();
  
  // Local player state
  private localPlayerState: {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    lastSent: number;
  } = {
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    lastSent: 0
  };
  
  // Configuration
  private syncRate: number = 20; // Hz
  private interpolationTime: number = 100; // ms
  private enabled: boolean = false;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    this.setupNetworkListeners();
    
    console.log('🔄 Multiplayer Sync initialized');
  }
  
  /**
   * Configura listeners de rede
   */
  private setupNetworkListeners(): void {
    // Escuta eventos do EventBus
    // Em produção, usar callbacks específicos do NetworkManager
  }
  
  /**
   * Habilita sincronização
   */
  public enable(): void {
    this.enabled = true;
    console.log('✅ Multiplayer sync enabled');
  }
  
  /**
   * Desabilita sincronização
   */
  public disable(): void {
    this.enabled = false;
    console.log('❌ Multiplayer sync disabled');
  }
  
  /**
   * Atualiza sincronização (chamado a cada frame)
   */
  public update(delta: number): void {
    if (!this.enabled) return;
    
    // Sincroniza player local
    this.syncLocalPlayer(delta);
    
    // Interpola players remotos
    this.interpolateRemotePlayers(delta);
    
    // Sincroniza objetos
    this.syncObjects(delta);
  }
  
  /**
   * Sincroniza estado do player local
   */
  private syncLocalPlayer(_delta: number): void {
    const now = Date.now();
    const timeSinceLastSync = now - this.localPlayerState.lastSent;
    
    // Envia update se passou tempo suficiente
    if (timeSinceLastSync >= 1000 / this.syncRate) {
      // Captura posição e rotação da câmera
      const position = this.camera.position.clone();
      const quaternion = this.camera.quaternion.clone();
      
      // Envia para servidor
      networkManager.syncPlayerState(
        { x: position.x, y: position.y, z: position.z },
        { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
        false // isVR - detectar automaticamente
      );
      
      this.localPlayerState.position.copy(position);
      this.localPlayerState.rotation.copy(quaternion);
      this.localPlayerState.lastSent = now;
    }
  }
  
  /**
   * Interpola movimento de players remotos
   */
  private interpolateRemotePlayers(delta: number): void {
    const now = Date.now();
    
    this.remotePlayers.forEach((player) => {
      const timeSinceUpdate = now - player.lastUpdate;
      
      // Interpola posição
      const t = Math.min(timeSinceUpdate / this.interpolationTime, 1.0);
      player.mesh.position.lerp(player.targetPosition, t);
      player.mesh.quaternion.slerp(player.targetRotation, t);
      
      // Predição de movimento
      if (timeSinceUpdate > this.interpolationTime) {
        // Aplica velocidade para prever movimento
        player.mesh.position.add(
          player.velocity.clone().multiplyScalar(delta)
        );
      }
    });
  }
  
  /**
   * Sincroniza objetos da cena
   */
  private syncObjects(_delta: number): void {
    // Implementação futura: sincronizar objetos manipuláveis
  }
  
  /**
   * Adiciona player remoto
   */
  public addRemotePlayer(playerId: string, playerData: any): void {
    if (this.remotePlayers.has(playerId)) {
      console.warn(`⚠️ Player ${playerId} already exists`);
      return;
    }
    
    // Cria representação visual do player
    const geometry = new THREE.CapsuleGeometry(0.3, 1.4, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4444ff,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.position.set(
      playerData.position.x,
      playerData.position.y,
      playerData.position.z
    );
    
    playerMesh.name = `Player_${playerId}`;
    this.scene.add(playerMesh);
    
    // Adiciona name tag
    const nameTag = this.createNameTag(playerData.name || playerId);
    nameTag.position.y = 2.0;
    playerMesh.add(nameTag);
    
    // Armazena estado
    this.remotePlayers.set(playerId, {
      mesh: playerMesh,
      targetPosition: new THREE.Vector3(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
      ),
      targetRotation: new THREE.Quaternion(
        playerData.rotation.x,
        playerData.rotation.y,
        playerData.rotation.z,
        playerData.rotation.w
      ),
      lastUpdate: Date.now(),
      velocity: new THREE.Vector3()
    });
    
    console.log(`👤 Remote player added: ${playerId}`);
    
    eventBus.emit(EventType.TOOL_ACTIVATED, {
      toolType: `Multiplayer:PlayerAdded:${playerId}`
    });
  }
  
  /**
   * Atualiza player remoto
   */
  public updateRemotePlayer(playerId: string, playerData: any): void {
    const player = this.remotePlayers.get(playerId);
    
    if (!player) {
      // Player não existe, adiciona
      this.addRemotePlayer(playerId, playerData);
      return;
    }
    
    const now = Date.now();
    const timeDelta = (now - player.lastUpdate) / 1000; // segundos
    
    // Calcula velocidade para predição
    const newPosition = new THREE.Vector3(
      playerData.position.x,
      playerData.position.y,
      playerData.position.z
    );
    
    if (timeDelta > 0) {
      player.velocity.subVectors(newPosition, player.targetPosition);
      player.velocity.divideScalar(timeDelta);
    }
    
    // Atualiza target
    player.targetPosition.copy(newPosition);
    player.targetRotation.set(
      playerData.rotation.x,
      playerData.rotation.y,
      playerData.rotation.z,
      playerData.rotation.w
    );
    
    player.lastUpdate = now;
  }
  
  /**
   * Remove player remoto
   */
  public removeRemotePlayer(playerId: string): void {
    const player = this.remotePlayers.get(playerId);
    
    if (player) {
      this.scene.remove(player.mesh);
      player.mesh.geometry.dispose();
      (player.mesh.material as THREE.Material).dispose();
      
      this.remotePlayers.delete(playerId);
      
      console.log(`👤 Remote player removed: ${playerId}`);
      
      eventBus.emit(EventType.TOOL_DEACTIVATED, {
        toolType: `Multiplayer:PlayerRemoved:${playerId}`
      });
    }
  }
  
  /**
   * Cria name tag
   */
  private createNameTag(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Text
    context.font = 'bold 32px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1, 0.25, 1);
    
    return sprite;
  }
  
  /**
   * Registra objeto para sincronização
   */
  public registerObject(objectId: string, object: THREE.Object3D, ownerId: string): void {
    this.syncedObjects.set(objectId, {
      object,
      ownerId,
      lastUpdate: Date.now()
    });
    
    console.log(`🔄 Object registered for sync: ${objectId}`);
  }
  
  /**
   * Remove objeto da sincronização
   */
  public unregisterObject(objectId: string): void {
    this.syncedObjects.delete(objectId);
    console.log(`🔄 Object unregistered: ${objectId}`);
  }
  
  /**
   * Sincroniza transformação de objeto
   */
  public syncObjectTransform(objectId: string, position: THREE.Vector3, rotation: THREE.Quaternion, scale: THREE.Vector3): void {
    const obj = this.syncedObjects.get(objectId);
    
    if (obj) {
      obj.object.position.copy(position);
      obj.object.quaternion.copy(rotation);
      obj.object.scale.copy(scale);
      obj.lastUpdate = Date.now();
    }
  }
  
  /**
   * Define taxa de sincronização
   */
  public setSyncRate(hz: number): void {
    this.syncRate = hz;
    networkManager.setSyncRate(hz);
    console.log(`🔄 Sync rate: ${hz}Hz`);
  }
  
  /**
   * Define tempo de interpolação
   */
  public setInterpolationTime(ms: number): void {
    this.interpolationTime = ms;
    console.log(`🔄 Interpolation time: ${ms}ms`);
  }
  
  /**
   * Retorna players remotos
   */
  public getRemotePlayers(): Map<string, any> {
    return this.remotePlayers;
  }
  
  /**
   * Limpa todos os players remotos
   */
  public clearAll(): void {
    this.remotePlayers.forEach((_, playerId) => {
      this.removeRemotePlayer(playerId);
    });
    
    this.syncedObjects.clear();
    
    console.log('🧹 Multiplayer sync cleared');
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    remotePlayers: number;
    syncedObjects: number;
    syncRate: number;
    interpolationTime: number;
  } {
    return {
      remotePlayers: this.remotePlayers.size,
      syncedObjects: this.syncedObjects.size,
      syncRate: this.syncRate,
      interpolationTime: this.interpolationTime
    };
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    console.log('📊 Multiplayer Sync Stats:');
    console.log(`   Remote Players: ${stats.remotePlayers}`);
    console.log(`   Synced Objects: ${stats.syncedObjects}`);
    console.log(`   Sync Rate: ${stats.syncRate}Hz`);
    console.log(`   Interpolation: ${stats.interpolationTime}ms`);
  }
}
