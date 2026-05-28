/**
 * WebGPU Renderer Wrapper
 * Sistema de abstração para WebGPU (futuro) + fallback WebGL2/WebGL1
 * Prepara o código para quando Three.js tiver suporte estável a WebGPU
 */

import * as THREE from 'three';

export type RenderingBackend = 'webgpu' | 'webgl2' | 'webgl1';

// WebGPU types (quando não disponível no TypeScript)
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(options?: { powerPreference?: string }): Promise<GPUAdapter | null>;
    };
  }
}

type GPUAdapter = any;
type GPUDevice = any;
type GPUComputePipeline = any;
type GPUBuffer = any;

export interface RendererCapabilities {
  backend: RenderingBackend;
  maxTextureSize: number;
  maxAnisotropy: number;
  maxSamples: number;
  supportsFloatTextures: boolean;
  supportsHalfFloatTextures: boolean;
  supportsDepthTexture: boolean;
  supportsInstancedArrays: boolean;
  supportsVertexArrayObjects: boolean;
  supportsMultipleRenderTargets: boolean;
  supportsComputeShaders: boolean;
  supportsRaytracing: boolean;
  maxComputeWorkgroupSize?: [number, number, number];
  maxStorageBufferBindingSize?: number;
  maxUniformBufferBindingSize: number;
  maxVertexAttributes: number;
  maxVertexUniformVectors: number;
  maxFragmentUniformVectors: number;
  maxVaryingVectors: number;
  shadingLanguage: string;
}

export interface WebGPUFeatures {
  timestamp_query: boolean;
  pipeline_statistics_query: boolean;
  texture_compression_bc: boolean;
  texture_compression_etc2: boolean;
  texture_compression_astc: boolean;
  depth_clip_control: boolean;
  depth32float_stencil8: boolean;
  indirect_first_instance: boolean;
  shader_f16: boolean;
  rg11b10ufloat_renderable: boolean;
  bgra8unorm_storage: boolean;
  float32_filterable: boolean;
}

/**
 * Sistema de rendering unificado com suporte WebGPU/WebGL
 */
export class UnifiedRenderer {
  private renderer: THREE.WebGLRenderer; // Por enquanto apenas WebGL
  private backend: RenderingBackend = 'webgl2';
  private capabilities: RendererCapabilities;
  private webgpuAdapter: GPUAdapter | null = null;
  private webgpuDevice: GPUDevice | null = null;
  private webgpuFeatures: Partial<WebGPUFeatures> = {};

  constructor(canvas?: HTMLCanvasElement) {
    console.log('🎨 Unified Renderer initializing...');

    // Detecta suporte WebGPU
    this.detectWebGPUSupport();

    // Por enquanto, usa WebGL (Three.js WebGPU ainda não está estável)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: true,
      depth: true,
      logarithmicDepthBuffer: false, // Pode causar problemas com precision
      preserveDrawingBuffer: false
    });

    // Detecta backend WebGL
    const gl = this.renderer.getContext() as WebGL2RenderingContext | WebGLRenderingContext;
    this.backend = gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1';

    // Configura renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Captura capabilities
    this.capabilities = this.buildCapabilities();

    console.log(`🎨 Renderer initialized:`, {
      backend: this.backend,
      maxTextureSize: this.capabilities.maxTextureSize,
      maxAnisotropy: this.capabilities.maxAnisotropy,
      computeShaders: this.capabilities.supportsComputeShaders,
      raytracing: this.capabilities.supportsRaytracing
    });
  }

  /**
   * Detecta suporte WebGPU no navegador
   */
  private async detectWebGPUSupport(): Promise<boolean> {
    if (!('gpu' in navigator)) {
      console.log('⚠️ WebGPU not supported in this browser');
      return false;
    }

    try {
      // @ts-ignore - WebGPU API experimental
      const adapter = await navigator.gpu?.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.log('⚠️ No WebGPU adapter available');
        return false;
      }

      this.webgpuAdapter = adapter;

      // Solicita device
      const device = await adapter.requestDevice();
      this.webgpuDevice = device;

      // Captura features
      adapter.features.forEach((feature) => {
        // @ts-ignore
        this.webgpuFeatures[feature] = true;
      });

      console.log('✅ WebGPU is available!', {
        adapter: adapter.name,
        features: Array.from(adapter.features)
      });

      return true;
    } catch (error) {
      console.log('⚠️ WebGPU detection failed:', error);
      return false;
    }
  }

  /**
   * Retorna capabilities do renderer atual
   */
  private buildCapabilities(): RendererCapabilities {
    const gl = this.renderer.getContext() as WebGL2RenderingContext | WebGLRenderingContext;
    const glCapabilities = this.renderer.capabilities;

    const caps: RendererCapabilities = {
      backend: this.backend,
      maxTextureSize: glCapabilities.maxTextureSize,
      maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy(),
      maxSamples: glCapabilities.maxSamples || 0,
      supportsFloatTextures: glCapabilities.isWebGL2 || !!gl.getExtension('OES_texture_float'),
      supportsHalfFloatTextures: glCapabilities.isWebGL2 || !!gl.getExtension('OES_texture_half_float'),
      supportsDepthTexture: glCapabilities.isWebGL2 || !!gl.getExtension('WEBGL_depth_texture'),
      supportsInstancedArrays: glCapabilities.isWebGL2 || !!gl.getExtension('ANGLE_instanced_arrays'),
      supportsVertexArrayObjects: glCapabilities.isWebGL2 || !!gl.getExtension('OES_vertex_array_object'),
      supportsMultipleRenderTargets: glCapabilities.isWebGL2 || !!gl.getExtension('WEBGL_draw_buffers'),
      supportsComputeShaders: false, // WebGL não suporta
      supportsRaytracing: false, // WebGL não suporta
      maxUniformBufferBindingSize: 16384,
      maxVertexAttributes: glCapabilities.maxAttributes || 16,
      maxVertexUniformVectors: glCapabilities.maxVertexUniforms || 256,
      maxFragmentUniformVectors: glCapabilities.maxFragmentUniforms || 256,
      maxVaryingVectors: glCapabilities.maxVaryings || 8,
      shadingLanguage: this.backend === 'webgl2' ? 'GLSL ES 3.00' : 'GLSL ES 1.00'
    };

    // Se WebGPU disponível, adiciona capabilities específicas
    if (this.webgpuDevice) {
      const limits = this.webgpuAdapter!.limits;
      
      caps.supportsComputeShaders = true;
      caps.maxComputeWorkgroupSize = [
        limits.maxComputeWorkgroupSizeX || 256,
        limits.maxComputeWorkgroupSizeY || 256,
        limits.maxComputeWorkgroupSizeZ || 64
      ];
      caps.maxStorageBufferBindingSize = limits.maxStorageBufferBindingSize || 134217728; // 128MB
      caps.shadingLanguage = 'WGSL';
    }

    return caps;
  }

  /**
   * Retorna renderer Three.js
   */
  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Retorna backend atual
   */
  public getBackend(): RenderingBackend {
    return this.backend;
  }

  /**
   * Retorna capabilities
   */
  public getCapabilities(): RendererCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Verifica se WebGPU está disponível
   */
  public hasWebGPU(): boolean {
    return this.webgpuDevice !== null;
  }

  /**
   * Retorna WebGPU device (se disponível)
   */
  public getWebGPUDevice(): GPUDevice | null {
    return this.webgpuDevice;
  }

  /**
   * Retorna features WebGPU
   */
  public getWebGPUFeatures(): Partial<WebGPUFeatures> {
    return { ...this.webgpuFeatures };
  }

  /**
   * Renderiza cena
   */
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /**
   * Define tamanho do renderer
   */
  public setSize(width: number, height: number, updateStyle: boolean = true): void {
    this.renderer.setSize(width, height, updateStyle);
  }

  /**
   * Define pixel ratio
   */
  public setPixelRatio(ratio: number): void {
    this.renderer.setPixelRatio(ratio);
  }

  /**
   * Ativa/desativa shadows
   */
  public setShadowsEnabled(enabled: boolean): void {
    this.renderer.shadowMap.enabled = enabled;
  }

  /**
   * Define tipo de shadow map
   */
  public setShadowMapType(type: THREE.ShadowMapType): void {
    this.renderer.shadowMap.type = type;
  }

  /**
   * Define tone mapping
   */
  public setToneMapping(mapping: THREE.ToneMapping, exposure: number = 1.0): void {
    this.renderer.toneMapping = mapping;
    this.renderer.toneMappingExposure = exposure;
  }

  /**
   * Captura screenshot da cena
   */
  public captureScreenshot(
    format: 'png' | 'jpeg' = 'png',
    quality: number = 1.0
  ): string {
    return this.renderer.domElement.toDataURL(
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality
    );
  }

  /**
   * Retorna informações de rendering
   */
  public getRenderInfo(): {
    triangles: number;
    geometries: number;
    textures: number;
    programs: number;
    calls: number;
    points: number;
    lines: number;
  } {
    const info = this.renderer.info;
    
    return {
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length || 0,
      calls: info.render.calls,
      points: info.render.points,
      lines: info.render.lines
    };
  }

  /**
   * Limpa recursos
   */
  public dispose(): void {
    this.renderer.dispose();
    
    if (this.webgpuDevice) {
      this.webgpuDevice.destroy();
    }

    console.log('🎨 Renderer disposed');
  }

  /**
   * Reporta compatibilidade do navegador
   */
  public getCompatibilityReport(): {
    webgpu: boolean;
    webgl2: boolean;
    webgl1: boolean;
    recommended: RenderingBackend;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    const hasWebGPU = this.hasWebGPU();
    const hasWebGL2 = this.backend === 'webgl2';
    const hasWebGL1 = this.backend === 'webgl1';

    if (!hasWebGL2 && !hasWebGPU) {
      warnings.push('WebGL2 not available, using WebGL1 (reduced performance)');
    }

    if (!this.capabilities.supportsFloatTextures) {
      issues.push('Float textures not supported (HDR rendering unavailable)');
    }

    if (!this.capabilities.supportsInstancedArrays) {
      issues.push('Instanced rendering not supported (poor performance with many objects)');
    }

    if (this.capabilities.maxTextureSize < 4096) {
      warnings.push(`Low max texture size: ${this.capabilities.maxTextureSize}px`);
    }

    let recommended: RenderingBackend = 'webgl1';
    if (hasWebGPU) {
      recommended = 'webgpu';
    } else if (hasWebGL2) {
      recommended = 'webgl2';
    }

    return {
      webgpu: hasWebGPU,
      webgl2: hasWebGL2 || hasWebGPU,
      webgl1: hasWebGL1 || hasWebGL2 || hasWebGPU,
      recommended,
      issues,
      warnings
    };
  }

  /**
   * Cria compute shader (WebGPU only)
   * Retorna null se WebGPU não disponível
   */
  public createComputeShader(
    code: string,
    workgroupSize: [number, number, number] = [8, 8, 1]
  ): GPUComputePipeline | null {
    if (!this.webgpuDevice) {
      console.warn('⚠️ Compute shaders require WebGPU');
      return null;
    }

    try {
      const shaderModule = this.webgpuDevice.createShaderModule({
        code
      });

      const pipeline = this.webgpuDevice.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main'
        }
      });

      console.log('✅ Compute shader created', workgroupSize);
      return pipeline;
    } catch (error) {
      console.error('❌ Failed to create compute shader:', error);
      return null;
    }
  }

  /**
   * Executa compute shader
   */
  public async executeComputeShader(
    pipeline: GPUComputePipeline,
    workgroups: [number, number, number],
    buffers: { binding: number; buffer: GPUBuffer }[]
  ): Promise<boolean> {
    if (!this.webgpuDevice) return false;

    try {
      const bindGroupLayout = pipeline.getBindGroupLayout(0);
      
      const bindGroup = this.webgpuDevice.createBindGroup({
        layout: bindGroupLayout,
        entries: buffers.map((b) => ({
          binding: b.binding,
          resource: { buffer: b.buffer }
        }))
      });

      const commandEncoder = this.webgpuDevice.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(...workgroups);
      passEncoder.end();

      this.webgpuDevice.queue.submit([commandEncoder.finish()]);
      await this.webgpuDevice.queue.onSubmittedWorkDone();

      return true;
    } catch (error) {
      console.error('❌ Failed to execute compute shader:', error);
      return false;
    }
  }
}

/**
 * Factory para criar renderer otimizado
 */
export function createRenderer(canvas?: HTMLCanvasElement): UnifiedRenderer {
  return new UnifiedRenderer(canvas);
}
