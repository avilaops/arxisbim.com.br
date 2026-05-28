/**
 * IFC Module Integration Example
 * Shows how to integrate IFC upload and management into ArxisVR viewer
 */

import { eventBus } from '../../core';
import { getIFCUploadManager } from './IFCUploadManager';
import { IFCProjectPanel } from './IFCProjectPanel';
import type { IfcDiscipline, IfcModel, IfcPhase } from '../../api/v1/services';
import type { IFCSimpleLoader } from '../../loaders/IFCSimpleLoader';
import type { Scene } from 'three';
import type { IFCUploadProgress } from './IFCUploadManager';

/**
 * Example: Initialize IFC module in viewer
 */
export async function initializeIFCModule(
  scene: Scene,
  ifcLoader: IFCSimpleLoader,
  projectId: string
): Promise<{ panel: IFCProjectPanel }> {
  
  // 1. Initialize Upload Manager
  const uploadManager = getIFCUploadManager();
  uploadManager.initialize(ifcLoader, scene);
  
  console.log('✅ IFC Upload Manager initialized');

  // 2. Create Project Panel
  const panel = new IFCProjectPanel({
    projectId,
    onModelSelected: (model) => {
      console.log('Model selected:', model.originalName);
    },
    onModelLoaded: (model) => {
      console.log('Model loaded into scene:', model.originalName);
    }
  });

  await panel.create();
  console.log('✅ IFC Project Panel created');

  // 3. Add toggle button to toolbar (example)
  addPanelToggleButton(panel);

  return { panel };
}

/**
 * Example: Add toggle button to toolbar
 */
function addPanelToggleButton(panel: IFCProjectPanel): void {
  const button = document.createElement('button');
  button.id = 'ifc-panel-toggle';
  button.innerHTML = '🏗️';
  button.title = 'Modelos IFC';
  button.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: #00ff88;
    font-size: 24px;
    cursor: pointer;
    z-index: 999;
    transition: all 0.3s;
    backdrop-filter: blur(10px);
  `;

  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(0, 255, 136, 0.2)';
    button.style.transform = 'scale(1.1)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'rgba(0, 255, 136, 0.1)';
    button.style.transform = 'scale(1)';
  });

  button.addEventListener('click', () => {
    panel.toggle();
    button.style.borderColor = panel['panel']?.classList.contains('visible')
      ? '#00ff88'
      : 'rgba(0, 255, 136, 0.3)';
  });

  document.body.appendChild(button);
}

/**
 * Example: Programmatic upload
 */
export async function uploadIFCProgrammatically(
  file: File,
  projectId: string,
  options?: {
    discipline?: string;
    phase?: string;
    description?: string;
    autoLoad?: boolean;
  }
): Promise<void> {
  const uploadManager = getIFCUploadManager();

  try {
    const model = await uploadManager.upload({
      file,
      projectId,
      discipline: (options?.discipline || 'architecture') as IfcDiscipline,
      phase: options?.phase as IfcPhase | undefined,
      description: options?.description,
      autoLoad: options?.autoLoad ?? true,
      captureThumbnail: true
    });

    console.log('✅ Upload complete:', model);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    throw error;
  }
}

/**
 * Example: List and load models
 */
export async function loadProjectModels(projectId: string): Promise<void> {
  const uploadManager = getIFCUploadManager();

  try {
    const models = await uploadManager.listProjectModels(projectId);
    console.log(`Found ${models.length} models`);

    // Load all models
    for (const model of models) {
      console.log(`Loading: ${model.originalName}...`);
      await uploadManager.loadModelIntoScene(model);
    }

    console.log('✅ All models loaded');
  } catch (error) {
    console.error('❌ Failed to load models:', error);
  }
}

/**
 * Example: Keyboard shortcuts
 */
export function setupIFCKeyboardShortcuts(panel: IFCProjectPanel): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+M - Toggle IFC panel
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      panel.toggle();
    }

    // Ctrl+U - Focus upload (if panel is visible)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      if (panel['panel']?.classList.contains('visible')) {
        const uploadZone = document.getElementById('ifc-upload-zone');
        uploadZone?.click();
      }
    }
  });

  console.log('✅ IFC keyboard shortcuts configured');
  console.log('   Ctrl+M - Toggle IFC panel');
  console.log('   Ctrl+U - Upload file');
}

/**
 * Example: Event listeners
 */
export function setupIFCEventListeners(): void {
  eventBus.on('ifc:uploaded', ({ model }: { model: IfcModel }) => {
    console.log('📤 IFC uploaded:', model.originalName);
    // Show notification, update UI, etc.
  });

  eventBus.on('ifc:loaded', ({ model }: { model: IfcModel }) => {
    console.log('👁️ IFC loaded:', model.originalName);
    // Fit camera, apply materials, etc.
  });

  eventBus.on('ifc:deleted', ({ modelId }: { modelId: string }) => {
    console.log('🗑️ IFC deleted:', modelId);
    // Remove from scene if loaded
  });

  eventBus.on('ifc:upload-progress', ({ uploadId, progress }: { uploadId: string; progress: IFCUploadProgress }) => {
    console.log(`📊 Upload progress (${uploadId}): ${progress.progress}%`);
    // Update progress bar
  });

  console.log('✅ IFC event listeners configured');
}

/**
 * Complete integration example
 */
export async function completeIFCIntegrationExample(
  scene: Scene,
  ifcLoader: IFCSimpleLoader
): Promise<void> {
  const projectId = 'proj-001'; // Get from auth or URL

  // 1. Initialize module
  const { panel } = await initializeIFCModule(scene, ifcLoader, projectId);

  // 2. Setup keyboard shortcuts
  setupIFCKeyboardShortcuts(panel);

  // 3. Setup event listeners
  setupIFCEventListeners();

  // 4. Show panel
  panel.show();

  console.log('🎉 IFC Module fully integrated!');
  console.log('   • Upload: Drag & drop or click upload zone');
  console.log('   • Keyboard: Ctrl+M (toggle), Ctrl+U (upload)');
  console.log('   • API: Use getIFCUploadManager() for programmatic access');
}
