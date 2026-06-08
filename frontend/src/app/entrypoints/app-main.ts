import { ViewerHost } from '../../viewer/ViewerHost';
import * as THREE from 'three';
import { IFCSimpleLoader } from '../../loaders/IFCSimpleLoader';
import { IFCUploadManager } from '../../systems/model/IFCUploadManager';
import { initializeAPI } from '../../api/v1/client';
import { getIfcService } from '../../api/v1/services/index';
import { tenantService } from '../../api/v1/services/tenant.service';
import { resolveApiBaseUrl } from '../../config/apiBaseUrl';
import { TenantProjectSelector } from '../../app/components/TenantProjectSelector.js';
import { AuthModal } from '../../app/components/AuthModal.js';
import { WorkspacePanel } from '../../app/components/WorkspacePanel.js';
import { AdminPanel } from '../../app/components/AdminPanel.js';
import { FederatedModelsPanel } from '../../app/components/FederatedModelsPanel.js';
import { SchedulingPanel } from '../../app/components/SchedulingPanel.js';
import { MeetingsPanel } from '../../app/components/MeetingsPanel.js';
import { BillingModal } from '../../app/components/BillingModal';
import { commandRegistry } from '../../commands';
import { appController } from '../../app/AppController';
import { initHelpSystem } from '../../app/help/HelpSystem';
import { uiStore } from '../../app/state/uiStore';
import { CollaborationPanel } from '../../app/CollaborationPanel';
import { isAuthenticated } from '../../core/auth/session';
import { modelSyncService } from '../../features/collaboration/ModelSyncService';
import { eventBus } from '../../core';
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

const API_BASE_URL = resolveApiBaseUrl();
let PROJECT_ID = localStorage.getItem('arxisvr_project_id') || '';
window.addEventListener('arxisvr:project-selected', (e: Event) => {
  const id = (e as CustomEvent).detail?.projectId;
  if (id) PROJECT_ID = id;
});
let TENANT_ID = localStorage.getItem('arxisvr_tenant_id') || 'default-tenant';

let viewerHost: ViewerHost | null = null;
let ifcLoader: IFCSimpleLoader | null = null;
let loadedIfcModelId: string | null = null;
let currentIfcModels: any[] = [];
const hasAuthToken = () => Boolean(localStorage.getItem('arxisvr_token'));

/**
 * Guarda de autenticação: o app é 100% privado. Sem demo, sem acesso anônimo.
 * Quem não tem sessão válida volta para a landing page (ou login, se veio de
 * um convite de reunião — preservando o destino via ?next).
 * Retorna false quando redirecionou (e o init deve abortar).
 */
function enforceAuthOrRedirect(): boolean {
  if (isAuthenticated()) return true;
  const search = window.location.search;
  const sessionParam = new URLSearchParams(search).get('session');
  if (sessionParam) {
    const next = encodeURIComponent('/app.html' + search);
    window.location.replace('/login.html?next=' + next);
  } else {
    window.location.replace('/index.html');
  }
  return false;
}

// Inicializar aplicação
async function init() {
  console.log('Inicializando ArxisVR App...');

  // App privado: sem sessão válida, não renderiza nada — redireciona.
  if (!enforceAuthOrRedirect()) return;

  const apiClient = initializeAPI({
    baseURL: API_BASE_URL,
  });

  // Initialize Auth Modal
  const authModal = new AuthModal();
  authModal.renderAuthButton();

  // Initialize Admin Panel
  const adminPanel = new AdminPanel();
  const billingModal = new BillingModal();

  // Initialize Federated Models Panel
  const federatedPanel = new FederatedModelsPanel();

  // Initialize Scheduling Panel
  const schedulingPanel = new SchedulingPanel();

  // Initialize Meetings Panel
  const meetingsPanel = new MeetingsPanel();
  // Expose globally so mobile nav can trigger it
  (window as any).__meetingsPanel = meetingsPanel;

  // Connect settings button to admin panel
  const settingsBtn = document.querySelector('[title="Configurações"]');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => adminPanel.open());
  }

  // Workspaces (multi-tenant): trocar/criar workspace, convidar, convites.
  const workspacePanel = new WorkspacePanel();
  (window as any).__workspacePanel = workspacePanel;

  const actionsContainer = document.querySelector('.header__actions');
  if (actionsContainer) {
    const workspaceBtn = document.createElement('button');
    workspaceBtn.className = 'icon-button';
    workspaceBtn.setAttribute('title', 'Workspaces');
    workspaceBtn.innerHTML = '<i class="lucide lucide-building-2"></i>';
    workspaceBtn.addEventListener('click', () => workspacePanel.open());

    const billingBtn = document.createElement('button');
    billingBtn.className = 'icon-button';
    billingBtn.setAttribute('title', 'Billing');
    billingBtn.innerHTML = '<i class="lucide lucide-credit-card"></i>';
    billingBtn.addEventListener('click', () => billingModal.open());

    const notificationsBtn = actionsContainer.querySelector('[title="Notificações"]');
    if (notificationsBtn?.parentElement === actionsContainer) {
      actionsContainer.insertBefore(workspaceBtn, notificationsBtn);
      actionsContainer.insertBefore(billingBtn, notificationsBtn);
    } else {
      actionsContainer.appendChild(workspaceBtn);
      actionsContainer.appendChild(billingBtn);
    }
  }

  // Add button to open federated models panel in IFC section
  const ifcSection = document.querySelector('[data-view="ifc"]');
  if (ifcSection) {
    const federatedBtn = document.createElement('button');
    federatedBtn.innerHTML = 'Modelos Federados';
    federatedBtn.style.cssText = 'padding: 8px 16px; background: var(--accent-blue); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 8px;';
    federatedBtn.addEventListener('click', () => {
      if (PROJECT_ID) {
        federatedPanel.open(PROJECT_ID);
      } else {
        alert('Selecione um projeto primeiro');
      }
    });
    
    // Add button after IFC list
    const ifcList = document.getElementById('ifc-list');
    if (ifcList && ifcList.parentElement) {
      ifcList.parentElement.appendChild(federatedBtn);
    }
  }

  // Inject secondary CTA buttons into dedicated header container (NOT inside header__nav)
  const ctaContainer = document.getElementById('header-cta-actions');
  if (ctaContainer) {
    const CTA_STYLE = 'display:inline-flex;align-items:center;gap:6px;padding:5px 12px;background:rgba(37,99,235,0.15);color:var(--accent-blue-l);border:1px solid rgba(37,99,235,0.3);border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;height:32px;white-space:nowrap;transition:all .15s;';

    const schedulingBtn = document.createElement('button');
    schedulingBtn.innerHTML = '<i class="lucide lucide-calendar-days" style="width:14px;height:14px;"></i> Cronograma 4D';
    schedulingBtn.style.cssText = CTA_STYLE;
    schedulingBtn.title = 'Abrir cronograma BIM 4D do projeto';
    schedulingBtn.addEventListener('click', () => {
      if (PROJECT_ID) {
        schedulingPanel.open(PROJECT_ID);
      } else {
        alert('Selecione um projeto primeiro');
      }
    });

    const meetingsBtn2 = document.createElement('button');
    meetingsBtn2.innerHTML = '<i class="lucide lucide-users" style="width:14px;height:14px;"></i> Reuniões XR';
    meetingsBtn2.style.cssText = CTA_STYLE;
    meetingsBtn2.title = 'Abrir sala de reunião colaborativa';
    meetingsBtn2.addEventListener('click', () => {
      const pid = PROJECT_ID || localStorage.getItem('arxisvr_project_id') || 'demo';
      meetingsPanel.open(pid);
    });

    ctaContainer.appendChild(schedulingBtn);
    ctaContainer.appendChild(meetingsBtn2);
  }

  // Initialize Tenant/Project Selector — uma falha no fetch de tenants NÃO pode
  // abortar a inicialização do app (ex.: convidado sem acesso a tenants ainda
  // precisa entrar na reunião). Isolado em try/catch.
  const tenantSelector = new TenantProjectSelector();
  try {
    await Promise.race([
      tenantSelector.init(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('tenant init timeout')), 8000)),
    ]);
  } catch (err) {
    console.warn('[ArxisVR] Seletor de tenant indisponível (seguindo sem ele):', err);
  }

  // Listen for project changes
  window.addEventListener('project-changed', (e: any) => {
    const { projectId } = e.detail;
    PROJECT_ID = projectId;
    console.log('Project changed to:', projectId);
    loadIfcModels();
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
  (appController as any).viewerHost = viewerHost;
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
      // Hide copilot's own floating toggle — header "Arxis AI" btn is the single entry point
      const selfToggle = document.querySelector('.arxis-copilot-toggle') as HTMLElement | null;
      if (selfToggle) selfToggle.style.display = 'none';

      // Wire welcome-ai panel as a LAUNCHER for the Copilot (not a separate AI)
      // Chips send a pre-filled message; textarea submits on Enter/click
      document.querySelectorAll('.welcome-ai .ai-chip').forEach(chip => {
        (chip as HTMLElement).addEventListener('click', () => {
          const msg = (chip as HTMLElement).innerText.trim();
          copilot.open();
          // Inject message after open animation settles
          setTimeout(() => {
            const inp = document.querySelector('.arxis-copilot-input, [data-copilot-input]') as HTMLInputElement | null;
            if (inp) { inp.value = msg; inp.dispatchEvent(new Event('input')); }
          }, 300);
        });
      });
      const welcomeTextarea = document.querySelector('.welcome-ai__input') as HTMLTextAreaElement | null;
      if (welcomeTextarea) {
        welcomeTextarea.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const msg = welcomeTextarea.value.trim();
            if (!msg) return;
            copilot.open();
            setTimeout(() => {
              const inp = document.querySelector('.arxis-copilot-input, [data-copilot-input]') as HTMLInputElement | null;
              if (inp) { inp.value = msg; inp.dispatchEvent(new Event('input')); }
              welcomeTextarea.value = '';
            }, 300);
          }
        });
      }
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
        window.THREE = THREE;
        new SectionsPanel(sectionsMount);
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
      
      // Painel ÚNICO de propriedades: o inspector é montado DENTRO do painel
      // direito (#model-info), não como uma segunda barra flutuante.
      const modelInfoEl = document.getElementById('model-info');
      inspectorController.initialize(
        viewerHost!.scene,
        viewerHost!.camera,
        canvasEl,
        modelInfoEl || document.body,
        ifcLoader
      );
      selectionService.onSelectionChanged((payload) => {
        if (payload) {
          // Remove placeholder/resumo antigo; mantém só o painel do inspector.
          if (modelInfoEl) {
            modelInfoEl
              .querySelectorAll(':scope > :not(.inspector-panel)')
              .forEach((n) => n.remove());
          }
          inspectorController.showPanel(payload);
          // Atualiza status bar / breadcrumb / botão IA (sem recriar o card).
          updateSelectionMeta(payload);
        } else {
          inspectorController.hidePanel();
          updateModelInfoFromSelection(null);
        }
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
  setupAIButton();

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

  // Detecta entrada em reunião ANTES de construir o painel — o CollaborationPanel
  // consome (apaga) as chaves de guest do localStorage no auto-join, então a
  // leitura precisa acontecer aqui. App é privado: quem tem ?session= é
  // participante legítimo de uma reunião.
  const sessionParam = new URLSearchParams(window.location.search).get('session');
  const arrivedAsGuest = !!(
    sessionParam &&
    localStorage.getItem('arxisvr_guest_name') &&
    (localStorage.getItem('arxisvr_session_id') === sessionParam ||
      localStorage.getItem('arxisvr_local_guest_id') ||
      localStorage.getItem('arxisvr_session_token'))
  );
  const inMeeting = !!sessionParam && (arrivedAsGuest || !!localStorage.getItem('arxisvr_host_session_id'));

  // Inicializar painel de colaboração flutuante
  const collabMount = document.getElementById('collab-panel-mount');
  if (collabMount) {
    new CollaborationPanel(collabMount);
  }

  // Toggle button para abrir/fechar painel de colaboração
  const btnCollabToggle = document.getElementById('btn-collab-toggle');
  const collabFloating = document.getElementById('collab-floating-panel');

  const closeCollabPanel = () => {
    if (collabFloating) collabFloating.style.display = 'none';
  };
  const openCollabPanel = () => {
    if (collabFloating) collabFloating.style.display = 'flex';
  };

  if (btnCollabToggle && collabFloating) {
    btnCollabToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = collabFloating.style.display !== 'none';
      if (isOpen) closeCollabPanel(); else openCollabPanel();
    });

    // Botão X dentro do painel
    const btnCollabClose = document.getElementById('btn-collab-close');
    if (btnCollabClose) {
      btnCollabClose.addEventListener('click', (e) => { e.stopPropagation(); closeCollabPanel(); });
    }

    // Fechar ao clicar fora do painel
    document.addEventListener('click', (e) => {
      if (collabFloating.style.display === 'none') return;
      if (!collabFloating.contains(e.target as Node) && e.target !== btnCollabToggle) {
        closeCollabPanel();
      }
    });

    // Tecla ESC fecha o painel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && collabFloating.style.display !== 'none') closeCollabPanel();
    });
  }

  // Entrou numa reunião → esconde o welcome/demo e abre o painel de colaboração.
  // Sem isso, o convidado caía na tela de boas-vindas (demo) em vez da reunião.
  if (inMeeting) {
    const welcomeOverlay = document.getElementById('welcome-overlay');
    if (welcomeOverlay) welcomeOverlay.classList.add('hidden');
    (window as any).ArxisWelcome?.hide?.();
    setTimeout(() => {
      if (collabFloating) collabFloating.style.display = 'flex';
    }, 300);

    // Sincronização do modelo do anfitrião entre todos os participantes.
    modelSyncService.start();
    (window as any).__modelSync = modelSyncService;
    (window as any).__eventBus = eventBus;

    // Banner de reunião: comunica o estado da sincronização do modelo, em vez de
    // deixar a viewport vazia parecendo demo/erro.
    setupMeetingBanner();
  }

  // Ctrl+Shift+O abre/fecha o painel de colaboração
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'O') {
      e.preventDefault();
      if (collabFloating) {
        collabFloating.style.display = collabFloating.style.display !== 'none' ? 'none' : 'block';
      }
    }
  });

  console.log('ArxisVR App pronto');
}

/**
 * Atualiza apenas os metadados de UI (status bar, breadcrumb, botão IA) a partir
 * da seleção. NÃO renderiza o card de propriedades — isso agora é feito pelo
 * Inspector embutido em #model-info (painel único de propriedades).
 */
function updateSelectionMeta(payload: any) {
  if (!payload) {
    _updateAIButton(null);
    _updateStatusBar(null);
    _updateBreadcrumb(null);
    return;
  }
  const obj = payload.object3D;
  const name = obj?.name || (payload.expressID !== undefined ? `IFC #${payload.expressID}` : obj?.type || 'Elemento');
  const ifcType = (payload.type || obj?.type || 'IFC').toUpperCase();
  _updateStatusBar({ name, coords: obj?.position });
  _updateBreadcrumb({ element: name, ifcType });
  _updateAIButton({ name, ifcType });
}

function updateModelInfoFromSelection(payload: any) {
  const el = document.getElementById('model-info');
  if (!el) return;

  // ── Clear state ──────────────────────────────────────
  if (!payload) {
    el.innerHTML = `
      <div style="padding:8px 0;text-align:center">
        <div style="font-size:28px;margin-bottom:8px;opacity:.3">📐</div>
        <p style="color:var(--text-secondary);font-size:12px;line-height:1.5">
          Clique em um elemento do modelo para ver propriedades
        </p>
      </div>`;
    _updateAIButton(null);
    _updateStatusBar(null);
    _updateBreadcrumb(null);
    return;
  }

  // ── Extract data ─────────────────────────────────────
  const obj = payload.object3D;
  const name = obj?.name || (payload.expressID !== undefined ? `IFC #${payload.expressID}` : obj?.type || 'Elemento');
  const ifcType = (payload.type || obj?.type || 'IFC').toUpperCase();
  const expressID = payload.expressID;

  // Bounding box → dimensions
  let dims = { x: 0, y: 0, z: 0 };
  if ((window as any).THREE && obj) {
    try {
      const box = new (window as any).THREE.Box3().setFromObject(obj);
      if (!box.isEmpty()) {
        const s = box.getSize(new (window as any).THREE.Vector3());
        dims = { x: parseFloat(s.x.toFixed(2)), y: parseFloat(s.y.toFixed(2)), z: parseFloat(s.z.toFixed(2)) };
      }
    } catch (_) {}
  }

  const volume = (dims.x * dims.y * dims.z).toFixed(2);
  const height = Math.max(dims.x, dims.y, dims.z).toFixed(2);

  // ── Update status bar ────────────────────────────────
  _updateStatusBar({ name, coords: obj?.position });

  // ── Update breadcrumb ────────────────────────────────
  _updateBreadcrumb({ element: name, ifcType });

  // ── Update AI button ────────────────────────────────
  _updateAIButton({ name, ifcType });

  // ── Render summary card ──────────────────────────────
  el.innerHTML = `
    <style>
      .elem-dim-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:10px 0}
      .elem-dim-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:8px 6px;text-align:center}
      .elem-dim-val{font-size:15px;font-weight:700;font-family:monospace;color:var(--text-primary)}
      .elem-dim-lbl{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
      .elem-tag{display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;margin:2px}
      .elem-tag-blue{background:rgba(37,99,235,.15);color:var(--accent-blue);border:1px solid rgba(37,99,235,.2)}
      .elem-tag-amber{background:rgba(245,158,11,.15);color:#F59E0B;border:1px solid rgba(245,158,11,.2)}
      .prop-kv{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px}
      .prop-kv:last-child{border:none}
      .prop-kv-key{color:var(--text-muted)}
      .prop-kv-val{color:var(--text-secondary);font-family:monospace}
      .prop-kv-val.accent{color:var(--accent-blue)}
    </style>

    <div style="margin-bottom:10px">
      <div style="font-size:15px;font-weight:700;color:var(--text-primary);letter-spacing:-.2px">${_esc(name)}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${_esc(ifcType)}${expressID !== undefined ? ` · ID ${expressID}` : ''}</div>
    </div>

    <div style="margin-bottom:10px">
      <span class="elem-tag elem-tag-blue">📐 ${_esc(ifcType)}</span>
      ${dims.y > 0 ? `<span class="elem-tag elem-tag-amber">↕ ${height}m alt.</span>` : ''}
    </div>

    ${dims.x > 0 ? `
    <div class="elem-dim-grid">
      <div class="elem-dim-box"><div class="elem-dim-val">${dims.x}</div><div class="elem-dim-lbl">Larg. m</div></div>
      <div class="elem-dim-box"><div class="elem-dim-val">${dims.y}</div><div class="elem-dim-lbl">Alt. m</div></div>
      <div class="elem-dim-box"><div class="elem-dim-val">${dims.z}</div><div class="elem-dim-lbl">Prof. m</div></div>
    </div>` : ''}

    <div style="margin-top:8px">
      ${expressID !== undefined ? `<div class="prop-kv"><span class="prop-kv-key">Express ID</span><span class="prop-kv-val accent">#${expressID}</span></div>` : ''}
      <div class="prop-kv"><span class="prop-kv-key">Tipo Three.js</span><span class="prop-kv-val">${_esc(obj?.type || '—')}</span></div>
      ${volume !== '0.00' ? `<div class="prop-kv"><span class="prop-kv-key">Volume aprox.</span><span class="prop-kv-val">${volume} m³</span></div>` : ''}
    </div>
  `;
}

// ── Helpers ──────────────────────────────────────────────

function _esc(s: string): string {
  return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c] || c));
}

function _updateStatusBar(data: { name: string; coords?: any } | null) {
  const sb = (window as any).ArxisStatusBar;
  if (!sb) return;
  if (!data) { sb.setObject('—'); sb.setCoords(null, null, null); return; }
  sb.setObject(data.name);
  if (data.coords) sb.setCoords(data.coords.x, data.coords.y, data.coords.z);
}

function _updateBreadcrumb(data: { element: string; ifcType: string } | null) {
  const sb = (window as any).ArxisStatusBar;
  if (!sb) return;
  if (!data) { return; }
  sb.setBreadcrumb('Projeto', data.ifcType, data.element);
}

function _updateAIButton(data: { name: string; ifcType: string } | null) {
  const btn = document.getElementById('btn-arxis-ai');
  if (!btn) return;
  if (!data) {
    btn.innerHTML = `<div class="btn-arxis-ai__dot"></div> Arxis AI`;
    btn.style.background = 'linear-gradient(135deg, #4F46E5, #7C3AED)';
    btn.style.boxShadow = '0 0 14px rgba(124, 58, 237, 0.35)';
    return;
  }
  const shortName = data.name.length > 14 ? data.name.slice(0, 12) + '…' : data.name;
  btn.innerHTML = `<div class="btn-arxis-ai__dot" style="background:#FCA5A5"></div> Analisar ${_esc(shortName)}`;
  btn.style.background = 'linear-gradient(135deg, #4F46E5, #7C3AED)';
  btn.style.boxShadow = '0 0 14px rgba(124, 58, 237, 0.35)';
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
        viewerHost.toggleControlMode();
      }
    }
  });
}

/**
 * Banner de estado da reunião — comunica a sincronização do modelo do anfitrião
 * (aguardando / carregando / pronto / erro) sem deixar a viewport parecer demo.
 */
function setupMeetingBanner(): void {
  if (document.getElementById('meeting-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'meeting-banner';
  banner.style.cssText =
    'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:50;background:rgba(15,23,42,.92);backdrop-filter:blur(8px);border:1px solid rgba(96,165,250,.3);color:#e2e8f0;padding:10px 18px;border-radius:10px;font-size:13px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:opacity .3s';

  const dot = (color: string) =>
    `<span style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};display:inline-block;flex-shrink:0"></span>`;
  const spinner =
    '<span style="width:13px;height:13px;border:2px solid rgba(255,255,255,.2);border-top-color:#60a5fa;border-radius:50%;display:inline-block;animation:spin .8s linear infinite"></span>';
  if (!document.getElementById('meeting-banner-kf')) {
    const kf = document.createElement('style');
    kf.id = 'meeting-banner-kf';
    kf.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(kf);
  }

  const setState = (html: string) => { banner.innerHTML = html; };
  const remove = () => {
    banner.style.opacity = '0';
    setTimeout(() => banner.remove(), 320);
  };

  const hasModel = () => currentIfcModels.length > 0 || !!loadedIfcModelId;

  if (hasModel()) return; // modelo já presente — sem banner

  setState(`${dot('#34d399')} Reunião conectada · aguardando o modelo do anfitrião`);
  document.body.appendChild(banner);

  const onLoading = () => setState(`${spinner} Carregando modelo do anfitrião…`);
  const onLoaded = () => { cleanup(); remove(); };
  const onError = () => {
    setState(`${dot('#f87171')} Não foi possível carregar o modelo do anfitrião`);
    setTimeout(() => { cleanup(); remove(); }, 6000);
  };
  // Modelo carregado localmente (anfitrião abriu o IFC) também encerra o banner.
  const onIfcLoaded = () => { cleanup(); remove(); };

  function cleanup() {
    eventBus.off('collab:model-loading', onLoading);
    eventBus.off('collab:model-loaded', onLoaded);
    eventBus.off('collab:model-error', onError);
    eventBus.off('ifc:loaded', onIfcLoaded);
  }

  eventBus.on('collab:model-loading', onLoading);
  eventBus.on('collab:model-loaded', onLoaded);
  eventBus.on('collab:model-error', onError);
  eventBus.on('ifc:loaded', onIfcLoaded);
}

function showNavToast(msg: string): void {
  let toast = document.getElementById('arxis-nav-toast') as HTMLDivElement;
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'arxis-nav-toast';
    toast.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:#1e293b;color:#f1f5f9;padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;border:1px solid rgba(255,255,255,0.1);box-shadow:0 8px 24px rgba(0,0,0,0.4);max-width:480px;text-align:center;transition:opacity .3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.display = 'block';
  clearTimeout((toast as any)._tid);
  (toast as any)._tid = setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => { toast.style.display = 'none'; }, 300); }, 4000);
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
          console.log('IFC view activated - loading models from backend');
          if (PROJECT_ID && hasAuthToken()) {
            loadIfcModels();
          }
          break;

        case 'bim4d':
          if (PROJECT_ID) {
            schedulingPanel.open(PROJECT_ID);
          } else {
            (window as any).__showModuleModal?.('📅 Planejamento 4D', `
              <p style="margin-bottom:14px;">Selecione um projeto para acessar o cronograma vinculado ao modelo IFC.</p>
              <div style="margin-bottom:14px;">
                <div style="font-size:12px;font-weight:600;color:#22c55e;margin-bottom:6px;">✓ Disponível</div>
                <div>Cronograma 4D com simulação de fases</div>
              </div>
              <div>
                <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;">Em desenvolvimento</div>
                <div>• Dependências entre tarefas</div>
                <div>• Recursos e alocação</div>
                <div>• Linha do tempo avançada</div>
              </div>
            `);
          }
          navButtons.forEach(b => b.classList.remove('active'));
          (document.querySelector('.nav-button[data-view="viewer"]') as HTMLElement)?.classList.add('active');
          break;

        case 'ar':
          (window as any).__showModuleModal?.('🥽 Imersão XR', `
            <p style="margin-bottom:14px;">Modo de realidade aumentada e virtual — acessível via headset WebXR ou celular.</p>
            <div style="margin-bottom:14px;">
              <div style="font-size:12px;font-weight:600;color:#22c55e;margin-bottom:6px;">✓ Disponível agora</div>
              <div>Reuniões XR — colaboração em tempo real no modelo</div>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:#94a3b8;margin-bottom:6px;">Em desenvolvimento</div>
              <div>• Visita AR no celular (câmera)</div>
              <div>• Quest / Vive — VR nativo</div>
              <div>• Anotações imersivas</div>
            </div>
          `);
          navButtons.forEach(b => b.classList.remove('active'));
          (document.querySelector('.nav-button[data-view="viewer"]') as HTMLElement)?.classList.add('active');
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

async function loadSingleIfc(file: File) {
  if (!viewerHost || !ifcLoader) return;
  try {
    if (hasAuthToken() && PROJECT_ID) {
      const uploadedModel = await tenantService.uploadIFCModel(PROJECT_ID, file);
      console.log('IFC uploaded to backend:', uploadedModel);
      await ifcLoader.load(file);
      loadedIfcModelId = (uploadedModel as any).id;
      await loadIfcModels();
      (window as any).ArxisStatusBar?.setModelInfo?.('IFC', '—');
      // Tem id no backend → emite ifc:loaded para o ModelSync compartilhar o
      // modelo com os participantes da reunião (se houver uma ativa).
      eventBus.emit('ifc:loaded', { model: uploadedModel });
    } else {
      await ifcLoader.load(file);
      console.log('IFC carregado localmente:', file.name);
      loadedIfcModelId = file.name;
      // Numa reunião, um arquivo só local (sem projeto) não pode ser
      // compartilhado — avisa o anfitrião de forma honesta.
      if (modelSyncService.isActive()) {
        showNavToast('Para compartilhar este modelo na reunião, abra-o a partir de um projeto (o arquivo local não é enviado aos participantes).');
      }
    }
    (window as any).ArxisWelcome?.hide?.();
  } catch (err) {
    console.error('Erro ao carregar IFC:', err);
    alert(`Erro ao carregar ${file.name}: ${(err as Error).message || err}`);
  }
}

function setupIfcUpload() {
  const uploadBtns = document.querySelectorAll('[data-action="upload-ifc"]');
  uploadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.ifc';
      input.multiple = true; // suporte a múltiplos arquivos
      input.id = 'arxis-ifc-file-input';
      input.style.display = 'none';
      document.body.appendChild(input);
      input.onchange = async (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        document.body.removeChild(input);
        if (!files.length) return;
        // Carrega arquivos sequencialmente
        for (const file of files) {
          await loadSingleIfc(file);
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

    const files = Array.from((e as any).dataTransfer?.files || [])
      .filter((f: any) => f.name.endsWith('.ifc')) as File[];
    if (!files.length || !viewerHost || !ifcLoader) return;
    for (const file of files) {
      await loadSingleIfc(file);
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
    let models: any[] = [];
    
    // Load IFC models from backend API
    if (PROJECT_ID && hasAuthToken()) {
      try {
        models = await tenantService.getIFCModels(PROJECT_ID);
        currentIfcModels = models;
      } catch (err) {
        console.warn('Failed to load models from API, using empty list:', err);
      }
    }
    
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
          console.log('Carregando modelo:', model);
          
          // Download and load model using IFCUploadManager
          if (viewerHost?.ifcUploadManager) {
            try {
              await viewerHost.ifcUploadManager.loadModelIntoScene(model);
            } catch (err) {
              console.error('Erro ao carregar modelo:', err);
              alert('Erro ao carregar modelo: ' + err.message);
            }
          } else {
            console.error('IFCUploadManager não inicializado');
          }
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

function setupAIButton() {
  const btn = document.getElementById('btn-arxis-ai');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const copilot = (window as any).__arxisCopilot;
    if (copilot?.toggle) {
      copilot.toggle();
    } else {
      // Copilot ainda carregando — aguardar e tentar novamente
      const retry = setInterval(() => {
        const c = (window as any).__arxisCopilot;
        if (c?.toggle) { clearInterval(retry); c.toggle(); }
      }, 200);
      setTimeout(() => clearInterval(retry), 5000);
    }
  });
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Wire up Environment / Scenery dropdown in app.html header
function wireEnvironmentDropdown() {
  const btn = document.getElementById('btn-environment');
  const menu = document.getElementById('env-dropdown-menu');
  const wrapper = document.getElementById('env-dropdown-container');
  if (!btn || !menu || !wrapper) return;

  const close = () => {
    menu.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    menu.style.display = 'block';
    btn.setAttribute('aria-expanded', 'true');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.style.display === 'block';
    isOpen ? close() : open();
  });

  menu.querySelectorAll<HTMLButtonElement>('.env-item').forEach((item) => {
    item.addEventListener('click', async () => {
      const cmd = item.getAttribute('data-cmd');
      if (!cmd) return;
      try {
        const result = await commandRegistry.execute(cmd as any);
        if (!result.success) {
          console.warn('[Environment] command failed:', cmd, result.error);
        }
      } catch (err) {
        console.error('[Environment] command error:', cmd, err);
      }
      close();
    });
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target as Node)) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(wireEnvironmentDropdown, 0));
} else {
  setTimeout(wireEnvironmentDropdown, 0);
}

// Help System (tooltip + F1 + modo ajuda)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initHelpSystem, 0));
} else {
  setTimeout(initHelpSystem, 0);
}
