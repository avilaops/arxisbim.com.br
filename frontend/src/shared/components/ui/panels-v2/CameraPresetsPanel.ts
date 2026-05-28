/**
 * Camera Presets Panel
 * Gerenciamento de vistas salvas da câmera
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';

export interface CameraPreset {
  id: string;
  name: string;
  thumbnail?: string;
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  fov: number;
  timestamp: number;
}

export class CameraPresetsPanel {
  private card: Card;
  private presets: CameraPreset[] = [];
  private onPresetLoad?: (preset: CameraPreset) => void;
  private onPresetSave?: () => CameraPreset | null;

  constructor(options?: {
    onPresetLoad?: (preset: CameraPreset) => void;
    onPresetSave?: () => CameraPreset | null;
  }) {
    this.onPresetLoad = options?.onPresetLoad;
    this.onPresetSave = options?.onPresetSave;
    
    this.card = new Card({
      title: '📷 Vistas Salvas',
      variant: 'glass'
    });

    this.loadFromStorage();
    this.initDefaultPresets();
    this.render();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('arxis-camera-presets');
      if (stored) {
        this.presets = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar presets:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem('arxis-camera-presets', JSON.stringify(this.presets));
    } catch (e) {
      console.error('Erro ao salvar presets:', e);
    }
  }

  private initDefaultPresets(): void {
    if (this.presets.length === 0) {
      this.presets = [
        {
          id: 'top',
          name: 'Vista Superior',
          position: { x: 0, y: 100, z: 0 },
          target: { x: 0, y: 0, z: 0 },
          fov: 50,
          timestamp: Date.now()
        },
        {
          id: 'front',
          name: 'Vista Frontal',
          position: { x: 0, y: 10, z: 50 },
          target: { x: 0, y: 10, z: 0 },
          fov: 50,
          timestamp: Date.now()
        },
        {
          id: 'side',
          name: 'Vista Lateral',
          position: { x: 50, y: 10, z: 0 },
          target: { x: 0, y: 10, z: 0 },
          fov: 50,
          timestamp: Date.now()
        },
        {
          id: 'iso',
          name: 'Vista Isométrica',
          position: { x: 30, y: 30, z: 30 },
          target: { x: 0, y: 0, z: 0 },
          fov: 50,
          timestamp: Date.now()
        }
      ];
    }
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Save current view button
    const saveSection = document.createElement('div');
    saveSection.className = 'arxis-camera-presets__save-section';

    const saveBtn = new Button({ text: '💾 Salvar Vista Atual', variant: 'primary' });
    saveBtn.getElement().addEventListener('click', () => this.saveCurrentView());
    saveSection.appendChild(saveBtn.getElement());

    body.appendChild(saveSection);

    // Presets grid
    const grid = document.createElement('div');
    grid.className = 'arxis-camera-presets__grid';

    this.presets.forEach(preset => {
      const card = this.createPresetCard(preset);
      grid.appendChild(card);
    });

    body.appendChild(grid);

    if (this.presets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-camera-presets__empty';
      empty.textContent = 'Nenhuma vista salva ainda';
      body.appendChild(empty);
    }
  }

  private createPresetCard(preset: CameraPreset): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'arxis-camera-presets__card';

    // Thumbnail
    const thumbnail = document.createElement('div');
    thumbnail.className = 'arxis-camera-presets__thumbnail';
    if (preset.thumbnail) {
      thumbnail.style.backgroundImage = `url(${preset.thumbnail})`;
    } else {
      thumbnail.innerHTML = '📷';
    }
    card.appendChild(thumbnail);

    // Info
    const info = document.createElement('div');
    info.className = 'arxis-camera-presets__info';

    const name = document.createElement('div');
    name.className = 'arxis-camera-presets__name';
    name.textContent = preset.name;

    const date = document.createElement('div');
    date.className = 'arxis-camera-presets__date';
    date.textContent = new Date(preset.timestamp).toLocaleDateString('pt-BR');

    info.appendChild(name);
    info.appendChild(date);
    card.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-camera-presets__actions';

    const loadBtn = new Button({ text: '👁️', variant: 'secondary', size: 'sm' });
    loadBtn.getElement().addEventListener('click', () => this.loadPreset(preset));

    const renameBtn = new Button({ text: '✏️', variant: 'secondary', size: 'sm' });
    renameBtn.getElement().addEventListener('click', () => this.renamePreset(preset));

    const deleteBtn = new Button({ text: '🗑️', variant: 'danger', size: 'sm' });
    deleteBtn.getElement().addEventListener('click', () => this.deletePreset(preset.id));

    actions.appendChild(loadBtn.getElement());
    actions.appendChild(renameBtn.getElement());
    actions.appendChild(deleteBtn.getElement());
    card.appendChild(actions);

    // Click to load
    card.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('button')) {
        this.loadPreset(preset);
      }
    });

    return card;
  }

  private saveCurrentView(): void {
    const name = prompt('Nome da vista:');
    if (!name) return;

    const cameraData = this.onPresetSave?.();
    if (!cameraData) {
      // Fallback data
      const preset: CameraPreset = {
        id: `preset-${Date.now()}`,
        name,
        position: { x: 0, y: 20, z: 30 },
        target: { x: 0, y: 0, z: 0 },
        fov: 50,
        timestamp: Date.now()
      };
      this.presets.push(preset);
    } else {
      this.presets.push({
        ...cameraData,
        id: `preset-${Date.now()}`,
        name,
        timestamp: Date.now()
      });
    }

    this.saveToStorage();
    this.render();
  }

  private loadPreset(preset: CameraPreset): void {
    this.onPresetLoad?.(preset);
    console.log('Vista carregada:', preset.name);
  }

  private renamePreset(preset: CameraPreset): void {
    const newName = prompt('Novo nome:', preset.name);
    if (newName && newName !== preset.name) {
      preset.name = newName;
      this.saveToStorage();
      this.render();
    }
  }

  private deletePreset(id: string): void {
    if (!confirm('Excluir esta vista?')) return;

    this.presets = this.presets.filter(p => p.id !== id);
    this.saveToStorage();
    this.render();
  }

  public addPreset(preset: CameraPreset): void {
    this.presets.push(preset);
    this.saveToStorage();
    this.render();
  }

  public getPresets(): CameraPreset[] {
    return this.presets;
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }
}
