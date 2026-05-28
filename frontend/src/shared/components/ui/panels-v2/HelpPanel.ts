/**
 * Help Panel
 * Sistema de ajuda searchável com documentação
 */

import { Card } from '../design-system/components/Card';
import { Input } from '../design-system/components/Input';
import { Tabs } from '../components/Tabs';

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
}

export class HelpPanel {
  private card: Card;
  private articles: HelpArticle[] = [];
  private searchInput?: Input;
  private tabs?: Tabs;
  private filteredArticles: HelpArticle[] = [];

  constructor() {
    this.card = new Card({
      title: '❓ Ajuda',
      variant: 'glass'
    });

    this.loadArticles();
    this.filteredArticles = [...this.articles];
    this.render();
  }

  private loadArticles(): void {
    this.articles = [
      {
        id: 'nav-1',
        title: 'Navegação Básica',
        category: 'Navegação',
        content: 'Use o mouse para navegar: Botão direito para orbitar, Scroll para zoom, Shift+Botão esquerdo para pan. Pressione H para voltar à visão inicial.',
        keywords: ['navegação', 'mouse', 'orbitar', 'zoom', 'pan']
      },
      {
        id: 'nav-2',
        title: 'Câmera e Vistas',
        category: 'Navegação',
        content: 'Crie vistas personalizadas com presets de câmera. Use F para enquadrar a seleção. Salve suas vistas favoritas para acesso rápido.',
        keywords: ['câmera', 'vistas', 'presets', 'enquadrar']
      },
      {
        id: 'sel-1',
        title: 'Selecionando Elementos',
        category: 'Seleção',
        content: 'Clique em elementos para selecionar. Use Ctrl+Clique para seleção múltipla. Ctrl+A seleciona tudo. Esc limpa a seleção.',
        keywords: ['seleção', 'elementos', 'múltipla', 'ctrl']
      },
      {
        id: 'sel-2',
        title: 'Filtros e Busca',
        category: 'Seleção',
        content: 'Use o painel de busca avançada (Ctrl+F) para encontrar elementos por propriedades. Crie filtros personalizados e salve para reutilizar.',
        keywords: ['filtros', 'busca', 'propriedades', 'avançada']
      },
      {
        id: 'viz-1',
        title: 'Modos de Visualização',
        category: 'Visualização',
        content: 'Alterne entre modos: W para wireframe, S para shaded. Ajuste transparência com T. Use o Section Box (B) para cortes.',
        keywords: ['visualização', 'wireframe', 'shaded', 'transparência']
      },
      {
        id: 'viz-2',
        title: 'Section Box e Cortes',
        category: 'Visualização',
        content: 'Ative o Section Box para criar cortes dinâmicos. Ajuste os planos com os controles. Salve posições para documentação.',
        keywords: ['section', 'box', 'cortes', 'planos']
      },
      {
        id: 'meas-1',
        title: 'Ferramentas de Medição',
        category: 'Ferramentas',
        content: 'Pressione M para ativar a medição. Clique em dois pontos para medir distâncias. Medições ficam salvas no painel de anotações.',
        keywords: ['medição', 'distância', 'ferramentas']
      },
      {
        id: 'anno-1',
        title: 'Anotações e Comentários',
        category: 'Colaboração',
        content: 'Crie anotações 3D pressionando N. Adicione comentários, tire screenshots, e compartilhe com a equipe. Exporte para BCF.',
        keywords: ['anotações', 'comentários', '3d', 'bcf']
      },
      {
        id: 'issue-1',
        title: 'Gerenciamento de Issues',
        category: 'Colaboração',
        content: 'Crie issues (I) para rastrear problemas. Defina prioridades, atribua responsáveis. Importe/exporte BCF para compatibilidade.',
        keywords: ['issues', 'problemas', 'bcf', 'rastreamento']
      },
      {
        id: 'export-1',
        title: 'Exportação de Dados',
        category: 'Exportação',
        content: 'Exporte relatórios, planilhas, imagens e modelos. Suporte para PDF, Excel, PNG, IFC e outros formatos.',
        keywords: ['exportar', 'relatórios', 'planilhas', 'pdf']
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Search
    const searchContainer = document.createElement('div');
    searchContainer.className = 'arxis-help__search';

    this.searchInput = new Input({
      placeholder: '🔍 Buscar na ajuda...',
      onChange: (value) => this.filterArticles(value)
    });

    searchContainer.appendChild(this.searchInput.getElement());
    body.appendChild(searchContainer);

    // Categories tabs
    const categories = ['Todos', ...Array.from(new Set(this.articles.map(a => a.category)))];
    
    this.tabs = new Tabs({
      tabs: categories.map(cat => ({ id: cat, label: cat })),
      onTabChange: (tabId) => this.filterByCategory(tabId)
    });

    body.appendChild(this.tabs.getElement());

    // Articles list
    const articlesList = document.createElement('div');
    articlesList.className = 'arxis-help__articles';

    if (this.filteredArticles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-help__empty';
      empty.textContent = '😔 Nenhum artigo encontrado';
      articlesList.appendChild(empty);
    } else {
      this.filteredArticles.forEach(article => {
        const item = this.createArticleItem(article);
        articlesList.appendChild(item);
      });
    }

    body.appendChild(articlesList);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'arxis-help__footer';
    footer.innerHTML = `
      <div>💬 Precisa de mais ajuda?</div>
      <div>
        <a href="#" class="arxis-help__link">Documentação Completa</a> |
        <a href="#" class="arxis-help__link">Suporte Técnico</a>
      </div>
    `;
    body.appendChild(footer);

    this.injectStyles();
  }

  private createArticleItem(article: HelpArticle): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-help__article';

    const header = document.createElement('div');
    header.className = 'arxis-help__article-header';

    const title = document.createElement('h4');
    title.className = 'arxis-help__article-title';
    title.textContent = article.title;

    const category = document.createElement('span');
    category.className = 'arxis-help__article-category';
    category.textContent = article.category;

    header.appendChild(title);
    header.appendChild(category);

    const content = document.createElement('div');
    content.className = 'arxis-help__article-content';
    content.textContent = article.content;

    item.appendChild(header);
    item.appendChild(content);

    return item;
  }

  private filterArticles(query: string): void {
    const lowerQuery = query.toLowerCase();
    this.filteredArticles = this.articles.filter(a =>
      a.title.toLowerCase().includes(lowerQuery) ||
      a.content.toLowerCase().includes(lowerQuery) ||
      a.keywords.some(k => k.includes(lowerQuery))
    );
    this.render();
  }

  private filterByCategory(category: string): void {
    if (category === 'Todos') {
      this.filteredArticles = [...this.articles];
    } else {
      this.filteredArticles = this.articles.filter(a => a.category === category);
    }
    this.render();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-help-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-help-styles';
    style.textContent = `
      .arxis-help__search {
        margin-bottom: 16px;
      }

      .arxis-help__articles {
        max-height: 400px;
        overflow-y: auto;
        margin-top: 16px;
      }

      .arxis-help__article {
        padding: 16px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        margin-bottom: 12px;
        transition: all 0.2s;
      }

      .arxis-help__article:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .arxis-help__article-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .arxis-help__article-title {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-help__article-category {
        padding: 3px 10px;
        background: rgba(0, 212, 255, 0.2);
        border-radius: 12px;
        font-size: 11px;
        color: #00d4ff;
        font-weight: 500;
      }

      .arxis-help__article-content {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.6;
      }

      .arxis-help__empty {
        padding: 40px;
        text-align: center;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-help__footer {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        text-align: center;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
      }

      .arxis-help__link {
        color: #00d4ff;
        text-decoration: none;
        transition: color 0.2s;
      }

      .arxis-help__link:hover {
        color: #7b2ff7;
        text-decoration: underline;
      }
    `;
    document.head.appendChild(style);
  }
}
