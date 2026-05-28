/**
 * Tabs Component
 * Sistema de abas com conteúdo dinâmico
 */

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  content?: HTMLElement | string;
  disabled?: boolean;
  closeable?: boolean;
}

export interface TabsOptions {
  tabs: TabItem[];
  activeTab?: string;
  variant?: 'default' | 'pills' | 'underline';
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
}

export class Tabs {
  private element: HTMLDivElement;
  private tabListElement: HTMLDivElement;
  private contentElement: HTMLDivElement;
  private options: Required<Omit<TabsOptions, 'onTabChange' | 'onTabClose'>> & {
    onTabChange?: (tabId: string) => void;
    onTabClose?: (tabId: string) => void;
  };
  private activeTabId: string;

  constructor(options: TabsOptions) {
    this.options = {
      tabs: options.tabs,
      activeTab: options.activeTab || options.tabs[0]?.id || '',
      variant: options.variant || 'default',
      onTabChange: options.onTabChange,
      onTabClose: options.onTabClose
    };

    this.activeTabId = this.options.activeTab;
    this.element = this.createElement();
    this.tabListElement = this.createTabList();
    this.contentElement = this.createContent();

    this.element.appendChild(this.tabListElement);
    this.element.appendChild(this.contentElement);

    this.showTab(this.activeTabId);
    this.injectStyles();
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement('div');
    container.className = `arxis-tabs arxis-tabs--${this.options.variant}`;
    return container;
  }

  private createTabList(): HTMLDivElement {
    const tabList = document.createElement('div');
    tabList.className = 'arxis-tabs__list';
    tabList.setAttribute('role', 'tablist');

    this.options.tabs.forEach(tab => {
      const button = this.createTabButton(tab);
      tabList.appendChild(button);
    });

    return tabList;
  }

  private createTabButton(tab: TabItem): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'arxis-tabs__tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `tab-panel-${tab.id}`);
    button.setAttribute('aria-selected', tab.id === this.activeTabId ? 'true' : 'false');
    button.dataset.tabId = tab.id;

    if (tab.disabled) {
      button.disabled = true;
      button.classList.add('arxis-tabs__tab--disabled');
    }

    if (tab.id === this.activeTabId) {
      button.classList.add('arxis-tabs__tab--active');
    }

    const contentWrapper = document.createElement('span');
    contentWrapper.className = 'arxis-tabs__tab-content';

    if (tab.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-tabs__icon';
      icon.textContent = tab.icon;
      contentWrapper.appendChild(icon);
    }

    const label = document.createElement('span');
    label.className = 'arxis-tabs__label';
    label.textContent = tab.label;
    contentWrapper.appendChild(label);

    button.appendChild(contentWrapper);

    if (tab.closeable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'arxis-tabs__close';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', 'Fechar aba');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });
      button.appendChild(closeBtn);
    }

    button.addEventListener('click', () => {
      if (!tab.disabled) {
        this.showTab(tab.id);
      }
    });

    return button;
  }

  private createContent(): HTMLDivElement {
    const content = document.createElement('div');
    content.className = 'arxis-tabs__content';

    this.options.tabs.forEach(tab => {
      const panel = this.createTabPanel(tab);
      content.appendChild(panel);
    });

    return content;
  }

  private createTabPanel(tab: TabItem): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'arxis-tabs__panel';
    panel.id = `tab-panel-${tab.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.dataset.tabId = tab.id;

    if (tab.content) {
      if (typeof tab.content === 'string') {
        panel.innerHTML = tab.content;
      } else {
        panel.appendChild(tab.content);
      }
    }

    if (tab.id !== this.activeTabId) {
      panel.style.display = 'none';
    }

    return panel;
  }

  public showTab(tabId: string): void {
    const tab = this.options.tabs.find(t => t.id === tabId);
    if (!tab || tab.disabled) return;

    this.activeTabId = tabId;

    // Update buttons
    const buttons = this.tabListElement.querySelectorAll('.arxis-tabs__tab');
    buttons.forEach(btn => {
      const button = btn as HTMLButtonElement;
      const isActive = button.dataset.tabId === tabId;
      button.classList.toggle('arxis-tabs__tab--active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update panels
    const panels = this.contentElement.querySelectorAll('.arxis-tabs__panel');
    panels.forEach(panel => {
      const panelEl = panel as HTMLDivElement;
      panelEl.style.display = panelEl.dataset.tabId === tabId ? 'block' : 'none';
    });

    this.options.onTabChange?.(tabId);
  }

  public addTab(tab: TabItem): void {
    this.options.tabs.push(tab);
    
    const button = this.createTabButton(tab);
    this.tabListElement.appendChild(button);

    const panel = this.createTabPanel(tab);
    this.contentElement.appendChild(panel);
  }

  public removeTab(tabId: string): void {
    const index = this.options.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    this.options.tabs.splice(index, 1);

    const button = this.tabListElement.querySelector(`[data-tab-id="${tabId}"]`);
    const panel = this.contentElement.querySelector(`[data-tab-id="${tabId}"]`);

    button?.remove();
    panel?.remove();

    if (this.activeTabId === tabId && this.options.tabs.length > 0) {
      this.showTab(this.options.tabs[0].id);
    }
  }

  public closeTab(tabId: string): void {
    this.options.onTabClose?.(tabId);
    this.removeTab(tabId);
  }

  public updateTab(tabId: string, updates: Partial<TabItem>): void {
    const tab = this.options.tabs.find(t => t.id === tabId);
    if (!tab) return;

    Object.assign(tab, updates);

    const button = this.tabListElement.querySelector(`[data-tab-id="${tabId}"]`) as HTMLButtonElement;
    if (button && updates.label) {
      const label = button.querySelector('.arxis-tabs__label');
      if (label) label.textContent = updates.label;
    }

    const panel = this.contentElement.querySelector(`[data-tab-id="${tabId}"]`) as HTMLDivElement;
    if (panel && updates.content) {
      panel.innerHTML = '';
      if (typeof updates.content === 'string') {
        panel.innerHTML = updates.content;
      } else {
        panel.appendChild(updates.content);
      }
    }
  }

  public getElement(): HTMLDivElement {
    return this.element;
  }

  public getActiveTab(): string {
    return this.activeTabId;
  }

  public destroy(): void {
    this.element.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-tabs-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-tabs-styles';
    style.textContent = `
      .arxis-tabs {
        display: flex;
        flex-direction: column;
        width: 100%;
      }

      .arxis-tabs__list {
        display: flex;
        gap: 4px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 16px;
      }

      .arxis-tabs__tab {
        position: relative;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 6px 6px 0 0;
      }

      .arxis-tabs__tab:hover:not(.arxis-tabs__tab--disabled) {
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.9);
      }

      .arxis-tabs__tab--active {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      .arxis-tabs--underline .arxis-tabs__tab--active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: #2563eb;
      }

      .arxis-tabs--pills .arxis-tabs__list {
        border-bottom: none;
        gap: 8px;
      }

      .arxis-tabs--pills .arxis-tabs__tab {
        border-radius: 20px;
      }

      .arxis-tabs--pills .arxis-tabs__tab--active {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1d4ed8;
      }

      .arxis-tabs__tab--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .arxis-tabs__tab-content {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .arxis-tabs__icon {
        font-size: 16px;
      }

      .arxis-tabs__close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        margin-left: 4px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 50%;
        color: rgba(255, 255, 255, 0.5);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-tabs__close:hover {
        background: rgba(255, 0, 0, 0.2);
        color: #ff4444;
      }

      .arxis-tabs__content {
        flex: 1;
      }

      .arxis-tabs__panel {
        animation: fadeIn 0.2s;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function
export function createTabs(options: TabsOptions): Tabs {
  return new Tabs(options);
}
