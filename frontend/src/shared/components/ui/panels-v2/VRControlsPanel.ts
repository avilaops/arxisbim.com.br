/**
 * VR Controls Panel
 * Painel de configurações para modo VR
 */

import { Card } from '../design-system/components/Card';
import { Toggle } from '../design-system/components/Toggle';
import { Slider } from '../design-system/components/Slider';
import { Select } from '../design-system/components/Select';
import { Button } from '../design-system/components/Button';

export interface VRSettings {
  locomotionMode: 'teleport' | 'smooth' | 'snap';
  snapAngle: number;
  movementSpeed: number;
  handTracking: boolean;
  controllerVibration: boolean;
  comfortMode: boolean;
  ipd: number; // Interpupillary distance
}

export class VRControlsPanel {
  private card: Card;
  private settings: VRSettings;
  private onSettingsChange?: (settings: VRSettings) => void;

  constructor(options?: {
    onSettingsChange?: (settings: VRSettings) => void;
  }) {
    this.onSettingsChange = options?.onSettingsChange;
    
    this.settings = {
      locomotionMode: 'teleport',
      snapAngle: 45,
      movementSpeed: 1.5,
      handTracking: true,
      controllerVibration: true,
      comfortMode: false,
      ipd: 63
    };

    this.card = new Card({
      title: '🥽 Controles VR',
      variant: 'glass'
    });

    this.render();
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // VR Status
    const status = document.createElement('div');
    status.className = 'arxis-vr__status';
    status.innerHTML = `
      <div class="arxis-vr__status-icon">🥽</div>
      <div class="arxis-vr__status-text">
        <div class="arxis-vr__status-label">Status VR</div>
        <div class="arxis-vr__status-value">Dispositivo detectado</div>
      </div>
    `;
    body.appendChild(status);

    // Locomotion Mode
    const locomotionSection = document.createElement('div');
    locomotionSection.className = 'arxis-vr__section';

    const locomotionLabel = document.createElement('label');
    locomotionLabel.className = 'arxis-vr__label';
    locomotionLabel.textContent = 'Modo de Locomoção';

    const locomotionSelect = new Select({
      options: [
        { value: 'teleport', label: '📍 Teleporte' },
        { value: 'smooth', label: '🚶 Movimento Suave' },
        { value: 'snap', label: '↪️ Giro em Ângulos' }
      ],
      value: this.settings.locomotionMode,
      onChange: (value) => {
        this.settings.locomotionMode = value as any;
        this.notifyChange();
        this.render();
      }
    });

    locomotionSection.appendChild(locomotionLabel);
    locomotionSection.appendChild(locomotionSelect.getElement());
    body.appendChild(locomotionSection);

    // Snap Angle (if snap turn)
    if (this.settings.locomotionMode === 'snap') {
      const snapSection = document.createElement('div');
      snapSection.className = 'arxis-vr__section';

      const snapLabel = document.createElement('label');
      snapLabel.className = 'arxis-vr__label';
      snapLabel.textContent = `Ângulo de Giro: ${this.settings.snapAngle}°`;

      const snapSlider = new Slider({
        min: 15,
        max: 90,
        step: 15,
        value: this.settings.snapAngle,
        onChange: (value) => {
          this.settings.snapAngle = value;
          this.notifyChange();
          this.render();
        }
      });

      snapSection.appendChild(snapLabel);
      snapSection.appendChild(snapSlider.getElement());
      body.appendChild(snapSection);
    }

    // Movement Speed
    const speedSection = document.createElement('div');
    speedSection.className = 'arxis-vr__section';

    const speedLabel = document.createElement('label');
    speedLabel.className = 'arxis-vr__label';
    speedLabel.textContent = `Velocidade: ${this.settings.movementSpeed.toFixed(1)}x`;

    const speedSlider = new Slider({
      min: 0.5,
      max: 3,
      step: 0.5,
      value: this.settings.movementSpeed,
      onChange: (value) => {
        this.settings.movementSpeed = value;
        this.notifyChange();
        this.render();
      }
    });

    speedSection.appendChild(speedLabel);
    speedSection.appendChild(speedSlider.getElement());
    body.appendChild(speedSection);

    // IPD (Interpupillary Distance)
    const ipdSection = document.createElement('div');
    ipdSection.className = 'arxis-vr__section';

    const ipdLabel = document.createElement('label');
    ipdLabel.className = 'arxis-vr__label';
    ipdLabel.textContent = `Distância Interpupilar: ${this.settings.ipd}mm`;

    const ipdSlider = new Slider({
      min: 55,
      max: 75,
      step: 1,
      value: this.settings.ipd,
      onChange: (value) => {
        this.settings.ipd = value;
        this.notifyChange();
        this.render();
      }
    });

    ipdSection.appendChild(ipdLabel);
    ipdSection.appendChild(ipdSlider.getElement());
    body.appendChild(ipdSection);

    // Toggles
    const togglesSection = document.createElement('div');
    togglesSection.className = 'arxis-vr__toggles';

    const handTrackingToggle = new Toggle({
      label: '✋ Rastreamento de Mãos',
      checked: this.settings.handTracking,
      onChange: (checked) => {
        this.settings.handTracking = checked;
        this.notifyChange();
      }
    });

    const vibrationToggle = new Toggle({
      label: '📳 Vibração dos Controles',
      checked: this.settings.controllerVibration,
      onChange: (checked) => {
        this.settings.controllerVibration = checked;
        this.notifyChange();
      }
    });

    const comfortToggle = new Toggle({
      label: '🛡️ Modo Conforto (Reduz Náusea)',
      checked: this.settings.comfortMode,
      onChange: (checked) => {
        this.settings.comfortMode = checked;
        this.notifyChange();
      }
    });

    togglesSection.appendChild(handTrackingToggle.getElement());
    togglesSection.appendChild(vibrationToggle.getElement());
    togglesSection.appendChild(comfortToggle.getElement());
    body.appendChild(togglesSection);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-vr__actions';

    const resetBtn = new Button({ text: '🔄 Resetar Padrões', variant: 'secondary', size: 'sm' });
    resetBtn.getElement().addEventListener('click', () => this.resetDefaults());

    const calibrateBtn = new Button({ text: '🎯 Calibrar', variant: 'primary', size: 'sm' });
    calibrateBtn.getElement().addEventListener('click', () => this.calibrate());

    actions.appendChild(resetBtn.getElement());
    actions.appendChild(calibrateBtn.getElement());
    body.appendChild(actions);

    this.injectStyles();
  }

  private notifyChange(): void {
    this.onSettingsChange?.(this.settings);
  }

  private resetDefaults(): void {
    this.settings = {
      locomotionMode: 'teleport',
      snapAngle: 45,
      movementSpeed: 1.5,
      handTracking: true,
      controllerVibration: true,
      comfortMode: false,
      ipd: 63
    };
    this.render();
    this.notifyChange();
  }

  private calibrate(): void {
    console.log('Iniciando calibração VR...');
  }

  public getSettings(): VRSettings {
    return { ...this.settings };
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-vr-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-vr-styles';
    style.textContent = `
      .arxis-vr__status {
        display: flex;
        gap: 16px;
        align-items: center;
        padding: 16px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 8px;
        margin-bottom: 20px;
      }

      .arxis-vr__status-icon {
        font-size: 40px;
      }

      .arxis-vr__status-text {
        flex: 1;
      }

      .arxis-vr__status-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .arxis-vr__status-value {
        font-size: 16px;
        font-weight: 600;
        color: #00d4ff;
      }

      .arxis-vr__section {
        margin-bottom: 20px;
      }

      .arxis-vr__label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.8);
      }

      .arxis-vr__toggles {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
      }

      .arxis-vr__actions {
        display: flex;
        gap: 8px;
      }
    `;
    document.head.appendChild(style);
  }
}
