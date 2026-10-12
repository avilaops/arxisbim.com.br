/**
 * QRCodeScanner - Scanner QR Code para AR usando APIs web
 * 
 * Funcionalidades:
 * - Escaneia QR codes usando câmera web
 * - Decodifica dados do projeto + posição (marco zero)
 * - Suporta múltiplos formatos de QR
 * - Fallback para web (getUserMedia)
 * 
 * Uso:
 * ```ts
 * const scanner = new QRCodeScanner();
 * const result = await scanner.scanQRCode();
 * if (result.success) {
 *   console.log('Dados:', result.data);
 *   console.log('Projeto:', result.projectId);
 *   console.log('Marco Zero:', result.zeroMarker);
 * }
 * ```
 */

/**
 * Formato de dados do QR Code ArxisVR
 */
export interface ArxisQRData {
  version: string;            // Versão do formato (ex: "1.0")
  type: 'zero-marker' | 'project' | 'session' | 'marker';
  
  // Dados do projeto
  projectId: string;
  projectName: string;
  projectUrl?: string;
  
  // Dados do marco zero (se type === 'zero-marker')
  zeroMarker?: {
    id: string;
    name: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    floorLevel: string;
    elevation: number;
  };
  
  // Dados de sessão multiplayer (se type === 'session')
  sessionId?: string;
  roomCode?: string;
  
  // Timestamp
  createdAt: number;
  expiresAt?: number;
}

/**
 * Resultado do scan
 */
export interface QRScanResult {
  success: boolean;
  data?: ArxisQRData;
  rawData?: string;
  error?: string;
  timestamp: number;
}

/**
 * Opções de scan
 */
export interface QRScanOptions {
  timeout?: number;           // Timeout em ms (0 = sem timeout)
  promptMessage?: string;     // Mensagem para o usuário
  useNativeCamera?: boolean;  // true = câmera nativa, false = web
  autoDetect?: boolean;       // Auto-detectar platform
}

export class QRCodeScanner extends EventTarget {
  private isScanning: boolean = false;
  private scanAbortController?: AbortController;
  
  constructor() {
    super();
  }

  // ============================================
  // QR CODE SCANNING
  // ============================================

  /**
   * Escaneia QR Code (auto-detecta plataforma)
   */
  async scanQRCode(options?: QRScanOptions): Promise<QRScanResult> {
    if (this.isScanning) {
      return {
        success: false,
        error: 'Scanner já está em execução',
        timestamp: Date.now()
      };
    }

    const opts: Required<QRScanOptions> = {
      timeout: 60000,  // 60s
      promptMessage: 'Posicione o QR Code ArxisVR na câmera',
      useNativeCamera: true,
      autoDetect: true,
      ...options
    };

    this.isScanning = true;
    this.scanAbortController = new AbortController();
    
    try {
      // Auto-detecta plataforma
      const isNative = false;
      
      let rawData: string;
      
      if (isNative) {
        // Usa câmera nativa (Capacitor)
        rawData = await this.scanWithNativeCamera(opts);
      } else {
        // Usa câmera web (getUserMedia + biblioteca JS)
        rawData = await this.scanWithWebCamera(opts);
      }
      
      // Decodifica dados
      const decoded = this.decodeQRData(rawData);
      
      const result: QRScanResult = {
        success: true,
        data: decoded,
        rawData,
        timestamp: Date.now()
      };
      
      this.dispatchEvent(new CustomEvent('qrScanned', { detail: result }));
      
      return result;
      
    } catch (error) {
      const result: QRScanResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
      
      this.dispatchEvent(new CustomEvent('qrScanError', { detail: result }));
      
      return result;
      
    } finally {
      this.isScanning = false;
      this.scanAbortController = undefined;
    }
  }

  /**
   * Cancela scan em andamento
   */
  cancelScan(): void {
    if (this.scanAbortController) {
      this.scanAbortController.abort();
    }
  }

  // ============================================
  // NATIVE CAMERA SCAN
  // ============================================

  /**
   * Escaneia usando câmera nativa.
   *
   * No build web-only, essa rota usa o scanner web para manter compatibilidade
   * com chamadas antigas sem trazer dependências Capacitor para o bundle.
   */
  private async scanWithNativeCamera(options: Required<QRScanOptions>): Promise<string> {
    return this.scanWithWebCamera(options);
  }

  /**
   * Decodifica QR code de uma imagem usando biblioteca JS
   */
  private async decodeQRFromImage(dataUrl: string): Promise<string> {
    // Usa biblioteca qr-scanner (npm install qr-scanner)
    // Por enquanto, vamos usar uma implementação simplificada
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Cria canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Falha ao criar contexto canvas'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          
          // Aqui você usaria uma biblioteca como:
          // - jsQR (https://github.com/cozmo/jsQR)
          // - qr-scanner (https://github.com/nimiq/qr-scanner)
          // 
          // Por enquanto, simulando detecção
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // TODO: Integrar biblioteca real de QR detection
          // const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          // Fallback: tenta extrair do nome do arquivo ou metadata
          reject(new Error('QR decoder não implementado. Instale: npm install jsqr'));
          
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'));
      };
      
      img.src = dataUrl;
    });
  }

  // ============================================
  // WEB CAMERA SCAN
  // ============================================

  /**
   * Escaneia usando câmera web (getUserMedia)
   */
  private async scanWithWebCamera(options: Required<QRScanOptions>): Promise<string> {
    return new Promise((resolve, reject) => {
      // Cria modal com preview da câmera
      const modal = this.createScannerModal(options.promptMessage);
      document.body.appendChild(modal);
      
      const video = modal.querySelector('video') as HTMLVideoElement;
      const canvas = modal.querySelector('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d')!;
      
      let stream: MediaStream;
      let scanInterval: number;
      
      // Cleanup
      const cleanup = () => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if (scanInterval) {
          clearInterval(scanInterval);
        }
        modal.remove();
      };
      
      // Botão cancelar
      modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
        cleanup();
        reject(new Error('Scan cancelado pelo usuário'));
      });
      
      // Inicia câmera
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }  // Câmera traseira
      })
      .then(mediaStream => {
        stream = mediaStream;
        video.srcObject = stream;
        video.play();
        
        // Loop de detecção
        scanInterval = window.setInterval(() => {
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // TODO: Usar jsQR
            // const code = jsQR(imageData.data, imageData.width, imageData.height);
            // if (code) {
            //   cleanup();
            //   resolve(code.data);
            // }
          }
        }, 100);  // 10 FPS
        
      })
      .catch(error => {
        cleanup();
        reject(new Error(`Erro ao acessar câmera: ${error}`));
      });
      
      // Timeout
      if (options.timeout > 0) {
        setTimeout(() => {
          cleanup();
          reject(new Error('Timeout ao escanear QR code'));
        }, options.timeout);
      }
    });
  }

  /**
   * Cria modal HTML para scanner web
   */
  private createScannerModal(message: string): HTMLDivElement {
    const modal = document.createElement('div');
    modal.className = 'qr-scanner-modal';
    modal.innerHTML = `
      <div class="qr-scanner-overlay">
        <div class="qr-scanner-container">
          <div class="qr-scanner-header">
            <h3>Escanear QR Code</h3>
            <p>${message}</p>
          </div>
          
          <div class="qr-scanner-preview">
            <video autoplay playsinline></video>
            <canvas style="display: none;"></canvas>
            
            <!-- Overlay de mira -->
            <div class="qr-scanner-target">
              <div class="corner tl"></div>
              <div class="corner tr"></div>
              <div class="corner bl"></div>
              <div class="corner br"></div>
            </div>
          </div>
          
          <div class="qr-scanner-actions">
            <button class="cancel-btn">Cancelar</button>
          </div>
        </div>
      </div>
    `;
    
    // Styles inline
    const style = document.createElement('style');
    style.textContent = `
      .qr-scanner-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }
      
      .qr-scanner-overlay {
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .qr-scanner-container {
        max-width: 600px;
        width: 90%;
        background: #1e1e1e;
        border-radius: 12px;
        padding: 20px;
      }
      
      .qr-scanner-header {
        text-align: center;
        margin-bottom: 20px;
      }
      
      .qr-scanner-header h3 {
        margin: 0 0 10px 0;
        font-size: 24px;
        color: #fff;
      }
      
      .qr-scanner-header p {
        margin: 0;
        font-size: 14px;
        color: #aaa;
      }
      
      .qr-scanner-preview {
        position: relative;
        width: 100%;
        aspect-ratio: 1;
        background: #000;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 20px;
      }
      
      .qr-scanner-preview video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .qr-scanner-target {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 60%;
        height: 60%;
        transform: translate(-50%, -50%);
        pointer-events: none;
      }
      
      .qr-scanner-target .corner {
        position: absolute;
        width: 40px;
        height: 40px;
        border: 3px solid #00ff00;
      }
      
      .qr-scanner-target .corner.tl {
        top: 0;
        left: 0;
        border-right: none;
        border-bottom: none;
      }
      
      .qr-scanner-target .corner.tr {
        top: 0;
        right: 0;
        border-left: none;
        border-bottom: none;
      }
      
      .qr-scanner-target .corner.bl {
        bottom: 0;
        left: 0;
        border-right: none;
        border-top: none;
      }
      
      .qr-scanner-target .corner.br {
        bottom: 0;
        right: 0;
        border-left: none;
        border-top: none;
      }
      
      .qr-scanner-actions {
        display: flex;
        justify-content: center;
      }
      
      .qr-scanner-actions button {
        padding: 12px 32px;
        font-size: 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: #ff4444;
        color: #fff;
      }
      
      .qr-scanner-actions button:hover {
        background: #ff6666;
      }
    `;
    modal.appendChild(style);
    
    return modal;
  }

  // ============================================
  // DATA DECODING
  // ============================================

  /**
   * Decodifica dados do QR code
   */
  private decodeQRData(rawData: string): ArxisQRData {
    try {
      // Tenta parsear JSON
      const data = JSON.parse(rawData);
      
      // Valida formato ArxisVR
      if (!data.version || !data.type || !data.projectId) {
        throw new Error('QR Code não é do formato ArxisVR');
      }
      
      // Valida versão
      if (data.version !== '1.0') {
        console.warn(`QR Code versão ${data.version} pode não ser compatível`);
      }
      
      // Valida expiração
      if (data.expiresAt && Date.now() > data.expiresAt) {
        throw new Error('QR Code expirado');
      }
      
      return data as ArxisQRData;
      
    } catch (error) {
      // Tenta URL format: arxisvr://project?id=xxx&marker=yyy
      if (rawData.startsWith('arxisvr://')) {
        return this.parseArxisURL(rawData);
      }
      
      // Tenta HTTP URL: https://app.arxisbim.com.br/ar?project=xxx&marker=yyy
      if (rawData.startsWith('http://') || rawData.startsWith('https://')) {
        return this.parseWebURL(rawData);
      }
      
      throw new Error(`Formato de QR code não reconhecido: ${error}`);
    }
  }

  /**
   * Parse URL format: arxisvr://...
   */
  private parseArxisURL(url: string): ArxisQRData {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    const data: ArxisQRData = {
      version: '1.0',
      type: params.get('type') as any || 'project',
      projectId: params.get('project') || params.get('id') || '',
      projectName: params.get('name') || 'Projeto',
      createdAt: Date.now()
    };
    
    // Zero marker data
    if (params.has('marker')) {
      const markerData = params.get('marker-data');
      if (markerData) {
        data.zeroMarker = JSON.parse(decodeURIComponent(markerData));
      }
    }
    
    return data;
  }

  /**
   * Parse web URL: https://...
   */
  private parseWebURL(url: string): ArxisQRData {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    return {
      version: '1.0',
      type: 'project',
      projectId: params.get('project') || '',
      projectName: params.get('name') || 'Projeto',
      projectUrl: url,
      createdAt: Date.now()
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Verifica se scanner está disponível
   */
  static async isAvailable(): Promise<boolean> {
    // Web: verifica getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch {
        return false;
      }
    }
    
    return false;
  }

  /**
   * Verifica se está escaneando
   */
  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}
