import { eventBus, EventType, appState } from '../../../core';

/**
 * XRManager - Gerenciador de WebXR
 * 
 * Responsável por:
 * - Feature detection
 * - Session management
 * - Estado XR no AppState
 * - Eventos de ciclo de vida
 */
export class XRManager {
  private static instance: XRManager;
  
  private renderer: THREE.WebGLRenderer | null = null;
  private session: XRSession | null = null;
  private isInitialized: boolean = false;
  
  private constructor() {
    console.log('🥽 XRManager initialized');
  }
  
  public static getInstance(): XRManager {
    if (!XRManager.instance) {
      XRManager.instance = new XRManager();
    }
    return XRManager.instance;
  }
  
  /**
   * Inicializa XRManager com renderer
   */
  public initialize(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.isInitialized = true;
    
    // Detecta suporte WebXR
    this.checkSupport();
    
    console.log('✅ XRManager initialized with renderer');
  }
  
  /**
   * Verifica suporte a WebXR
   */
  public async checkSupport(): Promise<void> {
    if (!('xr' in navigator)) {
      console.warn('⚠️ WebXR not supported in this browser');
      appState.setXRSupported(false);
      appState.setXRError('WebXR not supported');
      
      eventBus.emit(EventType.XR_SUPPORT_CHECKED, { supported: false });
      return;
    }
    
    try {
      const xr = (navigator as any).xr;
      
      // Check VR support
      const vrSupported = await xr?.isSessionSupported('immersive-vr');
      
      if (vrSupported) {
        appState.setXRSupported(true);
        appState.setXRError(null);
        console.log('✅ WebXR VR supported');
        
        eventBus.emit(EventType.XR_SUPPORT_CHECKED, { supported: true, mode: 'vr' });
      } else {
        appState.setXRSupported(false);
        appState.setXRError('Immersive VR not supported');
        console.warn('⚠️ Immersive VR not supported');
        
        eventBus.emit(EventType.XR_SUPPORT_CHECKED, { supported: false });
      }
      
    } catch (error) {
      console.error('❌ Error checking XR support:', error);
      appState.setXRSupported(false);
      appState.setXRError('Error checking XR support');
      
      eventBus.emit(EventType.XR_SUPPORT_CHECKED, { supported: false });
    }
  }
  
  /**
   * Entra em sessão XR
   */
  public async enterXR(mode: 'vr' | 'ar' = 'vr'): Promise<void> {
    if (!this.renderer || !this.isInitialized) {
      throw new Error('XRManager not initialized');
    }
    
    if (!appState.xrState.supported) {
      throw new Error('XR not supported');
    }
    
    if (appState.xrState.active) {
      console.warn('⚠️ Already in XR session');
      return;
    }
    
    try {
      console.log(`🥽 Entering XR mode: ${mode}...`);
      
      const xr = (navigator as any).xr;
      const sessionMode = mode === 'vr' ? 'immersive-vr' : 'immersive-ar';
      
      // Request session
      this.session = await xr.requestSession(sessionMode, {
        requiredFeatures: ['local-floor'],
        optionalFeatures: ['bounded-floor', 'hand-tracking']
      });
      
      // Set session on renderer
      await this.renderer.xr.setSession(this.session);
      
      // Update state
      appState.setXRActive(true, mode);
      appState.setXRError(null);
      
      // Listen for session end
      if (this.session) {
        this.session.addEventListener('end', () => {
          this.onSessionEnd();
        });
      }
      
      console.log(`✅ Entered XR mode: ${mode}`);
      
      eventBus.emit(EventType.XR_SESSION_STARTED, { mode });
      
    } catch (error: any) {
      console.error('❌ Failed to enter XR:', error);
      
      let errorMessage = 'Unknown error';
      
      if (error.name === 'SecurityError') {
        errorMessage = 'VR access denied or cancelled';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'VR configuration not supported';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'VR permission denied';
      } else {
        errorMessage = error.message || 'Failed to enter VR';
      }
      
      appState.setXRError(errorMessage);
      appState.setXRActive(false);
      
      eventBus.emit(EventType.XR_SESSION_FAILED, { error: errorMessage });
      
      throw new Error(errorMessage);
    }
  }
  
  /**
   * Sai da sessão XR
   */
  public async exitXR(): Promise<void> {
    if (!this.session) {
      console.warn('⚠️ No active XR session');
      return;
    }
    
    try {
      console.log('🥽 Exiting XR...');
      
      await this.session.end();
      this.session = null;
      
      appState.setXRActive(false);
      
      console.log('✅ Exited XR');
      
      eventBus.emit(EventType.XR_SESSION_ENDED, {});
      
    } catch (error) {
      console.error('❌ Error exiting XR:', error);
      throw error;
    }
  }
  
  /**
   * Handler para fim de sessão
   */
  private onSessionEnd(): void {
    console.log('🥽 XR session ended');
    
    this.session = null;
    appState.setXRActive(false);
    
    eventBus.emit(EventType.XR_SESSION_ENDED, {});
  }
  
  /**
   * Retorna se XR está ativo
   */
  public get isActive(): boolean {
    return appState.xrState.active;
  }
  
  /**
   * Retorna se XR é suportado
   */
  public get isSupported(): boolean {
    return appState.xrState.supported;
  }
  
  /**
   * Retorna sessão ativa
   */
  public getSession(): XRSession | null {
    return this.session;
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    if (this.session) {
      this.session.end().catch(console.error);
      this.session = null;
    }
    
    this.renderer = null;
    this.isInitialized = false;
    
    appState.setXRActive(false);
    
    console.log('🥽 XRManager disposed');
  }
}

// Export singleton
export const xrManager = XRManager.getInstance();
