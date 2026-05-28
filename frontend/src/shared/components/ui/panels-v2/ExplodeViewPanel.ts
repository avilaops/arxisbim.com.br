/**
 * Explode View Panel
 * Controle de vista explodida (assembly explosion)
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface ExplodeConfig {
  enabled: boolean;
  factor: number;
  axis: 'xyz' | 'x' | 'y' | 'z' | 'radial';
  animated: boolean;
  speed: number;
}

export class ExplodeViewPanel {
  private card: Card;
  private config: ExplodeConfig;
  private animationFrame?: number;
  private onExplodeChange?: (config: ExplodeConfig) => void;

  constructor(options?: { onExplodeChange?: (config: ExplodeConfig) => void }) {
    this.onExplodeChange = options?.onExplodeChange;
    
    this.config = {
      enabled: false,
      factor: 0,
      axis: 'xyz',
      animated: false,
      speed: 1
    };

    this.card = new Card({
      title: '💥 Vista Explodida',
      variant: 'glass'
    });

    this.render();
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Enable toggle
    const enableToggle = new Toggle({
      label: 'Ativar Vista Explodida',
      checked: this.config.enabled,
      onChange: (checked) => {
        this.config.enabled = checked;
        if (!checked) {
          this.config.factor = 0;
          this.stopAnimation();
        }
        this.render();
        this.notifyChange();
      }
    });
    body.appendChild(enableToggle.getElement());

    if (this.config.enabled) {
      // Explode factor slider
      const factorSection = this.createSection('Fator de Explosão');
      const factorControl = document.createElement('div');
      factorControl.className = 'arxis-explode__control';

      const factorSlider = document.createElement('input');
      factorSlider.type = 'range';
      factorSlider.className = 'arxis-explode__slider';
      factorSlider.min = '0';
      factorSlider.max = '3';
      factorSlider.step = '0.1';
      factorSlider.value = String(this.config.factor);

      const factorValue = document.createElement('span');
      factorValue.className = 'arxis-explode__value';
      factorValue.textContent = `${(this.config.factor * 100).toFixed(0)}%`;

      factorSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.config.factor = value;
        factorValue.textContent = `${(value * 100).toFixed(0)}%`;
        this.notifyChange();
      });

      factorControl.appendChild(factorSlider);
      factorControl.appendChild(factorValue);
      factorSection.appendChild(factorControl);
      body.appendChild(factorSection);

      // Quick buttons
      const quickButtons = document.createElement('div');
      quickButtons.className = 'arxis-explode__quick-buttons';

      const presets = [
        { name: '0%', value: 0 },
        { name: '25%', value: 0.75 },
        { name: '50%', value: 1.5 },
        { name: '100%', value: 3 }
      ];

      presets.forEach(preset => {
        const btn = new Button({ text: preset.name, variant: 'secondary', size: 'sm' });
        btn.getElement().addEventListener('click', () => {
          this.config.factor = preset.value;
          this.render();
          this.notifyChange();
        });
        quickButtons.appendChild(btn.getElement());
      });

      body.appendChild(quickButtons);

      // Axis selector
      const axisSection = this.createSection('Direção da Explosão');
      const axisSelect = document.createElement('select');
      axisSelect.className = 'arxis-explode__select';
      axisSelect.innerHTML = `
        <option value="xyz">Todas as Direções (XYZ)</option>
        <option value="x">Apenas Horizontal (X)</option>
        <option value="y">Apenas Vertical (Y)</option>
        <option value="z">Apenas Profundidade (Z)</option>
        <option value="radial">Radial (Centro)</option>
      `;
      axisSelect.value = this.config.axis;
      axisSelect.addEventListener('change', (e) => {
        this.config.axis = (e.target as HTMLSelectElement).value as any;
        this.notifyChange();
      });
      axisSection.appendChild(axisSelect);
      body.appendChild(axisSection);

      // Animation controls
      const animSection = this.createSection('Animação');
      
      const animToggle = new Toggle({
        label: 'Animar Explosão',
        checked: this.config.animated,
        onChange: (checked) => {
          this.config.animated = checked;
          if (checked) {
            this.startAnimation();
          } else {
            this.stopAnimation();
          }
        }
      });
      animSection.appendChild(animToggle.getElement());

      if (this.config.animated) {
        const speedControl = document.createElement('div');
        speedControl.className = 'arxis-explode__control';

        const speedLabel = document.createElement('label');
        speedLabel.textContent = 'Velocidade:';

        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.className = 'arxis-explode__slider';
        speedSlider.min = '0.1';
        speedSlider.max = '3';
        speedSlider.step = '0.1';
        speedSlider.value = String(this.config.speed);

        const speedValue = document.createElement('span');
        speedValue.className = 'arxis-explode__value';
        speedValue.textContent = `${this.config.speed.toFixed(1)}x`;

        speedSlider.addEventListener('input', (e) => {
          const value = parseFloat((e.target as HTMLInputElement).value);
          this.config.speed = value;
          speedValue.textContent = `${value.toFixed(1)}x`;
        });

        speedControl.appendChild(speedLabel);
        speedControl.appendChild(speedSlider);
        speedControl.appendChild(speedValue);
        animSection.appendChild(speedControl);
      }

      body.appendChild(animSection);

      // Visual diagram
      const visual = document.createElement('div');
      visual.className = 'arxis-explode__visual';
      visual.innerHTML = this.createVisualDiagram();
      body.appendChild(visual);

      // Reset button
      const resetBtn = new Button({ text: '🔄 Resetar', variant: 'secondary' });
      resetBtn.getElement().addEventListener('click', () => {
        this.config.factor = 0;
        this.config.axis = 'xyz';
        this.config.animated = false;
        this.stopAnimation();
        this.render();
        this.notifyChange();
      });
      body.appendChild(resetBtn.getElement());
    }
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-explode__section';
    
    const label = document.createElement('h4');
    label.className = 'arxis-explode__section-title';
    label.textContent = title;
    section.appendChild(label);

    return section;
  }

  private createVisualDiagram(): string {
    const size = 200;
    const center = size / 2;
    const factor = Math.min(this.config.factor / 3, 1);
    const offset = 30 * factor;

    let elements = '';

    if (this.config.axis === 'radial' || this.config.axis === 'xyz') {
      // Radial explosion - 4 corner boxes
      const positions = [
        { x: center - 20 - offset, y: center - 20 - offset },
        { x: center + offset, y: center - 20 - offset },
        { x: center - 20 - offset, y: center + offset },
        { x: center + offset, y: center + offset }
      ];

      positions.forEach((pos, i) => {
        elements += `<rect x="${pos.x}" y="${pos.y}" width="20" height="20" 
                     fill="rgba(0, 212, 255, 0.5)" stroke="#00d4ff" stroke-width="1"/>`;
      });
    } else {
      // Axis-aligned explosion
      const count = 4;
      for (let i = 0; i < count; i++) {
        let x = center - 10;
        let y = center - 10;

        if (this.config.axis === 'x') {
          x = center - 10 + (i - count / 2 + 0.5) * (20 + offset);
        } else if (this.config.axis === 'y') {
          y = center - 10 + (i - count / 2 + 0.5) * (20 + offset);
        } else if (this.config.axis === 'z') {
          const scale = 1 - (i / count) * 0.5 * factor;
          x = center - 10 * scale;
          y = center - 10 * scale;
          elements += `<rect x="${x}" y="${y}" width="${20 * scale}" height="${20 * scale}" 
                       fill="rgba(0, 212, 255, ${0.3 + 0.4 * (i / count)})" 
                       stroke="#00d4ff" stroke-width="1"/>`;
          continue;
        }

        elements += `<rect x="${x}" y="${y}" width="20" height="20" 
                     fill="rgba(0, 212, 255, 0.5)" stroke="#00d4ff" stroke-width="1"/>`;
      }
    }

    return `
      <svg width="${size}" height="${size}" class="arxis-explode__svg">
        <!-- Center point -->
        <circle cx="${center}" cy="${center}" r="3" fill="rgba(255,255,255,0.4)"/>
        <circle cx="${center}" cy="${center}" r="6" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        
        <!-- Exploded elements -->
        ${elements}
      </svg>
    `;
  }

  private startAnimation(): void {
    let direction = 1;
    const animate = () => {
      if (!this.config.animated) return;

      this.config.factor += 0.02 * this.config.speed * direction;

      if (this.config.factor >= 3) {
        this.config.factor = 3;
        direction = -1;
      } else if (this.config.factor <= 0) {
        this.config.factor = 0;
        direction = 1;
      }

      this.render();
      this.notifyChange();

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  private stopAnimation(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
  }

  private notifyChange(): void {
    this.onExplodeChange?.(this.config);
  }

  public getConfig(): ExplodeConfig {
    return this.config;
  }

  public setExplodeFactor(factor: number): void {
    this.config.factor = Math.max(0, Math.min(3, factor));
    this.render();
    this.notifyChange();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.stopAnimation();
    this.card.destroy();
  }
}
