/**
 * Botão para acionar análise de IA
 */

export class AIAnalysisButton {
  private button: HTMLButtonElement;
  private onAnalyze?: () => void;

  constructor() {
    this.button = this.createButton();
    this.attachToDOM();
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'ai-analysis-button';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
      <span>Análise IA</span>
    `;
    
    button.addEventListener('click', () => {
      if (this.onAnalyze) {
        button.classList.add('analyzing');
        button.disabled = true;
        button.innerHTML = `
          <div class="spinner"></div>
          <span>Analisando...</span>
        `;
        
        this.onAnalyze();
        
        // Reset após 2 segundos
        setTimeout(() => {
          button.classList.remove('analyzing');
          button.disabled = false;
          button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <span>Análise IA</span>
          `;
        }, 2000);
      }
    });
    
    return button;
  }

  private attachToDOM(): void {
    // Adicionar estilo
    const style = document.createElement('style');
    style.textContent = `
      #ai-analysis-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        transition: all 0.3s ease;
        z-index: 1000;
      }

      #ai-analysis-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
      }

      #ai-analysis-button:active {
        transform: translateY(0);
      }

      #ai-analysis-button:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }

      #ai-analysis-button.analyzing {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      }

      #ai-analysis-button .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      #ai-analysis-button svg {
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
    
    // Adicionar botão ao body
    document.body.appendChild(this.button);
  }

  public setOnAnalyze(callback: () => void): void {
    this.onAnalyze = callback;
  }

  public show(): void {
    this.button.style.display = 'flex';
  }

  public hide(): void {
    this.button.style.display = 'none';
  }

  public destroy(): void {
    this.button.remove();
  }
}
