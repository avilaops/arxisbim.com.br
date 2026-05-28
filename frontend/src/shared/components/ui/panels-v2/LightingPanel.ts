/**
 * Lighting Panel
 * Controle de iluminação da cena
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface Light {
  id: string;
  type: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';
  name: string;
  enabled: boolean;
  color: string;
  intensity: number;
  position?: { x: number; y: number; z: number };
  target?: { x: number; y: number; z: number };
  distance?: number;
  angle?: number;
  penumbra?: number;
  castShadow?: boolean;
}

export class LightingPanel {
  private card: Card;
  private lights: Light[] = [];
  private onLightChange?: (lights: Light[]) => void;

  constructor(options?: { onLightChange?: (lights: Light[]) => void }) {
    this.onLightChange = options?.onLightChange;
    
    this.card = new Card({
      title: '💡 Iluminação',
      variant: 'glass'
    });

    this.initDefaultLights();
    this.render();
  }

  private initDefaultLights(): void {
    this.lights = [
      {
        id: 'ambient',
        type: 'ambient',
        name: 'Luz Ambiente',
        enabled: true,
        color: '#ffffff',
        intensity: 0.4
      },
      {
        id: 'sun',
        type: 'directional',
        name: 'Sol (Direcional)',
        enabled: true,
        color: '#ffffff',
        intensity: 0.8,
        position: { x: 50, y: 100, z: 50 },
        target: { x: 0, y: 0, z: 0 },
        castShadow: true
      },
      {
        id: 'hemisphere',
        type: 'hemisphere',
        name: 'Hemisfério (Céu)',
        enabled: false,
        color: '#87ceeb',
        intensity: 0.6
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Preset buttons
    const presetsSection = this.createSection('Presets');
    const presets = document.createElement('div');
    presets.className = 'arxis-lighting__presets';

    const presetConfigs = [
      { name: '☀️ Dia', ambient: 0.5, sun: 0.9 },
      { name: '🌅 Entardecer', ambient: 0.4, sun: 0.6 },
      { name: '🌙 Noite', ambient: 0.2, sun: 0.1 },
      { name: '🏢 Interior', ambient: 0.6, sun: 0.3 }
    ];

    presetConfigs.forEach(preset => {
      const btn = new Button({ text: preset.name, variant: 'secondary', size: 'sm' });
      btn.getElement().addEventListener('click', () => this.applyPreset(preset.ambient, preset.sun));
      presets.appendChild(btn.getElement());
    });

    presetsSection.appendChild(presets);
    body.appendChild(presetsSection);

    // Lights list
    const lightsSection = this.createSection('Luzes Ativas');
    this.lights.forEach(light => {
      const lightItem = this.createLightItem(light);
      lightsSection.appendChild(lightItem);
    });
    body.appendChild(lightsSection);

    // Add light button
    const addBtn = new Button({ text: '➕ Adicionar Luz', variant: 'primary' });
    addBtn.getElement().addEventListener('click', () => this.showAddLightDialog());
    body.appendChild(addBtn.getElement());

    // Shadow settings
    const shadowSection = this.createSection('Configurações de Sombra');
    const shadowToggle = new Toggle({
      label: 'Sombras Ativadas',
      checked: true,
      onChange: (checked) => {
        console.log('Sombras:', checked);
        // Implementar toggle de sombras
      }
    });
    shadowSection.appendChild(shadowToggle.getElement());
    body.appendChild(shadowSection);
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-lighting__section';
    
    const label = document.createElement('h4');
    label.className = 'arxis-lighting__section-title';
    label.textContent = title;
    section.appendChild(label);

    return section;
  }

  private createLightItem(light: Light): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-lighting__light-item';
    if (!light.enabled) item.classList.add('arxis-lighting__light-item--disabled');

    // Header
    const header = document.createElement('div');
    header.className = 'arxis-lighting__light-header';

    const info = document.createElement('div');
    info.className = 'arxis-lighting__light-info';

    const icon = document.createElement('span');
    icon.className = 'arxis-lighting__light-icon';
    icon.textContent = this.getLightIcon(light.type);

    const name = document.createElement('span');
    name.className = 'arxis-lighting__light-name';
    name.textContent = light.name;

    info.appendChild(icon);
    info.appendChild(name);

    const toggle = new Toggle({
      checked: light.enabled,
      onChange: (checked) => {
        light.enabled = checked;
        this.render();
        this.notifyChange();
      }
    });

    header.appendChild(info);
    header.appendChild(toggle.getElement());
    item.appendChild(header);

    if (light.enabled) {
      // Color
      const colorControl = document.createElement('div');
      colorControl.className = 'arxis-lighting__control';
      
      const colorLabel = document.createElement('label');
      colorLabel.textContent = 'Cor:';
      
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'arxis-lighting__color';
      colorInput.value = light.color;
      colorInput.addEventListener('change', (e) => {
        light.color = (e.target as HTMLInputElement).value;
        this.notifyChange();
      });

      colorControl.appendChild(colorLabel);
      colorControl.appendChild(colorInput);
      item.appendChild(colorControl);

      // Intensity
      const intensityControl = document.createElement('div');
      intensityControl.className = 'arxis-lighting__control';
      
      const intensityLabel = document.createElement('label');
      intensityLabel.textContent = 'Intensidade:';
      
      const intensitySlider = document.createElement('input');
      intensitySlider.type = 'range';
      intensitySlider.className = 'arxis-lighting__slider';
      intensitySlider.min = '0';
      intensitySlider.max = '2';
      intensitySlider.step = '0.1';
      intensitySlider.value = String(light.intensity);

      const intensityValue = document.createElement('span');
      intensityValue.className = 'arxis-lighting__value';
      intensityValue.textContent = light.intensity.toFixed(1);

      intensitySlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        light.intensity = value;
        intensityValue.textContent = value.toFixed(1);
        this.notifyChange();
      });

      intensityControl.appendChild(intensityLabel);
      intensityControl.appendChild(intensitySlider);
      intensityControl.appendChild(intensityValue);
      item.appendChild(intensityControl);

      // Delete button
      if (light.type !== 'ambient') {
        const deleteBtn = new Button({ 
          text: '🗑️ Remover', 
          variant: 'danger',
          size: 'sm'
        });
        deleteBtn.getElement().addEventListener('click', () => {
          this.lights = this.lights.filter(l => l.id !== light.id);
          this.render();
          this.notifyChange();
        });
        item.appendChild(deleteBtn.getElement());
      }
    }

    return item;
  }

  private getLightIcon(type: string): string {
    const icons: Record<string, string> = {
      ambient: '🌐',
      directional: '☀️',
      point: '💡',
      spot: '🔦',
      hemisphere: '🌤️'
    };
    return icons[type] || '💡';
  }

  private applyPreset(ambientIntensity: number, sunIntensity: number): void {
    const ambient = this.lights.find(l => l.type === 'ambient');
    const sun = this.lights.find(l => l.type === 'directional');

    if (ambient) ambient.intensity = ambientIntensity;
    if (sun) sun.intensity = sunIntensity;

    this.render();
    this.notifyChange();
  }

  private showAddLightDialog(): void {
    // Simplified dialog
    const type = prompt('Tipo de luz (point, spot, directional):');
    if (!type) return;

    const name = prompt('Nome da luz:') || 'Nova Luz';

    const newLight: Light = {
      id: `light-${Date.now()}`,
      type: type as any,
      name,
      enabled: true,
      color: '#ffffff',
      intensity: 1,
      position: { x: 0, y: 10, z: 0 }
    };

    this.lights.push(newLight);
    this.render();
    this.notifyChange();
  }

  private notifyChange(): void {
    this.onLightChange?.(this.lights);
  }

  public getLights(): Light[] {
    return this.lights;
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }
}
