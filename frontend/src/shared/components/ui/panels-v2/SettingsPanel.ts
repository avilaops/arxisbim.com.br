/**
 * Settings Panel - Configurações do aplicativo
 * Configurações gerais, visualização, performance e preferências
 */

import { Card } from '../design-system/components/Card';
import { Toggle } from '../design-system/components/Toggle';
import { Slider } from '../design-system/components/Slider';
import { Select } from '../design-system/components/Select';
import { Button } from '../design-system/components/Button';
import { eventBus, EventType } from '../../../../core';

export interface AppSettings {
  // Visual
  theme: 'dark' | 'light';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  antialiasing: boolean;
  shadows: boolean;
  ambientOcclusion: boolean;
  
  // Performance
  fps_limit: number;
  lod_enabled: boolean;
  frustum_culling: boolean;
  
  // Navigation
  mouse_sensitivity: number;
  invert_y: boolean;
  fly_speed: number;
  
  // Units
  length_unit: string;
  area_unit: string;
  volume_unit: string;
}

export class SettingsPanel {
  private container: HTMLElement;
  private settings: AppSettings;

  constructor() {
    this.settings = this.loadSettings();
    this.container = this.createContainer();
    this.applyStyles();
  }

  /**
   * Carrega configurações (localStorage ou padrões)
   */
  private loadSettings(): AppSettings {
    const saved = localStorage.getItem('arxis-settings');
    if (saved) {
      return JSON.parse(saved);
    }

    return {
      theme: 'dark',
      quality: 'high',
      antialiasing: true,
      shadows: true,
      'ambientOcclusion': false,
      fps_limit: 60,
      lod_enabled: true,
      frustum_culling: true,
      mouse_sensitivity: 50,
      invert_y: false,
      fly_speed: 10,
      length_unit: 'm',
      area_unit: 'm²',
      volume_unit: 'm³'
    };
  }

  /**
   * Salva configurações
   */
  private saveSettings(): void {
    localStorage.setItem('arxis-settings', JSON.stringify(this.settings));
    eventBus.emit(EventType.SETTINGS_CHANGED, { settings: this.settings });
    console.log('Settings saved:', this.settings);
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'settings-panel';
    
    // Header
    const header = document.createElement('div');
    header.className = 'settings-panel-header';
    
    const title = document.createElement('h3');
    title.textContent = '⚙️ Configurações';
    header.appendChild(title);

    // Reset button
    const resetBtn = new Button({
      text: 'Resetar',
      icon: '🔄',
      variant: 'secondary',
      size: 'sm',
      onClick: () => this.resetSettings()
    });
    header.appendChild(resetBtn.getElement());

    container.appendChild(header);

    // Tabs
    const tabs = this.createTabs();
    container.appendChild(tabs);

    // Content
    const content = document.createElement('div');
    content.className = 'settings-content';
    content.appendChild(this.createVisualSettings());
    content.appendChild(this.createPerformanceSettings());
    content.appendChild(this.createNavigationSettings());
    content.appendChild(this.createUnitsSettings());
    container.appendChild(content);

    return container;
  }

  /**
   * Cria abas
   */
  private createTabs(): HTMLElement {
    const tabs = document.createElement('div');
    tabs.className = 'settings-tabs';
    
    const tabNames = ['🎨 Visual', '⚡ Performance', '🎮 Navegação', '📐 Unidades'];
    
    tabNames.forEach((name, index) => {
      const tab = document.createElement('button');
      tab.className = 'settings-tab';
      tab.textContent = name;
      if (index === 0) tab.classList.add('active');
      tab.onclick = () => this.switchTab(index);
      tabs.appendChild(tab);
    });

    return tabs;
  }

  /**
   * Troca de aba
   */
  private switchTab(index: number): void {
    // Atualiza tabs
    const tabs = this.container.querySelectorAll('.settings-tab');
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === index);
    });

    // Atualiza sections
    const sections = this.container.querySelectorAll('.settings-section');
    sections.forEach((section, i) => {
      (section as HTMLElement).style.display = i === index ? 'block' : 'none';
    });
  }

  /**
   * Configurações visuais
   */
  private createVisualSettings(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';

    const card = new Card({ title: 'Qualidade Visual', padding: 'md' });

    // Theme
    const themeSelect = new Select({
      label: 'Tema',
      options: [
        { value: 'dark', label: 'Escuro', icon: '🌙' },
        { value: 'light', label: 'Claro', icon: '☀️' }
      ],
      value: this.settings.theme,
      fullWidth: true,
      onChange: (value) => {
        this.settings.theme = value as 'dark' | 'light';
        this.saveSettings();
      }
    });
    card.appendChild(themeSelect.getElement());

    // Quality preset
    const qualitySelect = new Select({
      label: 'Preset de Qualidade',
      options: [
        { value: 'low', label: 'Baixa' },
        { value: 'medium', label: 'Média' },
        { value: 'high', label: 'Alta' },
        { value: 'ultra', label: 'Ultra' }
      ],
      value: this.settings.quality,
      fullWidth: true,
      onChange: (value) => {
        this.settings.quality = value as any;
        this.saveSettings();
      }
    });
    card.appendChild(qualitySelect.getElement());

    // Antialiasing
    const aaToggle = new Toggle({
      label: 'Antialiasing',
      checked: this.settings.antialiasing,
      onChange: (checked) => {
        this.settings.antialiasing = checked;
        this.saveSettings();
      }
    });
    card.appendChild(aaToggle.getElement());

    // Shadows
    const shadowsToggle = new Toggle({
      label: 'Sombras',
      checked: this.settings.shadows,
      onChange: (checked) => {
        this.settings.shadows = checked;
        this.saveSettings();
      }
    });
    card.appendChild(shadowsToggle.getElement());

    // Ambient Occlusion
    const aoToggle = new Toggle({
      label: 'Ambient Occlusion',
      checked: this.settings['ambientOcclusion'],
      onChange: (checked) => {
        this.settings['ambientOcclusion'] = checked;
        this.saveSettings();
      }
    });
    card.appendChild(aoToggle.getElement());

    section.appendChild(card.getElement());
    return section;
  }

  /**
   * Configurações de performance
   */
  private createPerformanceSettings(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.style.display = 'none';

    const card = new Card({ title: 'Performance', padding: 'md' });

    // FPS Limit
    const fpsSlider = new Slider({
      label: 'Limite de FPS',
      min: 30,
      max: 144,
      step: 1,
      value: this.settings.fps_limit,
      showValue: true,
      onChange: (value) => {
        this.settings.fps_limit = value;
        this.saveSettings();
      }
    });
    card.appendChild(fpsSlider.getElement());

    // LOD
    const lodToggle = new Toggle({
      label: 'Level of Detail (LOD)',
      checked: this.settings.lod_enabled,
      onChange: (checked) => {
        this.settings.lod_enabled = checked;
        this.saveSettings();
      }
    });
    card.appendChild(lodToggle.getElement());

    // Frustum Culling
    const cullingToggle = new Toggle({
      label: 'Frustum Culling',
      checked: this.settings.frustum_culling,
      onChange: (checked) => {
        this.settings.frustum_culling = checked;
        this.saveSettings();
      }
    });
    card.appendChild(cullingToggle.getElement());

    section.appendChild(card.getElement());
    return section;
  }

  /**
   * Configurações de navegação
   */
  private createNavigationSettings(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.style.display = 'none';

    const card = new Card({ title: 'Controles', padding: 'md' });

    // Mouse Sensitivity
    const sensitivitySlider = new Slider({
      label: 'Sensibilidade do Mouse',
      min: 1,
      max: 100,
      step: 1,
      value: this.settings.mouse_sensitivity,
      showValue: true,
      unit: '%',
      onChange: (value) => {
        this.settings.mouse_sensitivity = value;
        this.saveSettings();
      }
    });
    card.appendChild(sensitivitySlider.getElement());

    // Invert Y
    const invertToggle = new Toggle({
      label: 'Inverter Eixo Y',
      checked: this.settings.invert_y,
      onChange: (checked) => {
        this.settings.invert_y = checked;
        this.saveSettings();
      }
    });
    card.appendChild(invertToggle.getElement());

    // Fly Speed
    const speedSlider = new Slider({
      label: 'Velocidade de Voo',
      min: 1,
      max: 50,
      step: 1,
      value: this.settings.fly_speed,
      showValue: true,
      unit: 'm/s',
      onChange: (value) => {
        this.settings.fly_speed = value;
        this.saveSettings();
      }
    });
    card.appendChild(speedSlider.getElement());

    section.appendChild(card.getElement());
    return section;
  }

  /**
   * Configurações de unidades
   */
  private createUnitsSettings(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.style.display = 'none';

    const card = new Card({ title: 'Unidades de Medida', padding: 'md' });

    // Length Unit
    const lengthSelect = new Select({
      label: 'Comprimento',
      options: [
        { value: 'mm', label: 'Milímetros (mm)' },
        { value: 'cm', label: 'Centímetros (cm)' },
        { value: 'm', label: 'Metros (m)' },
        { value: 'km', label: 'Quilômetros (km)' }
      ],
      value: this.settings.length_unit,
      fullWidth: true,
      onChange: (value) => {
        this.settings.length_unit = value;
        this.saveSettings();
      }
    });
    card.appendChild(lengthSelect.getElement());

    // Area Unit
    const areaSelect = new Select({
      label: 'Área',
      options: [
        { value: 'm²', label: 'Metros quadrados (m²)' },
        { value: 'cm²', label: 'Centímetros quadrados (cm²)' },
        { value: 'ha', label: 'Hectares (ha)' }
      ],
      value: this.settings.area_unit,
      fullWidth: true,
      onChange: (value) => {
        this.settings.area_unit = value;
        this.saveSettings();
      }
    });
    card.appendChild(areaSelect.getElement());

    // Volume Unit
    const volumeSelect = new Select({
      label: 'Volume',
      options: [
        { value: 'm³', label: 'Metros cúbicos (m³)' },
        { value: 'cm³', label: 'Centímetros cúbicos (cm³)' },
        { value: 'L', label: 'Litros (L)' }
      ],
      value: this.settings.volume_unit,
      fullWidth: true,
      onChange: (value) => {
        this.settings.volume_unit = value;
        this.saveSettings();
      }
    });
    card.appendChild(volumeSelect.getElement());

    section.appendChild(card.getElement());
    return section;
  }

  /**
   * Reseta configurações
   */
  private resetSettings(): void {
    if (confirm('Deseja restaurar as configurações padrão?')) {
      localStorage.removeItem('arxis-settings');
      location.reload();
    }
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('settings-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'settings-panel-styles';
    style.textContent = `
      .settings-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .settings-panel-header {
        padding: 16px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .settings-panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .settings-tabs {
        display: flex;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .settings-tab {
        flex: 1;
        padding: 12px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 3px solid transparent;
      }

      .settings-tab:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--theme-foreground, #fff);
      }

      .settings-tab.active {
        color: var(--theme-accent, #00ff88);
        border-bottom-color: var(--theme-accent, #00ff88);
        background: rgba(0, 255, 136, 0.1);
      }

      .settings-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }

      .settings-section {
        animation: settings-fade-in 0.3s ease;
      }

      @keyframes settings-fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Retorna configurações atuais
   */
  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  /**
   * Destrói o painel
   */
  public destroy(): void {
    this.container.remove();
  }
}
