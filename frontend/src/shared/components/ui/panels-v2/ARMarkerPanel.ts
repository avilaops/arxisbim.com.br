/**
 * ARMarkerPanel - Painel de gerenciamento de marcos AR
 * 
 * Funcionalidades:
 * - Lista de todos os marcos zeros
 * - Criar novos marcos
 * - Editar/remover marcos
 * - Gerar QR codes
 * - Ativar marco (desktop)
 * - Iniciar modo AR (mobile)
 * - Exportar PDF com QR codes
 */

import './ARMarkerPanel.css';
import { ARZeroMarkerSystem, ZeroMarker, CreateZeroMarkerConfig } from '../../xr/ar/ARZeroMarkerSystem';
import { ARViewController } from '../../xr/ar/ARViewController';
import { GeneratedQRCode } from '../../xr/ar/QRCodeGenerator';
import { NativeBridge } from '../../mobile/NativeBridge';

export class ARMarkerPanel {
  private container: HTMLElement;
  private zeroMarkerSystem: ARZeroMarkerSystem;
  private arViewController?: ARViewController;
  private projectId: string;
  private projectName: string;

  constructor(
    zeroMarkerSystem: ARZeroMarkerSystem,
    arViewController: ARViewController | undefined,
    projectId: string,
    projectName: string
  ) {
    this.zeroMarkerSystem = zeroMarkerSystem;
    this.arViewController = arViewController;
    this.projectId = projectId;
    this.projectName = projectName;
    
    this.container = this.createUI();
    this.attachEventListeners();
    this.refreshMarkerList();
  }

  // ============================================
  // UI CREATION
  // ============================================

  private createUI(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ar-marker-panel';
    panel.innerHTML = `
      <div class="panel-header">
        <h2>
          <span class="icon">📍</span>
          Marcos AR
        </h2>
        <button class="btn-close" id="arPanelClose">✕</button>
      </div>

      <div class="panel-content">
        <!-- Info Section -->
        <div class="ar-info-section">
          <div class="info-card">
            <span class="info-icon">📱</span>
            <div class="info-text">
              <strong>Como funciona:</strong>
              <p>Crie marcos AR no modelo, gere QR codes e posicione-os no local físico. No app mobile, escaneie o QR para ver o modelo alinhado à realidade.</p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="ar-actions">
          <button class="btn-primary" id="createMarkerBtn">
            <span>➕</span>
            Criar Marco Zero
          </button>
          
          ${NativeBridge.isNative() ? `
            <button class="btn-success" id="startARBtn">
              <span>📷</span>
              Iniciar Modo AR
            </button>
          ` : ''}
          
          <button class="btn-secondary" id="exportAllQRBtn">
            <span>📄</span>
            Exportar Todos QR (PDF)
          </button>
        </div>

        <!-- Marker List -->
        <div class="marker-list-container">
          <div class="marker-list-header">
            <h3>Marcos Cadastrados</h3>
            <span class="marker-count" id="markerCount">0 marcos</span>
          </div>
          
          <div class="marker-list" id="markerList">
            <!-- Lista será preenchida dinamicamente -->
          </div>
        </div>
      </div>

      <!-- Create Marker Modal -->
      <div class="modal" id="createMarkerModal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Criar Marco Zero</h3>
            <button class="btn-close" id="modalClose">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>Nome do Marco</label>
              <input type="text" id="markerName" placeholder="Ex: Entrada Principal" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Posição X (m)</label>
                <input type="number" id="markerPosX" value="0" step="0.1" />
              </div>
              <div class="form-group">
                <label>Posição Y (m)</label>
                <input type="number" id="markerPosY" value="0" step="0.1" />
              </div>
              <div class="form-group">
                <label>Posição Z (m)</label>
                <input type="number" id="markerPosZ" value="0" step="0.1" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Pavimento</label>
                <select id="markerFloor">
                  <option>TÉRREO</option>
                  <option>SUBSOLO</option>
                  <option>1º ANDAR</option>
                  <option>2º ANDAR</option>
                  <option>3º ANDAR</option>
                  <option>COBERTURA</option>
                </select>
              </div>
              <div class="form-group">
                <label>Elevação (m)</label>
                <input type="number" id="markerElevation" value="0" step="0.1" />
              </div>
            </div>

            <div class="form-group">
              <label>Tamanho do QR Code (m)</label>
              <input type="number" id="markerSize" value="0.2" step="0.05" min="0.1" max="1.0" />
              <small>Recomendado: 20cm (0.2m)</small>
            </div>

            <div class="form-group">
              <label>Descrição (opcional)</label>
              <textarea id="markerDescription" rows="3" placeholder="Ex: QR code fixado na parede ao lado da porta de entrada"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" id="modalCancelBtn">Cancelar</button>
            <button class="btn-primary" id="modalCreateBtn">Criar Marco</button>
          </div>
        </div>
      </div>
    `;

    return panel;
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  private attachEventListeners(): void {
    // Close panel
    this.container.querySelector('#arPanelClose')?.addEventListener('click', () => {
      this.hide();
    });

    // Create marker button
    this.container.querySelector('#createMarkerBtn')?.addEventListener('click', () => {
      this.showCreateMarkerModal();
    });

    // Start AR button (mobile)
    this.container.querySelector('#startARBtn')?.addEventListener('click', () => {
      this.startARMode();
    });

    // Export all QR codes
    this.container.querySelector('#exportAllQRBtn')?.addEventListener('click', () => {
      this.exportAllQRCodes();
    });

    // Modal close
    this.container.querySelector('#modalClose')?.addEventListener('click', () => {
      this.hideCreateMarkerModal();
    });

    this.container.querySelector('#modalCancelBtn')?.addEventListener('click', () => {
      this.hideCreateMarkerModal();
    });

    // Modal create
    this.container.querySelector('#modalCreateBtn')?.addEventListener('click', () => {
      this.createMarkerFromForm();
    });
  }

  // ============================================
  // MARKER LIST
  // ============================================

  private refreshMarkerList(): void {
    const listContainer = this.container.querySelector('#markerList') as HTMLElement;
    const countElement = this.container.querySelector('#markerCount') as HTMLElement;
    
    if (!listContainer || !countElement) return;

    const markers = this.zeroMarkerSystem.getAllZeroMarkers();
    
    countElement.textContent = `${markers.length} marco${markers.length !== 1 ? 's' : ''}`;

    if (markers.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📍</span>
          <p>Nenhum marco cadastrado</p>
          <small>Crie um marco zero para começar</small>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = markers.map(marker => this.createMarkerCard(marker)).join('');

    // Attach card event listeners
    this.attachMarkerCardListeners();
  }

  private createMarkerCard(marker: ZeroMarker): string {
    const isActive = this.zeroMarkerSystem.getActiveMarker()?.id === marker.id;
    
    return `
      <div class="marker-card ${isActive ? 'active' : ''}" data-marker-id="${marker.id}">
        <div class="marker-card-header">
          <div class="marker-info">
            <h4>${marker.name}</h4>
            <span class="marker-floor">${marker.floorLevel.name}</span>
          </div>
          ${isActive ? '<span class="badge-active">Ativo</span>' : ''}
        </div>

        <div class="marker-card-body">
          <div class="marker-position">
            <span class="label">Posição:</span>
            <span class="value">
              X: ${marker.positionInBIM.x.toFixed(2)}m, 
              Y: ${marker.positionInBIM.y.toFixed(2)}m, 
              Z: ${marker.positionInBIM.z.toFixed(2)}m
            </span>
          </div>

          ${marker.description ? `
            <div class="marker-description">
              <span class="label">Descrição:</span>
              <span class="value">${marker.description}</span>
            </div>
          ` : ''}

          <div class="marker-metadata">
            <span>Tamanho: ${(marker.physicalSize * 100).toFixed(0)}cm</span>
            ${marker.qrCodeGenerated ? 
              `<span class="qr-generated">✓ QR Gerado</span>` : 
              `<span class="qr-pending">QR Pendente</span>`
            }
          </div>
        </div>

        <div class="marker-card-actions">
          <button class="btn-icon btn-qr" data-action="qr" title="Gerar QR Code">
            <span>📱</span>
          </button>
          
          <button class="btn-icon btn-locate" data-action="locate" title="Localizar no Modelo">
            <span>🎯</span>
          </button>
          
          ${!isActive ? `
            <button class="btn-icon btn-activate" data-action="activate" title="Ativar Marco">
              <span>▶️</span>
            </button>
          ` : `
            <button class="btn-icon btn-deactivate" data-action="deactivate" title="Desativar Marco">
              <span>⏸️</span>
            </button>
          `}
          
          <button class="btn-icon btn-delete" data-action="delete" title="Remover Marco">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;
  }

  private attachMarkerCardListeners(): void {
    const cards = this.container.querySelectorAll('.marker-card');
    
    cards.forEach(card => {
      const markerId = card.getAttribute('data-marker-id');
      if (!markerId) return;

      // QR Code
      card.querySelector('[data-action="qr"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.generateQRCode(markerId);
      });

      // Locate
      card.querySelector('[data-action="locate"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.locateMarker(markerId);
      });

      // Activate
      card.querySelector('[data-action="activate"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activateMarker(markerId);
      });

      // Deactivate
      card.querySelector('[data-action="deactivate"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deactivateMarker();
      });

      // Delete
      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMarker(markerId);
      });
    });
  }

  // ============================================
  // MARKER ACTIONS
  // ============================================

  private async generateQRCode(markerId: string): Promise<void> {
    try {
      const qrCode = await this.zeroMarkerSystem.generateQRCode(markerId);
      
      // Mostra preview e opções de download
      this.showQRCodePreview(qrCode, markerId);
      
      this.refreshMarkerList();
      
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert(`Erro ao gerar QR Code: ${error}`);
    }
  }

  private showQRCodePreview(qrCode: GeneratedQRCode, markerId: string): void {
    const marker = this.zeroMarkerSystem.getZeroMarker(markerId);
    if (!marker) return;

    const modal = document.createElement('div');
    modal.className = 'modal qr-preview-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>QR Code - ${marker.name}</h3>
          <button class="btn-close">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="qr-preview">
            <img src="${qrCode.dataUrl}" alt="QR Code" />
          </div>
          
          <div class="qr-info">
            <p><strong>Local:</strong> ${marker.floorLevel.name}</p>
            <p><strong>Posição:</strong> X: ${marker.positionInBIM.x.toFixed(2)}m, Y: ${marker.positionInBIM.y.toFixed(2)}m, Z: ${marker.positionInBIM.z.toFixed(2)}m</p>
            <p><strong>Tamanho:</strong> ${(marker.physicalSize * 100).toFixed(0)}cm</p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="qrPrintBtn">🖨️ Imprimir</button>
          <button class="btn-primary" id="qrDownloadBtn">⬇️ Download PNG</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.querySelector('.btn-close')?.addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#qrPrintBtn')?.addEventListener('click', () => {
      qrCode.print();
    });

    modal.querySelector('#qrDownloadBtn')?.addEventListener('click', () => {
      qrCode.download(`${marker.name.replace(/\s+/g, '-')}.png`);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  private locateMarker(markerId: string): void {
    const marker = this.zeroMarkerSystem.getZeroMarker(markerId);
    if (!marker) return;

    // TODO: Integrar com sistema de câmera para voar até o marco
    console.log('Locating marker:', marker.name, marker.positionInBIM);
    
    // Por enquanto, apenas log
    alert(`Voando para marco: ${marker.name}\nPosição: ${marker.positionInBIM.x.toFixed(2)}, ${marker.positionInBIM.y.toFixed(2)}, ${marker.positionInBIM.z.toFixed(2)}`);
  }

  private async activateMarker(markerId: string): Promise<void> {
    try {
      await this.zeroMarkerSystem.activateZeroMarker(markerId);
      this.refreshMarkerList();
      
      const marker = this.zeroMarkerSystem.getZeroMarker(markerId);
      alert(`Marco ativado: ${marker?.name}\nO modelo foi alinhado a este ponto.`);
      
    } catch (error) {
      console.error('Failed to activate marker:', error);
      alert(`Erro ao ativar marco: ${error}`);
    }
  }

  private async deactivateMarker(): Promise<void> {
    try {
      await this.zeroMarkerSystem.deactivateZeroMarker();
      this.refreshMarkerList();
      
    } catch (error) {
      console.error('Failed to deactivate marker:', error);
      alert(`Erro ao desativar marco: ${error}`);
    }
  }

  private async deleteMarker(markerId: string): Promise<void> {
    const marker = this.zeroMarkerSystem.getZeroMarker(markerId);
    if (!marker) return;

    if (!confirm(`Tem certeza que deseja remover o marco "${marker.name}"?`)) {
      return;
    }

    try {
      await this.zeroMarkerSystem.removeZeroMarker(markerId);
      this.refreshMarkerList();
      
    } catch (error) {
      console.error('Failed to delete marker:', error);
      alert(`Erro ao remover marco: ${error}`);
    }
  }

  // ============================================
  // CREATE MARKER MODAL
  // ============================================

  private showCreateMarkerModal(): void {
    const modal = this.container.querySelector('#createMarkerModal') as HTMLElement;
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  private hideCreateMarkerModal(): void {
    const modal = this.container.querySelector('#createMarkerModal') as HTMLElement;
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private async createMarkerFromForm(): Promise<void> {
    const name = (this.container.querySelector('#markerName') as HTMLInputElement).value.trim();
    const posX = parseFloat((this.container.querySelector('#markerPosX') as HTMLInputElement).value);
    const posY = parseFloat((this.container.querySelector('#markerPosY') as HTMLInputElement).value);
    const posZ = parseFloat((this.container.querySelector('#markerPosZ') as HTMLInputElement).value);
    const floor = (this.container.querySelector('#markerFloor') as HTMLSelectElement).value;
    const elevation = parseFloat((this.container.querySelector('#markerElevation') as HTMLInputElement).value);
    const size = parseFloat((this.container.querySelector('#markerSize') as HTMLInputElement).value);
    const description = (this.container.querySelector('#markerDescription') as HTMLTextAreaElement).value.trim();

    if (!name) {
      alert('Por favor, informe o nome do marco');
      return;
    }

    const config: CreateZeroMarkerConfig = {
      name,
      positionInBIM: { x: posX, y: posY, z: posZ },
      floorLevel: floor,
      elevation,
      physicalSize: size,
      description: description || undefined
    };

    try {
      const marker = await this.zeroMarkerSystem.createZeroMarker(config);
      
      this.hideCreateMarkerModal();
      this.refreshMarkerList();
      
      alert(`Marco "${marker.name}" criado com sucesso!`);
      
    } catch (error) {
      console.error('Failed to create marker:', error);
      alert(`Erro ao criar marco: ${error}`);
    }
  }

  // ============================================
  // AR MODE (Mobile)
  // ============================================

  private async startARMode(): Promise<void> {
    if (!this.arViewController) {
      alert('AR Controller não está disponível');
      return;
    }

    try {
      // Solicita scan de QR
      await this.arViewController.requestQRScan();
      
    } catch (error) {
      console.error('Failed to start AR mode:', error);
      alert(`Erro ao iniciar modo AR: ${error}`);
    }
  }

  // ============================================
  // EXPORT
  // ============================================

  private async exportAllQRCodes(): Promise<void> {
    try {
      await this.zeroMarkerSystem.generatePrintablePDF(this.projectName);
      
    } catch (error) {
      console.error('Failed to export QR codes:', error);
      alert(`Erro ao exportar QR codes: ${error}`);
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================

  show(): void {
    this.container.style.display = 'flex';
    this.refreshMarkerList();
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  toggle(): void {
    if (this.container.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  getElement(): HTMLElement {
    return this.container;
  }

  dispose(): void {
    this.container.remove();
  }
}
