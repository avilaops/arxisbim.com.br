import { eventBus, EventType } from '../../../../core';

/**
 * ShortcutsModal - Modal exibindo atalhos de teclado
 */
export class ShortcutsModal {
  private modal: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.applyStyles();
    this.listenEvents();
  }

  private listenEvents(): void {
    eventBus.on(EventType.UI_MODAL_OPEN, (data: any) => {
      if (data.modal === 'shortcuts') {
        this.open();
      }
    });
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .shortcuts-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }
      
      .shortcuts-modal-container {
        background: var(--theme-background, #141414);
        border: 2px solid var(--theme-primary, #667eea);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        max-width: 700px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideIn {
        from {
          transform: translateY(-50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .shortcuts-modal-header {
        padding: 20px;
        background: linear-gradient(135deg, var(--theme-primary, #667eea), var(--theme-accent, #00ff88));
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .shortcuts-modal-title {
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .shortcuts-modal-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .shortcuts-modal-close:hover {
        background: rgba(255, 0, 0, 0.6);
        transform: scale(1.1);
      }
      
      .shortcuts-modal-body {
        padding: 24px;
        max-height: calc(80vh - 140px);
        overflow-y: auto;
      }
      
      .shortcuts-section {
        margin-bottom: 24px;
      }
      
      .shortcuts-section-title {
        font-size: 16px;
        font-weight: bold;
        color: var(--theme-primary, #667eea);
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--theme-border, #333);
      }
      
      .shortcuts-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .shortcut-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-radius: 6px;
        transition: all 0.2s;
      }
      
      .shortcut-item:hover {
        background: var(--theme-border, #333);
      }
      
      .shortcut-label {
        color: var(--theme-text, #fff);
        font-size: 14px;
      }
      
      .shortcut-keys {
        display: flex;
        gap: 6px;
      }
      
      .shortcut-key {
        background: var(--theme-background, #141414);
        border: 2px solid var(--theme-border, #333);
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        font-weight: bold;
        color: var(--theme-accent, #00ff88);
        min-width: 30px;
        text-align: center;
      }
      
      .shortcuts-modal-footer {
        padding: 16px 24px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-top: 1px solid var(--theme-border, #333);
        display: flex;
        justify-content: center;
      }
      
      .shortcuts-modal-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        background: var(--theme-primary, #667eea);
        color: white;
        transition: all 0.2s;
      }
      
      .shortcuts-modal-btn:hover {
        background: var(--theme-accent, #00ff88);
        color: black;
        transform: translateY(-2px);
      }
    `;
    
    if (!document.getElementById('shortcuts-modal-styles')) {
      style.id = 'shortcuts-modal-styles';
      document.head.appendChild(style);
    }
  }

  public open(): void {
    if (this.isVisible) return;

    this.render();
    this.isVisible = true;
  }

  public close(): void {
    if (!this.isVisible) return;

    if (this.modal && this.modal.parentElement) {
      this.modal.parentElement.removeChild(this.modal);
    }

    this.modal = null;
    this.isVisible = false;
  }

  private render(): void {
    this.modal = document.createElement('div');
    this.modal.className = 'shortcuts-modal-overlay';

    this.modal.innerHTML = `
      <div class="shortcuts-modal-container">
        <div class="shortcuts-modal-header">
          <div class="shortcuts-modal-title">
            ⌨️ Keyboard Shortcuts
          </div>
          <button class="shortcuts-modal-close" data-action="close">✕</button>
        </div>
        
        <div class="shortcuts-modal-body">
          ${this.renderShortcuts()}
        </div>
        
        <div class="shortcuts-modal-footer">
          <button class="shortcuts-modal-btn" data-action="close">
            Got it!
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Event listeners
    const closeButtons = this.modal.querySelectorAll('[data-action="close"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // ESC fecha modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Clica fora fecha modal
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  private renderShortcuts(): string {
    const shortcuts = [
      {
        section: '📁 File',
        items: [
          { label: 'New Project', keys: ['Ctrl', 'N'] },
          { label: 'Open File', keys: ['Ctrl', 'O'] },
          { label: 'Save Project', keys: ['Ctrl', 'S'] },
          { label: 'Save As', keys: ['Ctrl', 'Shift', 'S'] },
          { label: 'Export Screenshot', keys: ['Ctrl', 'P'] },
          { label: 'Close Project', keys: ['Ctrl', 'W'] },
        ]
      },
      {
        section: '✏️ Edit',
        items: [
          { label: 'Undo', keys: ['Ctrl', 'Z'] },
          { label: 'Redo', keys: ['Ctrl', 'Y'] },
          { label: 'Cut', keys: ['Ctrl', 'X'] },
          { label: 'Copy', keys: ['Ctrl', 'C'] },
          { label: 'Paste', keys: ['Ctrl', 'V'] },
          { label: 'Delete', keys: ['Del'] },
          { label: 'Select All', keys: ['Ctrl', 'A'] },
          { label: 'Deselect All', keys: ['Ctrl', 'D'] },
        ]
      },
      {
        section: '👁️ View',
        items: [
          { label: 'Top View', keys: ['7'] },
          { label: 'Front View', keys: ['1'] },
          { label: 'Side View', keys: ['3'] },
          { label: 'Isometric View', keys: ['5'] },
          { label: 'Focus Selection', keys: ['F'] },
          { label: 'Frame All', keys: ['H'] },
          { label: 'Toggle Grid', keys: ['G'] },
          { label: 'Toggle Axes', keys: ['X'] },
          { label: 'Toggle Stats', keys: ['Shift', 'S'] },
          { label: 'Fullscreen', keys: ['F11'] },
        ]
      },
      {
        section: '🛠️ Tools',
        items: [
          { label: 'Selection Tool', keys: ['V'] },
          { label: 'Measurement Tool', keys: ['M'] },
          { label: 'Section Tool', keys: ['X'] },
        ]
      },
      {
        section: '🥽 XR / 🌐 Network',
        items: [
          { label: 'Toggle VR Mode', keys: ['V'] },
          { label: 'Toggle VR Advanced', keys: ['Shift', 'V'] },
        ]
      },
      {
        section: '🚶 Navigation (FPS Mode)',
        items: [
          { label: 'Move Forward', keys: ['W'] },
          { label: 'Move Backward', keys: ['S'] },
          { label: 'Strafe Left', keys: ['A'] },
          { label: 'Strafe Right', keys: ['D'] },
          { label: 'Move Up (Y-axis)', keys: ['Q'] },
          { label: 'Move Down (Y-axis)', keys: ['E'] },
          { label: 'Rotate Camera', keys: ['↑', '↓', '←', '→'] },
          { label: 'Sprint', keys: ['Shift'] },
          { label: 'Slow Walk', keys: ['Ctrl'] },
          { label: 'Toggle FPS/Orbit', keys: ['C'] },
        ]
      },
      {
        section: 'ℹ️ Help',
        items: [
          { label: 'Keyboard Shortcuts', keys: ['?'] },
          { label: 'Documentation', keys: ['F1'] },
          { label: 'Toggle Sidebar', keys: ['Ctrl', 'B'] },
          { label: 'Command Palette', keys: ['Ctrl', 'K'] },
        ]
      },
    ];

    return shortcuts.map(section => `
      <div class="shortcuts-section">
        <div class="shortcuts-section-title">${section.section}</div>
        <div class="shortcuts-list">
          ${section.items.map(item => `
            <div class="shortcut-item">
              <span class="shortcut-label">${item.label}</span>
              <div class="shortcut-keys">
                ${item.keys.map(key => `<span class="shortcut-key">${key}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  public get visible(): boolean {
    return this.isVisible;
  }
}

// Singleton
let shortcutsModal: ShortcutsModal | null = null;

export function getShortcutsModal(): ShortcutsModal {
  if (!shortcutsModal) {
    shortcutsModal = new ShortcutsModal();
  }
  return shortcutsModal;
}
