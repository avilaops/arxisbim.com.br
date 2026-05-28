/**
 * SampleProjects - Manager para modelos de referência
 * Fornece acesso rápido a arquivos BIM disponíveis no ambiente
 */

export interface SampleProject {
  id: string;
  name: string;
  description: string;
  category: 'small' | 'medium' | 'large';
  size: string;
  triangles: string;
  thumbnail?: string;
  url: string;
}

export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: 'residential-house',
    name: 'Casa Residencial',
    description: 'Modelo residencial para revisão inicial de arquitetura',
    category: 'small',
    size: '5 MB',
    triangles: '~50k',
    thumbnail: '/demos/thumbnails/house.jpg',
    url: '/demos/EDUARDO SAMPA.ifc'
  },
  {
    id: 'office-building',
    name: 'Edifício Comercial',
    description: 'Prédio comercial de 4 andares com estrutura e MEP',
    category: 'medium',
    size: '45 MB',
    triangles: '~250k',
    thumbnail: '/demos/thumbnails/office.jpg',
    url: '/demos/VZZ086_25 Magnussão - Res. Heitor - Estrutural Executivo - Rev08 (1).ifc'
  },
  {
    id: 'residential-foundation',
    name: 'Fundação Residencial',
    description: 'Detalhamento completo de fundações e estrutura',
    category: 'medium',
    size: '12 MB',
    triangles: '~80k',
    thumbnail: '/demos/thumbnails/foundation.jpg',
    url: '/demos/FUNDAÇÃO.DWG'
  },
  {
    id: 'electrical-system',
    name: 'Sistema Elétrico',
    description: 'Instalações elétricas completas - MEP',
    category: 'medium',
    size: '35 MB',
    triangles: '~180k',
    thumbnail: '/demos/thumbnails/electrical.jpg',
    url: '/demos/ELE - VZZ086_25 - Magnussão - Res. Heitor - REV01-4.ifc'
  },
  {
    id: 'hydraulic-system',
    name: 'Sistema Hidráulico',
    description: 'Instalações hidráulicas - água fria, quente e esgoto',
    category: 'medium',
    size: '28 MB',
    triangles: '~150k',
    thumbnail: '/demos/thumbnails/hydraulic.jpg',
    url: '/demos/HID - VZZ086_25 - Magnussão - Res. Heitor - REV01-3.ifc'
  }
];

export class SampleProjectsManager {
  /**
   * Obtém projetos por categoria
   */
  getByCategory(category: 'small' | 'medium' | 'large'): SampleProject[] {
    return SAMPLE_PROJECTS.filter(p => p.category === category);
  }

  /**
   * Obtém todos os projetos
   */
  getAll(): SampleProject[] {
    return [...SAMPLE_PROJECTS];
  }

  /**
   * Obtém projeto por ID
   */
  getById(id: string): SampleProject | undefined {
    return SAMPLE_PROJECTS.find(p => p.id === id);
  }

  /**
   * Carrega um projeto de exemplo
   */
  async loadSample(projectId: string): Promise<void> {
    const project = this.getById(projectId);
    if (!project) {
      throw new Error(`Modelo de referência não encontrado: ${projectId}`);
    }

    console.log(`Loading reference project: ${project.name}`);

    try {
      // Fetch the file
      const response = await fetch(project.url);
      if (!response.ok) {
        throw new Error(`Falha ao carregar arquivo: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], project.url.split('/').pop() || 'sample.ifc', {
        type: 'application/octet-stream'
      });

      // Emit event for file loading
      const { eventBus, EventType } = await import('../../core');
      eventBus.emit(EventType.FILE_SELECTED, {
        file,
        kind: project.url.endsWith('.ifc') ? 'ifc' : 'dwg',
        source: 'sample'
      });

      console.log(`Reference project loaded: ${project.name}`);
    } catch (error) {
      console.error('Failed to load reference project:', error);
      throw error;
    }
  }

  /**
  * Cria UI para seleção de modelos de referência
   */
  createUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'sample-projects';

    // Header
    const header = document.createElement('div');
    header.className = 'sample-projects__header';
    header.innerHTML = `
      <h3>Modelos de referência</h3>
      <p>Carregue um modelo BIM disponível para análise técnica</p>
    `;
    container.appendChild(header);

    // Grid de projetos
    const grid = document.createElement('div');
    grid.className = 'sample-projects__grid';

    SAMPLE_PROJECTS.forEach(project => {
      const card = this.createProjectCard(project);
      grid.appendChild(card);
    });

    container.appendChild(grid);

    return container;
  }

  /**
   * Cria card de projeto
   */
  private createProjectCard(project: SampleProject): HTMLElement {
    const card = document.createElement('div');
    card.className = 'sample-project-card';
    card.dataset.category = project.category;

    card.innerHTML = `
      <div class="sample-project-card__thumbnail">
        ${project.thumbnail 
          ? `<img src="${project.thumbnail}" alt="${project.name}" />`
          : '<div class="sample-project-card__placeholder">BIM</div>'
        }
      </div>
      <div class="sample-project-card__content">
        <h4>${project.name}</h4>
        <p>${project.description}</p>
        <div class="sample-project-card__meta">
          <span class="badge">${project.size}</span>
          <span class="badge">${project.triangles}</span>
          <span class="badge badge--${project.category}">${this.getCategoryLabel(project.category)}</span>
        </div>
      </div>
      <button class="sample-project-card__btn">
        <span>Carregar</span>
      </button>
    `;

    // Event listener para botão
    const btn = card.querySelector('.sample-project-card__btn');
    btn?.addEventListener('click', async () => {
      btn.setAttribute('disabled', 'true');
      btn.innerHTML = '<span>Carregando...</span>';
      
      try {
        await this.loadSample(project.id);
      } catch (error) {
        btn.removeAttribute('disabled');
        btn.innerHTML = '<span>Erro - tentar novamente</span>';
      }
    });

    return card;
  }

  /**
   * Helper para label de categoria
   */
  private getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      small: 'Pequeno',
      medium: 'Médio',
      large: 'Grande'
    };
    return labels[category] || category;
  }
}
