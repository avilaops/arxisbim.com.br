import { CommandId, CommandPayload } from './Command';
import * as THREE from 'three';
import { commandRegistry } from './CommandRegistry';
import { appController, commandHistory, projectSerializer } from '../app';
import { eventBus, EventType } from '../core';
import { 
  getThemeSelectorModal, 
  getNetworkConnectModal, 
  getShortcutsModal, 
  getSettingsModal,
  getAboutModal
} from '../shared/components/ui/modals';

/**
 * CommandHandlers - Implementação dos handlers de todos os comandos
 * 
 * Organizado por categorias:
 * - File: New, Open, Save, Export, Close
 * - Edit: Undo, Redo, Cut, Copy, Paste, Delete, Select
 * - View: Camera, Focus, Frame, Toggle UI
 * - Model: Show/Hide, Isolate, Filter by Class
 * - Tools: Selection, Navigation, Measurement, Layer
 * - Theme: Select theme
 * - Help: Docs, Shortcuts, About
 */

/**
 * Registra todos os handlers de comandos
 */
export function registerAllCommandHandlers(): void {
  registerFileHandlers();
  registerEditHandlers();
  registerViewHandlers();
  registerEnvironmentHandlers();
  registerSectionHandlers();
  registerModelHandlers();
  registerToolHandlers();
  registerXRHandlers();
  registerNetworkHandlers();
  registerThemeHandlers();
  registerHelpHandlers();
  
  console.log('Command handlers registered');
}

// ==================== FILE HANDLERS ====================

function registerFileHandlers(): void {
  // FILE_NEW
  commandRegistry.register(
    {
      id: CommandId.FILE_NEW,
      label: 'Novo projeto',
      category: 'file',
      shortcut: 'Ctrl+N'
    },
    async (payload?: CommandPayload) => {
      console.log('Criando novo projeto...');
      
      // Confirma se há mudanças não salvas
      const currentProject = appController.getState().projectContext;
      if (currentProject.modelLoaded) {
        const confirm = window.confirm('Criar um novo projeto? Alterações não salvas serão perdidas.');
        if (!confirm) return;
      }
      
      // Template (empty ou ifc-viewer)
      const template = payload?.template || 'empty';
      
      // Limpa estado via AppController
      appController.projectManager.reset();
      appController.selectionManager.deselectAll();
      appController.layerManager.clearLayers();
      commandHistory.clear();
      
      // Emite evento para engine limpar cena
      eventBus.emit(EventType.PROJECT_RESET, { template });
      
      console.log(`Novo projeto criado (template: ${template})`);
    }
  );

  // FILE_OPEN
  commandRegistry.register(
    {
      id: CommandId.FILE_OPEN,
      label: 'Abrir',
      category: 'file',
      shortcut: 'Ctrl+O'
    },
    async () => {
      console.log('Opening file dialog...');
      
      // Cria file picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.ifc,.gltf,.glb,.obj,.fbx,.arxis.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        // Detecta tipo pelo nome
        const ext = file.name.split('.').pop()?.toLowerCase();
        let kind: 'ifc' | 'gltf' | 'obj' | 'project' = 'ifc';
        
        if (ext === 'gltf' || ext === 'glb') kind = 'gltf';
        else if (ext === 'obj' || ext === 'fbx') kind = 'obj';
        else if (file.name.includes('.arxis.json')) kind = 'project';
        
        // Emite FILE_SELECTED
        eventBus.emit(EventType.FILE_SELECTED, { file, kind });
        
        // Se for projeto, carrega via ProjectSerializer
        if (kind === 'project') {
          projectSerializer.loadFromFile(file).then(projectData => {
            eventBus.emit(EventType.PROJECT_LOADED, { projectData });
          }).catch(error => {
            console.error('Falha ao carregar projeto:', error);
            alert('Falha ao carregar projeto: ' + error.message);
          });
        } else {
          // Se for modelo 3D, emite MODEL_LOAD_REQUESTED
          eventBus.emit(EventType.MODEL_LOAD_REQUESTED, {
            kind,
            source: 'file',
            fileRef: file
          });
        }
      };
      
      input.click();
    }
  );

  // FILE_OPEN_IFC
  commandRegistry.register(
    {
      id: CommandId.FILE_OPEN_IFC,
      label: 'Abrir IFC',
      category: 'file'
    },
    async () => {
      console.log('Abrindo arquivo IFC...');
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.ifc';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        // Emite FILE_SELECTED
        eventBus.emit(EventType.FILE_SELECTED, { file, kind: 'ifc' });
        
        // Emite MODEL_LOAD_REQUESTED
        eventBus.emit(EventType.MODEL_LOAD_REQUESTED, {
          kind: 'ifc',
          source: 'file',
          fileRef: file
        });
      };
      
      input.click();
    }
  );

  // FILE_OPEN_GLTF
  commandRegistry.register(
    {
      id: CommandId.FILE_OPEN_GLTF,
      label: 'Abrir GLTF/GLB',
      category: 'file'
    },
    async () => {
      console.log('Abrindo arquivo GLTF...');
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.gltf,.glb';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        eventBus.emit(EventType.FILE_SELECTED, { file, kind: 'gltf' });
        
        eventBus.emit(EventType.MODEL_LOAD_REQUESTED, {
          kind: 'gltf',
          source: 'file',
          fileRef: file
        });
      };
      
      input.click();
    }
  );

  // FILE_OPEN_OBJ
  commandRegistry.register(
    {
      id: CommandId.FILE_OPEN_OBJ,
      label: 'Abrir OBJ/FBX',
      category: 'file'
    },
    async () => {
      console.log('Abrindo arquivo OBJ...');
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.obj,.fbx';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        eventBus.emit(EventType.FILE_SELECTED, { file, kind: 'obj' });
        
        eventBus.emit(EventType.MODEL_LOAD_REQUESTED, {
          kind: 'obj',
          source: 'file',
          fileRef: file
        });
      };
      
      input.click();
    }
  );

  // FILE_SAVE
  commandRegistry.register(
    {
      id: CommandId.FILE_SAVE,
      label: 'Salvar',
      category: 'file',
      shortcut: 'Ctrl+S'
    },
    async () => {
      console.log('Saving project...');
      
      // Obtém referências da cena
      const sceneManager = (appController as any).sceneManager;
      const cameraSystem = (appController as any).cameraSystem;
      
      if (!sceneManager || !cameraSystem) {
        console.error('Scene or camera not available');
        return;
      }
      
      // Serializa projeto
      const projectData = projectSerializer.serialize(
        sceneManager.scene,
        cameraSystem.camera,
        'ArxisVR Project'
      );
      
      // Salva em arquivo
      projectSerializer.saveToFile(projectData);
      
      eventBus.emit(EventType.PROJECT_SAVE, {});
      console.log('Projeto salvo com sucesso');
    }
  );

  // FILE_SAVE_AS
  commandRegistry.register(
    {
      id: CommandId.FILE_SAVE_AS,
      label: 'Salvar como',
      category: 'file',
      shortcut: 'Ctrl+Shift+S'
    },
    async () => {
      console.log('Save as...');
      
      // Prompt para nome do projeto
      const projectName = prompt('Nome do projeto:', 'Projeto ArxisVR');
      if (!projectName) return;
      
      // Obtém referências da cena
      const sceneManager = (appController as any).sceneManager;
      const cameraSystem = (appController as any).cameraSystem;
      
      if (!sceneManager || !cameraSystem) {
        console.error('Scene or camera not available');
        return;
      }
      
      // Serializa projeto
      const projectData = projectSerializer.serialize(
        sceneManager.scene,
        cameraSystem.camera,
        projectName
      );
      
      // Salva em arquivo
      projectSerializer.saveToFile(projectData, `${projectName}.arxis.json`);
      
      eventBus.emit(EventType.PROJECT_SAVE_AS, {});
      console.log('Project saved as successfully');
    }
  );

  // FILE_EXPORT_GLB
  commandRegistry.register(
    {
      id: CommandId.FILE_EXPORT_GLB,
      label: 'Exportar cena como GLB',
      category: 'file'
    },
    async (payload?: CommandPayload) => {
      eventBus.emit(EventType.EXPORT_GLB_REQUESTED, {
        selection: payload?.selection || false
      });
      await exportSceneAsGltf({ selectionOnly: !!payload?.selection });
    }
  );

  // FILE_EXPORT_SELECTION
  commandRegistry.register(
    {
      id: CommandId.FILE_EXPORT_SELECTION,
      label: 'Exportar seleção',
      category: 'file'
    },
    async () => {
      eventBus.emit(EventType.EXPORT_GLB_REQUESTED, { selection: true });
      await exportSceneAsGltf({ selectionOnly: true });
    }
  );

  // FILE_EXPORT_SCREENSHOT
  commandRegistry.register(
    {
      id: CommandId.FILE_EXPORT_SCREENSHOT,
      label: 'Capturar imagem',
      category: 'file',
      shortcut: 'Ctrl+P'
    },
    async (payload?: CommandPayload) => {
      console.log('Taking screenshot...');
      
      try {
        // Pega referências via import estático
        
        // Acessa canvas do renderer
        const canvas = document.querySelector('canvas');
        if (!canvas) {
          throw new Error('Canvas not found');
        }
        
        // Captura em alta resolução
        const width = payload?.width || canvas.width;
        const height = payload?.height || canvas.height;
        
        // Captura do canvas atual
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error('Failed to create blob');
            return;
          }
          
          // Download
          const link = document.createElement('a');
          const filename = `arxisvr-captura-${Date.now()}.png`;
          link.download = filename;
          link.href = URL.createObjectURL(blob);
          link.click();
          
          // Cleanup
          setTimeout(() => URL.revokeObjectURL(link.href), 100);
          
          eventBus.emit(EventType.EXPORT_COMPLETED, { 
            type: 'screenshot',
            filename 
          });
          
          console.log(`Screenshot saved: ${filename}`);
        }, 'image/png');
        
      } catch (error) {
        console.error('Screenshot failed:', error);
        eventBus.emit(EventType.EXPORT_FAILED, { 
          type: 'screenshot',
          error: (error as Error).message 
        });
        eventBus.emit(EventType.EXPORT_FAILED, {
          type: 'screenshot',
          error: String(error)
        });
      }
    }
  );

  // FILE_CLOSE
  commandRegistry.register(
    {
      id: CommandId.FILE_CLOSE,
      label: 'Fechar',
      category: 'file',
      shortcut: 'Ctrl+W'
    },
    async () => {
      console.log('Closing project...');
      eventBus.emit(EventType.PROJECT_CLOSE, {});
      closeActiveProject();
    }
  );
}

/**
 * Export the current viewer scene (or current selection only) as a GLB
 * binary file. Dynamic import keeps GLTFExporter out of the main bundle.
 */
async function exportSceneAsGltf(opts: { selectionOnly: boolean }): Promise<void> {
  try {
    const viewerHost = (window as unknown as { __viewerHost?: { scene: unknown } }).__viewerHost;
    if (!viewerHost?.scene) {
      console.warn('Viewer not initialized; GLB export skipped');
      return;
    }

    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();

    let target: unknown = viewerHost.scene;
    let isSelection = false;
    if (opts.selectionOnly) {
      const sel = (await import('../inspector/SelectionService')).selectionService.getSelected();
      if (sel?.object3D) {
        target = sel.object3D;
        isSelection = true;
      }
    }

    await new Promise<void>((resolve, reject) => {
      // GLTFExporter typings don't accept `unknown`; cast at the boundary.
      (exporter as unknown as { parse: (
        input: unknown,
        onDone: (result: ArrayBuffer | object) => void,
        onError: (err: ErrorEvent) => void,
        options: { binary: boolean }
      ) => void }).parse(
        target,
        (result) => {
          const blob = result instanceof ArrayBuffer
            ? new Blob([result], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(result)], { type: 'application/json' });
          const ext = result instanceof ArrayBuffer ? 'glb' : 'gltf';
          const filename = `arxisvr-${isSelection ? 'selection' : 'scene'}-${Date.now()}.${ext}`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          eventBus.emit(EventType.EXPORT_COMPLETED, { type: 'glb', filename });
          console.log(`Exported as ${ext.toUpperCase()}: ${filename}`);
          resolve();
        },
        (err) => {
          eventBus.emit(EventType.EXPORT_FAILED, { type: 'glb', error: String(err) });
          reject(err);
        },
        { binary: true }
      );
    });
  } catch (error) {
    console.error('GLB export failed:', error);
    eventBus.emit(EventType.EXPORT_FAILED, { type: 'glb', error: String(error) });
  }
}

/**
 * Close the active project: clear viewer scene of user-added objects
 * (keeps lights/grid/helpers untouched), drop the cached project id,
 * and reset the selection.
 */
function closeActiveProject(): void {
  try {
    const viewerHost = (window as unknown as {
      __viewerHost?: {
        scene?: { children: Array<{ userData?: { keepOnClose?: boolean } }> ; remove: (...o: unknown[]) => void };
      };
    }).__viewerHost;
    if (viewerHost?.scene) {
      const removable = viewerHost.scene.children.filter(
        (c) => !c.userData?.keepOnClose,
      );
      // Keep lights / cameras / helpers by convention if they set keepOnClose.
      for (const child of removable) {
        viewerHost.scene.remove(child as unknown as object);
      }
    }
    // Reset selection if module is loaded
    void import('../inspector/SelectionService').then(({ selectionService }) => {
      selectionService.clear();
    }).catch(() => { /* selection not loaded yet */ });
    // Drop persisted project id
    try { localStorage.removeItem('arxisvr_project_id'); } catch { /* ignore */ }
    eventBus.emit(EventType.EXPORT_COMPLETED, { type: 'project-close' });
    console.log('Project closed');
  } catch (error) {
    console.error('Close failed:', error);
  }
}

// ==================== EDIT HANDLERS ====================

function registerEditHandlers(): void {
  // EDIT_UNDO
  commandRegistry.register(
    {
      id: CommandId.EDIT_UNDO,
      label: 'Desfazer',
      category: 'edit',
      shortcut: 'Ctrl+Z'
    },
    async () => {
      console.log('Undo');
      const success = await commandHistory.undo();
      if (!success) {
        console.warn('Nothing to undo');
      }
    }
  );

  // EDIT_REDO
  commandRegistry.register(
    {
      id: CommandId.EDIT_REDO,
      label: 'Refazer',
      category: 'edit',
      shortcut: 'Ctrl+Y'
    },
    async () => {
      console.log('Redo');
      const success = await commandHistory.redo();
      if (!success) {
        console.warn('Nothing to redo');
      }
    }
  );

  // EDIT_CUT
  commandRegistry.register(
    {
      id: CommandId.EDIT_CUT,
      label: 'Recortar',
      category: 'edit',
      shortcut: 'Ctrl+X'
    },
    async () => {
      console.log('Cut');
      const state = appController.getState();
      if (state.selectedObjects.length > 0) {
        eventBus.emit(EventType.EDIT_CUT, { objects: state.selectedObjects.map(item => item.object.uuid) });
      }
    }
  );

  // EDIT_COPY
  commandRegistry.register(
    {
      id: CommandId.EDIT_COPY,
      label: 'Copiar',
      category: 'edit',
      shortcut: 'Ctrl+C'
    },
    async () => {
      console.log('Copy');
      const state = appController.getState();
      if (state.selectedObjects.length > 0) {
        eventBus.emit(EventType.EDIT_COPY, { objects: state.selectedObjects.map(item => item.object.uuid) });
      }
    }
  );

  // EDIT_PASTE
  commandRegistry.register(
    {
      id: CommandId.EDIT_PASTE,
      label: 'Colar',
      category: 'edit',
      shortcut: 'Ctrl+V'
    },
    async () => {
      console.log('Paste');
      eventBus.emit(EventType.EDIT_PASTE, {});
    }
  );

  // EDIT_DELETE
  commandRegistry.register(
    {
      id: CommandId.EDIT_DELETE,
      label: 'Excluir',
      category: 'edit',
      shortcut: 'Delete'
    },
    async () => {
      console.log('Delete');
      const state = appController.getState();
      if (state.selectedObjects.length > 0) {
        eventBus.emit(EventType.EDIT_DELETE, { objects: state.selectedObjects.map(item => item.object.uuid) });
      }
    }
  );

  // EDIT_SELECT_ALL
  commandRegistry.register(
    {
      id: CommandId.EDIT_SELECT_ALL,
      label: 'Selecionar tudo',
      category: 'edit',
      shortcut: 'Ctrl+A'
    },
    async () => {
      console.log('Select All');
      eventBus.emit(EventType.SELECT_ALL, {});
    }
  );

  // EDIT_DESELECT_ALL
  commandRegistry.register(
    {
      id: CommandId.EDIT_DESELECT_ALL,
      label: 'Limpar seleção',
      category: 'edit',
      shortcut: 'Ctrl+D'
    },
    async () => {
      console.log('Deselect All');
      eventBus.emit(EventType.DESELECT_ALL, {});
    }
  );
}

// ==================== VIEW HANDLERS ====================

function registerViewHandlers(): void {
  // VIEW_TOP
  commandRegistry.register(
    {
      id: CommandId.VIEW_TOP,
      label: 'Vista superior',
      category: 'view'
    },
    async () => {
      console.log('Top View');
      eventBus.emit(EventType.CAMERA_VIEW_CHANGE, { view: 'top' });
    }
  );

  // VIEW_FRONT
  commandRegistry.register(
    {
      id: CommandId.VIEW_FRONT,
      label: 'Vista frontal',
      category: 'view'
    },
    async () => {
      console.log('Front View');
      eventBus.emit(EventType.CAMERA_VIEW_CHANGE, { view: 'front' });
    }
  );

  // VIEW_SIDE
  commandRegistry.register(
    {
      id: CommandId.VIEW_SIDE,
      label: 'Vista lateral',
      category: 'view'
    },
    async () => {
      console.log('Side View');
      eventBus.emit(EventType.CAMERA_VIEW_CHANGE, { view: 'side' });
    }
  );

  // VIEW_ISOMETRIC
  commandRegistry.register(
    {
      id: CommandId.VIEW_ISOMETRIC,
      label: 'Vista isométrica',
      category: 'view'
    },
    async () => {
      console.log('Isometric View');
      eventBus.emit(EventType.CAMERA_VIEW_CHANGE, { view: 'isometric' });
    }
  );

  // VIEW_FOCUS_SELECTION
  commandRegistry.register(
    {
      id: CommandId.VIEW_FOCUS_SELECTION,
      label: 'Focar seleção',
      category: 'view',
      shortcut: 'F'
    },
    async () => {
      console.log('Focus Selection');
      eventBus.emit(EventType.CAMERA_FOCUS_SELECTION, {});
    }
  );

  // VIEW_FRAME_ALL
  commandRegistry.register(
    {
      id: CommandId.VIEW_FRAME_ALL,
      label: 'Enquadrar tudo',
      category: 'view',
      shortcut: 'H'
    },
    async () => {
      console.log('Frame All');
      eventBus.emit(EventType.CAMERA_FRAME_ALL, {});
    }
  );

  // VIEW_TOGGLE_GRID
  commandRegistry.register(
    {
      id: CommandId.VIEW_TOGGLE_GRID,
      label: 'Alternar grade',
      category: 'view',
      shortcut: 'G'
    },
    async () => {
      console.log('Toggle Grid');
      // Chama função global do main-simple.ts
      const isVisible = (window as any).toggleGrid?.();
      console.log(`Grid ${isVisible ? 'ativado' : 'desativado'}`);
    }
  );

  // VIEW_TOGGLE_AXES
  commandRegistry.register(
    {
      id: CommandId.VIEW_TOGGLE_AXES,
      label: 'Alternar eixos',
      category: 'view',
      shortcut: 'X'
    },
    async () => {
      console.log('Toggle Axes');
      eventBus.emit(EventType.VIEW_TOGGLE_AXES, {});
    }
  );

  // VIEW_TOGGLE_STATS
  commandRegistry.register(
    {
      id: CommandId.VIEW_TOGGLE_STATS,
      label: 'Alternar estatísticas',
      category: 'view',
      shortcut: 'Shift+S'
    },
    async () => {
      console.log('Toggle Stats');
      const currentState = appController.getState().viewState;
      const newState = !currentState.statsEnabled;
      appController.getState().setStatsEnabled(newState);
      eventBus.emit(EventType.VIEW_TOGGLE_STATS, { enabled: newState });
      appController['notifyStateChange']?.();
    }
  );

  // VIEW_FULLSCREEN
  commandRegistry.register(
    {
      id: CommandId.VIEW_FULLSCREEN,
      label: 'Tela cheia',
      category: 'view',
      shortcut: 'F11'
    },
    async () => {
      console.log('Toggle Fullscreen');
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  );
  
  // VIEW_SET_RENDER_QUALITY (FASE 5)
  commandRegistry.register(
    {
      id: CommandId.VIEW_SET_RENDER_QUALITY,
      label: 'Definir qualidade de renderização',
      category: 'view'
    },
    async (payload?: CommandPayload) => {
      const quality = payload?.quality;
      if (!quality) {
        console.warn('No quality specified');
        return;
      }
      
      console.log(`Setting render quality: ${quality}`);
      appController.setRenderQuality(quality);
      console.log('Render quality updated');
    }
  );
  
  // VIEW_SET_CAMERA_MODE (FASE 5)
  commandRegistry.register(
    {
      id: CommandId.VIEW_SET_CAMERA_MODE,
      label: 'Definir modo de câmera',
      category: 'view'
    },
    async (payload?: CommandPayload) => {
      const mode = payload?.mode;
      if (!mode) {
        console.warn('No camera mode specified');
        return;
      }
      
      console.log(`Setting camera mode: ${mode}`);
      appController.getState().setCameraMode(mode);
      eventBus.emit(EventType.CAMERA_MODE_CHANGED, { mode });
      console.log('Camera mode updated');
    }
  );
}

// ==================== ENVIRONMENT/SKYBOX HANDLERS ====================

function registerEnvironmentHandlers(): void {
  const getHdri = () => (appController as any).viewerHost?.hdriManager;

  commandRegistry.register(
    { id: CommandId.ENV_SKYBOX_NEUTRAL, label: 'Ambiente: estúdio neutro', category: 'environment' },
    async () => {
      console.log('Loading neutral skybox');
      const hdri = getHdri();
      if (hdri) {
        await hdri.loadPreset('neutral');
        console.log('Neutral skybox loaded');
      } else {
        console.warn('HDRIManager not available');
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.ENV_SKYBOX_NATURE, label: 'Ambiente: exterior natural', category: 'environment' },
    async () => {
      console.log('Loading nature skybox');
      const hdri = getHdri();
      if (hdri) {
        await hdri.loadPreset('nature');
        console.log('Nature skybox loaded');
      } else {
        console.warn('HDRIManager not available');
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.ENV_SKYBOX_URBAN, label: 'Ambiente: urbano', category: 'environment' },
    async () => {
      console.log('Loading urban skybox');
      const hdri = getHdri();
      if (hdri) {
        await hdri.loadPreset('urban');
        console.log('Urban skybox loaded');
      } else {
        console.warn('HDRIManager not available');
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.ENV_SKYBOX_SUNSET, label: 'Ambiente: pôr do sol', category: 'environment' },
    async () => {
      console.log('Loading sunset skybox');
      const hdri = getHdri();
      if (hdri) {
        await hdri.loadPreset('sunset');
        console.log('Sunset skybox loaded');
      } else {
        console.warn('HDRIManager not available');
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.ENV_TOGGLE_FOG, label: 'Alternar névoa', category: 'environment' },
    async () => {
      console.log('Toggle fog');
      const hdri = getHdri();
      if (hdri) {
        const config = hdri.getConfig();
        if (config.enableFog) {
          hdri.removeFog();
          console.log('Fog disabled');
        } else {
          hdri.setFog(0xcccccc, 0.001);
          console.log('Fog enabled');
        }
      } else {
        console.warn('HDRIManager not available');
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.ENV_ADJUST_EXPOSURE, label: 'Ajustar exposição', category: 'environment' },
    async () => {
      console.log('Adjust exposure');
      const hdri = getHdri();
      if (hdri) {
        const current = hdri.getConfig().exposure;
        const values = [0.5, 1.0, 1.5, 2.0];
        const currentIndex = values.findIndex(v => Math.abs(v - current) < 0.1);
        const nextIndex = (currentIndex + 1) % values.length;
        const newExposure = values[nextIndex];
        hdri.setExposure(newExposure);
        console.log(`Exposure set to ${newExposure}`);
      } else {
        console.warn('HDRIManager not available');
      }
    }
  );
}

// ==================== SECTIONS & CLIPPING HANDLERS ====================

function registerSectionHandlers(): void {
  commandRegistry.register(
    { id: CommandId.SECTION_CREATE_X, label: 'Criar corte X', category: 'section' },
    async (payload?: CommandPayload) => {
      const position = payload?.position || 0;
      appController.sectionManager.createSection('x-axis' as any, position);
      console.log(`Section X created at ${position}`);
    }
  );

  commandRegistry.register(
    { id: CommandId.SECTION_CREATE_Y, label: 'Criar corte Y', category: 'section' },
    async (payload?: CommandPayload) => {
      const position = payload?.position || 0;
      appController.sectionManager.createSection('y-axis' as any, position);
      console.log(`Section Y created at ${position}`);
    }
  );

  commandRegistry.register(
    { id: CommandId.SECTION_CREATE_Z, label: 'Criar corte Z', category: 'section' },
    async (payload?: CommandPayload) => {
      const position = payload?.position || 0;
      appController.sectionManager.createSection('z-axis' as any, position);
      console.log(`Section Z created at ${position}`);
    }
  );

  commandRegistry.register(
    { id: CommandId.SECTION_TOGGLE_LINES, label: 'Alternar linhas de corte', category: 'section' },
    async () => {
      const options = appController.sectionManager.getVisualOptions();
      appController.sectionManager.updateVisualOptions({ showSectionLines: !options.showSectionLines });
      console.log(`Section lines ${!options.showSectionLines ? 'enabled' : 'disabled'}`);
    }
  );

  commandRegistry.register(
    { id: CommandId.SECTION_TOGGLE_PLANES, label: 'Alternar planos de corte', category: 'section' },
    async () => {
      const options = appController.sectionManager.getVisualOptions();
      appController.sectionManager.updateVisualOptions({ showClippingPlanes: !options.showClippingPlanes });
      console.log(`Clipping planes ${!options.showClippingPlanes ? 'enabled' : 'disabled'}`);
    }
  );

  commandRegistry.register(
    { id: CommandId.SECTION_CLEAR_ALL, label: 'Limpar cortes', category: 'section' },
    async () => {
      appController.sectionManager.clearSections();
      console.log('All sections cleared');
    }
  );

  commandRegistry.register(
    { id: CommandId.SECTION_FLIP_ACTIVE, label: 'Inverter corte ativo', category: 'section' },
    async () => {
      const activeSection = appController.sectionManager.getActiveSection();
      if (activeSection) {
        appController.sectionManager.flipSection(activeSection.id);
        console.log(`Section ${activeSection.name} flipped`);
      } else {
        console.warn('No active section to flip');
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.SECTION_BOX_CLIPPING, label: 'Corte por caixa', category: 'section' },
    async (payload?: CommandPayload) => {
      const min = payload?.min || { x: -10, y: -10, z: -10 };
      const max = payload?.max || { x: 10, y: 10, z: 10 };
      const minVec = new THREE.Vector3(min.x, min.y, min.z);
      const maxVec = new THREE.Vector3(max.x, max.y, max.z);
      appController.sectionManager.createBoxClipping(minVec, maxVec);
      console.log('Box clipping created');
    }
  );
}

// ==================== MODEL HANDLERS ====================

function registerModelHandlers(): void {
  commandRegistry.register(
    { id: CommandId.MODEL_SHOW_ALL, label: 'Mostrar tudo', category: 'model' },
    async () => {
      console.log('Show All');
      eventBus.emit(EventType.MODEL_SHOW_ALL, {});
    }
  );

  commandRegistry.register(
    { id: CommandId.MODEL_HIDE_SELECTED, label: 'Ocultar seleção', category: 'model' },
    async () => {
      console.log('Hide Selected');
      const state = appController.getState();
      if (state.selectedObjects.length > 0) {
        eventBus.emit(EventType.MODEL_HIDE_SELECTED, { objects: state.selectedObjects.map(item => item.object.uuid) });
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.MODEL_ISOLATE_SELECTED, label: 'Isolar seleção', category: 'model' },
    async () => {
      console.log('Isolate Selected');
      const state = appController.getState();
      if (state.selectedObjects.length > 0) {
        eventBus.emit(EventType.MODEL_ISOLATE_SELECTED, { objects: state.selectedObjects.map(item => item.object.uuid) });
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.MODEL_HIDE_BY_CLASS, label: 'Ocultar por classe', category: 'model' },
    async (payload?: CommandPayload) => {
      console.log('Hide by Class:', payload);
      if (payload?.ifcClass) {
        eventBus.emit(EventType.MODEL_HIDE_BY_CLASS, { ifcClass: payload.ifcClass });
      }
    }
  );
}

// ==================== TOOL HANDLERS ====================

function registerToolHandlers(): void {
  commandRegistry.register(
    { id: CommandId.TOOL_SELECT, label: 'Ferramenta de seleção', category: 'tool', shortcut: 'Q' },
    async () => {
      console.log('Selection Tool');
      appController.toolManager?.setActiveTool('selection');
    }
  );

  // TOOL_NAVIGATE - Removido: navegação é global via WASD
  // Não precisa mais de comando/ferramenta separada

  commandRegistry.register(
    { id: CommandId.TOOL_MEASURE, label: 'Ferramenta de medição', category: 'tool', shortcut: 'E' },
    async () => {
      console.log('Measurement Tool');
      appController.toolManager?.setActiveTool('measurement');
    }
  );

  commandRegistry.register(
    { id: CommandId.TOOL_LAYER, label: 'Ferramenta de camadas', category: 'tool', shortcut: 'R' },
    async () => {
      console.log('Layer Tool');
      appController.toolManager?.setActiveTool('layer');
    }
  );

  commandRegistry.register(
    { id: CommandId.TOOL_AVATAR, label: 'Personalizar avatar', category: 'tool', shortcut: 'K' },
    async () => {
      console.log('Opening Avatar Customizer');
      const { AvatarCustomizer } = await import('../features/virtual-meetings/avatar/AvatarCustomizer');
      const avatarSystem = (appController as any).viewerHost?.avatarSystem;
      if (avatarSystem) {
        const customizer = new AvatarCustomizer(avatarSystem);
        customizer.open();
      } else {
        console.warn('AvatarSystem not available');
      }
    }
  );
}

// ==================== XR HANDLERS (FASE 5) ====================

function registerXRHandlers(): void {
  let xrManagerPromise: Promise<any> | null = null;

  const getXRManager = async () => {
    if (!xrManagerPromise) {
      xrManagerPromise = import('../features/ar/xr').then(m => m.xrManager);
    }
    return xrManagerPromise;
  };

  commandRegistry.register(
    { id: CommandId.XR_ENTER, label: 'Entrar em VR', category: 'xr', shortcut: 'V' },
    async () => {
      try {
        const xrManager = await getXRManager();
        await xrManager.enterXR('vr');
      } catch (error) {
        console.error('Falha ao entrar em VR:', error);
        alert('Falha ao entrar em VR: ' + (error as Error).message);
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.XR_EXIT, label: 'Sair do VR', category: 'xr' },
    async () => {
      try {
        const xrManager = await getXRManager();
        await xrManager.exitXR();
      } catch (error) {
        console.error('Falha ao sair do VR:', error);
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.XR_TOGGLE, label: 'Alternar VR', category: 'xr', shortcut: 'Shift+V' },
    async () => {
      try {
        const xrManager = await getXRManager();
        if (xrManager.isActive) {
          await xrManager.exitXR();
        } else {
          await xrManager.enterXR('vr');
        }
      } catch (error) {
        console.error('Falha ao alternar VR:', error);
        alert('Falha ao alternar VR: ' + (error as Error).message);
      }
    }
  );
}

// ==================== NETWORK HANDLERS (FASE 5) ====================

function registerNetworkHandlers(): void {
  let networkManagerPromise: Promise<any> | null = null;

  const getNetworkManager = async () => {
    if (!networkManagerPromise) {
      networkManagerPromise = import('../network').then(m => m.networkManager);
    }
    return networkManagerPromise;
  };

  const getWebrtcManager = () => (appController as any).viewerHost?.webrtcManager;

  commandRegistry.register(
    { id: CommandId.NET_CONNECT, label: 'Conectar colaboração', category: 'network' },
    async (payload?: CommandPayload) => {
      if (payload?.serverUrl && payload?.playerName) {
        try {
          const networkManager = await getNetworkManager();
          await networkManager.connect(payload.serverUrl, payload.playerName);
          console.log('Connected to multiplayer');
        } catch (error) {
          console.error('Falha ao conectar:', error);
          alert('Falha ao conectar: ' + (error as Error).message);
        }
      } else {
        const modal = getNetworkConnectModal();
        (modal as any)?.open?.();
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_DISCONNECT, label: 'Desconectar', category: 'network' },
    async () => {
      try {
        const networkManager = await getNetworkManager();
        networkManager.disconnect();
        console.log('Disconnected from multiplayer');
      } catch (error) {
        console.error('Falha ao desconectar:', error);
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_CREATE_ROOM, label: 'Criar sala', category: 'network' },
    async (payload?: CommandPayload) => {
      const roomName = payload?.roomName || prompt('Nome da sala:', 'Sala ArxisVR');
      if (!roomName) return;
      eventBus.emit(EventType.NET_CREATE_ROOM_REQUESTED, { roomName });
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_JOIN_ROOM, label: 'Entrar na sala', category: 'network' },
    async (payload?: CommandPayload) => {
      const roomId = payload?.roomId || prompt('ID da sala:');
      if (!roomId) return;
      eventBus.emit(EventType.NET_JOIN_ROOM_REQUESTED, { roomId });
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_LEAVE_ROOM, label: 'Sair da sala', category: 'network' },
    async () => {
      eventBus.emit(EventType.ROOM_LEFT, {});
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_TOGGLE_VOIP, label: 'Alternar voz', category: 'network' },
    async () => {
      commandRegistry.execute(CommandId.NET_TOGGLE_VOICE);
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_TOGGLE_VOICE, label: 'Alternar chat de voz', category: 'network', shortcut: 'Shift+M' },
    async () => {
      const webrtcManager = getWebrtcManager();
      if (!webrtcManager) {
        console.warn('WebRTC not initialized');
        return;
      }
      if (!webrtcManager.isInRoom()) {
        alert('Entre em uma sala para usar o chat de voz.');
        return;
      }
      try {
        if (webrtcManager.isVoiceEnabled()) {
          webrtcManager.disableVoice();
        } else {
          await webrtcManager.enableVoice();
        }
      } catch (error) {
        console.error('Falha ao alternar voz:', error);
        alert('Falha ao alternar voz: ' + (error as Error).message);
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_START_SCREEN_SHARE, label: 'Iniciar compartilhamento de tela', category: 'network', shortcut: 'Shift+P' },
    async () => {
      const webrtcManager = getWebrtcManager();
      if (!webrtcManager) {
        console.warn('WebRTC not initialized');
        return;
      }
      if (!webrtcManager.isInRoom()) {
        alert('Entre em uma sala para compartilhar a tela.');
        return;
      }
      try {
        await webrtcManager.startScreenShare();
      } catch (error) {
        console.error('Falha ao iniciar compartilhamento de tela:', error);
        alert('Falha ao iniciar compartilhamento de tela: ' + (error as Error).message);
      }
    }
  );

  commandRegistry.register(
    { id: CommandId.NET_STOP_SCREEN_SHARE, label: 'Parar compartilhamento de tela', category: 'network' },
    async () => {
      getWebrtcManager()?.stopScreenShare();
    }
  );
}

// ==================== THEME HANDLERS ====================


function registerThemeHandlers(): void {
  // THEME_SELECT
  commandRegistry.register(
    {
      id: CommandId.THEME_SELECT,
      label: 'Selecionar tema',
      category: 'theme'
    },
    async () => {
      console.log('Opening theme selector...');
      const modal = getThemeSelectorModal();
      (modal as any)?.show?.();
    }
  );
}

// ==================== HELP HANDLERS ====================

function registerHelpHandlers(): void {
  // HELP_DOCS
  commandRegistry.register(
    {
      id: CommandId.HELP_DOCS,
      label: 'Documentação',
      category: 'help',
      shortcut: 'F1'
    },
    async () => {
      console.log('Opening documentation...');
      window.open('https://github.com/avilaops/arxisVR#readme', '_blank');
    }
  );

  // HELP_SHORTCUTS
  commandRegistry.register(
    {
      id: CommandId.HELP_SHORTCUTS,
      label: 'Atalhos de teclado',
      category: 'help'
    },
    async () => {
      console.log('Showing shortcuts...');
      const modal = getShortcutsModal();
      (modal as any)?.open?.();
    }
  );

  // HELP_ABOUT
  commandRegistry.register(
    {
      id: CommandId.HELP_ABOUT,
      label: 'Sobre',
      category: 'help'
    },
    async () => {
      console.log('Showing about...');
      const modal = getAboutModal();
      (modal as any)?.open?.();
    }
  );

  // AI_TOGGLE_CHAT
  commandRegistry.register(
    {
      id: CommandId.AI_TOGGLE_CHAT,
      label: 'Alternar assistente BIM',
      category: 'ai',
      shortcut: 'Ctrl+K'
    },
    async () => {
      console.log('Toggle AI Chat');
      eventBus.emit(EventType.AI_CHAT_TOGGLE, {});
    }
  );

  // TOOL_AVATAR - Avatar Customizer
  commandRegistry.register(
    {
      id: CommandId.TOOL_AVATAR,
      label: 'Personalizar avatar',
      category: 'tools',
      shortcut: 'Alt+A'
    },
    async () => {
      console.log('Opening Avatar Customizer...');
      const { componentManager } = await import('../shared/components/registry');
      await componentManager.open('modal:avatar', 'AvatarCustomizer');
    }
  );
}
