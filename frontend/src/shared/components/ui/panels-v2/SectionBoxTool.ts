/**
 * Section Box Tool
 * Ferramenta de section box 3D interativo
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface SectionBox {
  enabled: boolean;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  inverted: boolean;
}

export class SectionBoxTool {
  private card: Card;
  private sectionBox: SectionBox;
  private onSectionChange?: (box: SectionBox) => void;

  constructor(options?: { onSectionChange?: (box: SectionBox) => void }) {
    this.onSectionChange = options?.onSectionChange;
    
    this.sectionBox = {
      enabled: false,
      min: { x: -50, y: -50, z: -50 },
      max: { x: 50, y: 50, z: 50 },
      inverted: false
    };

    this.card = new Card({
      title: '📦 Section Box',
      variant: 'glass'
    });

    this.render();
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Enable toggle
    const enableToggle = new Toggle({
      label: 'Ativar Section Box',
      checked: this.sectionBox.enabled,
      onChange: (checked) => {
        this.sectionBox.enabled = checked;
        this.render();
        this.notifyChange();
      }
    });
    body.appendChild(enableToggle.getElement());

    if (this.sectionBox.enabled) {
      // Invert toggle
      const invertToggle = new Toggle({
        label: 'Inverter Seleção',
        checked: this.sectionBox.inverted,
        onChange: (checked) => {
          this.sectionBox.inverted = checked;
          this.notifyChange();
        }
      });
      body.appendChild(invertToggle.getElement());

      // Min bounds
      body.appendChild(this.createBoundsSection('Mínimo', this.sectionBox.min));

      // Max bounds
      body.appendChild(this.createBoundsSection('Máximo', this.sectionBox.max));

      // Presets
      const presetsSection = this.createSection('Presets');
      const presets = document.createElement('div');
      presets.className = 'arxis-section-box__presets';

      const presetButtons = [
        { name: '🔝 Metade Superior', fn: () => this.applyPreset('top') },
        { name: '🔽 Metade Inferior', fn: () => this.applyPreset('bottom') },
        { name: '◀️ Metade Esquerda', fn: () => this.applyPreset('left') },
        { name: '▶️ Metade Direita', fn: () => this.applyPreset('right') },
        { name: '🎯 Centro', fn: () => this.applyPreset('center') },
        { name: '🔄 Resetar', fn: () => this.applyPreset('reset') }
      ];

      presetButtons.forEach(({ name, fn }) => {
        const btn = new Button({ text: name, variant: 'secondary', size: 'sm' });
        btn.getElement().addEventListener('click', fn);
        presets.appendChild(btn.getElement());
      });

      presetsSection.appendChild(presets);
      body.appendChild(presetsSection);

      // Visual representation
      const visual = document.createElement('div');
      visual.className = 'arxis-section-box__visual';
      visual.innerHTML = this.createVisualRepresentation();
      body.appendChild(visual);
    }
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-section-box__section';
    
    const label = document.createElement('h4');
    label.className = 'arxis-section-box__section-title';
    label.textContent = title;
    section.appendChild(label);

    return section;
  }

  private createBoundsSection(title: string, bounds: { x: number; y: number; z: number }): HTMLDivElement {
    const section = this.createSection(title);

    ['x', 'y', 'z'].forEach(axis => {
      const control = document.createElement('div');
      control.className = 'arxis-section-box__control';

      const label = document.createElement('label');
      label.textContent = `${axis.toUpperCase()}:`;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'arxis-section-box__slider';
      slider.min = '-100';
      slider.max = '100';
      slider.step = '1';
      slider.value = String(bounds[axis as keyof typeof bounds]);

      const value = document.createElement('span');
      value.className = 'arxis-section-box__value';
      value.textContent = String(bounds[axis as keyof typeof bounds]);

      slider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        bounds[axis as keyof typeof bounds] = val;
        value.textContent = String(val);
        this.notifyChange();
      });

      control.appendChild(label);
      control.appendChild(slider);
      control.appendChild(value);
      section.appendChild(control);
    });

    return section;
  }

  private createVisualRepresentation(): string {
    const { min, max } = this.sectionBox;
    
    // Simplified 2D representation
    const width = 200;
    const height = 200;
    const centerX = width / 2;
    const centerY = height / 2;

    const boxWidth = ((max.x - min.x) / 200) * width;
    const boxHeight = ((max.z - min.z) / 200) * height;
    const boxX = centerX + (min.x / 100) * (width / 2);
    const boxY = centerY + (min.z / 100) * (height / 2);

    return `
      <svg width="${width}" height="${height}" class="arxis-section-box__svg">
        <!-- Grid background -->
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#grid)"/>
        
        <!-- Bounding area -->
        <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
              fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="5,5"/>
        
        <!-- Section box -->
        <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}"
              fill="rgba(0, 212, 255, 0.2)" stroke="#00d4ff" stroke-width="2"/>
        
        <!-- Center cross -->
        <line x1="${centerX - 10}" y1="${centerY}" x2="${centerX + 10}" y2="${centerY}" 
              stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        <line x1="${centerX}" y1="${centerY - 10}" x2="${centerX}" y2="${centerY + 10}" 
              stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      </svg>
    `;
  }

  private applyPreset(preset: string): void {
    switch (preset) {
      case 'top':
        this.sectionBox.min = { x: -50, y: 0, z: -50 };
        this.sectionBox.max = { x: 50, y: 50, z: 50 };
        break;
      case 'bottom':
        this.sectionBox.min = { x: -50, y: -50, z: -50 };
        this.sectionBox.max = { x: 50, y: 0, z: 50 };
        break;
      case 'left':
        this.sectionBox.min = { x: -50, y: -50, z: -50 };
        this.sectionBox.max = { x: 0, y: 50, z: 50 };
        break;
      case 'right':
        this.sectionBox.min = { x: 0, y: -50, z: -50 };
        this.sectionBox.max = { x: 50, y: 50, z: 50 };
        break;
      case 'center':
        this.sectionBox.min = { x: -25, y: -25, z: -25 };
        this.sectionBox.max = { x: 25, y: 25, z: 25 };
        break;
      case 'reset':
        this.sectionBox.min = { x: -50, y: -50, z: -50 };
        this.sectionBox.max = { x: 50, y: 50, z: 50 };
        break;
    }

    this.render();
    this.notifyChange();
  }

  private notifyChange(): void {
    this.onSectionChange?.(this.sectionBox);
  }

  public getSectionBox(): SectionBox {
    return this.sectionBox;
  }

  public setSectionBox(box: Partial<SectionBox>): void {
    Object.assign(this.sectionBox, box);
    this.render();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }
}
