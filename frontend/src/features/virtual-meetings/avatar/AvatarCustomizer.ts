/**
 * AvatarCustomizer - Interface de customização de avatar
 * Modal com presets, sliders e color pickers
 */

import { 
  AvatarConfig, 
  AVATAR_PRESET_DEFAULT,
  AVATAR_PRESET_ENGINEER,
  AVATAR_PRESET_ARCHITECT,
  AVATAR_PRESET_MANAGER,
  AvatarMorphs,
  AVATAR_PARTS_CATALOG
} from './AvatarConfig';
import { AvatarSystem } from './AvatarSystem';

export class AvatarCustomizer {
  private avatarSystem?: AvatarSystem;
  private modal?: HTMLDivElement;
  private currentConfig: AvatarConfig;
  
  // Preview (mesmo na UI)
  private previewAvatar?: any; // Avatar class em 2D canvas ou 3D preview simples
  
  constructor(avatarSystem?: AvatarSystem) {
    this.avatarSystem = avatarSystem;
    this.currentConfig = this.getAvatarSystem()?.getLocalConfig() || { ...AVATAR_PRESET_DEFAULT };
  }

  /**
   * Obtém o AvatarSystem (do construtor ou do window global)
   */
  private getAvatarSystem(): AvatarSystem | undefined {
    if (this.avatarSystem) {
      return this.avatarSystem;
    }
    // Busca do window global se não foi passado no construtor
    this.avatarSystem = (window as any).__avatarSystem;
    return this.avatarSystem;
  }

  /**
   * Abre modal de customização
   */
  public open(): void {
    if (this.modal) {
      this.modal.style.display = 'flex';
      return;
    }
    
    this.createModal();
  }

  /**
   * Fecha modal
   */
  public close(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  /**
   * Cria modal HTML
   */
  private createModal(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'avatar-customizer-modal';
    this.modal.innerHTML = `
      <div class="avatar-customizer-panel">
        <!-- Header -->
        <div class="avatar-customizer-header">
          <h2>
            <i class="iconoir-user"></i>
            Personalizar Avatar
          </h2>
          <button class="avatar-customizer-close" title="Fechar">
            <i class="iconoir-xmark"></i>
          </button>
        </div>
        
        <!-- Tabs -->
        <div class="avatar-customizer-tabs">
          <button class="avatar-tab active" data-tab="presets">
            <i class="iconoir-bookmark"></i>
            Presets
          </button>
          <button class="avatar-tab" data-tab="morphs">
            <i class="iconoir-scale-frame-enlarge"></i>
            Proporções
          </button>
          <button class="avatar-tab" data-tab="colors">
            <i class="iconoir-color-picker"></i>
            Cores
          </button>
          <button class="avatar-tab" data-tab="parts">
            <i class="iconoir-wardrobe"></i>
            Roupas
          </button>
        </div>
        
        <!-- Content -->
        <div class="avatar-customizer-content">
          <!-- Presets Tab -->
          <div class="avatar-tab-content active" data-content="presets">
            <div class="avatar-presets-grid">
              <button class="avatar-preset-btn" data-preset="default">
                <div class="preset-icon">👤</div>
                <span>Padrão</span>
              </button>
              <button class="avatar-preset-btn" data-preset="engineer">
                <div class="preset-icon">👷</div>
                <span>Engenheiro</span>
              </button>
              <button class="avatar-preset-btn" data-preset="architect">
                <div class="preset-icon">🧑‍💼</div>
                <span>Arquiteto</span>
              </button>
              <button class="avatar-preset-btn" data-preset="manager">
                <div class="preset-icon">👨‍💼</div>
                <span>Gerente</span>
              </button>
            </div>
          </div>
          
          <!-- Morphs Tab -->
          <div class="avatar-tab-content" data-content="morphs">
            <div class="avatar-morph-group">
              <label>
                <i class="iconoir-arrow-up"></i>
                Altura
              </label>
              <input type="range" min="0" max="100" value="50" 
                     class="avatar-slider" data-morph="height">
              <span class="morph-value">50%</span>
            </div>
            
            <div class="avatar-morph-group">
              <label>
                <i class="iconoir-width"></i>
                Largura
              </label>
              <input type="range" min="0" max="100" value="50" 
                     class="avatar-slider" data-morph="weight">
              <span class="morph-value">50%</span>
            </div>
            
            <div class="avatar-morph-group">
              <label>
                <i class="iconoir-horizontal-split"></i>
                Ombros
              </label>
              <input type="range" min="0" max="100" value="50" 
                     class="avatar-slider" data-morph="shoulderWidth">
              <span class="morph-value">50%</span>
            </div>
            
            <div class="avatar-morph-group">
              <label>
                <i class="iconoir-emoji-surprise"></i>
                Tamanho Cabeça
              </label>
              <input type="range" min="0" max="100" value="50" 
                     class="avatar-slider" data-morph="headSize">
              <span class="morph-value">50%</span>
            </div>
          </div>
          
          <!-- Colors Tab -->
          <div class="avatar-tab-content" data-content="colors">
            <div class="avatar-color-group">
              <label>
                <i class="iconoir-color-picker"></i>
                Pele
              </label>
              <input type="color" value="#FFDBAC" 
                     class="avatar-color-picker" data-color="skin">
            </div>
            
            <div class="avatar-color-group">
              <label>
                <i class="iconoir-color-picker"></i>
                Cabelo
              </label>
              <input type="color" value="#2C1810" 
                     class="avatar-color-picker" data-color="hair">
            </div>
            
            <div class="avatar-color-group">
              <label>
                <i class="iconoir-color-picker"></i>
                Camisa
              </label>
              <input type="color" value="#4A90E2" 
                     class="avatar-color-picker" data-color="shirt">
            </div>
            
            <div class="avatar-color-group">
              <label>
                <i class="iconoir-color-picker"></i>
                Calça
              </label>
              <input type="color" value="#2C3E50" 
                     class="avatar-color-picker" data-color="pants">
            </div>
            
            <div class="avatar-color-group">
              <label>
                <i class="iconoir-color-picker"></i>
                Colete (BIM)
              </label>
              <input type="color" value="#FFD700" 
                     class="avatar-color-picker" data-color="vest">
            </div>
          </div>
          
          <!-- Parts Tab -->
          <div class="avatar-tab-content" data-content="parts">
            <div class="avatar-parts-section">
              <h3>Cabelo</h3>
              <div class="avatar-parts-grid" data-category="hair"></div>
            </div>
            
            <div class="avatar-parts-section">
              <h3>Camisa</h3>
              <div class="avatar-parts-grid" data-category="shirt"></div>
            </div>
            
            <div class="avatar-parts-section">
              <h3>Calça</h3>
              <div class="avatar-parts-grid" data-category="pants"></div>
            </div>
            
            <div class="avatar-parts-section">
              <h3>Equipamentos BIM</h3>
              <div class="avatar-parts-grid" data-category="bim"></div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="avatar-customizer-footer">
          <input type="text" 
                 class="avatar-name-input" 
                 placeholder="Seu nome" 
                 maxlength="20"
                 value="${this.currentConfig.displayName}">
          <button class="avatar-btn-cancel">Cancelar</button>
          <button class="avatar-btn-save">
            <i class="iconoir-floppy-disk"></i>
            Salvar Avatar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Populate parts
    this.populateParts();
    
    // Event listeners
    this.attachEventListeners();
    
    // Load current config to UI
    this.loadConfigToUI();
  }

  /**
   * Popula grid de partes do catálogo
   */
  private populateParts(): void {
    const hairGrid = this.modal!.querySelector('[data-category="hair"]')!;
    const shirtGrid = this.modal!.querySelector('[data-category="shirt"]')!;
    const pantsGrid = this.modal!.querySelector('[data-category="pants"]')!;
    const bimGrid = this.modal!.querySelector('[data-category="bim"]')!;
    
    AVATAR_PARTS_CATALOG.forEach((part) => {
      const btn = document.createElement('button');
      btn.className = 'avatar-part-btn';
      btn.dataset.partId = part.id;
      btn.innerHTML = `
        <div class="part-preview">${part.name.charAt(0)}</div>
        <span>${part.name}</span>
      `;
      
      if (part.category === 'hair') hairGrid.appendChild(btn);
      else if (part.category === 'shirt') shirtGrid.appendChild(btn);
      else if (part.category === 'pants') pantsGrid.appendChild(btn);
      else if (part.category === 'helmet' || part.category === 'vest') bimGrid.appendChild(btn);
    });
  }

  /**
   * Carrega config atual nos controles da UI
   */
  private loadConfigToUI(): void {
    // Name
    const nameInput = this.modal!.querySelector('.avatar-name-input') as HTMLInputElement;
    nameInput.value = this.currentConfig.displayName;
    
    // Morphs
    const morphSliders = this.modal!.querySelectorAll('[data-morph]') as NodeListOf<HTMLInputElement>;
    morphSliders.forEach((slider) => {
      const morph = slider.dataset.morph as keyof AvatarMorphs;
      const value = this.currentConfig.morphs[morph];
      slider.value = String(value * 100);
      const valueSpan = slider.parentElement!.querySelector('.morph-value')!;
      valueSpan.textContent = `${Math.round(value * 100)}%`;
    });
    
    // Colors
    const colorPickers = this.modal!.querySelectorAll('[data-color]') as NodeListOf<HTMLInputElement>;
    colorPickers.forEach((picker) => {
      const color = picker.dataset.color as keyof AvatarConfig['colors'];
      const value = this.currentConfig.colors[color];
      if (value) picker.value = value;
    });
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Close button
    const closeBtn = this.modal!.querySelector('.avatar-customizer-close')!;
    closeBtn.addEventListener('click', () => this.close());
    
    // Tabs
    const tabs = this.modal!.querySelectorAll('.avatar-tab') as NodeListOf<HTMLButtonElement>;
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab!));
    });
    
    // Presets
    const presetBtns = this.modal!.querySelectorAll('.avatar-preset-btn') as NodeListOf<HTMLButtonElement>;
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset!));
    });
    
    // Morphs
    const morphSliders = this.modal!.querySelectorAll('[data-morph]') as NodeListOf<HTMLInputElement>;
    morphSliders.forEach((slider) => {
      slider.addEventListener('input', () => this.onMorphChange(slider));
    });
    
    // Colors
    const colorPickers = this.modal!.querySelectorAll('[data-color]') as NodeListOf<HTMLInputElement>;
    colorPickers.forEach((picker) => {
      picker.addEventListener('input', () => this.onColorChange(picker));
    });
    
    // Parts
    const partBtns = this.modal!.querySelectorAll('.avatar-part-btn') as NodeListOf<HTMLButtonElement>;
    partBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.onPartSelect(btn.dataset.partId!));
    });
    
    // Name
    const nameInput = this.modal!.querySelector('.avatar-name-input') as HTMLInputElement;
    nameInput.addEventListener('input', () => {
      this.currentConfig.displayName = nameInput.value;
    });
    
    // Save/Cancel
    const saveBtn = this.modal!.querySelector('.avatar-btn-save')!;
    saveBtn.addEventListener('click', () => this.save());
    
    const cancelBtn = this.modal!.querySelector('.avatar-btn-cancel')!;
    cancelBtn.addEventListener('click', () => this.close());
  }

  /**
   * Switch tab
   */
  private switchTab(tabName: string): void {
    // Update active tab
    const tabs = this.modal!.querySelectorAll('.avatar-tab');
    tabs.forEach((tab) => tab.classList.remove('active'));
    const activeTab = this.modal!.querySelector(`[data-tab="${tabName}"]`)!;
    activeTab.classList.add('active');
    
    // Update active content
    const contents = this.modal!.querySelectorAll('.avatar-tab-content');
    contents.forEach((content) => content.classList.remove('active'));
    const activeContent = this.modal!.querySelector(`[data-content="${tabName}"]`)!;
    activeContent.classList.add('active');
  }

  /**
   * Apply preset
   */
  private applyPreset(presetName: string): void {
    const presets: Record<string, AvatarConfig> = {
      'default': { ...AVATAR_PRESET_DEFAULT },
      'engineer': { ...AVATAR_PRESET_ENGINEER },
      'architect': { ...AVATAR_PRESET_ARCHITECT },
      'manager': { ...AVATAR_PRESET_MANAGER }
    };
    
    const preset = presets[presetName];
    if (!preset) return;
    
    this.currentConfig = { ...preset };
    this.loadConfigToUI();
    
    console.log('✨ Preset aplicado:', presetName);
  }

  /**
   * Handle morph slider change
   */
  private onMorphChange(slider: HTMLInputElement): void {
    const morph = slider.dataset.morph as keyof AvatarMorphs;
    const value = parseInt(slider.value) / 100;
    
    this.currentConfig.morphs[morph] = value;
    
    // Update value display
    const valueSpan = slider.parentElement!.querySelector('.morph-value')!;
    valueSpan.textContent = `${Math.round(value * 100)}%`;
  }

  /**
   * Handle color picker change
   */
  private onColorChange(picker: HTMLInputElement): void {
    const color = picker.dataset.color as keyof AvatarConfig['colors'];
    this.currentConfig.colors[color] = picker.value;
  }

  /**
   * Handle part selection
   */
  private onPartSelect(partId: string): void {
    const part = AVATAR_PARTS_CATALOG.find(p => p.id === partId);
    if (!part) return;
    
    // Update config
    if (part.category === 'hair') this.currentConfig.parts.hair = partId;
    else if (part.category === 'shirt') this.currentConfig.parts.shirt = partId;
    else if (part.category === 'pants') this.currentConfig.parts.pants = partId;
    else if (part.category === 'helmet') this.currentConfig.parts.helmet = partId;
    else if (part.category === 'vest') this.currentConfig.parts.vest = partId;
    
    console.log('🔧 Parte selecionada:', part.name);
  }

  /**
   * Save and apply
   */
  private async save(): Promise<void> {
    try {
      const avatarSystem = this.getAvatarSystem();
      if (!avatarSystem) {
        console.error('❌ AvatarSystem not available');
        alert('Sistema de avatares ainda não está pronto. Tente novamente em alguns segundos.');
        return;
      }

      await avatarSystem.updateLocalAvatar(this.currentConfig);
      console.log('✅ Avatar salvo e aplicado');
      this.close();
    } catch (error) {
      console.error('❌ Erro ao salvar avatar:', error);
      alert('Erro ao salvar avatar. Tente novamente.');
    }
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    if (this.modal && this.modal.parentElement) {
      this.modal.parentElement.removeChild(this.modal);
    }
  }
}
