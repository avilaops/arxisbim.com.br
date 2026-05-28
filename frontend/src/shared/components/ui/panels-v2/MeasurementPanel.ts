/**
 * Measurement Tools Panel - Ferramentas de medição
 * Medição de distâncias, áreas, volumes e ângulos
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';
import { Select } from '../design-system/components/Select';
import { eventBus, EventType, ToolType } from '../../../../core';

export type MeasurementType = 'distance' | 'area' | 'volume' | 'angle';

export interface Measurement {
  id: string;
  type: MeasurementType;
  value: number;
  unit: string;
  label?: string;
  points: number[][];  // Array de pontos [x, y, z]
  timestamp: number;
}

export class MeasurementPanel {
  private container: HTMLElement;
  private measurements: Measurement[] = [];
  private activeTool: MeasurementType | null = null;

  constructor() {
    this.container = this.createContainer();
    this.applyStyles();
    this.setupEventListeners();
    this.render();
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'measurement-panel';
    
    // Header
    const header = document.createElement('div');
    header.className = 'measurement-panel-header';
    
    const title = document.createElement('h3');
    title.textContent = '📏 Medições';
    header.appendChild(title);

    // Clear all button
    const clearBtn = new Button({
      icon: '🗑️',
      variant: 'danger',
      size: 'sm',
      tooltip: 'Limpar todas',
      onClick: () => this.clearAll()
    });
    header.appendChild(clearBtn.getElement());

    container.appendChild(header);

    // Tools section
    const tools = this.createToolsSection();
    container.appendChild(tools);

    // Measurements list
    const list = document.createElement('div');
    list.className = 'measurement-list';
    container.appendChild(list);

    return container;
  }

  /**
   * Cria seção de ferramentas
   */
  private createToolsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'measurement-tools';

    // Tool buttons
    const tools: { type: MeasurementType; icon: string; label: string }[] = [
      { type: 'distance', icon: '📏', label: 'Distância' },
      { type: 'area', icon: '📐', label: 'Área' },
      { type: 'volume', icon: '📦', label: 'Volume' },
      { type: 'angle', icon: '📐', label: 'Ângulo' }
    ];

    tools.forEach(tool => {
      const btn = new Button({
        text: tool.label,
        icon: tool.icon,
        variant: this.activeTool === tool.type ? 'primary' : 'secondary',
        size: 'md',
        fullWidth: true,
        onClick: () => this.activateTool(tool.type)
      });
      section.appendChild(btn.getElement());
    });

    // Unit selector
    const unitSelect = new Select({
      label: 'Unidade',
      options: [
        { value: 'mm', label: 'Milímetros (mm)' },
        { value: 'cm', label: 'Centímetros (cm)' },
        { value: 'm', label: 'Metros (m)' },
        { value: 'km', label: 'Quilômetros (km)' },
        { value: 'in', label: 'Polegadas (in)' },
        { value: 'ft', label: 'Pés (ft)' }
      ],
      value: 'm',
      fullWidth: true,
      onChange: (value) => console.log('Unit changed:', value)
    });
    section.appendChild(unitSelect.getElement());

    // Precision toggle
    const precisionToggle = new Toggle({
      label: 'Alta precisão',
      checked: true,
      onChange: (checked) => console.log('Precision:', checked)
    });
    section.appendChild(precisionToggle.getElement());

    return section;
  }

  /**
   * Ativa ferramenta de medição
   */
  private activateTool(type: MeasurementType): void {
    this.activeTool = type;
    
    // Atualiza botões
    const buttons = this.container.querySelectorAll('.measurement-tools button');
    buttons.forEach((btn, index) => {
      if (index === ['distance', 'area', 'volume', 'angle'].indexOf(type)) {
        btn.classList.add('arxis-button--primary');
        btn.classList.remove('arxis-button--secondary');
      } else {
        btn.classList.remove('arxis-button--primary');
        btn.classList.add('arxis-button--secondary');
      }
    });

    // Emite evento para ativar ferramenta
    eventBus.emit(EventType.TOOL_ACTIVATED, {
      tool: ToolType.MEASUREMENT,
      measurementType: type
    });

    console.log(`Measurement tool activated: ${type}`);
  }

  /**
   * Adiciona medição
   */
  public addMeasurement(measurement: Omit<Measurement, 'id' | 'timestamp'>): void {
    const newMeasurement: Measurement = {
      ...measurement,
      id: `measurement-${Date.now()}`,
      timestamp: Date.now()
    };

    this.measurements.push(newMeasurement);
    this.render();

    eventBus.emit(EventType.MEASUREMENT_ADDED, { measurement: newMeasurement });
  }

  /**
   * Remove medição
   */
  private removeMeasurement(id: string): void {
    this.measurements = this.measurements.filter(m => m.id !== id);
    this.render();

    eventBus.emit(EventType.MEASUREMENT_REMOVED, { measurementId: id });
  }

  /**
   * Limpa todas as medições
   */
  private clearAll(): void {
    if (confirm('Deseja realmente limpar todas as medições?')) {
      this.measurements = [];
      this.render();

      eventBus.emit(EventType.MEASUREMENTS_CLEARED, {});
    }
  }

  /**
   * Renderiza a lista de medições
   */
  private render(): void {
    const list = this.container.querySelector('.measurement-list');
    if (!list) return;

    list.innerHTML = '';

    if (this.measurements.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'measurement-empty';
      empty.innerHTML = `
        <p>Nenhuma medição</p>
        <small>Selecione uma ferramenta acima para começar</small>
      `;
      list.appendChild(empty);
      return;
    }

    this.measurements.forEach(measurement => {
      const item = this.createMeasurementItem(measurement);
      list.appendChild(item);
    });
  }

  /**
   * Cria item de medição
   */
  private createMeasurementItem(measurement: Measurement): HTMLElement {
    const item = document.createElement('div');
    item.className = 'measurement-item';

    // Icon
    const icon = document.createElement('span');
    icon.className = 'measurement-icon';
    icon.textContent = this.getIconForType(measurement.type);
    item.appendChild(icon);

    // Info
    const info = document.createElement('div');
    info.className = 'measurement-info';

    const label = document.createElement('div');
    label.className = 'measurement-label';
    label.textContent = measurement.label || this.getLabelForType(measurement.type);
    info.appendChild(label);

    const value = document.createElement('div');
    value.className = 'measurement-value';
    value.textContent = `${measurement.value.toFixed(2)} ${measurement.unit}`;
    info.appendChild(value);

    item.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'measurement-actions';

    const deleteBtn = new Button({
      icon: '🗑️',
      variant: 'ghost',
      size: 'xs',
      onClick: () => this.removeMeasurement(measurement.id)
    });
    actions.appendChild(deleteBtn.getElement());

    item.appendChild(actions);

    return item;
  }

  /**
   * Retorna ícone para tipo
   */
  private getIconForType(type: MeasurementType): string {
    const icons = {
      distance: '📏',
      area: '📐',
      volume: '📦',
      angle: '📐'
    };
    return icons[type];
  }

  /**
   * Retorna label para tipo
   */
  private getLabelForType(type: MeasurementType): string {
    const labels = {
      distance: 'Distância',
      area: 'Área',
      volume: 'Volume',
      angle: 'Ângulo'
    };
    return labels[type];
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Mock: adiciona medições de exemplo após 2s
    setTimeout(() => {
      this.addMeasurement({
        type: 'distance',
        value: 12.45,
        unit: 'm',
        label: 'Distância 1',
        points: [[0, 0, 0], [12.45, 0, 0]]
      });

      this.addMeasurement({
        type: 'area',
        value: 156.32,
        unit: 'm²',
        label: 'Área da Sala',
        points: [[0, 0, 0], [12, 0, 0], [12, 13, 0], [0, 13, 0]]
      });

      this.addMeasurement({
        type: 'volume',
        value: 468.96,
        unit: 'm³',
        label: 'Volume do Cômodo',
        points: []
      });
    }, 2000);
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('measurement-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'measurement-panel-styles';
    style.textContent = `
      .measurement-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .measurement-panel-header {
        padding: 16px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .measurement-panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .measurement-tools {
        padding: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .measurement-list {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .measurement-empty {
        text-align: center;
        padding: 40px 20px;
        color: rgba(255, 255, 255, 0.5);
      }

      .measurement-empty p {
        margin: 0 0 8px 0;
        font-size: 14px;
      }

      .measurement-empty small {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.3);
      }

      .measurement-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: all 0.2s ease;
      }

      .measurement-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .measurement-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .measurement-info {
        flex: 1;
        min-width: 0;
      }

      .measurement-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
        margin-bottom: 4px;
      }

      .measurement-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-accent, #00ff88);
        font-family: 'Courier New', monospace;
      }

      .measurement-actions {
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .measurement-item:hover .measurement-actions {
        opacity: 1;
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
   * Destrói o painel
   */
  public destroy(): void {
    this.container.remove();
  }
}
