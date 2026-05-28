/**
 * bootstrap.ts - Composition root (entry point)
 * Inicializa AppShell e serviços
 */

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '../styles/tokens.css';
import '../styles/app.css';
import '../inspector/inspector.css';
import '../network/multiplayer-controls.css';

import { AppShell } from './AppShell';
import { di } from './di';
import { uiStore } from './state/uiStore';
import { eventBus } from './state/eventBus';
import { EventType, ToolType } from '../core';
import { ModelSession } from '../systems/model/ModelSession';
import { IFCSimpleLoader } from '../loaders/IFCSimpleLoader';
import { FederatedLoader } from '../systems/model/FederatedLoader';
import { fileService } from '../systems/file';
import { initializeAPI, getAuthService, getProjectsService, getMeetingsService, getBillingService } from '../api/v1';
import { licenseManager } from '../systems/licensing/LicenseManager';

// Autenticação removida para uso anônimo

/**
 * Bootstrap application
 */
async function bootstrap() {
  console.log('ArxisVR starting...');
  console.log('Location:', window.location.href);
  console.log('Pathname:', window.location.pathname);

  // Removido Auth guard: app liberado para uso anônimo

  // 0. Initialize API connection to backend
  console.log('Initializing API connection...');
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  initializeAPI({
    baseURL,
    // onUnauthorized: nenhuma ação, uso anônimo
  });
  
  // Removido restore de sessão/token: app sempre inicia em modo anônimo
  
  console.log('API initialized');

  // 1. Get root container
  const root = document.getElementById('app');
  if (!root) {
    const errorMsg = 'Root element #app not found';
    console.error(errorMsg);
    document.body.innerHTML = `<div style="padding:32px;color:#111827;background:#f9fafb;font-family:Inter,Segoe UI,sans-serif;"><h1 style="color:#dc2626;">Falha ao iniciar o workspace</h1><p>${errorMsg}</p></div>`;
    throw new Error(errorMsg);
  }
  
  console.log('Root element found:', root);

  // 2. Initialize AppShell (monta layout)
  console.log('Creating AppShell...');
  const appShell = new AppShell(root);
  console.log('AppShell created');

  // 3. Get Three.js references from ViewerHost
  console.log('Getting ViewerHost references...');
  const viewerHost = appShell.getViewerHost();
  const { scene, camera, renderer, controls } = viewerHost;
  console.log('ViewerHost references obtained');

  // 4. Initialize core services
  console.log('Initializing services...');
  
  // SIMPLES: IFC Loader básico que FUNCIONA
  const ifcLoader = new IFCSimpleLoader(scene, camera, controls);
  
  const modelSession = new ModelSession(scene, camera);
  
  // FederatedLoader agora compartilha o IFCSimpleLoader (sem criar novo IFCLoader)
  const federatedLoader = new FederatedLoader(scene, camera, modelSession, ifcLoader);
  
  console.log('IFCSimpleLoader created');
  console.log('FederatedLoader created (shared loader)');
  
  // AppController é singleton
  const AppControllerClass = (await import('./AppController')).AppController as any;
  const appController = AppControllerClass.getInstance();

  // 5. Register services in DI
  console.log('Registering services in DI...');
  di.register('ifcLoader', ifcLoader);
  di.register('modelSession', modelSession);
  di.register('federatedLoader', federatedLoader);
  di.register('appController', appController);
  
  // Register API services
  di.register('authService', getAuthService());
  di.register('projectsService', getProjectsService());
  di.register('meetingsService', getMeetingsService());
  
  console.log('Services registered');

  // 6. Configure FileService - usa o loader SIMPLES e FUNCIONAL
  fileService.setIfcLoader(async (file: File) => {
    console.log('Carregando arquivo IFC...');
    
    try {
      await ifcLoader.load(file);
      console.log('Arquivo carregado com sucesso');
    } catch (error) {
      console.error('Erro ao carregar arquivo:', error);
      throw error;
    }
  });

  // 6.5. Registra handler para FILE_SELECTED
  eventBus.on(EventType.FILE_SELECTED, async ({ file, kind }: any) => {
    console.log('FILE_SELECTED event received:', { fileName: file?.name, kind });
    
    if (!file) {
      console.warn('FILE_SELECTED recebido sem referência de arquivo.');
      return;
    }

    const normalizedKind = (kind ?? 'ifc').toLowerCase();
    if (normalizedKind !== 'ifc') {
      console.warn(`Tipo de arquivo não suportado: ${normalizedKind}`);
      return;
    }

    try {
      console.log(`Iniciando carregamento IFC: ${file.name}`);
      await ifcLoader.load(file);
      console.log('Arquivo IFC carregado com sucesso');
    } catch (error) {
      console.error('Falha ao carregar IFC:', error);
      throw error;
    }
  });

  // 7. Listen to file load events
  eventBus.on('ModelLoaded', (event) => {
    console.log('Model loaded:', event.payload);
    
    // Auto-switch to layers panel
    uiStore.setActiveView('layers');
  });

  // 8. Setup app controller
  appController.setEngineReferences(scene, camera, renderer);

  // 8.5. Initialize and register tools
  console.log('Initializing tools...');
  const { SelectionTool } = await import('../tools/SelectionTool');
  const { MeasurementTool } = await import('../tools/MeasurementTool');
  const { SectionTool } = await import('../tools/SectionTool');
  const { LayerTool } = await import('../tools/LayerTool');
  
  const selectionTool = new SelectionTool(scene, camera);
  const measurementTool = new MeasurementTool(scene, camera);
  const sectionTool = new SectionTool(scene, camera);
  const layerTool = new LayerTool();
  
  appController.toolManager.registerTool(ToolType.SELECTION, selectionTool);
  appController.toolManager.registerTool(ToolType.MEASUREMENT, measurementTool);
  appController.toolManager.registerTool(ToolType.CUT, sectionTool);
  appController.toolManager.registerTool(ToolType.LAYER, layerTool);
  
  console.log('Tools registered:', appController.toolManager.getRegisteredTools());

  // 9. Initialize Inspector (feature plugável)
  const { inspectorController } = await import('../inspector/InspectorController');
  const canvas = renderer.domElement;
  inspectorController.initialize(scene, camera, canvas, root, ifcLoader);

  // 11.5. Initialize Login Modal
  const { getLoginModal, AuthStatusWidget, getProfilePanel } = await import('../features/auth');
  const loginModal = getLoginModal();
  
  // Initialize Profile Panel
  const profilePanel = getProfilePanel();
  
  // Initialize Auth Status Widget
  const authStatusWidget = new AuthStatusWidget(root);
  console.log('Auth UI initialized');

  console.log('ArxisVR ready');
  console.log('Press Ctrl+B to toggle sidebar');
  console.log('Press Escape to close modals');
  console.log('Click on objects to inspect properties');

  // Expose for debugging (only in dev)
  if (import.meta.env.DEV) {
    (window as any).appShell = appShell;
    (window as any).di = di;
    (window as any).uiStore = uiStore;
    (window as any).eventBus = eventBus;
    (window as any).federatedLoader = federatedLoader;
    (window as any).authManager = (await import('../features/auth')).authManager;
    (window as any).authStatusWidget = authStatusWidget;
    (window as any).loginModal = loginModal;
    (window as any).profilePanel = profilePanel;
  }
  
  // Expose FederatedLoader globally for UI (production também)
  (window as any).federatedLoader = federatedLoader;
}

// Start app
console.log('Calling bootstrap()...');
bootstrap().catch((error) => {
  console.error('Falha ao iniciar o ArxisVR:', error);
  console.error('Stack:', error.stack);
  
  // Show error on page
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'padding:32px;background:#f9fafb;color:#111827;font-family:Inter,Segoe UI,sans-serif;white-space:pre-wrap;';
  errorDiv.innerHTML = `
    <h1 style="color:#dc2626;">Falha ao iniciar o ArxisVR</h1>
    <h2>Mensagem do erro:</h2>
    <p style="color:#991b1b;">${error.message}</p>
    <h2>Detalhes técnicos:</h2>
    <pre style="color:#6b7280;font-size:12px;">${error.stack || 'Sem stack trace disponível'}</pre>
    <hr>
    <p>Abra o console do navegador para mais detalhes técnicos.</p>
  `;
  document.body.innerHTML = '';
  document.body.appendChild(errorDiv);
});
