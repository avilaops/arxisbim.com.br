/**
 * BackgroundManager - Gerencia fundos da cena 3D
 * Aplica gradientes infinitos e grids otimizados para BIM
 */

import * as THREE from 'three';
import { BACKGROUND_PRESETS, BackgroundPreset, getBackgroundPreset } from './BackgroundPresets';
import { PhysicalSkyEnvironment } from './PhysicalSkyEnvironment.js';

const GRID_MAX_SIZE_METERS = 2000;
const GRID_MIN_SIZE_METERS = 10;

interface GridRuntimeConfig {
  enabled: boolean;
  size: number;
}

export class BackgroundManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer | null = null;
  private currentPreset: BackgroundPreset;
  private gridHelper: THREE.GridHelper | null = null;
  private fog: THREE.Fog | null = null;
  private gridRuntime: GridRuntimeConfig;
  private physicalSky: PhysicalSkyEnvironment | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, presetId: string = 'SKY_NOON', renderer?: THREE.WebGLRenderer) {
    this.renderer = renderer ?? null;
    this.scene = scene;
    this.camera = camera;
    this.gridRuntime = this.resolveGridRuntimeConfig();
    
    console.log('🔵 BackgroundManager constructor called with:', {
      presetId,
      sceneChildren: scene.children.length
    });
    
    const preset = getBackgroundPreset(presetId) || BACKGROUND_PRESETS.HORIZON;
    this.currentPreset = preset;
    
    this.applyPreset(preset);
    console.log(`🌄 Background preset applied: ${preset.name}`, {
      gridEnabled: preset.grid?.enabled,
      gridRuntime: this.gridRuntime,
      sceneChildren: this.scene.children.length,
      sceneChildrenNames: this.scene.children.map(c => c.name || c.type)
    });
  }

  private parseBoolean(value: string | null | undefined, fallback: boolean): boolean {
    if (value === null || value === undefined || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
  }

  private clampGridSize(size: number): number {
    return Math.max(GRID_MIN_SIZE_METERS, Math.min(GRID_MAX_SIZE_METERS, size));
  }

  private resolveGridRuntimeConfig(): GridRuntimeConfig {
    const envEnabled = this.parseBoolean((import.meta as any).env?.VITE_GRID_ENABLED, false);
    const savedEnabled = localStorage.getItem('arxis:gridEnabled');
    const enabled = this.parseBoolean(savedEnabled, envEnabled);

    const envSizeRaw = Number((import.meta as any).env?.VITE_GRID_SIZE);
    const envSize = Number.isFinite(envSizeRaw) && envSizeRaw > 0 ? envSizeRaw : 1000;

    const savedSizeRaw = Number(localStorage.getItem('arxis:gridSize'));
    const sizeCandidate = Number.isFinite(savedSizeRaw) && savedSizeRaw > 0 ? savedSizeRaw : envSize;

    return {
      enabled,
      size: this.clampGridSize(sizeCandidate)
    };
  }

  /**
   * Apply background preset
   */
  public applyPreset(preset: BackgroundPreset | string): void {
    const presetObj = typeof preset === 'string' 
      ? getBackgroundPreset(preset) || BACKGROUND_PRESETS.HORIZON
      : preset;
    
    this.currentPreset = presetObj;

    // Apply background color/gradient
    this.applyBackground(presetObj);

    // Apply fog
    this.applyFog(presetObj);

    // Apply grid
    this.applyGrid(presetObj);

    console.log(`🎨 Background changed to: ${presetObj.name}`);
  }

  /**
   * Destroys current physical sky if active
   */
  private disposePhysicalSky(): void {
    if (this.physicalSky) {
      this.physicalSky.dispose();
      this.physicalSky = null;
    }
  }

  /**
   * Apply background gradient
   */
  private applyBackground(preset: BackgroundPreset): void {
    // Physical sky — delega para PhysicalSkyEnvironment
    if (preset.type === 'physical-sky') {
      if (!this.renderer) {
        console.warn('[BackgroundManager] renderer not provided — physical sky requires WebGLRenderer');
        return;
      }
      this.disposePhysicalSky();
      this.physicalSky = new PhysicalSkyEnvironment(
        this.scene,
        this.renderer,
        preset.physicalSkyPreset ?? 'NOON'
      );
      return;
    }

    // Dispose physical sky when switching to flat preset
    this.disposePhysicalSky();
    // SIMPLIFICADO: Usar apenas scene.background (sem sky dome)
    // Sky domes podem causar conflitos de rendering com viewports pequenos
    
    // Remove old sky if exists
    const oldSky = this.scene.getObjectByName('sky-background');
    if (oldSky) {
      this.scene.remove(oldSky);
    }
    
    if (preset.type === 'gradient') {
      // Usar apenas a cor de baixo como background sólido
      this.scene.background = new THREE.Color(preset.colors.bottom);
      console.log('🎨 Background: solid color (bottom)', preset.colors.bottom);
    } else {
      // Solid color
      this.scene.background = new THREE.Color(preset.colors.top);
      console.log('🎨 Background: solid color (top)', preset.colors.top);
    }
  }

  /**
   * Apply fog for depth perception
   */
  private applyFog(preset: BackgroundPreset): void {
    // Remove old fog
    if (this.fog) {
      this.scene.fog = null;
      this.fog = null;
    }

    if (preset.fog && preset.fog.enabled) {
      const fogColor = new THREE.Color(preset.fog.color);
      this.fog = new THREE.Fog(fogColor, preset.fog.near, preset.fog.far);
      this.scene.fog = this.fog;
    }
  }

  /**
   * Apply infinite grid
   */
  private applyGrid(preset: BackgroundPreset): void {
    // Remove old grid
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
      this.gridHelper = null;
      console.log('🗑️ Old grid removed');
    }

    if (preset.grid && preset.grid.enabled && this.gridRuntime.enabled) {
      const gridSize = this.clampGridSize(this.gridRuntime.size || preset.grid.size);
      const gridColor = new THREE.Color(preset.grid.color);
      const centerLineColor = gridColor.clone().multiplyScalar(1.2);

      this.gridHelper = new THREE.GridHelper(
        gridSize,
        preset.grid.divisions,
        centerLineColor,
        gridColor
      );

      // Aplicar opacidade do preset
      const opacity = preset.grid.opacity || 0.25;
      if (this.gridHelper.material instanceof THREE.Material) {
        this.gridHelper.material.opacity = opacity;
        this.gridHelper.material.transparent = opacity < 1.0;
        this.gridHelper.material.depthTest = true;
        this.gridHelper.material.depthWrite = false;
      }

      this.gridHelper.name = 'ground-grid';
      this.gridHelper.position.y = 0;
      this.gridHelper.visible = true;
      
      // Desabilitar frustum culling para grid infinito
      this.gridHelper.frustumCulled = false;
      
      this.scene.add(this.gridHelper);
      
      // Forçar atualização de transformação
      this.gridHelper.updateMatrixWorld(true);
      
      console.log(`✅ Grid configurado:`, {
        size: gridSize,
        maxSize: GRID_MAX_SIZE_METERS,
        divisions: preset.grid.divisions,
        opacity: opacity,
        position: this.gridHelper.position.toArray(),
        visible: this.gridHelper.visible,
        frustumCulled: this.gridHelper.frustumCulled,
        inScene: this.scene.getObjectByName('ground-grid') !== undefined
      });
    } else {
      console.log('ℹ️ Grid desabilitado para este preset/runtime');
    }
  }

  /**
   * Get current preset
   */
  public getCurrentPreset(): BackgroundPreset {
    return this.currentPreset;
  }

  /**
   * Toggle grid visibility
   */
  public toggleGrid(visible?: boolean): void {
    if (this.gridHelper) {
      const oldVisible = this.gridHelper.visible;
      this.gridHelper.visible = visible !== undefined ? visible : !this.gridHelper.visible;
      console.log(`🔲 Grid toggled: ${oldVisible} → ${this.gridHelper.visible}`, {
        position: this.gridHelper.position,
        inScene: this.scene.getObjectByName('ground-grid') !== undefined
      });
    } else {
      console.warn('⚠️ Grid not initialized. Re-applying preset to create grid.');
      this.applyGrid(this.currentPreset);
    }
  }

  /**
   * Ensure grid is present in scene (fix if missing)
   */
  public ensureGridVisible(): void {
    if (this.currentPreset.grid?.enabled && this.gridRuntime.enabled) {
      if (!this.gridHelper || !this.scene.getObjectByName('ground-grid')) {
        console.warn('⚠️ Grid missing from scene. Recreating...');
        this.applyGrid(this.currentPreset);
      } else if (this.gridHelper && !this.gridHelper.visible) {
        this.gridHelper.visible = true;
        console.log('✅ Grid visibility restored');
      }
    }
  }

  /**
   * Set grid opacity
   */
  public setGridOpacity(opacity: number): void {
    if (this.gridHelper && this.gridHelper.material instanceof THREE.Material) {
      this.gridHelper.material.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * Runtime grid config (persisted)
   * size is clamped to [10, 2000] meters.
   */
  public setGridConfig(config: Partial<GridRuntimeConfig>): GridRuntimeConfig {
    if (typeof config.enabled === 'boolean') {
      this.gridRuntime.enabled = config.enabled;
      localStorage.setItem('arxis:gridEnabled', String(config.enabled));
    }

    if (typeof config.size === 'number' && Number.isFinite(config.size)) {
      this.gridRuntime.size = this.clampGridSize(config.size);
      localStorage.setItem('arxis:gridSize', String(this.gridRuntime.size));
    }

    this.applyGrid(this.currentPreset);
    return { ...this.gridRuntime };
  }

  public getGridConfig(): GridRuntimeConfig {
    return { ...this.gridRuntime };
  }

  /**
   * Fit physical sky to loaded model bounding box
   */
  public fitToModel(box: THREE.Box3): void {
    if (this.physicalSky) {
      this.physicalSky.fitToModel(box);
    }
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.disposePhysicalSky();
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper.dispose();
    }

    const sky = this.scene.getObjectByName('sky-background');
    if (sky) {
      this.scene.remove(sky);
      if (sky instanceof THREE.Mesh) {
        sky.geometry.dispose();
        if (sky.material instanceof THREE.Material) {
          sky.material.dispose();
        }
      }
    }

    this.scene.fog = null;
  }
}
