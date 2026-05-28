/**
 * Clipping Planes Editor
 * Editor de planos de corte com controles interativos
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface ClippingPlane {
  id: string;
  name: string;
  enabled: boolean;
  normal: { x: number; y: number; z: number };
  constant: number;
  negated: boolean;
}

export class ClippingPlanesEditor {
  private card: Card;
  private planes: ClippingPlane[] = [];
  private globalEnabled: boolean = true;
  private onPlanesChange?: (planes: ClippingPlane[], enabled: boolean) => void;

  constructor(options?: { onPlanesChange?: (planes: ClippingPlane[], enabled: boolean) => void }) {
    this.onPlanesChange = options?.onPlanesChange;
    
    this.card = new Card({
      title: '✂️ Planos de Corte',
      variant: 'glass'
    });

    this.render();
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Global toggle
    const globalToggle = new Toggle({
      label: 'Ativar Planos de Corte',
      checked: this.globalEnabled,
      onChange: (checked) => {
        this.globalEnabled = checked;
        this.render();
        this.notifyChange();
      }
    });
    body.appendChild(globalToggle.getElement());

    if (this.globalEnabled) {
      // Quick add buttons
      const quickAdd = this.createSection('Adicionar Plano');
      const buttons = document.createElement('div');
      buttons.className = 'arxis-clipping__quick-buttons';

      const axes = [
        { name: 'X+', normal: { x: 1, y: 0, z: 0 }, icon: '▶️' },
        { name: 'X-', normal: { x: -1, y: 0, z: 0 }, icon: '◀️' },
        { name: 'Y+', normal: { x: 0, y: 1, z: 0 }, icon: '⬆️' },
        { name: 'Y-', normal: { x: 0, y: -1, z: 0 }, icon: '⬇️' },
        { name: 'Z+', normal: { x: 0, y: 0, z: 1 }, icon: '🔼' },
        { name: 'Z-', normal: { x: 0, y: 0, z: -1 }, icon: '🔽' }
      ];

      axes.forEach(axis => {
        const btn = new Button({ 
          text: `${axis.icon} ${axis.name}`, 
          variant: 'secondary', 
          size: 'sm' 
        });
        btn.getElement().addEventListener('click', () => this.addPlane(axis.normal, axis.name));
        buttons.appendChild(btn.getElement());
      });

      quickAdd.appendChild(buttons);
      body.appendChild(quickAdd);

      // Planes list
      if (this.planes.length > 0) {
        const planesSection = this.createSection('Planos Ativos');
        this.planes.forEach(plane => {
          const planeItem = this.createPlaneItem(plane);
          planesSection.appendChild(planeItem);
        });
        body.appendChild(planesSection);

        // Clear all button
        const clearBtn = new Button({ text: '🗑️ Remover Todos', variant: 'danger' });
        clearBtn.getElement().addEventListener('click', () => {
          if (confirm('Remover todos os planos?')) {
            this.planes = [];
            this.render();
            this.notifyChange();
          }
        });
        body.appendChild(clearBtn.getElement());
      } else {
        const hint = document.createElement('div');
        hint.className = 'arxis-clipping__hint';
        hint.textContent = 'Adicione planos de corte para visualizar o interior do modelo';
        body.appendChild(hint);
      }
    }
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-clipping__section';
    
    const label = document.createElement('h4');
    label.className = 'arxis-clipping__section-title';
    label.textContent = title;
    section.appendChild(label);

    return section;
  }

  private createPlaneItem(plane: ClippingPlane): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-clipping__plane-item';
    if (!plane.enabled) item.classList.add('arxis-clipping__plane-item--disabled');

    // Header
    const header = document.createElement('div');
    header.className = 'arxis-clipping__plane-header';

    const name = document.createElement('span');
    name.className = 'arxis-clipping__plane-name';
    name.textContent = plane.name;

    const toggle = new Toggle({
      checked: plane.enabled,
      onChange: (checked) => {
        plane.enabled = checked;
        this.render();
        this.notifyChange();
      }
    });

    header.appendChild(name);
    header.appendChild(toggle.getElement());
    item.appendChild(header);

    if (plane.enabled) {
      // Normal vector (read-only display)
      const normalInfo = document.createElement('div');
      normalInfo.className = 'arxis-clipping__info';
      normalInfo.innerHTML = `
        <span class="arxis-clipping__label">Normal:</span>
        <span class="arxis-clipping__vector">
          (${plane.normal.x.toFixed(1)}, ${plane.normal.y.toFixed(1)}, ${plane.normal.z.toFixed(1)})
        </span>
      `;
      item.appendChild(normalInfo);

      // Constant slider (position)
      const constantControl = document.createElement('div');
      constantControl.className = 'arxis-clipping__control';

      const constantLabel = document.createElement('label');
      constantLabel.textContent = 'Posição:';

      const constantSlider = document.createElement('input');
      constantSlider.type = 'range';
      constantSlider.className = 'arxis-clipping__slider';
      constantSlider.min = '-50';
      constantSlider.max = '50';
      constantSlider.step = '0.5';
      constantSlider.value = String(plane.constant);

      const constantValue = document.createElement('span');
      constantValue.className = 'arxis-clipping__value';
      constantValue.textContent = plane.constant.toFixed(1);

      constantSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        plane.constant = value;
        constantValue.textContent = value.toFixed(1);
        this.notifyChange();
      });

      constantControl.appendChild(constantLabel);
      constantControl.appendChild(constantSlider);
      constantControl.appendChild(constantValue);
      item.appendChild(constantControl);

      // Negate toggle
      const negateToggle = new Toggle({
        label: 'Inverter Direção',
        checked: plane.negated,
        onChange: (checked) => {
          plane.negated = checked;
          this.notifyChange();
        }
      });
      item.appendChild(negateToggle.getElement());

      // Delete button
      const deleteBtn = new Button({ 
        text: '🗑️ Remover', 
        variant: 'danger',
        size: 'sm'
      });
      deleteBtn.getElement().addEventListener('click', () => {
        this.planes = this.planes.filter(p => p.id !== plane.id);
        this.render();
        this.notifyChange();
      });
      item.appendChild(deleteBtn.getElement());
    }

    return item;
  }

  private addPlane(normal: { x: number; y: number; z: number }, name: string): void {
    const plane: ClippingPlane = {
      id: `plane-${Date.now()}`,
      name: `Plano ${name}`,
      enabled: true,
      normal,
      constant: 0,
      negated: false
    };

    this.planes.push(plane);
    this.render();
    this.notifyChange();
  }

  private notifyChange(): void {
    this.onPlanesChange?.(this.planes, this.globalEnabled);
  }

  public getPlanes(): ClippingPlane[] {
    return this.planes.filter(p => p.enabled);
  }

  public isEnabled(): boolean {
    return this.globalEnabled;
  }

  public clear(): void {
    this.planes = [];
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
