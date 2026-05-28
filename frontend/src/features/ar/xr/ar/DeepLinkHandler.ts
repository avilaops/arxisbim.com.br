/**
 * DeepLinkHandler - Handler para deep links do app
 * 
 * Funcionalidades:
 * - Processa deep links: arxisvr://...
 * - Processa web URLs: https://arxisvr.avila.inc/ar?...
 * - Integra com eventos web do navegador
 * - Roteamento automático para AR mode
 * 
 * Uso:
 * ```ts
 * const handler = new DeepLinkHandler();
 * 
 * handler.on('ar-marker', (data) => {
 *   console.log('Abrir AR com marco zero:', data);
 *   arViewController.initializeFromMarker(data);
 * });
 * 
 * handler.on('project', (data) => {
 *   console.log('Abrir projeto:', data);
 *   loadProject(data.projectId);
 * });
 * 
 * handler.start();
 * ```
 */

import { ArxisQRData } from './QRCodeScanner';

/**
 * Tipo de deep link
 */
export type DeepLinkType = 'ar-marker' | 'project' | 'session' | 'marker' | 'unknown';

/**
 * Evento de deep link
 */
export interface DeepLinkEvent {
  type: DeepLinkType;
  url: string;
  data: ArxisQRData | null;
  params: URLSearchParams;
  timestamp: number;
}

/**
 * Callbacks para eventos
 */
type DeepLinkCallback = (event: DeepLinkEvent) => void;

export class DeepLinkHandler extends EventTarget {
  private callbacks: Map<DeepLinkType, DeepLinkCallback[]> = new Map();
  private isListening: boolean = false;
  private history: DeepLinkEvent[] = [];
  private maxHistory: number = 50;

  constructor() {
    super();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Inicia o listener de deep links
   */
  async start(): Promise<void> {
    if (this.isListening) {
      console.warn('DeepLinkHandler já está rodando');
      return;
    }

    this.isListening = true;

    // Web (URL changes)
    this.startWebListener();

    // Processa URL inicial (se app foi aberto via deep link)
    await this.processInitialURL();

    console.log('[DeepLinkHandler] Started');
  }

  /**
   * Para o listener
   */
  stop(): void {
    this.isListening = false;
    console.log('[DeepLinkHandler] Stopped');
  }

  // ============================================
  // NATIVE LISTENER
  // ============================================

  /**
   * Listener nativo desabilitado no build web-only.
   */
  private async startNativeListener(): Promise<void> {
    console.debug('[DeepLinkHandler] Native listeners disabled in web-only build');
  }

  /**
   * Processa URL inicial (quando app é aberto)
   */
  private async processInitialURL(): Promise<void> {
    // Web: processa window.location
    if (window.location.search || window.location.hash) {
      const url = window.location.href;
      this.handleDeepLink(url);
    }
  }

  /**
   * Verifica deep link pendente
   */
  private async checkPendingDeepLink(): Promise<void> {
    // Implementar lógica de deep link pendente se necessário
  }

  // ============================================
  // WEB LISTENER
  // ============================================

  /**
   * Inicia listener web (popstate/hashchange)
   */
  private startWebListener(): void {
    // Listener para mudanças de URL (history API)
    window.addEventListener('popstate', () => {
      const url = window.location.href;
      this.handleDeepLink(url);
    });

    // Listener para mudanças de hash
    window.addEventListener('hashchange', () => {
      const url = window.location.href;
      this.handleDeepLink(url);
    });

    console.log('[DeepLinkHandler] Web listeners registered');
  }

  // ============================================
  // DEEP LINK PROCESSING
  // ============================================

  /**
   * Processa deep link
   */
  private handleDeepLink(url: string): void {
    console.log('[DeepLinkHandler] Processing:', url);

    try {
      const event = this.parseDeepLink(url);
      
      // Adiciona ao histórico
      this.addToHistory(event);
      
      // Dispara evento global
      this.dispatchEvent(new CustomEvent('deeplink', { detail: event }));
      
      // Dispara callbacks específicos por tipo
      this.triggerCallbacks(event);
      
    } catch (error) {
      console.error('[DeepLinkHandler] Failed to process deep link:', error);
    }
  }

  /**
   * Parse deep link em evento estruturado
   */
  private parseDeepLink(url: string): DeepLinkEvent {
    let urlObj: URL;
    
    try {
      urlObj = new URL(url);
    } catch {
      // URL inválida
      return {
        type: 'unknown',
        url,
        data: null,
        params: new URLSearchParams(),
        timestamp: Date.now()
      };
    }

    const params = new URLSearchParams(urlObj.search);
    
    // Detecta tipo de deep link
    let type: DeepLinkType = 'unknown';
    let data: ArxisQRData | null = null;

    // arxisvr://ar?type=zero-marker&...
    if (urlObj.protocol === 'arxisvr:' && urlObj.pathname === 'ar') {
      const qrType = params.get('type') || 'project';
      
      if (qrType === 'zero-marker') {
        type = 'ar-marker';
        data = this.parseARMarkerParams(params);
      } else if (qrType === 'session') {
        type = 'session';
        data = this.parseSessionParams(params);
      } else {
        type = 'project';
        data = this.parseProjectParams(params);
      }
    }
    
    // https://arxisvr.avila.inc/ar?project=xxx&marker=yyy
    else if (urlObj.pathname === '/ar' || params.has('ar')) {
      if (params.has('marker')) {
        type = 'ar-marker';
        data = this.parseARMarkerParams(params);
      } else if (params.has('session')) {
        type = 'session';
        data = this.parseSessionParams(params);
      } else if (params.has('project')) {
        type = 'project';
        data = this.parseProjectParams(params);
      }
    }
    
    // https://arxisvr.avila.inc/?project=xxx
    else if (params.has('project')) {
      type = 'project';
      data = this.parseProjectParams(params);
    }

    return {
      type,
      url,
      data,
      params,
      timestamp: Date.now()
    };
  }

  /**
   * Parse parâmetros de marco zero AR
   */
  private parseARMarkerParams(params: URLSearchParams): ArxisQRData {
    const markerDataStr = params.get('marker-data');
    let zeroMarker = null;

    if (markerDataStr) {
      try {
        zeroMarker = JSON.parse(decodeURIComponent(markerDataStr));
      } catch {
        // Se falhar, tenta construir dos parâmetros individuais
        zeroMarker = {
          id: params.get('marker') || 'marker-' + Date.now(),
          name: params.get('marker-name') || 'Marco Zero',
          position: {
            x: parseFloat(params.get('x') || '0'),
            y: parseFloat(params.get('y') || '0'),
            z: parseFloat(params.get('z') || '0')
          },
          rotation: {
            x: parseFloat(params.get('rx') || '0'),
            y: parseFloat(params.get('ry') || '0'),
            z: parseFloat(params.get('rz') || '0')
          },
          floorLevel: params.get('floor') || 'TÉRREO',
          elevation: parseFloat(params.get('elevation') || '0')
        };
      }
    }

    return {
      version: '1.0',
      type: 'zero-marker',
      projectId: params.get('project') || '',
      projectName: params.get('name') || 'Projeto',
      zeroMarker,
      createdAt: Date.now()
    };
  }

  /**
   * Parse parâmetros de projeto
   */
  private parseProjectParams(params: URLSearchParams): ArxisQRData {
    return {
      version: '1.0',
      type: 'project',
      projectId: params.get('project') || params.get('id') || '',
      projectName: params.get('name') || 'Projeto',
      createdAt: Date.now()
    };
  }

  /**
   * Parse parâmetros de sessão
   */
  private parseSessionParams(params: URLSearchParams): ArxisQRData {
    return {
      version: '1.0',
      type: 'session',
      projectId: params.get('project') || '',
      projectName: params.get('name') || 'Projeto',
      sessionId: params.get('session') || '',
      roomCode: params.get('room') || '',
      createdAt: Date.now()
    };
  }

  // ============================================
  // EVENT CALLBACKS
  // ============================================

  /**
   * Registra callback para tipo de evento
   */
  on(type: DeepLinkType, callback: DeepLinkCallback): void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, []);
    }
    
    this.callbacks.get(type)!.push(callback);
  }

  /**
   * Remove callback
   */
  off(type: DeepLinkType, callback: DeepLinkCallback): void {
    const callbacks = this.callbacks.get(type);
    
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Dispara callbacks para evento
   */
  private triggerCallbacks(event: DeepLinkEvent): void {
    const callbacks = this.callbacks.get(event.type);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`[DeepLinkHandler] Callback error for ${event.type}:`, error);
        }
      });
    }
  }

  // ============================================
  // HISTORY
  // ============================================

  /**
   * Adiciona evento ao histórico
   */
  private addToHistory(event: DeepLinkEvent): void {
    this.history.unshift(event);
    
    // Limita tamanho do histórico
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }
  }

  /**
   * Retorna histórico de deep links
   */
  getHistory(): DeepLinkEvent[] {
    return [...this.history];
  }

  /**
   * Retorna último deep link processado
   */
  getLastDeepLink(): DeepLinkEvent | null {
    return this.history[0] || null;
  }

  /**
   * Limpa histórico
   */
  clearHistory(): void {
    this.history = [];
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Verifica se está rodando
   */
  isRunning(): boolean {
    return this.isListening;
  }

  /**
   * Cria deep link programaticamente
   */
  static createDeepLink(data: ArxisQRData): string {
    const params = new URLSearchParams();
    
    params.set('type', data.type);
    params.set('project', data.projectId);
    params.set('name', data.projectName);
    
    if (data.zeroMarker) {
      params.set('marker', data.zeroMarker.id);
      params.set('marker-data', JSON.stringify(data.zeroMarker));
    }
    
    if (data.sessionId) {
      params.set('session', data.sessionId);
    }
    
    if (data.roomCode) {
      params.set('room', data.roomCode);
    }
    
    return `arxisvr://ar?${params.toString()}`;
  }

  /**
   * Abre deep link externamente
   */
  static async openDeepLink(url: string): Promise<void> {
    window.location.href = url;
  }
}
