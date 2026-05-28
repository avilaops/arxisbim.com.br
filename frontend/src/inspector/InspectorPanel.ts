/**
 * InspectorPanel - UI para exibir propriedades de objetos selecionados
 */

import { SelectionPayload } from './SelectionService';
import { propertyResolver, PropertySection } from './PropertyResolver';

export class InspectorPanel {
  private container: HTMLElement | null = null;
  private collapsed: boolean = false;
  private mounted: boolean = false;

  constructor() {
    // Não cria painel no constructor - será criado apenas quando necessário
  }

  /**
   * Cria a estrutura do painel
   */
  private createPanel(): void {
    const panel = document.createElement('div');
    panel.className = 'inspector-panel';
    panel.innerHTML = `
      <div class="inspector-panel__header">
        <h3 class="inspector-panel__title">
          <i class="iconoir-settings"></i>
          Properties
        </h3>
        <button class="inspector-panel__toggle" id="inspector-toggle">
          <i class="iconoir-nav-arrow-right"></i>
        </button>
      </div>
      <div class="inspector-panel__content" id="inspector-content">
        <div class="inspector-panel__empty">
          <i class="iconoir-mouse-button-left"></i>
          <p>Click on an object to view properties</p>
        </div>
      </div>
    `;

    this.container = panel;
    this.setupPanelEvents();
  }

  /**
   * Configura eventos do painel
   */
  private setupPanelEvents(): void {
    const toggleBtn = this.container?.querySelector('#inspector-toggle');
    toggleBtn?.addEventListener('click', () => {
      this.toggleCollapse();
    });
  }

  /**
   * Colapsa/expande o painel
   */
  private toggleCollapse(): void {
    if (!this.container) return;

    this.collapsed = !this.collapsed;
    this.container.classList.toggle('inspector-panel--collapsed', this.collapsed);

    const icon = this.container.querySelector('#inspector-toggle i');
    if (icon) {
      icon.className = this.collapsed ? 'iconoir-nav-arrow-left' : 'iconoir-nav-arrow-right';
    }
  }

  /**
   * Define dados da seleção e renderiza propriedades
   */
  public async setData(payload: SelectionPayload): Promise<void> {
    if (!this.mounted) {
      console.warn('⚠️ InspectorPanel não está montado');
      return;
    }
    await this.showProperties(payload);
  }

  /**
   * Mostra propriedades do objeto selecionado
   */
  private async showProperties(payload: SelectionPayload): Promise<void> {
    const content = this.container?.querySelector('#inspector-content');
    if (!content) return;

    // Mostrar loading
    content.innerHTML = `
      <div class="inspector-panel__loading">
        <div class="spinner"></div>
        <p>Loading properties...</p>
      </div>
    `;

    try {
      // Resolver propriedades
      const sections = await propertyResolver.resolveProperties(payload);

      // Renderizar seções
      content.innerHTML = `
        <div class="inspector-panel__object-header">
          <h4>${this.getObjectTitle(payload)}</h4>
          <span class="inspector-panel__object-type">${payload.type.toUpperCase()}</span>
        </div>
        <div class="inspector-panel__sections">
          ${sections.map((section, idx) => this.renderSection(section, idx)).join('')}
        </div>
      `;

      // Adicionar eventos de collapse
      this.setupSectionToggles();

    } catch (error) {
      console.error('Erro ao carregar propriedades:', error);
      content.innerHTML = `
        <div class="inspector-panel__error">
          <i class="iconoir-warning-triangle"></i>
          <p>Failed to load properties</p>
        </div>
      `;
    }
  }

  /**
   * Renderiza uma seção de propriedades
   */
  private renderSection(section: PropertySection, index: number): string {
    return `
      <div class="inspector-section" data-section="${index}">
        <div class="inspector-section__header" data-toggle="${index}">
          <span class="inspector-section__title">${section.section}</span>
          <i class="iconoir-nav-arrow-down"></i>
        </div>
        <div class="inspector-section__content">
          <table class="inspector-table">
            ${section.properties.map(prop => `
              <tr>
                <td class="inspector-table__key">${prop.key}</td>
                <td class="inspector-table__value">${prop.value}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Configura toggles de seções
   */
  private setupSectionToggles(): void {
    const headers = this.container?.querySelectorAll('[data-toggle]');
    headers?.forEach(header => {
      header.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const section = target.closest('.inspector-section');
        section?.classList.toggle('inspector-section--collapsed');
      });
    });
  }

  /**
   * Obtém título do objeto
   */
  private getObjectTitle(payload: SelectionPayload): string {
    const obj = payload.object3D;
    if (obj.name) return obj.name;
    if (payload.expressID !== undefined) return `IFC Element #${payload.expressID}`;
    if (obj.type) return obj.type;
    return 'Object';
  }

  /**
   * Monta o painel no DOM (cria e adiciona)
   */
  public mount(parent: HTMLElement): void {
    if (this.mounted) return;

    // Criar painel se não existe
    if (!this.container) {
      this.createPanel();
    }

    // Adicionar ao DOM
    if (this.container) {
      parent.appendChild(this.container);
      this.mounted = true;
      console.log('✅ Inspector Panel montado');
    }
  }

  /**
   * Desmonta o painel (remove do DOM)
   */
  public unmount(): void {
    if (!this.mounted) return;

    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
      this.mounted = false;
      console.log('🔻 Inspector Panel desmontado');
    }
  }

  /**
   * Verifica se está montado
   */
  public isMounted(): boolean {
    return this.mounted;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.unmount();
    this.container = null;
  }
}
