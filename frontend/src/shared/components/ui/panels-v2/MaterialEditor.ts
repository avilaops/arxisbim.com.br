/**
 * Material Editor Panel
 * Editor de materiais PBR com preview
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Slider } from '../design-system/components/Slider';
import { ColorPicker } from '../design-system/components/ColorPicker';
import { Input } from '../design-system/components/Input';

export interface Material {
  id: string;
  name: string;
  type: 'standard' | 'physical' | 'basic' | 'lambert' | 'phong';
  color: string;
  metalness: number;
  roughness: number;
  opacity: number;
  emissive: string;
  emissiveIntensity: number;
  map?: string;
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
}

export class MaterialEditor {
  private card: Card;
  private currentMaterial: Material | null = null;
  private onMaterialChange?: (material: Material) => void;

  constructor(options?: { onMaterialChange?: (material: Material) => void }) {
    this.onMaterialChange = options?.onMaterialChange;
    
    this.card = new Card({
      title: '🎨 Editor de Materiais',
      variant: 'glass'
    });

    this.render();
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Material selector
    const selectorSection = this.createSection('Material Atual');
    const materialSelect = document.createElement('select');
    materialSelect.className = 'arxis-material-editor__select';
    materialSelect.innerHTML = `
      <option value="">Selecione um material...</option>
      <option value="concrete">Concreto</option>
      <option value="steel">Aço</option>
      <option value="glass">Vidro</option>
      <option value="wood">Madeira</option>
    `;
    materialSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value;
      if (value) this.loadPreset(value);
    });
    selectorSection.appendChild(materialSelect);
    body.appendChild(selectorSection);

    // Preview
    const previewSection = this.createSection('Preview');
    const preview = document.createElement('div');
    preview.className = 'arxis-material-editor__preview';
    preview.innerHTML = '<div class="arxis-material-editor__sphere"></div>';
    previewSection.appendChild(preview);
    body.appendChild(previewSection);

    if (this.currentMaterial) {
      // Type selector
      const typeSection = this.createSection('Tipo');
      const typeSelect = document.createElement('select');
      typeSelect.className = 'arxis-material-editor__select';
      typeSelect.value = this.currentMaterial.type;
      typeSelect.innerHTML = `
        <option value="standard">Standard (PBR)</option>
        <option value="physical">Physical (PBR Avançado)</option>
        <option value="basic">Basic (Sem iluminação)</option>
        <option value="lambert">Lambert (Difuso)</option>
        <option value="phong">Phong (Especular)</option>
      `;
      typeSelect.addEventListener('change', (e) => {
        if (this.currentMaterial) {
          this.currentMaterial.type = (e.target as HTMLSelectElement).value as any;
          this.notifyChange();
        }
      });
      typeSection.appendChild(typeSelect);
      body.appendChild(typeSection);

      // Color
      const colorSection = this.createSection('Cor Base');
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'arxis-material-editor__color';
      colorInput.value = this.currentMaterial.color;
      colorInput.addEventListener('change', (e) => {
        if (this.currentMaterial) {
          this.currentMaterial.color = (e.target as HTMLInputElement).value;
          this.updatePreview();
          this.notifyChange();
        }
      });
      colorSection.appendChild(colorInput);
      body.appendChild(colorSection);

      // Metalness
      if (this.currentMaterial.type === 'standard' || this.currentMaterial.type === 'physical') {
        body.appendChild(this.createSlider('Metalness', this.currentMaterial.metalness, 0, 1, 0.01, (value) => {
          if (this.currentMaterial) {
            this.currentMaterial.metalness = value;
            this.updatePreview();
            this.notifyChange();
          }
        }));

        // Roughness
        body.appendChild(this.createSlider('Roughness', this.currentMaterial.roughness, 0, 1, 0.01, (value) => {
          if (this.currentMaterial) {
            this.currentMaterial.roughness = value;
            this.updatePreview();
            this.notifyChange();
          }
        }));
      }

      // Opacity
      body.appendChild(this.createSlider('Opacidade', this.currentMaterial.opacity, 0, 1, 0.01, (value) => {
        if (this.currentMaterial) {
          this.currentMaterial.opacity = value;
          this.updatePreview();
          this.notifyChange();
        }
      }));

      // Emissive
      const emissiveSection = this.createSection('Cor Emissiva');
      const emissiveInput = document.createElement('input');
      emissiveInput.type = 'color';
      emissiveInput.className = 'arxis-material-editor__color';
      emissiveInput.value = this.currentMaterial.emissive;
      emissiveInput.addEventListener('change', (e) => {
        if (this.currentMaterial) {
          this.currentMaterial.emissive = (e.target as HTMLInputElement).value;
          this.updatePreview();
          this.notifyChange();
        }
      });
      emissiveSection.appendChild(emissiveInput);
      body.appendChild(emissiveSection);

      // Emissive Intensity
      body.appendChild(this.createSlider('Intensidade Emissiva', this.currentMaterial.emissiveIntensity, 0, 2, 0.1, (value) => {
        if (this.currentMaterial) {
          this.currentMaterial.emissiveIntensity = value;
          this.updatePreview();
          this.notifyChange();
        }
      }));

      // Actions
      const actions = document.createElement('div');
      actions.className = 'arxis-material-editor__actions';
      
      const saveBtn = new Button({ text: '💾 Salvar', variant: 'primary' });
      saveBtn.getElement().addEventListener('click', () => this.saveMaterial());
      
      const resetBtn = new Button({ text: '🔄 Resetar', variant: 'secondary' });
      resetBtn.getElement().addEventListener('click', () => this.resetMaterial());

      actions.appendChild(saveBtn.getElement());
      actions.appendChild(resetBtn.getElement());
      body.appendChild(actions);
    } else {
      const hint = document.createElement('div');
      hint.className = 'arxis-material-editor__hint';
      hint.textContent = 'Selecione um material para editar';
      body.appendChild(hint);
    }

    this.updatePreview();
  }

  private createSection(title: string): HTMLDivElement {
    const section = document.createElement('div');
    section.className = 'arxis-material-editor__section';
    
    const label = document.createElement('label');
    label.className = 'arxis-material-editor__label';
    label.textContent = title;
    section.appendChild(label);

    return section;
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
  ): HTMLDivElement {
    const section = this.createSection(label);
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'arxis-material-editor__slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'arxis-material-editor__slider';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'arxis-material-editor__value';
    valueDisplay.textContent = value.toFixed(2);

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      valueDisplay.textContent = val.toFixed(2);
      onChange(val);
    });

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(valueDisplay);
    section.appendChild(sliderContainer);

    return section;
  }

  private loadPreset(preset: string): void {
    const presets: Record<string, Partial<Material>> = {
      concrete: {
        name: 'Concreto',
        type: 'standard',
        color: '#888888',
        metalness: 0,
        roughness: 0.9,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0
      },
      steel: {
        name: 'Aço',
        type: 'standard',
        color: '#aaaaaa',
        metalness: 1,
        roughness: 0.3,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0
      },
      glass: {
        name: 'Vidro',
        type: 'physical',
        color: '#ffffff',
        metalness: 0,
        roughness: 0,
        opacity: 0.3,
        emissive: '#000000',
        emissiveIntensity: 0
      },
      wood: {
        name: 'Madeira',
        type: 'standard',
        color: '#8b5a2b',
        metalness: 0,
        roughness: 0.8,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0
      }
    };

    const material = presets[preset];
    if (material) {
      this.currentMaterial = {
        id: preset,
        name: material.name!,
        type: material.type!,
        color: material.color!,
        metalness: material.metalness!,
        roughness: material.roughness!,
        opacity: material.opacity!,
        emissive: material.emissive!,
        emissiveIntensity: material.emissiveIntensity!
      };
      this.render();
    }
  }

  private updatePreview(): void {
    if (!this.currentMaterial) return;

    const preview = document.querySelector('.arxis-material-editor__sphere') as HTMLElement;
    if (!preview) return;

    const r = parseInt(this.currentMaterial.color.slice(1, 3), 16);
    const g = parseInt(this.currentMaterial.color.slice(3, 5), 16);
    const b = parseInt(this.currentMaterial.color.slice(5, 7), 16);

    const metallic = this.currentMaterial.metalness;
    const rough = this.currentMaterial.roughness;

    preview.style.background = `
      radial-gradient(
        circle at 30% 30%,
        rgba(${r + 40}, ${g + 40}, ${b + 40}, ${this.currentMaterial.opacity}),
        rgba(${r}, ${g}, ${b}, ${this.currentMaterial.opacity})
      )
    `;

    if (metallic > 0.5) {
      preview.style.boxShadow = `
        inset -10px -10px 30px rgba(0, 0, 0, ${0.5 * rough}),
        inset 10px 10px 30px rgba(255, 255, 255, ${0.3 * (1 - rough)})
      `;
    } else {
      preview.style.boxShadow = `
        inset -5px -5px 15px rgba(0, 0, 0, ${0.3 * rough}),
        0 5px 15px rgba(0, 0, 0, 0.3)
      `;
    }
  }

  private notifyChange(): void {
    if (this.currentMaterial && this.onMaterialChange) {
      this.onMaterialChange(this.currentMaterial);
    }
  }

  private saveMaterial(): void {
    if (this.currentMaterial) {
      console.log('Material salvo:', this.currentMaterial);
      // Implementar save
    }
  }

  private resetMaterial(): void {
    if (this.currentMaterial) {
      const id = this.currentMaterial.id;
      this.loadPreset(id);
    }
  }

  public setMaterial(material: Material): void {
    this.currentMaterial = material;
    this.render();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }
}
