/**
 * QRCodeGenerator - Gerador de QR Codes para AR
 * 
 * Funcionalidades:
 * - Gera QR codes com dados de projeto + marco zero
 * - Suporta múltiplos formatos (JSON, URL, deep link)
 * - Gera imagens para impressão
 * - Exporta PDFs com instruções
 * 
 * Uso:
 * ```ts
 * const generator = new QRCodeGenerator();
 * 
 * const qr = await generator.generateZeroMarkerQR({
 *   projectId: 'proj-123',
 *   projectName: 'Edifício XYZ',
 *   position: { x: 0, y: 0, z: 0 },
 *   rotation: { x: 0, y: 0, z: 0 }
 * });
 * 
 * // Download como imagem
 * qr.download('marker-entrance.png');
 * 
 * // Download PDF com instruções
 * generator.generatePrintablePDF([qr], 'Markers Edifício XYZ');
 * ```
 */

import { ArxisQRData } from './QRCodeScanner';

/**
 * Configuração do marco zero
 */
export interface ZeroMarkerConfig {
  projectId: string;
  projectName: string;
  markerId?: string;
  markerName?: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  floorLevel?: string;
  elevation?: number;
  expiresInDays?: number;  // 0 = nunca expira
}

/**
 * Opções de geração de QR
 */
export interface QRGenerateOptions {
  size?: number;           // Tamanho em pixels (default: 512)
  format?: 'json' | 'url' | 'deeplink';
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';  // Low, Medium, Quartile, High
  includeMargin?: boolean;
  foregroundColor?: string;
  backgroundColor?: string;
  includeArxisLogo?: boolean;  // Logo no centro
}

/**
 * QR Code gerado
 */
export interface GeneratedQRCode {
  data: ArxisQRData;
  rawData: string;
  dataUrl: string;  // Base64 image
  size: number;
  format: 'json' | 'url' | 'deeplink';
  
  // Métodos
  download(filename?: string): void;
  toBlob(): Promise<Blob>;
  print(): void;
}

export class QRCodeGenerator {
  private static readonly ARXIS_DEEPLINK_SCHEME = 'arxisvr://';
  private static readonly ARXIS_WEB_URL = 'https://arxisvr.avila.inc';

  constructor() {}

  // ============================================
  // QR CODE GENERATION
  // ============================================

  /**
   * Gera QR Code para marco zero
   */
  async generateZeroMarkerQR(
    config: ZeroMarkerConfig,
    options?: QRGenerateOptions
  ): Promise<GeneratedQRCode> {
    const opts: Required<QRGenerateOptions> = {
      size: 512,
      format: 'json',
      errorCorrection: 'M',
      includeMargin: true,
      foregroundColor: '#000000',
      backgroundColor: '#FFFFFF',
      includeArxisLogo: true,
      ...options
    };

    // Cria dados do QR
    const expiresAt = config.expiresInDays 
      ? Date.now() + (config.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const qrData: ArxisQRData = {
      version: '1.0',
      type: 'zero-marker',
      projectId: config.projectId,
      projectName: config.projectName,
      zeroMarker: {
        id: config.markerId || this.generateMarkerId(),
        name: config.markerName || 'Marco Zero',
        position: config.position,
        rotation: config.rotation,
        floorLevel: config.floorLevel || 'TÉRREO',
        elevation: config.elevation || 0
      },
      createdAt: Date.now(),
      expiresAt
    };

    // Serializa dados
    let rawData: string;
    
    switch (opts.format) {
      case 'json':
        rawData = JSON.stringify(qrData);
        break;
        
      case 'url':
        rawData = this.toWebURL(qrData);
        break;
        
      case 'deeplink':
        rawData = this.toDeepLink(qrData);
        break;
    }

    // Gera QR code
    const dataUrl = await this.generateQRImage(rawData, opts);

    return this.createQRCodeObject(qrData, rawData, dataUrl, opts);
  }

  /**
   * Gera QR Code para projeto (sem marco zero)
   */
  async generateProjectQR(
    projectId: string,
    projectName: string,
    options?: QRGenerateOptions
  ): Promise<GeneratedQRCode> {
    const opts: Required<QRGenerateOptions> = {
      size: 512,
      format: 'url',
      errorCorrection: 'M',
      includeMargin: true,
      foregroundColor: '#000000',
      backgroundColor: '#FFFFFF',
      includeArxisLogo: true,
      ...options
    };

    const qrData: ArxisQRData = {
      version: '1.0',
      type: 'project',
      projectId,
      projectName,
      projectUrl: `${QRCodeGenerator.ARXIS_WEB_URL}/?project=${projectId}`,
      createdAt: Date.now()
    };

    let rawData: string;
    
    if (opts.format === 'url') {
      rawData = qrData.projectUrl!;
    } else if (opts.format === 'deeplink') {
      rawData = this.toDeepLink(qrData);
    } else {
      rawData = JSON.stringify(qrData);
    }

    const dataUrl = await this.generateQRImage(rawData, opts);

    return this.createQRCodeObject(qrData, rawData, dataUrl, opts);
  }

  /**
   * Gera QR Code para sessão multiplayer
   */
  async generateSessionQR(
    projectId: string,
    projectName: string,
    sessionId: string,
    roomCode: string,
    options?: QRGenerateOptions
  ): Promise<GeneratedQRCode> {
    const opts: Required<QRGenerateOptions> = {
      size: 512,
      format: 'deeplink',
      errorCorrection: 'M',
      includeMargin: true,
      foregroundColor: '#000000',
      backgroundColor: '#FFFFFF',
      includeArxisLogo: false,
      ...options
    };

    const qrData: ArxisQRData = {
      version: '1.0',
      type: 'session',
      projectId,
      projectName,
      sessionId,
      roomCode,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)  // 24h
    };

    const rawData = this.toDeepLink(qrData);
    const dataUrl = await this.generateQRImage(rawData, opts);

    return this.createQRCodeObject(qrData, rawData, dataUrl, opts);
  }

  // ============================================
  // QR IMAGE GENERATION
  // ============================================

  /**
   * Gera imagem do QR code
   */
  private async generateQRImage(
    data: string,
    options: Required<QRGenerateOptions>
  ): Promise<string> {
    // Aqui você usaria uma biblioteca como:
    // - qrcode (https://github.com/soldair/node-qrcode) - Node.js e Browser
    // - qr-code-generator (puro JS)
    // 
    // Exemplo com qrcode:
    // import QRCode from 'qrcode';
    // const dataUrl = await QRCode.toDataURL(data, { options });
    
    // Por enquanto, vamos usar um placeholder/fallback
    return this.generateQRPlaceholder(data, options);
  }

  /**
   * Gera placeholder de QR code (fallback)
   * TODO: Substituir por biblioteca real (npm install qrcode)
   */
  private async generateQRPlaceholder(
    data: string,
    options: Required<QRGenerateOptions>
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = options.size;
    canvas.height = options.size;
    
    const ctx = canvas.getContext('2d')!;
    
    // Background
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = options.foregroundColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    // Text placeholder
    ctx.fillStyle = options.foregroundColor;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const lines = [
      'QR CODE PLACEHOLDER',
      '',
      'Install: npm install qrcode',
      '',
      `Data: ${data.substring(0, 30)}...`,
      '',
      `Size: ${options.size}x${options.size}`,
      `Format: ${options.format}`,
      `Error Correction: ${options.errorCorrection}`
    ];
    
    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, 50 + (i * 24));
    });
    
    // Arxis logo
    if (options.includeArxisLogo) {
      ctx.fillStyle = '#0066ff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('ARXIS VR', canvas.width / 2, canvas.height - 40);
    }
    
    return canvas.toDataURL('image/png');
  }

  // ============================================
  // DATA SERIALIZATION
  // ============================================

  /**
   * Converte para deep link: arxisvr://...
   */
  private toDeepLink(data: ArxisQRData): string {
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
    
    return `${QRCodeGenerator.ARXIS_DEEPLINK_SCHEME}ar?${params.toString()}`;
  }

  /**
   * Converte para web URL: https://...
   */
  private toWebURL(data: ArxisQRData): string {
    const params = new URLSearchParams();
    
    params.set('project', data.projectId);
    
    if (data.type === 'zero-marker' && data.zeroMarker) {
      params.set('ar', 'true');
      params.set('marker', data.zeroMarker.id);
      params.set('x', data.zeroMarker.position.x.toString());
      params.set('y', data.zeroMarker.position.y.toString());
      params.set('z', data.zeroMarker.position.z.toString());
    }
    
    if (data.sessionId) {
      params.set('session', data.sessionId);
    }
    
    return `${QRCodeGenerator.ARXIS_WEB_URL}/ar?${params.toString()}`;
  }

  // ============================================
  // QR CODE OBJECT
  // ============================================

  /**
   * Cria objeto GeneratedQRCode
   */
  private createQRCodeObject(
    data: ArxisQRData,
    rawData: string,
    dataUrl: string,
    options: Required<QRGenerateOptions>
  ): GeneratedQRCode {
    return {
      data,
      rawData,
      dataUrl,
      size: options.size,
      format: options.format,
      
      download(filename?: string) {
        const name = filename || `arxis-qr-${data.type}-${Date.now()}.png`;
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = name;
        a.click();
      },
      
      async toBlob(): Promise<Blob> {
        const response = await fetch(dataUrl);
        return response.blob();
      },
      
      print() {
        const win = window.open('', '_blank');
        if (!win) return;
        
        win.document.write(`
          <html>
            <head>
              <title>QR Code - ${data.projectName}</title>
              <style>
                body {
                  margin: 0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  font-family: Arial, sans-serif;
                }
                img {
                  max-width: 400px;
                  border: 2px solid #000;
                }
                .info {
                  margin-top: 20px;
                  text-align: center;
                }
                @media print {
                  @page { margin: 2cm; }
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="QR Code" />
              <div class="info">
                <h2>${data.projectName}</h2>
                <p>${data.type === 'zero-marker' ? 'Marco Zero AR' : 'Projeto'}</p>
                ${data.zeroMarker ? `<p>${data.zeroMarker.name} - ${data.zeroMarker.floorLevel}</p>` : ''}
                <p>Criado em: ${new Date(data.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            </body>
          </html>
        `);
        
        win.document.close();
        win.focus();
        
        setTimeout(() => {
          win.print();
        }, 500);
      }
    };
  }

  // ============================================
  // PDF GENERATION
  // ============================================

  /**
   * Gera PDF com múltiplos QR codes e instruções
   */
  async generatePrintablePDF(
    qrCodes: GeneratedQRCode[],
    projectName: string
  ): Promise<void> {
    // Aqui você usaria uma biblioteca como:
    // - jsPDF (https://github.com/parallax/jsPDF)
    // - pdfmake (https://github.com/bpampuch/pdfmake)
    
    console.warn('PDF generation not implemented. Install jsPDF library.');
    
    // Fallback: abre página HTML com print
    this.generatePrintableHTML(qrCodes, projectName);
  }

  /**
   * Gera página HTML para impressão
   */
  private generatePrintableHTML(
    qrCodes: GeneratedQRCode[],
    projectName: string
  ): void {
    const win = window.open('', '_blank');
    if (!win) return;
    
    const qrHTML = qrCodes.map((qr, i) => `
      <div class="qr-page">
        <div class="qr-header">
          <h1>${projectName}</h1>
          <h2>${qr.data.zeroMarker?.name || `QR Code ${i + 1}`}</h2>
        </div>
        
        <div class="qr-container">
          <img src="${qr.dataUrl}" alt="QR Code ${i + 1}" />
        </div>
        
        <div class="qr-info">
          <table>
            <tr><td><strong>Tipo:</strong></td><td>${qr.data.type}</td></tr>
            <tr><td><strong>Projeto ID:</strong></td><td>${qr.data.projectId}</td></tr>
            ${qr.data.zeroMarker ? `
              <tr><td><strong>Pavimento:</strong></td><td>${qr.data.zeroMarker.floorLevel}</td></tr>
              <tr><td><strong>Elevação:</strong></td><td>${qr.data.zeroMarker.elevation}m</td></tr>
              <tr><td><strong>Posição X:</strong></td><td>${qr.data.zeroMarker.position.x.toFixed(2)}m</td></tr>
              <tr><td><strong>Posição Y:</strong></td><td>${qr.data.zeroMarker.position.y.toFixed(2)}m</td></tr>
              <tr><td><strong>Posição Z:</strong></td><td>${qr.data.zeroMarker.position.z.toFixed(2)}m</td></tr>
            ` : ''}
            <tr><td><strong>Criado em:</strong></td><td>${new Date(qr.data.createdAt).toLocaleString('pt-BR')}</td></tr>
            ${qr.data.expiresAt ? `
              <tr><td><strong>Expira em:</strong></td><td>${new Date(qr.data.expiresAt).toLocaleString('pt-BR')}</td></tr>
            ` : ''}
          </table>
        </div>
        
        <div class="qr-instructions">
          <h3>Instruções de Uso</h3>
          <ol>
            <li>Posicione este QR Code no local indicado (Marco Zero)</li>
            <li>Abra o app ArxisVR no dispositivo móvel</li>
            <li>Toque em "Modo AR" e escaneie este código</li>
            <li>O modelo IFC será posicionado a partir deste ponto</li>
          </ol>
        </div>
      </div>
    `).join('');
    
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectName} - QR Codes AR</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              background: #fff;
            }
            
            .qr-page {
              width: 210mm;
              min-height: 297mm;
              padding: 20mm;
              page-break-after: always;
              display: flex;
              flex-direction: column;
            }
            
            .qr-page:last-child {
              page-break-after: auto;
            }
            
            .qr-header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            
            .qr-header h1 {
              font-size: 28px;
              margin-bottom: 5px;
            }
            
            .qr-header h2 {
              font-size: 20px;
              color: #666;
            }
            
            .qr-container {
              display: flex;
              justify-content: center;
              margin: 30px 0;
            }
            
            .qr-container img {
              width: 150mm;
              height: 150mm;
              border: 2px solid #000;
            }
            
            .qr-info {
              margin: 20px 0;
            }
            
            .qr-info table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .qr-info td {
              padding: 8px;
              border-bottom: 1px solid #ddd;
            }
            
            .qr-info td:first-child {
              width: 40%;
              font-weight: bold;
            }
            
            .qr-instructions {
              margin-top: 20px;
              padding: 15px;
              background: #f5f5f5;
              border-left: 4px solid #0066ff;
            }
            
            .qr-instructions h3 {
              margin-bottom: 10px;
              color: #0066ff;
            }
            
            .qr-instructions ol {
              margin-left: 20px;
            }
            
            .qr-instructions li {
              margin: 8px 0;
              line-height: 1.5;
            }
            
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              
              body {
                margin: 0;
              }
              
              .qr-page {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${qrHTML}
        </body>
      </html>
    `);
    
    win.document.close();
    win.focus();
    
    setTimeout(() => {
      win.print();
    }, 1000);
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Gera ID único para marker
   */
  private generateMarkerId(): string {
    return `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
