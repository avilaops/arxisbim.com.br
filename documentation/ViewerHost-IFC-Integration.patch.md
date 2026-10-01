# Patch: integrar o modulo IFC no ViewerHost

> Isto NAO e codigo compilavel. Sao trechos soltos para colar dentro de
> `frontend/src/viewer/ViewerHost.ts`, escritos como se fossem um arquivo.
> Vivia em `frontend/src/viewer/ViewerHost-IFC-Integration.patch.ts`, onde
> ninguem importava, nao entrava no bundle e o ESLint quebrava com
> "Parsing error: Declaration or statement expected" na linha 21.
> Movido para ca em 01/09/2026, com a extensao que descreve o que ele e.

```ts
/**
 * ViewerHost IFC Integration Patch
 * 
 * Add this code to ViewerHost.ts to enable IFC module
 */

// ==========================================
// 1. IMPORTS (add to top of file)
// ==========================================

import {
  getIFCUploadManager,
  IFCProjectPanel,
  type IFCProjectPanelOptions
} from '../systems/model';

// ==========================================
// 2. CLASS PROPERTIES (add to ViewerHost class)
// ==========================================

private ifcUploadManager = getIFCUploadManager();
private ifcPanel: IFCProjectPanel | null = null;

// ==========================================
// 3. INITIALIZATION (add to constructor or init method)
// ==========================================

async initializeIFCModule(projectId: string): Promise<void> {
  console.log('🏗️ Initializing IFC Module...');

  try {
    // 1. Initialize Upload Manager
    if (this.ifcLoader && this.scene) {
      this.ifcUploadManager.initialize(this.ifcLoader, this.scene);
      console.log('✅ IFC Upload Manager initialized');
    } else {
      console.warn('⚠️ IFCLoader or Scene not available');
      return;
    }

    // 2. Create Project Panel
    this.ifcPanel = new IFCProjectPanel({
      projectId,
      container: undefined, // Will append to body
      onModelSelected: (model) => {
        console.log('📌 Model selected:', model.originalName);
        this.handleModelSelected(model);
      },
      onModelLoaded: (model) => {
        console.log('✅ Model loaded:', model.originalName);
        this.handleModelLoaded(model);
      }
    });

    await this.ifcPanel.create();
    console.log('✅ IFC Project Panel created');

    // 3. Add toolbar button
    this.addIFCToolbarButton();

    // 4. Setup keyboard shortcuts
    this.setupIFCKeyboardShortcuts();

    // 5. Setup event listeners
    this.setupIFCEventListeners();

    console.log('🎉 IFC Module fully initialized!');

  } catch (error) {
    console.error('❌ Failed to initialize IFC Module:', error);
  }
}

// ==========================================
// 4. TOOLBAR BUTTON
// ==========================================

private addIFCToolbarButton(): void {
  // Check if toolbar exists (adjust selector to match your toolbar)
  const toolbar = document.querySelector('.toolbar') 
    || document.querySelector('#toolbar')
    || document.body;

  const button = document.createElement('button');
  button.id = 'ifc-panel-toggle';
  button.className = 'toolbar-button ifc-button';
  button.innerHTML = '🏗️';
  button.title = 'Modelos IFC (Ctrl+M)';
  button.setAttribute('aria-label', 'Toggle IFC Models Panel');

  // Styles (adjust to match your design system)
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
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  `;

  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.background = 'rgba(0, 255, 136, 0.2)';
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.3)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'rgba(0, 255, 136, 0.1)';
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
  });

  // Click handler
  button.addEventListener('click', () => {
    if (this.ifcPanel) {
      this.ifcPanel.toggle();
      
      // Update button style based on panel visibility
      const isVisible = this.ifcPanel['panel']?.classList.contains('visible');
      button.style.borderColor = isVisible 
        ? '#00ff88' 
        : 'rgba(0, 255, 136, 0.3)';
      button.style.background = isVisible
        ? 'rgba(0, 255, 136, 0.2)'
        : 'rgba(0, 255, 136, 0.1)';
    }
  });

  toolbar.appendChild(button);
  console.log('✅ IFC toolbar button added');
}

// ==========================================
// 5. KEYBOARD SHORTCUTS
// ==========================================

private setupIFCKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Ctrl+M - Toggle IFC panel
    if (e.ctrlKey && e.key === 'm') {
      e.preventDefault();
      if (this.ifcPanel) {
        this.ifcPanel.toggle();
        console.log('⌨️ IFC panel toggled via Ctrl+M');
      }
    }

    // Ctrl+U - Focus upload (if panel visible)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      if (this.ifcPanel && this.ifcPanel['panel']?.classList.contains('visible')) {
        const uploadZone = document.getElementById('ifc-upload-zone');
        uploadZone?.click();
        console.log('⌨️ Upload zone focused via Ctrl+U');
      }
    }

    // Escape - Close panel
    if (e.key === 'Escape') {
      if (this.ifcPanel && this.ifcPanel['panel']?.classList.contains('visible')) {
        this.ifcPanel.hide();
        console.log('⌨️ IFC panel closed via Escape');
      }
    }
  });

  console.log('✅ IFC keyboard shortcuts configured');
  console.log('   • Ctrl+M - Toggle panel');
  console.log('   • Ctrl+U - Focus upload');
  console.log('   • Escape - Close panel');
}

// ==========================================
// 6. EVENT LISTENERS
// ==========================================

private setupIFCEventListeners(): void {
  const { eventBus } = require('../core');

  // Model uploaded
  eventBus.on('ifc:uploaded', ({ model }) => {
    console.log('📤 IFC uploaded:', model.originalName);
    
    // Show notification (if you have notification system)
    this.showNotification?.({
      type: 'success',
      message: `Modelo "${model.originalName}" enviado com sucesso!`,
      duration: 3000
    });
  });

  // Model loaded
  eventBus.on('ifc:loaded', ({ model }) => {
    console.log('👁️ IFC loaded:', model.originalName);
    
    // Fit camera to model
    this.fitCameraToModel?.(model);
    
    // Show notification
    this.showNotification?.({
      type: 'success',
      message: `Modelo "${model.originalName}" carregado!`,
      duration: 2000
    });
  });

  // Model deleted
  eventBus.on('ifc:deleted', ({ modelId }) => {
    console.log('🗑️ IFC deleted:', modelId);
    
    // Remove from scene if loaded
    this.removeModelFromScene?.(modelId);
    
    // Show notification
    this.showNotification?.({
      type: 'info',
      message: 'Modelo deletado',
      duration: 2000
    });
  });

  // Upload progress
  eventBus.on('ifc:upload-progress', ({ uploadId, progress }) => {
    console.log(`📊 Upload progress: ${progress.progress}%`);
    
    // Update progress bar if you have one
    this.updateUploadProgress?.(uploadId, progress);
  });

  console.log('✅ IFC event listeners configured');
}

// ==========================================
// 7. EVENT HANDLERS
// ==========================================

private handleModelSelected(model: any): void {
  // Highlight model in scene
  if (this.selectionManager) {
    // Find model in scene by metadata
    const sceneModel = this.findModelInScene(model.id);
    if (sceneModel) {
      this.selectionManager.select(sceneModel);
    }
  }

  // Show properties panel
  this.showModelProperties?.(model);
}

private handleModelLoaded(model: any): void {
  // Fit camera to show entire model
  if (this.camera && this.controls) {
    this.fitCameraToModel(model);
  }

  // Apply discipline-based color
  this.applyDisciplineColor?.(model);

  // Update scene stats
  this.updateSceneStats?.();
}

private fitCameraToModel(model: any): void {
  // Implementation depends on your camera/controls setup
  console.log('📷 Fitting camera to model:', model.originalName);
  
  // Example:
  // const box = new THREE.Box3().setFromObject(modelObject);
  // const center = box.getCenter(new THREE.Vector3());
  // const size = box.getSize(new THREE.Vector3());
  // this.camera.position.set(center.x, center.y + size.y, center.z + size.z);
  // this.controls.target.copy(center);
}

// ==========================================
// 8. USAGE IN VIEWER INITIALIZATION
// ==========================================

async initialize(): Promise<void> {
  // ... existing initialization code ...

  // Initialize scene, camera, controls, etc.
  this.initializeScene();
  this.initializeCamera();
  this.initializeControls();
  this.initializeIFCLoader();

  // Get project ID (from URL, auth, or config)
  const projectId = this.getProjectId();

  // Initialize IFC Module
  if (projectId) {
    await this.initializeIFCModule(projectId);
  }

  // ... rest of initialization ...
}

private getProjectId(): string {
  // Option 1: From URL params
  const urlParams = new URLSearchParams(window.location.search);
  const projectIdFromUrl = urlParams.get('projectId');
  if (projectIdFromUrl) return projectIdFromUrl;

  // Option 2: From auth service
  const authService = require('../api/services').getAuthService();
  const user = authService.getCurrentUser();
  if (user?.currentProjectId) return user.currentProjectId;

  // Option 3: Default/fallback
  return 'proj-001'; // Replace with your logic
}

// ==========================================
// 9. CLEANUP
// ==========================================

dispose(): void {
  // Clean up IFC panel
  if (this.ifcPanel) {
    this.ifcPanel.destroy();
    this.ifcPanel = null;
  }

  // Remove toolbar button
  const button = document.getElementById('ifc-panel-toggle');
  button?.remove();

  // ... rest of cleanup ...
}

// ==========================================
// NOTES
// ==========================================

/*
1. Adjust selectors and class names to match your existing code
2. Replace notification system with your implementation
3. Adjust camera/controls logic to your setup
4. Add error boundary/try-catch as needed
5. Consider lazy loading for better performance
6. Add loading states for better UX
7. Customize styles to match your design system

Example full initialization:

```typescript
// In ViewerHost constructor or init method
async ngOnInit() {
  await this.initialize();
}

async initialize() {
  // Standard initialization
  this.initializeScene();
  this.initializeCamera();
  this.initializeControls();
  this.initializeIFCLoader();

  // Get project ID
  const projectId = this.getProjectId();

  // Initialize IFC Module
  if (projectId) {
    await this.initializeIFCModule(projectId);
  }

  // Start render loop
  this.animate();
}
```
*/

```
