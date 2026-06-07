/**
 * ActivityBar - Barra lateral esquerda (tipo VS Code)
 * Navegação entre views (Explorer, Search, Layers, Properties, Tools, Settings)
 */

import {
  Building2,
  Camera,
  ClipboardList,
  Folder,
  Layers,
  Search,
  Settings,
  UserRound,
  Users,
  Wrench,
  createElement,
  type IconNode,
} from 'lucide';
import { uiStore } from '../../../../app/state/uiStore';
import type { ViewType } from '../../../../app/state/uiStore';

interface ActivityBarItem {
  id: ViewType;
  icon: IconNode;
  label: string;
  shortcut?: string;
}

const ACTIVITY_ITEMS: ActivityBarItem[] = [
  { id: 'explorer', icon: Folder, label: 'Projetos', shortcut: 'Ctrl+Shift+E' },
  { id: 'search', icon: Search, label: 'Busca BIM', shortcut: 'Ctrl+Shift+F' },
  { id: 'layers', icon: Layers, label: 'Camadas', shortcut: 'Ctrl+Shift+L' },
  { id: 'properties', icon: ClipboardList, label: 'Inspector', shortcut: 'Ctrl+Shift+P' },
  { id: 'tools', icon: Wrench, label: 'Ferramentas', shortcut: 'Ctrl+Shift+T' },
  { id: 'scenarios', icon: Camera, label: 'Cenários', shortcut: 'Ctrl+Shift+C' },
  { id: 'collaboration', icon: Users, label: 'Colaboração', shortcut: 'Ctrl+Shift+O' }
];

// Special action buttons (não são views, mas ações)
const ACTION_ITEMS: ActivityBarItem[] = [
  { id: 'federation' as ViewType, icon: Building2, label: 'Modelos federados', shortcut: 'Ctrl+Shift+M' },
  { id: 'avatar' as ViewType, icon: UserRound, label: 'Avatar técnico', shortcut: 'Alt+A' },
  { id: 'settings', icon: Settings, label: 'Configurações', shortcut: 'Ctrl+,' }
];

/**
 * ActivityBar component
 */
export class ActivityBar {
  private container: HTMLElement;
  private unsubscribe?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.subscribeToState();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'activity-bar';

    const list = document.createElement('ul');
    list.className = 'activity-bar__list';

    // Main view items
    ACTIVITY_ITEMS.forEach(item => {
      const li = this.createActivityItem(item, () => {
        uiStore.setActiveView(item.id);
      });
      list.appendChild(li);
    });

    // Separator
    const separator = document.createElement('li');
    separator.className = 'activity-bar__separator';
    list.appendChild(separator);

    // Action items (bottom)
    ACTION_ITEMS.forEach(item => {
      const li = this.createActivityItem(item, async () => {
        if (item.id === 'federation') {
          // Open federation panel
          const { FederationPanel } = await import('../panels-v2/FederationPanel');
          const federatedLoader = (window as any).federatedLoader;
          
          if (!federatedLoader) {
            console.error('FederatedLoader não encontrado no window global');
            alert('Sistema de federação não está disponível');
            return;
          }
          
          const panel = new FederationPanel();
          panel.setFederatedLoader(federatedLoader);
          panel.open();
        } else if (item.id === 'avatar') {
          // Open avatar customizer modal
          const { componentManager } = await import('../../registry');
          await componentManager.open('modal:avatar', 'AvatarCustomizer');
        } else if (item.id === 'settings') {
          uiStore.setActiveView(item.id);
        }
      });
      list.appendChild(li);
    });

    this.container.appendChild(list);

    // Update active state
    this.updateActiveState(uiStore.getState().activeView);
  }

  private createActivityItem(item: ActivityBarItem, onClick: () => void): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'activity-bar__item';
    li.dataset.view = item.id;
    li.title = `${item.label} (${item.shortcut || ''})`;

    const button = document.createElement('button');
    button.className = 'activity-bar__button';
    button.setAttribute('aria-label', item.label);

    const icon = document.createElement('span');
    icon.className = 'activity-bar__icon';
    icon.appendChild(createElement(item.icon, {
      class: 'activity-bar__svg',
      'aria-hidden': 'true',
      focusable: 'false',
    }));
    button.appendChild(icon);

    button.addEventListener('click', onClick);

    li.appendChild(button);
    return li;
  }

  private subscribeToState(): void {
    this.unsubscribe = uiStore.subscribe((state) => {
      this.updateActiveState(state.activeView);
    });
  }

  private updateActiveState(activeView: ViewType): void {
    const items = this.container.querySelectorAll('.activity-bar__item');
    items.forEach(item => {
      if (item.getAttribute('data-view') === activeView) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
