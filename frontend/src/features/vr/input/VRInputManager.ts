import * as THREE from 'three';
import { eventBus, EventType } from '../../core';

/**
 * VRInputManager - Gerenciador central de input VR
 * Integra controllers, gestures e haptic feedback
 * 
 * Features:
 * - Controller tracking (6DOF)
 * - Button/trigger events
 * - Thumbstick/trackpad input
 * - Squeeze/grip detection
 * - Haptic feedback API
 * - Hand tracking ready
 * 
 * Suporte: Oculus Quest, Valve Index, HTC Vive, Windows MR
 */
export class VRInputManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  
  // Controllers
  private controller1: THREE.XRTargetRaySpace | null = null;
  private controller2: THREE.XRTargetRaySpace | null = null;
  private controllerGrip1: THREE.XRGripSpace | null = null;
  private controllerGrip2: THREE.XRGripSpace | null = null;
  
  // Controller models
  private controllerModel1: THREE.Object3D | null = null;
  private controllerModel2: THREE.Object3D | null = null;
  
  // Input state
  private inputState = {
    controller1: {
      trigger: 0,
      grip: 0,
      thumbstick: new THREE.Vector2(),
      buttons: new Map<number, boolean>()
    },
    controller2: {
      trigger: 0,
      grip: 0,
      thumbstick: new THREE.Vector2(),
      buttons: new Map<number, boolean>()
    }
  };
  
  // Raycasting
  private raycaster: THREE.Raycaster;
  private tempMatrix: THREE.Matrix4;
  
  // Haptic feedback
  private hapticEnabled: boolean = true;
  
  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();
    
    console.log('🎮 VR Input Manager initialized');
  }
  
  /**
   * Inicializa controllers VR
   */
  public initialize(): void {
    if (!this.renderer.xr.enabled) {
      console.warn('⚠️ WebXR not enabled on renderer');
      return;
    }
    
    // Controller 1 (geralmente mão direita)
    this.controller1 = this.renderer.xr.getController(0);
    this.setupControllerEvents(this.controller1, 'controller1');
    this.scene.add(this.controller1);
    
    // Controller 2 (geralmente mão esquerda)
    this.controller2 = this.renderer.xr.getController(1);
    this.setupControllerEvents(this.controller2, 'controller2');
    this.scene.add(this.controller2);
    
    // Controller grips (para segurar objetos)
    this.controllerGrip1 = this.renderer.xr.getControllerGrip(0);
    this.scene.add(this.controllerGrip1);
    
    this.controllerGrip2 = this.renderer.xr.getControllerGrip(1);
    this.scene.add(this.controllerGrip2);
    
    // Adiciona visuais
    this.addControllerVisuals();
    
    console.log('✅ VR Controllers initialized');
  }
  
  /**
   * Configura eventos de um controller
   */
  private setupControllerEvents(controller: THREE.XRTargetRaySpace, id: string): void {
    controller.addEventListener('selectstart', (event) => {
      this.onSelectStart(event, id);
    });
    
    controller.addEventListener('selectend', (event) => {
      this.onSelectEnd(event, id);
    });
    
    controller.addEventListener('squeezestart', (event) => {
      this.onSqueezeStart(event, id);
    });
    
    controller.addEventListener('squeezeend', (event) => {
      this.onSqueezeEnd(event, id);
    });
    
    controller.addEventListener('connected', (event: any) => {
      this.onControllerConnected(event, id);
    });
    
    controller.addEventListener('disconnected', (event) => {
      this.onControllerDisconnected(event, id);
    });
  }
  
  /**
   * Adiciona visuais dos controllers
   */
  private addControllerVisuals(): void {
    // Linha de raycasting
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
    
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });
    
    if (this.controller1) {
      const line1 = new THREE.Line(geometry, material);
      line1.name = 'ray';
      line1.scale.z = 5;
      this.controller1.add(line1.clone());
    }
    
    if (this.controller2) {
      const line2 = new THREE.Line(geometry, material);
      line2.name = 'ray';
      line2.scale.z = 5;
      this.controller2.add(line2.clone());
    }
    
    // Modelo 3D dos controllers (pode ser customizado)
    this.createControllerModels();
  }
  
  /**
   * Cria modelos 3D dos controllers
   */
  private createControllerModels(): void {
    // Modelo simples (pode ser substituído por modelos GLTF)
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    this.controllerModel1 = new THREE.Mesh(geometry, material);
    this.controllerModel1.rotation.x = Math.PI / 2;
    
    this.controllerModel2 = new THREE.Mesh(geometry, material.clone());
    this.controllerModel2.rotation.x = Math.PI / 2;
    
    if (this.controllerGrip1) {
      this.controllerGrip1.add(this.controllerModel1);
    }
    
    if (this.controllerGrip2) {
      this.controllerGrip2.add(this.controllerModel2);
    }
  }
  
  /**
   * Evento de select start (trigger pressionado)
   */
  private onSelectStart(_event: THREE.Event, controllerId: string): void {
    console.log(`🎯 Select start: ${controllerId}`);
    
    eventBus.emit(EventType.TOOL_ACTIVATED, {
      toolType: `VRInput:${controllerId}:select`
    });
  }
  
  /**
   * Evento de select end (trigger solto)
   */
  private onSelectEnd(_event: THREE.Event, controllerId: string): void {
    console.log(`🎯 Select end: ${controllerId}`);
    
    eventBus.emit(EventType.TOOL_DEACTIVATED, {
      toolType: `VRInput:${controllerId}:select`
    });
  }
  
  /**
   * Evento de squeeze start (grip pressionado)
   */
  private onSqueezeStart(_event: THREE.Event, controllerId: string): void {
    console.log(`✊ Squeeze start: ${controllerId}`);
    
    // Vibração ao segurar
    this.triggerHapticPulse(controllerId as 'controller1' | 'controller2', 0.5, 100);
    
    eventBus.emit(EventType.TOOL_ACTIVATED, {
      toolType: `VRInput:${controllerId}:squeeze`
    });
  }
  
  /**
   * Evento de squeeze end (grip solto)
   */
  private onSqueezeEnd(_event: THREE.Event, controllerId: string): void {
    console.log(`✋ Squeeze end: ${controllerId}`);
    
    eventBus.emit(EventType.TOOL_DEACTIVATED, {
      toolType: `VRInput:${controllerId}:squeeze`
    });
  }
  
  /**
   * Evento de controller conectado
   */
  private onControllerConnected(event: any, controllerId: string): void {
    console.log(`🔌 Controller connected: ${controllerId}`, event.data);
    
    const gamepad = event.data.gamepad;
    if (gamepad) {
      console.log(`   Type: ${gamepad.id}`);
      console.log(`   Buttons: ${gamepad.buttons.length}`);
      console.log(`   Axes: ${gamepad.axes.length}`);
    }
  }
  
  /**
   * Evento de controller desconectado
   */
  private onControllerDisconnected(_event: THREE.Event, controllerId: string): void {
    console.log(`🔌 Controller disconnected: ${controllerId}`);
  }
  
  /**
   * Atualiza input state (chamado a cada frame)
   */
  public update(): void {
    const session = this.renderer.xr.getSession();
    if (!session) return;
    
    // Atualiza state dos controllers
    const inputSources = session.inputSources;
    
    inputSources.forEach((source, index) => {
      if (source.gamepad) {
        const controllerId = index === 0 ? 'controller1' : 'controller2';
        const state = this.inputState[controllerId];
        
        // Trigger (botão 0)
        if (source.gamepad.buttons[0]) {
          state.trigger = source.gamepad.buttons[0].value;
        }
        
        // Grip (botão 1)
        if (source.gamepad.buttons[1]) {
          state.grip = source.gamepad.buttons[1].value;
        }
        
        // Thumbstick (axes 2, 3)
        if (source.gamepad.axes.length >= 4) {
          state.thumbstick.set(
            source.gamepad.axes[2],
            source.gamepad.axes[3]
          );
        }
        
        // Outros botões
        source.gamepad.buttons.forEach((button, btnIndex) => {
          state.buttons.set(btnIndex, button.pressed);
        });
      }
    });
  }
  
  /**
   * Raycast do controller
   */
  public raycast(controllerId: 'controller1' | 'controller2', objects: THREE.Object3D[]): THREE.Intersection[] {
    const controller = controllerId === 'controller1' ? this.controller1 : this.controller2;
    if (!controller) return [];
    
    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
    
    return this.raycaster.intersectObjects(objects, true);
  }
  
  /**
   * Vibração háptica
   */
  public triggerHapticPulse(
    controllerId: 'controller1' | 'controller2',
    intensity: number = 1.0,
    duration: number = 100
  ): void {
    if (!this.hapticEnabled) return;
    
    const session = this.renderer.xr.getSession();
    if (!session) return;
    
    const index = controllerId === 'controller1' ? 0 : 1;
    const inputSource = session.inputSources[index];
    
    if (inputSource && inputSource.gamepad && inputSource.gamepad.hapticActuators) {
      const actuator = inputSource.gamepad.hapticActuators[0];
      if (actuator) {
        actuator.pulse(intensity, duration);
      }
    }
  }
  
  /**
   * Retorna posição do controller
   */
  public getControllerPosition(controllerId: 'controller1' | 'controller2'): THREE.Vector3 | null {
    const controller = controllerId === 'controller1' ? this.controller1 : this.controller2;
    if (!controller) return null;
    
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(controller.matrixWorld);
    return position;
  }
  
  /**
   * Retorna rotação do controller
   */
  public getControllerRotation(controllerId: 'controller1' | 'controller2'): THREE.Quaternion | null {
    const controller = controllerId === 'controller1' ? this.controller1 : this.controller2;
    if (!controller) return null;
    
    const quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(controller.matrixWorld);
    return quaternion;
  }
  
  /**
   * Retorna valor do trigger
   */
  public getTriggerValue(controllerId: 'controller1' | 'controller2'): number {
    return this.inputState[controllerId].trigger;
  }
  
  /**
   * Retorna valor do grip
   */
  public getGripValue(controllerId: 'controller1' | 'controller2'): number {
    return this.inputState[controllerId].grip;
  }
  
  /**
   * Retorna posição do thumbstick
   */
  public getThumbstick(controllerId: 'controller1' | 'controller2'): THREE.Vector2 {
    return this.inputState[controllerId].thumbstick.clone();
  }
  
  /**
   * Verifica se botão está pressionado
   */
  public isButtonPressed(controllerId: 'controller1' | 'controller2', buttonIndex: number): boolean {
    return this.inputState[controllerId].buttons.get(buttonIndex) || false;
  }
  
  /**
   * Habilita/desabilita haptic feedback
   */
  public setHapticEnabled(enabled: boolean): void {
    this.hapticEnabled = enabled;
    console.log(`🎮 Haptic feedback: ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    if (this.controller1) this.scene.remove(this.controller1);
    if (this.controller2) this.scene.remove(this.controller2);
    if (this.controllerGrip1) this.scene.remove(this.controllerGrip1);
    if (this.controllerGrip2) this.scene.remove(this.controllerGrip2);
    
    console.log('🗑️ VR Input Manager disposed');
  }
}
