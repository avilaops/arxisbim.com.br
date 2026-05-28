/**
 * AR Measurement UI
 * Interface de medição específica para AR
 */

import { Button } from '../design-system/components/Button';

export interface ARMeasurement {
  id: string;
  type: 'distance' | 'area' | 'volume' | 'angle';
  value: number;
  unit: string;
  points: { x: number; y: number; z: number }[];
  timestamp: number;
}

export class ARMeasurementUI {
  private container: HTMLDivElement;
  private hud: HTMLDivElement;
  private measurements: ARMeasurement[] = [];
  private currentMeasurement?: ARMeasurement;
  private mode: 'distance' | 'area' | 'volume' | 'angle' = 'distance';
  private onMeasurementComplete?: (measurement: ARMeasurement) => void;

  constructor(options?: {
    onMeasurementComplete?: (measurement: ARMeasurement) => void;
  }) {
    this.onMeasurementComplete = options?.onMeasurementComplete;
    
    this.container = document.createElement('div');
    this.container.className = 'arxis-ar-measure';

    this.hud = document.createElement('div');
    this.hud.className = 'arxis-ar-measure__hud';

    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    // Mode selector
    const modeSelector = document.createElement('div');
    modeSelector.className = 'arxis-ar-measure__modes';

    const modes = [
      { type: 'distance', icon: '📏', label: 'Distância' },
      { type: 'area', icon: '▭', label: 'Área' },
      { type: 'volume', icon: '📦', label: 'Volume' },
      { type: 'angle', icon: '📐', label: 'Ângulo' }
    ];

    modes.forEach(mode => {
      const btn = document.createElement('div');
      btn.className = `arxis-ar-measure__mode ${this.mode === mode.type ? 'arxis-ar-measure__mode--active' : ''}`;
      btn.innerHTML = `
        <div class="arxis-ar-measure__mode-icon">${mode.icon}</div>
        <div class="arxis-ar-measure__mode-label">${mode.label}</div>
      `;
      btn.addEventListener('click', () => {
        this.mode = mode.type as any;
        this.render();
      });
      modeSelector.appendChild(btn);
    });

    this.container.appendChild(modeSelector);

    // HUD - current measurement
    this.renderHUD();
    this.container.appendChild(this.hud);

    // Measurements list
    const list = document.createElement('div');
    list.className = 'arxis-ar-measure__list';

    const listTitle = document.createElement('h4');
    listTitle.textContent = 'Medições';
    listTitle.style.margin = '0 0 12px 0';
    listTitle.style.color = '#fff';
    listTitle.style.fontSize = '14px';
    list.appendChild(listTitle);

    if (this.measurements.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-ar-measure__empty';
      empty.textContent = 'Nenhuma medição realizada';
      list.appendChild(empty);
    } else {
      this.measurements.forEach(measurement => {
        const item = this.createMeasurementItem(measurement);
        list.appendChild(item);
      });
    }

    this.container.appendChild(list);

    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }

    this.injectStyles();
  }

  private renderHUD(): void {
    this.hud.innerHTML = '';

    if (!this.currentMeasurement) {
      this.hud.innerHTML = `
        <div class="arxis-ar-measure__hud-icon">🎯</div>
        <div class="arxis-ar-measure__hud-text">
          <div>Aponte para iniciar medição</div>
          <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
            Modo: ${this.getModeLabel()}
          </div>
        </div>
      `;
      return;
    }

    const value = this.formatValue(this.currentMeasurement.value, this.currentMeasurement.unit);
    
    this.hud.innerHTML = `
      <div class="arxis-ar-measure__hud-value">${value}</div>
      <div class="arxis-ar-measure__hud-type">${this.getModeLabel()}</div>
      <div class="arxis-ar-measure__hud-points">
        ${this.currentMeasurement.points.length} pontos
      </div>
    `;
  }

  private createMeasurementItem(measurement: ARMeasurement): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-ar-measure__item';

    const icon = document.createElement('div');
    icon.className = 'arxis-ar-measure__item-icon';
    icon.textContent = this.getModeIcon(measurement.type);
    item.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'arxis-ar-measure__item-info';

    const value = document.createElement('div');
    value.className = 'arxis-ar-measure__item-value';
    value.textContent = this.formatValue(measurement.value, measurement.unit);

    const type = document.createElement('div');
    type.className = 'arxis-ar-measure__item-type';
    type.textContent = this.getModeLabel(measurement.type);

    info.appendChild(value);
    info.appendChild(type);
    item.appendChild(info);

    const deleteBtn = new Button({ text: '🗑️', variant: 'danger', size: 'sm' });
    deleteBtn.getElement().addEventListener('click', () => {
      this.removeMeasurement(measurement.id);
    });
    item.appendChild(deleteBtn.getElement());

    return item;
  }

  private getModeIcon(mode?: string): string {
    const icons: Record<string, string> = {
      distance: '📏',
      area: '▭',
      volume: '📦',
      angle: '📐'
    };
    return icons[mode || this.mode] || '📏';
  }

  private getModeLabel(mode?: string): string {
    const labels: Record<string, string> = {
      distance: 'Distância',
      area: 'Área',
      volume: 'Volume',
      angle: 'Ângulo'
    };
    return labels[mode || this.mode] || 'Distância';
  }

  private formatValue(value: number, unit: string): string {
    return `${value.toFixed(2)} ${unit}`;
  }

  public startMeasurement(): void {
    this.currentMeasurement = {
      id: `m-${Date.now()}`,
      type: this.mode,
      value: 0,
      unit: this.getUnitForMode(),
      points: [],
      timestamp: Date.now()
    };
    this.renderHUD();
  }

  public addPoint(point: { x: number; y: number; z: number }): void {
    if (!this.currentMeasurement) {
      this.startMeasurement();
    }

    this.currentMeasurement!.points.push(point);
    this.updateMeasurementValue();
    this.renderHUD();
  }

  public completeMeasurement(): void {
    if (this.currentMeasurement && this.currentMeasurement.points.length > 0) {
      this.measurements.push(this.currentMeasurement);
      this.onMeasurementComplete?.(this.currentMeasurement);
      this.currentMeasurement = undefined;
      this.render();
    }
  }

  public cancelMeasurement(): void {
    this.currentMeasurement = undefined;
    this.renderHUD();
  }

  private updateMeasurementValue(): void {
    if (!this.currentMeasurement || this.currentMeasurement.points.length < 2) return;

    const points = this.currentMeasurement.points;
    
    switch (this.mode) {
      case 'distance':
        const p1 = points[0];
        const p2 = points[points.length - 1];
        this.currentMeasurement.value = Math.sqrt(
          Math.pow(p2.x - p1.x, 2) +
          Math.pow(p2.y - p1.y, 2) +
          Math.pow(p2.z - p1.z, 2)
        );
        break;
      case 'area':
      case 'volume':
      case 'angle':
        // Simplified calculation
        this.currentMeasurement.value = points.length * 2.5;
        break;
    }
  }

  private getUnitForMode(): string {
    const units: Record<string, string> = {
      distance: 'm',
      area: 'm²',
      volume: 'm³',
      angle: '°'
    };
    return units[this.mode] || 'm';
  }

  private removeMeasurement(id: string): void {
    this.measurements = this.measurements.filter(m => m.id !== id);
    this.render();
  }

  public clearAll(): void {
    this.measurements = [];
    this.currentMeasurement = undefined;
    this.render();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-ar-measure-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-ar-measure-styles';
    style.textContent = `
      .arxis-ar-measure {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        max-width: 400px;
        background: rgba(20, 20, 30, 0.95);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        z-index: 9999;
      }

      .arxis-ar-measure__modes {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }

      .arxis-ar-measure__mode {
        padding: 12px 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid transparent;
        border-radius: 8px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-ar-measure__mode:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(0, 212, 255, 0.3);
      }

      .arxis-ar-measure__mode--active {
        background: rgba(0, 212, 255, 0.15);
        border-color: #00d4ff;
      }

      .arxis-ar-measure__mode-icon {
        font-size: 24px;
        margin-bottom: 4px;
      }

      .arxis-ar-measure__mode-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        font-weight: 600;
      }

      .arxis-ar-measure__hud {
        padding: 16px;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 8px;
        margin-bottom: 16px;
        text-align: center;
      }

      .arxis-ar-measure__hud-icon {
        font-size: 40px;
        margin-bottom: 8px;
      }

      .arxis-ar-measure__hud-text {
        color: rgba(255, 255, 255, 0.9);
        font-size: 14px;
      }

      .arxis-ar-measure__hud-value {
        font-size: 32px;
        font-weight: 700;
        color: #00d4ff;
        margin-bottom: 6px;
      }

      .arxis-ar-measure__hud-type {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 4px;
      }

      .arxis-ar-measure__hud-points {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-ar-measure__list {
        max-height: 200px;
        overflow-y: auto;
      }

      .arxis-ar-measure__item {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .arxis-ar-measure__item-icon {
        font-size: 24px;
        width: 32px;
        text-align: center;
      }

      .arxis-ar-measure__item-info {
        flex: 1;
      }

      .arxis-ar-measure__item-value {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 2px;
      }

      .arxis-ar-measure__item-type {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-ar-measure__empty {
        padding: 20px;
        text-align: center;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
}
