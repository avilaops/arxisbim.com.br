import { ViewerHost } from '../../viewer/ViewerHost';
import { IFCSimpleLoader } from '../../loaders/IFCSimpleLoader';
import { IFCUploadManager } from '../../systems/model/IFCUploadManager';
import { initializeAPI } from '../../api/v1/client';
import { getIfcService } from '../../api/v1/services/index';
import '../../inspector/inspector.css';

// Lazy load heavy modules
let inspectorController: any = null;
let selectionService: any = null;
let batchSelectionService: any = null;

// Utility to defer non-critical work to reduce main-thread blocking
function deferNonCritical(callback: () => void, timeout = 0) {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => callback(), { timeout });
  } else {
    setTimeout(callback, timeout);
  }
}

declare global {
  interface Window {
    __viewerHost: any;
    __ifcSimpleLoader: any;
    __arxisCopilot: any;
    __budgetPanel: any;
    __ifcUploadManager: any;
    THREE: any;
  }
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const SIGNIN_URL = 'https://signin.avilaops.com';
const PROJECT_ID = '123e4567-e89b-12d3-a456-426614174000';
localStorage.setItem('arxisvr_project_id', PROJECT_ID);

let viewerHost: ViewerHost | null = null;
let ifcLoader: IFCSimpleLoader | null = null;
let loadedIfcModelId: string | null = null;
let currentIfcModels: any[] = [];
const hasAuthToken = () => Boolean(localStorage.getItem('arxisvr_token'));

// Inicializar aplicação
async function init() {
  console.log('Inicializando ArxisVR App...');

  // Permitir acesso anônimo para demonstração
  const apiClient = initializeAPI({
    baseURL: API_BASE_URL,
  });

  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.style.display = 'grid';
  }

  // Inicializar ViewerHost
  const canvasEl = document.getElementById('viewer-canvas') as HTMLCanvasElement;
  if (!canvasEl) {
    console.error('Canvas principal não encontrado!');
    return;
  }

  viewerHost = new ViewerHost(canvasEl);
  window.__viewerHost = viewerHost;
  console.log('ViewerHost inicializado');

  // Inicializar IFCUploadManager após API Client estar pronto
  viewerHost.ifcUploadManager = IFCUploadManager.getInstance();
  window.__ifcUploadManager = viewerHost.ifcUploadManager;
  console.log('IFC Upload Manager inicializado');

  ifcLoader = new IFCSimpleLoader(viewerHost.scene, viewerHost.camera, viewerHost.controls);
  window.__ifcSimpleLoader = ifcLoader;
  viewerHost.ifcUploadManager.initialize(ifcLoader, viewerHost.scene);
  console.log('IFCSimpleLoader inicializado para abrir modelos IFC');

  // Lazy load ArxisCopilot - defer to idle time
  deferNonCritical(() => {
    import('../../copilot/ArxisCopilot').then(({ ArxisCopilot }) => {
      const copilot = new ArxisCopilot(viewerHost!);
      window.__arxisCopilot = copilot;
      console.log('ArxisVR Copilot inicializado');
    }).catch(err => console.error('Failed to load ArxisCopilot:', err));
  }, 100);

  // Lazy load ScenariosPanel - defer to idle time
  deferNonCritical(() => {
    const scenariosMount = document.getElementById('scenarios-panel-mount');
    if (scenariosMount && hasAuthToken()) {
      import('../../shared/components/ui/panels/ScenariosPanel').then(({ ScenariosPanel }) => {
        new ScenariosPanel(scenariosMount);
      }).catch(err => console.error('Failed to load ScenariosPanel:', err));
    } else if (scenariosMount) {
      scenariosMount.innerHTML = '<div class="panel__empty panel__empty--compact">Faça login para carregar cenários salvos.</div>';
    }
  }, 200);

  // Lazy load SectionsPanel - defer to idle time
  deferNonCritical(() => {
    const sectionsMount = document.getElementById('sections-panel-mount');
    if (sectionsMount) {
      import('../../shared/components/ui/panels/SectionsPanel').then(({ SectionsPanel }) => {
        import('three').then(({ default: THREE }) => {
          window.THREE = THREE;
          new SectionsPanel(sectionsMount);
        });
      }).catch(err => console.error('Failed to load SectionsPanel:', err));
    }
  }, 300);

  // Lazy load MeasurementsPanel - defer to idle time
  deferNonCritical(() => {
    const measurementsMount = document.getElementById('measurements-panel-mount');
    if (measurementsMount) {
      import('../../shared/components/ui/panels/MeasurementsPanel').then(({ MeasurementsPanel }) => {
        new MeasurementsPanel(measurementsMount);
      }).catch(err => console.error('Failed to load MeasurementsPanel:', err));
    }
  }, 400);

  // Lazy load QueryPanel - defer to idle time
  deferNonCritical(() => {
    const queryMount = document.getElementById('query-panel-mount');
    if (queryMount) {
      const collectIfcObjects = () => {
        const objs: any[] = [];
        viewerHost!.scene.traverse((o: any) => {
          if (o.userData && (o.userData.expressID || o.userData.ifcType || o.userData.ifcId)) {
            objs.push(o);
          }
        });
        return objs;
      };
      import('../../shared/components/ui/panels/QueryPanel').then(({ QueryPanel }) => {
        new QueryPanel(queryMount, { getObjects: collectIfcObjects });
      }).catch(err => console.error('Failed to load QueryPanel:', err));
    }
  }, 500);

  // Lazy load TakeoffPanel - defer to idle time
  deferNonCritical(() => {
    const takeoffMount = document.getElementById('takeoff-panel-mount');
    if (takeoffMount) {
      const collectIfcObjects = () => {
        const objs: any[] = [];
        viewerHost!.scene.traverse((o: any) => {
          if (o.userData && (o.userData.expressID || o.userData.ifcType || o.userData.ifcId)) {
            objs.push(o);
          }
        });
        return objs;
      };
      import('../../shared/components/ui/panels/TakeoffPanel').then(({ TakeoffPanel }) => {
        const takeoffPanel = new TakeoffPanel(takeoffMount, { getObjects: collectIfcObjects });
        (window as any).__takeoffPanel = takeoffPanel;
      }).catch(err => console.error('Failed to load TakeoffPanel:', err));
    }
  }, 600);

  // Lazy load BudgetPanel - defer to idle time
  deferNonCritical(() => {
    const budgetMount = document.getElementById('budget-panel-mount');
    if (budgetMount) {
      const selectionToExpressIds = () => {
        const uuids = new Set(batchSelectionService.getSelectedUuids());
        if (uuids.size === 0) return [];
        const ids: number[] = [];
        viewerHost!.scene.traverse((o: any) => {
          if (uuids.has(o.uuid) && o.userData && o.userData.expressID != null) {
            ids.push(o.userData.expressID);
          }
        });
        return ids;
      };
      const currentProjectId = PROJECT_ID;
      Promise.all([
        import('../../shared/components/ui/panels/BudgetPanel'),
        hasAuthToken() ? import('../../features/bim-4d/bim/5d/api/BudgetApiClient') : Promise.resolve({ BudgetApiClient: null })
      ]).then(([{ BudgetPanel }, { BudgetApiClient }]) => {
        const budgetPanel = new BudgetPanel(budgetMount, {
          getTakeoffResult: () => (window as any).__takeoffPanel ? (window as any).__takeoffPanel.getLastResult() : null,
          getSelectedElementIds: selectionToExpressIds,
          apiClient: hasAuthToken() && BudgetApiClient ? new BudgetApiClient({ baseUrl: `${API_BASE_URL}/api/v1/budgets` }) : undefined,
          projectId: currentProjectId,
          autoLoad: hasAuthToken(),
        });
        window.__budgetPanel = budgetPanel;
      }).catch(err => console.error('Failed to load BudgetPanel:', err));
    }
  }, 700);

  // Inspector: lazy load and activate on first interaction
  let inspectorInitialized = false;
  const initInspector = async () => {
    if (inspectorInitialized) return;
    inspectorInitialized = true;
    
    try {
      const [{ inspectorController }, { selectionService }, { batchSelectionService }] = await Promise.all([
        import('../../inspector/InspectorController'),
        import('../../inspector/SelectionService'),
        import('../../inspector/BatchSelectionService')
      ]);
      
      inspectorController.initialize(
        viewerHost!.scene,
        viewerHost!.camera,
        canvasEl,
        document.body,
        ifcLoader
      );
      selectionService.onSelectionChanged((payload) => {
        if (payload) {
          inspectorController.showPanel(payload);
        }
        updateModelInfoFromSelection(payload);
      });
      
      // Lazy load SelectionActionsPanel
      import('../../shared/components/ui/panels/SelectionActionsPanel').then(({ SelectionActionsPanel }) => {
        new SelectionActionsPanel();
      }).catch(err => console.error('Failed to load SelectionActionsPanel:', err));
      
      console.log('Inspector ativo (clique em um objeto)');
    } catch (e) {
      console.warn('Inspector falhou ao iniciar:', e);
    }
  };
  
  // Initialize inspector on first canvas click
  canvasEl.addEventListener('click', initInspector, { once: true });

  setupNavigation();
  setupIfcUpload();
  setupDragDropIfc();
  setupCameraModeControls(viewerHost);
  setupGravityControls(viewerHost);
  setupExportGLB();
  setupSnapshotPNG();
  setupKeyboardShortcuts();

  // Defer non-critical operations to idle time
  deferNonCritical(async () => {
    // Carregar lista de modelos IFC
    await loadIfcModels();
  }, 50);

  // Remover loading e mostrar app
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
  
  console.log('ArxisVR App pronto');
}

function updateModelInfoFromSelection(payload: any) {
  const el = document.getElementById('model-info');
  if (!el) return;
  if (!payload) {
    el.innerHTML = `<p style="color: var(--text-secondary); font-size: 13px;">
      Selecione um modelo para ver detalhes
    </p>`;
    return;
  }
  const obj = payload.object3D;
  const name = obj.name || (payload.expressID !== undefined ? `IFC #${payload.expressID}` : obj.type || 'Objeto');
  let bboxLine = '';
  
  // Use window.THREE if available, otherwise skip bbox calculation
  if (window.THREE) {
    try {
      const box = new window.THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        const s = box.getSize(new window.THREE.Vector3());
        bboxLine = `<div style="color: var(--text-secondary); font-size: 12px; margin-top: 4px;">
          Dimensões: ${s.x.toFixed(2)} × ${s.y.toFixed(2)} × ${s.z.toFixed(2)} m
        </div>`;
      }
    } catch (e) {
      // Ignore bbox calculation errors
    }
  }
  
  const materialCount = obj.material
    ? (Array.isArray(obj.material) ? obj.material.length : 1)
    : 0;
  el.innerHTML = `
    <div style="font-size: 13px;">
      <div style="color: var(--text-primary); font-weight: 600; margin-bottom: 6px;">
        ${name}
      </div>
      <div style="color: var(--text-secondary); font-size: 12px;">
        Tipo: <span style="color: var(--accent-blue);">${payload.type.toUpperCase()}</span>
        ${obj.type && obj.type !== payload.type ? ` • ${obj.type}` : ''}
      </div>
      ${bboxLine}
      ${materialCount > 0 ? `<div style="color: var(--text-secondary); font-size: 12px;">Materiais: ${materialCount}</div>` : ''}
      ${payload.expressID !== undefined ? `<div style="color: var(--text-secondary); font-size: 12px;">ExpressID: ${payload.expressID}</div>` : ''}
    </div>
  `;
}

async function setupExportGLB() {
  const btn = document.querySelector('[data-action="export-glb"]');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
      const exporter = new GLTFExporter();
      const sel = selectionService?.getSelected();
      const target = sel?.object3D ?? viewerHost!.scene;
      exporter.parse(
        target,
        (result: any) => {
          const blob = result instanceof ArrayBuffer
            ? new Blob([result], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(result)], { type: 'application/json' });
          const ext = result instanceof ArrayBuffer ? 'glb' : 'gltf';
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `arxisvr-${sel ? 'selection' : 'scene'}-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          console.log(`Exportado como ${ext.toUpperCase()}`);
        },
        (err: any) => {
          console.error('Falha no export GLTF:', err);
          alert('Falha ao exportar.');
        },
        { binary: true }
      );
    } catch (e) {
      console.error('Erro no exportador:', e);
      alert('Exportador indisponível.');
    }
  });
}

function setupSnapshotPNG() {
  const btn = document.querySelector('[data-action="snapshot-png"]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    try {
      viewerHost!.renderer.render(viewerHost!.scene, viewerHost!.camera);
      const dataUrl = viewerHost!.renderer.domElement.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `arxisvr-snapshot-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      console.log('📸 Snapshot capturado');
    } catch (e) {
      console.error('Falha ao capturar snapshot:', e);
      alert('Falha ao capturar snapshot.');
    }
  });
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', async (e) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    const bar = document.querySelector('.selection-actions');
    if (bar && (bar as HTMLElement).style.display !== 'none') {
      if (e.key === 'Escape') {
        selectionService.clear();
        (bar as HTMLElement).style.display = 'none';
      }
    }

    if (e.key === 'v' || e.key === 'V') {
      if (viewerHost) {
        viewerHost.controls.toggleOrbit();
      }
    }
  });
}

function setupNavigation() {
  // Setup navigation buttons
  const navButtons = document.querySelectorAll('.nav-button');
  navButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const view = btn.getAttribute('data-view');
      console.log('View changed to:', view);

      // Load view-specific functionality
      switch (view) {
        case 'ifc':
          // Show IFC Project Panel
          if (viewerHost) {
            try {
              const { IFCProjectPanel } = await import('../../systems/model/IFCProjectPanel');
              const panel = new IFCProjectPanel({
                mountPoint: document.getElementById('left-sidebar'),
                viewerHost
              });
              console.log('IFC Project Panel loaded');
            } catch (err) {
              console.error('Failed to load IFC Project Panel:', err);
            }
          }
          break;

        case 'bim4d':
          // Load BIM 4D scheduling features
          if (viewerHost) {
            try {
              const { BIM4DManager } = await import('../../features/bim-4d/bim/4d');
              const manager = new BIM4DManager(viewerHost.scene, viewerHost.camera);
              console.log('BIM 4D Manager loaded');
            } catch (err) {
              console.error('Failed to load BIM 4D Manager:', err);
            }
          }
          break;

        case 'ar':
          // Load XR/AR immersive features
          if (viewerHost) {
            try {
              const { AvatarSystem } = await import('../../features/virtual-meetings/avatar/AvatarSystem');
              const avatarSystem = new AvatarSystem(viewerHost.scene);
              console.log('XR Avatar System loaded');
            } catch (err) {
              console.error('Failed to load XR features:', err);
            }
          }
          break;

        case 'viewer':
        default:
          // Default workspace view - no special loading
          console.log('Workspace view active');
          break;
      }
    });
  });
}

function setupIfcUpload() {
  const uploadBtns = document.querySelectorAll('[data-action="upload-ifc"]');
  uploadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.ifc';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && viewerHost && ifcLoader) {
          try {
            await ifcLoader.load(file);
            console.log('IFC carregado:', file.name);
            loadedIfcModelId = file.name;
            // Update IFC list
            await loadIfcModels();
          } catch (err) {
            console.error('Erro ao carregar IFC:', err);
            alert('Erro ao carregar arquivo IFC');
          }
        }
      };
      input.click();
    });
  });
}

function setupDragDropIfc() {
  const canvasArea = document.querySelector('.canvas-area');
  if (!canvasArea) return;

  canvasArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    canvasArea.classList.add('dnd-overlay');
  });

  canvasArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    canvasArea.classList.remove('dnd-overlay');
  });

  canvasArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    canvasArea.classList.remove('dnd-overlay');

    const file = (e as any).dataTransfer?.files[0];
    if (file && file.name.endsWith('.ifc') && viewerHost && ifcLoader) {
      try {
        await ifcLoader.load(file);
        console.log('IFC carregado via drag-drop:', file.name);
        loadedIfcModelId = file.name;
        // Update IFC list
        await loadIfcModels();
      } catch (err) {
        console.error('Erro ao carregar IFC:', err);
        alert('Erro ao carregar arquivo IFC');
      }
    }
  });
}

function setupCameraModeControls(viewerHost: ViewerHost) {
  const buttons = document.querySelectorAll('.camera-mode-button');
  const statusEl = document.getElementById('camera-mode-status');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-camera-mode');
      if (statusEl) {
        const modeNames: Record<string, string> = {
          'fps': 'Primeira Pessoa',
          'third-person': 'Terceira Pessoa 360°',
          'drone': 'Drone',
          'orbit': 'Órbita'
        };
        statusEl.innerHTML = `<strong>${modeNames[mode || ''] || mode}:</strong> ${getModeHint(mode || '')}`;
      }

      // Apply camera mode changes
      if (viewerHost && viewerHost.controls) {
        switch (mode) {
          case 'fps':
            viewerHost.controls.enableZoom = true;
            viewerHost.controls.enableRotate = true;
            viewerHost.controls.enablePan = true;
            break;
          case 'third-person':
            viewerHost.controls.enableZoom = true;
            viewerHost.controls.enableRotate = true;
            viewerHost.controls.enablePan = true;
            break;
          case 'drone':
            viewerHost.controls.enableZoom = true;
            viewerHost.controls.enableRotate = true;
            viewerHost.controls.enablePan = true;
            break;
          case 'orbit':
            viewerHost.controls.enableZoom = true;
            viewerHost.controls.enableRotate = true;
            viewerHost.controls.enablePan = true;
            break;
        }
        viewerHost.controls.update();
      }
    });
  });
}

function getModeHint(mode: string): string {
  const hints: Record<string, string> = {
    'fps': 'WASD anda, mouse olha, Space pula.',
    'third-person': 'Mouse orbita, scroll zoom.',
    'drone': 'WASD voa, Shift sobe, Ctrl desce.',
    'orbit': 'Mouse orbita, scroll zoom.'
  };
  return hints[mode] || '';
}

function setupGravityControls(viewerHost: ViewerHost) {
  const slider = document.getElementById('gravity-slider') as HTMLInputElement;
  const valueEl = document.getElementById('gravity-value');
  const checkbox = document.getElementById('gravity-enabled') as HTMLInputElement;

  if (slider && valueEl) {
    slider.addEventListener('input', () => {
      valueEl.textContent = slider.value;
      // Apply gravity to viewerHost if it has physics
      if (viewerHost && (viewerHost as any).physics) {
        (viewerHost as any).physics.gravity = parseFloat(slider.value);
      }
    });
  }

  if (checkbox) {
    checkbox.addEventListener('change', () => {
      // Enable/disable gravity in viewerHost
      if (viewerHost && (viewerHost as any).physics) {
        (viewerHost as any).physics.enabled = checkbox.checked;
      }
    });
  }
}

async function loadIfcModels() {
  try {
    const ifcService = getIfcService();
    // const models = await ifcService.listModels();
    const models: any[] = [];
    currentIfcModels = models;
    
    const ifcList = document.getElementById('ifc-list');
    if (!ifcList) return;
    
    if (models.length === 0) {
      ifcList.innerHTML = `
        <li class="sidebar__item">
          <span class="sidebar__icon">ADD</span>
          <span>Nenhum modelo - arraste IFC aqui</span>
        </li>
      `;
      return;
    }
    
    ifcList.innerHTML = models.map(model => `
      <li class="sidebar__item" data-model-id="${model.id}">
        <span class="sidebar__icon">IFC</span>
        <span>${model.name || 'Sem nome'}</span>
      </li>
    `).join('');
    
    // Add click handlers
    ifcList.querySelectorAll('.sidebar__item').forEach(item => {
      item.addEventListener('click', async () => {
        const modelId = item.getAttribute('data-model-id');
        const model = currentIfcModels.find((entry) => entry.id === modelId);
        if (model) {
          console.log('Modelo selecionado:', model);
        }
      });
    });

    const modelInfo = document.getElementById('model-info');
    if (modelInfo) {
      modelInfo.innerHTML = `
        <p style="font-size: 13px; color: var(--text-secondary);">
          <strong style="color: var(--text-primary);">${models.length}</strong> modelos disponíveis
        </p>
      `;
    }
  } catch (error) {
    console.error('Erro ao carregar modelos:', error);
    const ifcList = document.getElementById('ifc-list');
    if (ifcList) {
      ifcList.innerHTML = `
        <li class="sidebar__item">
          <span class="sidebar__icon">ERR</span>
          <span style="color: var(--accent-red);">Erro ao carregar</span>
        </li>
      `;
    }
  }
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
