import * as THREE from 'three';

/**
 * VRNotifications - Sistema de notificações para VR
 * Toasts e alertas espaciais
 * 
 * Features:
 * - Toast notifications
 * - Auto-dismiss
 * - Queue system
 * - Different types (info, success, warning, error)
 * - Positioning options
 */
export class VRNotifications {
  private notifications: Map<string, {
    mesh: THREE.Mesh;
    label: THREE.Sprite;
    timestamp: number;
    duration: number;
  }> = new Map();
  
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private nextId: number = 0;
  
  // Configurações
  private readonly MAX_NOTIFICATIONS = 3;
  private readonly DEFAULT_DURATION = 3000; // ms
  private readonly SPACING = 0.3; // metros
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    console.log('🔔 VR Notifications initialized');
  }
  
  /**
   * Mostra notificação
   */
  public show(
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    duration: number = this.DEFAULT_DURATION
  ): string {
    const id = `notification_${this.nextId++}`;
    
    // Remove notificações antigas se limite atingido
    if (this.notifications.size >= this.MAX_NOTIFICATIONS) {
      const oldest = Array.from(this.notifications.keys())[0];
      this.dismiss(oldest);
    }
    
    // Cor baseada no tipo
    const color = this.getColorForType(type);
    
    // Cria mesh da notificação
    const geometry = new THREE.PlaneGeometry(0.6, 0.15);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Cria label
    const label = this.createLabel(message, type);
    
    // Posiciona notificação
    this.positionNotification(mesh, label, this.notifications.size);
    
    // Adiciona à cena
    this.scene.add(mesh);
    this.scene.add(label);
    
    // Armazena
    this.notifications.set(id, {
      mesh,
      label,
      timestamp: Date.now(),
      duration
    });
    
    // Auto-dismiss
    setTimeout(() => {
      this.dismiss(id);
    }, duration);
    
    console.log(`🔔 Notification: ${message} (${type})`);
    
    return id;
  }
  
  /**
   * Cria label de texto
   */
  private createLabel(text: string, type: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;
    
    // Background transparente
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Ícone baseado no tipo
    context.font = '48px Arial';
    const icon = this.getIconForType(type);
    context.fillText(icon, 20, 64);
    
    // Texto
    context.font = '32px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(text, 80, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.2, 0.3, 1);
    
    return sprite;
  }
  
  /**
   * Retorna cor para tipo
   */
  private getColorForType(type: string): number {
    switch (type) {
      case 'info': return 0x4444ff;
      case 'success': return 0x44ff44;
      case 'warning': return 0xffaa44;
      case 'error': return 0xff4444;
      default: return 0x4444ff;
    }
  }
  
  /**
   * Retorna ícone para tipo
   */
  private getIconForType(type: string): string {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }
  
  /**
   * Posiciona notificação
   */
  private positionNotification(mesh: THREE.Mesh, label: THREE.Sprite, index: number): void {
    // Posição na frente da câmera, acima do campo de visão
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    
    const distance = 1.5;
    const position = this.camera.position.clone().add(direction.multiplyScalar(distance));
    
    // Offset vertical baseado no índice
    position.y += 0.5 - (index * this.SPACING);
    
    mesh.position.copy(position);
    label.position.copy(position);
    
    // Faz olhar para câmera
    mesh.lookAt(this.camera.position);
    label.lookAt(this.camera.position);
  }
  
  /**
   * Fecha notificação
   */
  public dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;
    
    // Remove da cena
    this.scene.remove(notification.mesh);
    this.scene.remove(notification.label);
    
    // Dispose
    notification.mesh.geometry.dispose();
    (notification.mesh.material as THREE.Material).dispose();
    (notification.label.material as THREE.SpriteMaterial).map?.dispose();
    (notification.label.material as THREE.SpriteMaterial).dispose();
    
    this.notifications.delete(id);
    
    // Reposiciona notificações restantes
    this.repositionAll();
  }
  
  /**
   * Reposiciona todas as notificações
   */
  private repositionAll(): void {
    let index = 0;
    this.notifications.forEach((notification) => {
      this.positionNotification(notification.mesh, notification.label, index);
      index++;
    });
  }
  
  /**
   * Atualiza notificações (chamado a cada frame)
   */
  public update(): void {
    const now = Date.now();
    
    // Verifica notificações expiradas
    this.notifications.forEach((notification, id) => {
      if (now - notification.timestamp > notification.duration) {
        this.dismiss(id);
      }
    });
    
    // Atualiza posição para seguir câmera
    this.repositionAll();
  }
  
  /**
   * Limpa todas as notificações
   */
  public clearAll(): void {
    const ids = Array.from(this.notifications.keys());
    ids.forEach((id) => this.dismiss(id));
  }
  
  /**
   * Atalhos para tipos específicos
   */
  public info(message: string, duration?: number): string {
    return this.show(message, 'info', duration);
  }
  
  public success(message: string, duration?: number): string {
    return this.show(message, 'success', duration);
  }
  
  public warning(message: string, duration?: number): string {
    return this.show(message, 'warning', duration);
  }
  
  public error(message: string, duration?: number): string {
    return this.show(message, 'error', duration);
  }
}
