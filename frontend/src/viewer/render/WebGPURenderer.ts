import {
  WebGPUEngine,
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
} from '@babylonjs/core';

export class WebGPURenderer {
  public engine!: any;
  public scene!: Scene;
  public camera!: ArcRotateCamera;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public async initialize(): Promise<void> {
    const isWebGPUSupported = await WebGPUEngine.IsSupportedAsync;
    if (isWebGPUSupported) {
      const webGPUEngine = new WebGPUEngine(this.canvas, {
        antialias: true,
      });
      await webGPUEngine.initAsync();
      this.engine = webGPUEngine;
    } else {
      console.warn('WebGPU not supported, falling back to WebGL');
      this.engine = new Engine(this.canvas, true);
    }

    this.scene = new Scene(this.engine);
    this.setupCamera();
    this.setupLights();
    this.startRenderLoop();
  }

  private setupCamera(): void {
    this.camera = new ArcRotateCamera(
      'mainCamera',
      0,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(this.canvas, true);
    
    // Configurações de restrições orbitais da câmera
    this.camera.lowerRadiusLimit = 1;
    this.camera.upperRadiusLimit = 1000;
    this.camera.panningSensibility = 50;
    this.camera.wheelPrecision = 50;
  }

  private setupLights(): void {
    const light = new HemisphericLight(
      'ambientLight',
      new Vector3(0, 1, 0),
      this.scene
    );
    light.intensity = 0.8;
  }

  private startRenderLoop(): void {
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });

    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.engine.resize();
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.engine.dispose();
  }
}
