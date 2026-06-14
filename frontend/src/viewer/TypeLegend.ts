import { typeColorizer } from './TypeColorizer';
import type { TypeInfo } from '../api/v1/services/projects.service';

export class TypeLegend {
  private container: HTMLElement;
  private legendEl: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private init(): void {
    // Insere estilos CSS no head
    this.injectStyles();

    // Cria o elemento da legenda
    this.legendEl = document.createElement('div');
    this.legendEl.className = 'type-legend-container collapsed';
    this.container.appendChild(this.legendEl);

    // Renderiza inicialmente
    this.render();

    // Inscreve-se para mudanças no type map
    this.unsubscribe = typeColorizer.registerOnTypeMapChanged(() => {
      this.render();
    });
  }

  private injectStyles(): void {
    if (document.getElementById('type-legend-styles')) return;

    const style = document.createElement('style');
    style.id = 'type-legend-styles';
    style.textContent = `
      .type-legend-container {
        position: absolute;
        bottom: 24px;
        left: 24px;
        z-index: 10;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        width: 280px;
        max-height: 400px;
        overflow-y: auto;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .type-legend-container.collapsed {
        width: 48px;
        height: 48px;
        padding: 0;
        overflow: hidden;
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .type-legend-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
        font-size: 13px;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        color: #94a3b8;
        cursor: pointer;
        user-select: none;
      }

      .type-legend-container.collapsed .type-legend-toggle {
        width: 100%;
        height: 100%;
        justify-content: center;
      }

      .type-legend-toggle-icon {
        transition: transform 0.3s ease;
      }

      .type-legend-container.collapsed .type-legend-toggle-icon {
        transform: rotate(0deg);
      }

      .type-legend-content {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 4px;
        animation: fadeIn 0.2s ease;
      }

      .type-legend-container.collapsed .type-legend-content {
        display: none;
      }

      .type-legend-category {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .type-legend-category-title {
        font-size: 11px;
        font-weight: 700;
        color: #3b82f6;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        padding-bottom: 4px;
      }

      .type-legend-items {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .type-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #e2e8f0;
      }

      .type-legend-color-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        box-shadow: inset 0 1px 2px rgba(0,0,0,0.2), 0 0 4px var(--dot-shadow);
      }

      .type-legend-item-label {
        font-weight: 500;
      }

      .type-legend-item-type {
        font-size: 10px;
        color: #64748b;
        font-family: monospace;
        margin-left: auto;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  private render(): void {
    if (!this.legendEl) return;

    // Se estiver colapsado, mostra apenas um ícone ou botão de abrir
    if (this.legendEl.classList.contains('collapsed')) {
      this.legendEl.innerHTML = `
        <div class="type-legend-toggle" title="Mostrar Legenda de Cores">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </div>
      `;

      const toggleBtn = this.legendEl.querySelector('.type-legend-toggle');
      toggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.legendEl?.classList.remove('collapsed');
        this.render();
      });
      return;
    }

    const typeMap = typeColorizer.getTypeMap();

    // Agrupa itens por categoria
    const categories: Record<string, { label: string; items: { type: string; info: TypeInfo }[] }> = {
      structural: { label: 'Estrutural', items: [] },
      architectural: { label: 'Arquitetônico', items: [] },
      mep: { label: 'MEP (Instalações)', items: [] },
      furniture: { label: 'Mobiliário', items: [] },
      site: { label: 'Terreno', items: [] },
      other: { label: 'Outros', items: [] },
    };

    // Preenche categorias com itens ordenados por label
    for (const [type, info] of Object.entries(typeMap)) {
      const cat = info.category || 'other';
      if (categories[cat]) {
        categories[cat].items.push({ type, info });
      }
    }

    // Ordenar itens dentro de cada categoria por label
    for (const cat of Object.keys(categories)) {
      categories[cat].items.sort((a, b) => a.info.label.localeCompare(b.info.label));
    }

    let html = `
      <div class="type-legend-toggle">
        <span>Legenda de Cores</span>
        <div class="type-legend-toggle-icon" style="cursor: pointer; padding: 2px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </div>
      </div>
      <div class="type-legend-content">
    `;

    // Renderiza cada categoria que tem itens
    for (const [catKey, catData] of Object.entries(categories)) {
      if (catData.items.length === 0) continue;

      let categoryColor = '#3b82f6'; // default
      if (catKey === 'structural') categoryColor = '#f59e0b';
      if (catKey === 'architectural') categoryColor = '#10b981';
      if (catKey === 'mep') categoryColor = '#3b82f6';
      if (catKey === 'furniture') categoryColor = '#8b5cf6';
      if (catKey === 'site') categoryColor = '#22c55e';
      if (catKey === 'other') categoryColor = '#64748b';

      html += `
        <div class="type-legend-category">
          <div class="type-legend-category-title" style="color: ${categoryColor}">${catData.label}</div>
          <div class="type-legend-items">
      `;

      // Renderiza itens únicos (evitando duplicatas como IfcWall e IfcWallStandardCase se tiverem a mesma label/cor)
      const seenLabels = new Set<string>();
      for (const item of catData.items) {
        const keyLabel = `${item.info.label}-${item.info.color}`;
        if (seenLabels.has(keyLabel)) continue;
        seenLabels.add(keyLabel);

        html += `
          <div class="type-legend-item">
            <div class="type-legend-color-dot" style="background-color: ${item.info.color}; --dot-shadow: ${item.info.color}80;"></div>
            <div class="type-legend-item-label">${item.info.label}</div>
            <div class="type-legend-item-type">${item.type.replace('Ifc', '')}</div>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    }

    // Adicionar categoria 'Outro' padrão se houver tipos não mapeados na cena
    html += `
        <div class="type-legend-category">
          <div class="type-legend-category-title" style="color: #64748b">Outro</div>
          <div class="type-legend-items">
            <div class="type-legend-item">
              <div class="type-legend-color-dot" style="background-color: #9CA3AF; --dot-shadow: #9CA3AF80;"></div>
              <div class="type-legend-item-label">Não Mapeado</div>
              <div class="type-legend-item-type">Outros</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.legendEl.innerHTML = html;

    // Registrar evento de colapsar
    const toggleIcon = this.legendEl.querySelector('.type-legend-toggle-icon');
    toggleIcon?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.legendEl?.classList.add('collapsed');
      this.render();
    });
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.legendEl?.remove();
    this.legendEl = null;
  }
}
