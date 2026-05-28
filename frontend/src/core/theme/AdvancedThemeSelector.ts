import { ThemeSelector } from './ThemeSelector';
import { ThemeManager } from './ThemeManager';
import { Theme } from './Theme';

/**
 * AdvancedThemeSelector - Seletor de temas com filtros e busca
 * 
 * Funcionalidades extras:
 * - Busca por nome, descrição ou tags
 * - Filtros por categoria
 * - Ordenação
 * - Preview expandido
 */
export class AdvancedThemeSelector extends ThemeSelector {
  protected searchInput!: HTMLInputElement;
  protected filterButtons: Map<string, HTMLButtonElement> = new Map();
  protected currentFilter: string = 'all';
  protected sortOrder: 'name' | 'date' | 'custom' = 'name';

  /**
   * Renderiza controles de busca e filtro
   */
  protected createSearchAndFilter(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'theme-selector-controls';
    
    // Search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search themes...';
    this.searchInput.className = 'theme-search-input';
    this.searchInput.oninput = () => this.filterThemes();
    
    const searchIcon = document.createElement('span');
    searchIcon.textContent = '🔍';
    searchIcon.className = 'search-icon';
    
    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(this.searchInput);
    
    // Filter buttons
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    
    const filters = [
      { id: 'all', label: 'All' },
      { id: 'dark', label: 'Dark' },
      { id: 'light', label: 'Light' },
      { id: 'custom', label: 'Custom' },
      { id: 'high-contrast', label: 'High Contrast' }
    ];
    
    filters.forEach(filter => {
      const button = document.createElement('button');
      button.textContent = filter.label;
      button.className = 'filter-button';
      button.dataset.filter = filter.id;
      
      if (filter.id === this.currentFilter) {
        button.classList.add('active');
      }
      
      button.onclick = () => this.setFilter(filter.id);
      
      this.filterButtons.set(filter.id, button);
      filterContainer.appendChild(button);
    });
    
    // Sort dropdown
    const sortContainer = document.createElement('div');
    sortContainer.className = 'sort-container';
    
    const sortLabel = document.createElement('label');
    sortLabel.textContent = 'Sort by: ';
    sortLabel.className = 'sort-label';
    
    const sortSelect = document.createElement('select');
    sortSelect.className = 'sort-select';
    
    const sortOptions = [
      { value: 'name', label: 'Name' },
      { value: 'date', label: 'Date' },
      { value: 'custom', label: 'Custom' }
    ];
    
    sortOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      sortSelect.appendChild(option);
    });
    
    sortSelect.onchange = () => {
      this.sortOrder = sortSelect.value as 'name' | 'date' | 'custom';
      this.filterThemes();
    };
    
    sortContainer.appendChild(sortLabel);
    sortContainer.appendChild(sortSelect);
    
    controls.appendChild(searchContainer);
    controls.appendChild(filterContainer);
    controls.appendChild(sortContainer);
    
    return controls;
  }

  /**
   * Filtra temas baseado em busca e filtros
   */
  protected filterThemes(): void {
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    const themes = this.getManager().getAvailableThemes();
    
    let filtered = themes.filter(theme => {
      // Aplica busca
      if (searchTerm) {
        const matchesSearch = 
          theme.name.toLowerCase().includes(searchTerm) ||
          theme.description?.toLowerCase().includes(searchTerm) ||
          theme.metadata?.tags?.some(tag => tag.toLowerCase().includes(searchTerm)) ||
          theme.id.toLowerCase().includes(searchTerm);
        
        if (!matchesSearch) return false;
      }
      
      // Aplica filtro
      if (this.currentFilter !== 'all') {
        const matchesFilter = this.themeMatchesFilter(theme, this.currentFilter);
        if (!matchesFilter) return false;
      }
      
      return true;
    });
    
    // Aplica ordenação
    filtered = this.sortThemes(filtered);
    
    this.renderFilteredThemes(filtered);
  }

  /**
   * Verifica se tema corresponde ao filtro
   */
  private themeMatchesFilter(theme: Theme, filter: string): boolean {
    const tags = theme.metadata?.tags || [];
    
    switch (filter) {
      case 'dark':
        return tags.includes('dark') || theme.id.includes('dark');
      
      case 'light':
        return tags.includes('light') || theme.id.includes('light');
      
      case 'custom':
        return tags.includes('custom') || theme.id.startsWith('custom-');
      
      case 'high-contrast':
        return tags.includes('high-contrast') || tags.includes('accessible');
      
      default:
        return true;
    }
  }

  /**
   * Ordena temas
   */
  private sortThemes(themes: Theme[]): Theme[] {
    return themes.sort((a, b) => {
      switch (this.sortOrder) {
        case 'name':
          return a.name.localeCompare(b.name);
        
        case 'date':
          const dateA = a.metadata?.createdAt || '';
          const dateB = b.metadata?.createdAt || '';
          return dateB.localeCompare(dateA);
        
        case 'custom':
          const isCustomA = a.id.startsWith('custom-') ? 0 : 1;
          const isCustomB = b.id.startsWith('custom-') ? 0 : 1;
          return isCustomA - isCustomB;
        
        default:
          return 0;
      }
    });
  }

  /**
   * Renderiza temas filtrados
   */
  protected renderFilteredThemes(themes: Theme[]): void {
    const container = this.getThemesContainer();
    if (!container) return;
    
    container.innerHTML = '';
    
    if (themes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `
        <p class="empty-message">No themes found</p>
        <p class="empty-hint">Try adjusting your search or filters</p>
      `;
      container.appendChild(empty);
      return;
    }
    
    themes.forEach(theme => {
      const isActive = theme.id === this.manager.getCurrentTheme()?.id;
      const button = this.createThemeButton(theme, isActive);
      container.appendChild(button);
    });
    
    console.log(`Rendered ${themes.length} themes`);
  }

  /**
   * Define filtro ativo
   */
  protected setFilter(filterId: string): void {
    this.currentFilter = filterId;
    
    // Atualiza estado visual dos botões
    this.filterButtons.forEach((button, id) => {
      if (id === filterId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    this.filterThemes();
    console.log(`Filter set to: ${filterId}`);
  }

  /**
   * Cria botão de tema com informações expandidas
   */
  protected createThemeButton(theme: Theme, isActive: boolean): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `theme-button-advanced${isActive ? ' active' : ''}`;
    button.dataset.themeId = theme.id;
    
    // Nome do tema
    const name = document.createElement('div');
    name.className = 'theme-name';
    name.textContent = theme.name;
    
    // Descrição
    if (theme.description) {
      const desc = document.createElement('div');
      desc.className = 'theme-description';
      desc.textContent = theme.description;
      button.appendChild(desc);
    }
    
    // Tags
    if (theme.metadata?.tags && theme.metadata.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'theme-tags';
      
      theme.metadata.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'theme-tag';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
      
      button.appendChild(tagsContainer);
    }
    
    // Preview de cores
    const preview = document.createElement('div');
    preview.className = 'theme-preview-expanded';
    
    const previewColors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.accent,
      theme.colors.background
    ];
    
    previewColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'preview-swatch';
      swatch.style.backgroundColor = color;
      swatch.title = color;
      preview.appendChild(swatch);
    });
    
    button.appendChild(name);
    button.appendChild(preview);
    
    button.onclick = () => {
      this.getManager().applyTheme(theme.id);
      this.updateActiveState(theme.id);
    };
    
    return button;
  }

  /**
   * Atualiza estado ativo dos botões
   */
  private updateActiveState(activeThemeId: string): void {
    const buttons = document.querySelectorAll('.theme-button-advanced');
    buttons.forEach(btn => {
      const button = btn as HTMLElement;
      if (button.dataset.themeId === activeThemeId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Retorna o manager (para compatibilidade com a classe base)
   */
  protected getManager(): ThemeManager {
    return ThemeManager.getInstance();
  }

  /**
   * Retorna container de temas
   */
  protected getThemesContainer(): HTMLElement | null {
    return document.getElementById('themes-container');
  }
}
