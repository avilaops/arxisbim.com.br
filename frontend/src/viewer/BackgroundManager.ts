/**
 * BackgroundManager - Gerencia fundos da cena 3D
 * Aplica gradientes infinitos e grids otimizados para BIM
 */

import * as THREE from 'three';
import { BACKGROUND_PRESETS, BackgroundPreset, getBackgroundPreset } from './BackgroundPresets';

export class BackgroundManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private currentPreset: BackgroundPreset;
  private gridHelper: THREE.GridHelper | null = null;
  private fog: THREE.Fog | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, presetId: string = 'HORIZON') {
    this.scene = scene;
    this.camera = camera;
    
    console.log('🔵 BackgroundManager constructor called with:', {
      presetId,
      sceneChildren: scene.children.length
    });
    
    const preset = getBackgroundPreset(presetId) || BACKGROUND_PRESETS.HORIZON;
    this.currentPreset = preset;
    
    this.applyPreset(preset);
    console.log(`🌄 Background preset applied: ${preset.name}`, {
      gridEnabled: preset.grid?.enabled,
      sceneChildren: this.scene.children.length,
      sceneChildrenNames: this.scene.children.map(c => c.name || c.type)
    });
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
   * Apply background gradient
   */
  private applyBackground(preset: BackgroundPreset): void {
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

    if (preset.grid && preset.grid.enabled) {
      const gridColor = new THREE.Color(preset.grid.color);
      const centerLineColor = gridColor.clone().multiplyScalar(1.2);

      this.gridHelper = new THREE.GridHelper(
        preset.grid.size,
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
        size: preset.grid.size,
        divisions: preset.grid.divisions,
        opacity: opacity,
        position: this.gridHelper.position.toArray(),
        visible: this.gridHelper.visible,
        frustumCulled: this.gridHelper.frustumCulled,
        inScene: this.scene.getObjectByName('ground-grid') !== undefined
      });
    } else {
      console.log('ℹ️ Grid desabilitado para este preset');
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
    if (this.currentPreset.grid?.enabled) {
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
   * Cleanup
   */
  public dispose(): void {
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
