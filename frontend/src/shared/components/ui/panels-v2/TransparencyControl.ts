/**
 * Transparency Control
 * Controle de transparência por tipo de elemento
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface TransparencyRule {
  category: string;
  enabled: boolean;
  opacity: number;
  isolate: boolean;
}

export class TransparencyControl {
  private card: Card;
  private rules: TransparencyRule[] = [];
  private globalOpacity: number = 1;
  private onTransparencyChange?: (rules: TransparencyRule[], globalOpacity: number) => void;

  constructor(options?: { 
    onTransparencyChange?: (rules: TransparencyRule[], globalOpacity: number) => void 
  }) {
    this.onTransparencyChange = options?.onTransparencyChange;
    
    this.card = new Card({
      title: '👁️ Transparência',
      variant: 'glass'
    });

    this.initDefaultRules();
    this.render();
  }

  private initDefaultRules(): void {
    this.rules = [
      { category: 'Estrutura', enabled: false, opacity: 1, isolate: false },
      { category: 'Paredes', enabled: false, opacity: 1, isolate: false },
      { category: 'Pisos', enabled: false, opacity: 1, isolate: false },
      { category: 'Tetos', enabled: false, opacity: 1, isolate: false },
      { category: 'Esquadrias', enabled: false, opacity: 1, isolate: false },
      { category: 'Mobiliário', enabled: false, opacity: 1, isolate: false }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Global opacity
    const globalSection = this.createSection('Opacidade Global');
    const globalControl = document.createElement('div');
    globalControl.className = 'arxis-transparency__control';

    const globalSlider = document.createElement('input');
    globalSlider.type = 'range';
    globalSlider.className = 'arxis-transparency__slider';
    globalSlider.min = '0';
    globalSlider.max = '1';
    globalSlider.step = '0.05';
    globalSlider.value = String(this.globalOpacity);

    const globalValue = document.createElement('span');
    globalValue.className = 'arxis-transparency__value';
    globalValue.textContent = `${(this.globalOpacity * 100).toFixed(0)}%`;

    globalSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.globalOpacity = value;
      globalValue.textContent = `${(value * 100).toFixed(0)}%`;
      this.notifyChange();
    });

    globalControl.appendChild(globalSlider);
    globalControl.appendChild(globalValue);
    globalSection.appendChild(globalControl);
    body.appendChild(globalSection);

    // Quick presets
    const presetsDiv = document.createElement('div');
    presetsDiv.className = 'arxis-transparency__presets';

    const presets = [
      { name: 'Opaco', value: 1 },
      { name: '75%', value: 0.75 },
      { name: '50%', value: 0.5 },
      { name: '25%', value: 0.25 },
      { name: 'Transparente', value: 0.1 }
    ];

    presets.forEach(preset => {
      const btn = new Button({ text: preset.name, variant: 'secondary', size: 'sm' });
      btn.getElement().addEventListener('click', () => {
        this.globalOpacity = preset.value;
        this.render();
        this.notifyChange();
      });
      presetsDiv.appendChild(btn.getElement());
    });

    body.appendChild(presetsDiv);

    // Category rules
    const rulesSection = this.createSection('Controle por Categoria');
    this.rules.forEach(rule => {
      const ruleItem = this.createRuleItem(rule);
      rulesSection.appendChild(ruleItem);
    });
    body.appendChild(rulesSection);

    // Special modes
    const modesSection = this.createSection('Modos Especiais');
    
    const xrayBtn = new Button({ text: '🩻 Modo Raio-X', variant: 'secondary' });
    xrayBtn.getElement().addEventListener('click', () => this.applyXRayMode());

    const ghostBtn = new Button({ text: '👻 Modo Fantasma', variant: 'secondary' });
    ghostBtn.getElement().addEventListener('click', () => this.applyGhostMode());

    const resetBtn = new Button({ text: '🔄 Resetar', variant: 'secondary' });
    resetBtn.getElement().addEventListener('click', () => this.resetAll());

    modesSection.appendChild(xrayBtn.getElement());
    modesSection.appendChild(ghostBtn.getElement());
    modesSection.appendChild(resetBtn.getElement());
    body.appendChild(modesSection);
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-transparency__section';
    
    const label = document.createElement('h4');
    label.className = 'arxis-transparency__section-title';
    label.textContent = title;
    section.appendChild(label);

    return section;
  }

  private createRuleItem(rule: TransparencyRule): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-transparency__rule-item';
    if (!rule.enabled) item.classList.add('arxis-transparency__rule-item--disabled');

    // Header
    const header = document.createElement('div');
    header.className = 'arxis-transparency__rule-header';

    const name = document.createElement('span');
    name.className = 'arxis-transparency__rule-name';
    name.textContent = rule.category;

    const toggle = new Toggle({
      checked: rule.enabled,
      onChange: (checked) => {
        rule.enabled = checked;
        this.render();
        this.notifyChange();
      }
    });

    header.appendChild(name);
    header.appendChild(toggle.getElement());
    item.appendChild(header);

    if (rule.enabled) {
      // Opacity slider
      const opacityControl = document.createElement('div');
      opacityControl.className = 'arxis-transparency__control';

      const opacityLabel = document.createElement('label');
      opacityLabel.textContent = 'Opacidade:';

      const opacitySlider = document.createElement('input');
      opacitySlider.type = 'range';
      opacitySlider.className = 'arxis-transparency__slider';
      opacitySlider.min = '0';
      opacitySlider.max = '1';
      opacitySlider.step = '0.05';
      opacitySlider.value = String(rule.opacity);

      const opacityValue = document.createElement('span');
      opacityValue.className = 'arxis-transparency__value';
      opacityValue.textContent = `${(rule.opacity * 100).toFixed(0)}%`;

      opacitySlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        rule.opacity = value;
        opacityValue.textContent = `${(value * 100).toFixed(0)}%`;
        this.notifyChange();
      });

      opacityControl.appendChild(opacityLabel);
      opacityControl.appendChild(opacitySlider);
      opacityControl.appendChild(opacityValue);
      item.appendChild(opacityControl);

      // Isolate mode
      const isolateToggle = new Toggle({
        label: 'Isolar (outros transparentes)',
        checked: rule.isolate,
        onChange: (checked) => {
          rule.isolate = checked;
          if (checked) {
            // Disable isolate on other rules
            this.rules.forEach(r => {
              if (r !== rule) r.isolate = false;
            });
            this.render();
          }
          this.notifyChange();
        }
      });
      item.appendChild(isolateToggle.getElement());
    }

    return item;
  }

  private applyXRayMode(): void {
    this.globalOpacity = 0.3;
    this.rules.forEach(rule => {
      rule.enabled = true;
      rule.opacity = 0.3;
      rule.isolate = false;
    });
    this.render();
    this.notifyChange();
  }

  private applyGhostMode(): void {
    this.globalOpacity = 0.15;
    this.rules.forEach(rule => {
      rule.enabled = true;
      rule.opacity = 0.15;
      rule.isolate = false;
    });
    this.render();
    this.notifyChange();
  }

  private resetAll(): void {
    this.globalOpacity = 1;
    this.rules.forEach(rule => {
      rule.enabled = false;
      rule.opacity = 1;
      rule.isolate = false;
    });
    this.render();
    this.notifyChange();
  }

  private notifyChange(): void {
    this.onTransparencyChange?.(this.rules, this.globalOpacity);
  }

  public getRules(): TransparencyRule[] {
    return this.rules.filter(r => r.enabled);
  }

  public getGlobalOpacity(): number {
    return this.globalOpacity;
  }

  public setGlobalOpacity(opacity: number): void {
    this.globalOpacity = Math.max(0, Math.min(1, opacity));
    this.render();
    this.notifyChange();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }
}
