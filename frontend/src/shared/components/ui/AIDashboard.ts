/**
 * AI Dashboard - Interface para visualizar análises de IA
 */

import { bimAI, type ClashResult, type CostAnalysis, type OptimizationSuggestion } from '../../../ai/BIMAIEngine';
import { aiAssistant } from '../../../ai/AIAssistant';
import './AIDashboard.css';

export class AIDashboard {
  private container: HTMLElement;
  private isVisible: boolean = false;
  
  // Elementos do DOM
  private chatContainer!: HTMLElement;
  private chatMessages!: HTMLElement;
  private chatInput!: HTMLInputElement;
  private analysisContainer!: HTMLElement;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'ai-dashboard';
    this.container.style.display = 'none';
    
    this.build();
    document.body.appendChild(this.container);
  }

  /**
   * Construir interface
   */
  private build(): void {
    this.container.innerHTML = `
      <div class="ai-dashboard-header">
        <h2>Assistente BIM</h2>
        <button class="close-btn" id="closeAIBtn">&times;</button>
      </div>
      
      <div class="ai-dashboard-tabs">
        <button class="tab-btn active" data-tab="chat">Chat</button>
        <button class="tab-btn" data-tab="clashes">Colisões</button>
        <button class="tab-btn" data-tab="costs">Custos</button>
        <button class="tab-btn" data-tab="timeline">Cronograma</button>
        <button class="tab-btn" data-tab="risks">Riscos</button>
        <button class="tab-btn" data-tab="optimization">Otimização</button>
      </div>
      
      <div class="ai-dashboard-content">
        <!-- CHAT TAB -->
        <div class="tab-panel active" id="chatPanel">
          <div class="chat-container">
            <div class="chat-messages" id="chatMessages"></div>
            <div class="chat-input-container">
              <input 
                type="text" 
                id="chatInput" 
                class="chat-input" 
                placeholder="Pergunte algo sobre o projeto..."
              />
              <button class="send-btn" id="sendBtn">➤</button>
            </div>
            <div class="quick-actions">
              <button class="quick-btn" data-question="Quantos elementos tem?">Quantidades</button>
              <button class="quick-btn" data-question="Tem colisões?">Colisões</button>
              <button class="quick-btn" data-question="Qual o custo?">Custos</button>
              <button class="quick-btn" data-question="Como otimizar?">Otimizar</button>
            </div>
          </div>
        </div>
        
        <!-- CLASHES TAB -->
        <div class="tab-panel" id="clashesPanel">
          <div class="analysis-header">
            <button class="analyze-btn" id="detectClashesBtn">Detectar Colisões</button>
            <button class="export-btn" id="exportClashesBtn">Exportar</button>
          </div>
          <div class="clashes-stats" id="clashesStats"></div>
          <div class="clashes-list" id="clashesList"></div>
        </div>
        
        <!-- COSTS TAB -->
        <div class="tab-panel" id="costsPanel">
          <div class="analysis-header">
            <button class="analyze-btn" id="estimateCostsBtn">Estimar Custos</button>
            <button class="export-btn" id="exportCostsBtn">Exportar</button>
          </div>
          <div class="costs-summary" id="costsSummary"></div>
          <div class="costs-breakdown" id="costsBreakdown"></div>
        </div>
        
        <!-- TIMELINE TAB -->
        <div class="tab-panel" id="timelinePanel">
          <div class="analysis-header">
            <button class="analyze-btn" id="predictTimelineBtn">Prever Cronograma</button>
            <button class="export-btn" id="exportTimelineBtn">Exportar</button>
          </div>
          <div class="timeline-summary" id="timelineSummary"></div>
          <div class="timeline-gantt" id="timelineGantt"></div>
          <div class="timeline-critical-path" id="criticalPath"></div>
        </div>
        
        <!-- RISKS TAB -->
        <div class="tab-panel" id="risksPanel">
          <div class="analysis-header">
            <button class="analyze-btn" id="assessRisksBtn">Avaliar Riscos</button>
            <button class="export-btn" id="exportRisksBtn">Exportar</button>
          </div>
          <div class="risks-matrix" id="risksMatrix"></div>
          <div class="risks-list" id="risksList"></div>
        </div>
        
        <!-- OPTIMIZATION TAB -->
        <div class="tab-panel" id="optimizationPanel">
          <div class="analysis-header">
            <button class="analyze-btn" id="analyzeOptimizationBtn">Analisar</button>
          </div>
          <div class="optimization-suggestions" id="optimizationSuggestions"></div>
        </div>
      </div>
    `;
    
    this.setupEventListeners();
  }

  /**
   * Configurar event listeners
   */
  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.container.querySelector('#closeAIBtn');
    closeBtn?.addEventListener('click', () => this.hide());
    
    // Tabs
    const tabs = this.container.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        if (tabName) this.switchTab(tabName);
      });
    });
    
    // Chat
    this.chatMessages = this.container.querySelector('#chatMessages')!;
    this.chatInput = this.container.querySelector('#chatInput') as HTMLInputElement;
    
    const sendBtn = this.container.querySelector('#sendBtn');
    sendBtn?.addEventListener('click', () => this.sendMessage());
    
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
    
    // Quick actions
    const quickBtns = this.container.querySelectorAll('.quick-btn');
    quickBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const question = target.dataset.question;
        if (question) {
          this.chatInput.value = question;
          this.sendMessage();
        }
      });
    });
    
    // Analysis buttons
    const detectClashesBtn = this.container.querySelector('#detectClashesBtn');
    detectClashesBtn?.addEventListener('click', () => this.runClashDetection());
    
    const estimateCostsBtn = this.container.querySelector('#estimateCostsBtn');
    estimateCostsBtn?.addEventListener('click', () => this.runCostEstimation());
    
    const analyzeOptimizationBtn = this.container.querySelector('#analyzeOptimizationBtn');
    analyzeOptimizationBtn?.addEventListener('click', () => this.runOptimizationAnalysis());
    
    // Export buttons
    const exportClashesBtn = this.container.querySelector('#exportClashesBtn');
    exportClashesBtn?.addEventListener('click', () => this.exportClashes());
    
    const exportCostsBtn = this.container.querySelector('#exportCostsBtn');
    exportCostsBtn?.addEventListener('click', () => this.exportCosts());
  }

  /**
   * Alternar aba
   */
  private switchTab(tabName: string): void {
    // Update tab buttons
    const tabs = this.container.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });
    
    // Update panels
    const panels = this.container.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}Panel`);
    });
  }

  /**
   * CHAT
   */
  private async sendMessage(): Promise<void> {
    const question = this.chatInput.value.trim();
    if (!question) return;
    
    // Clear input
    this.chatInput.value = '';
    
    // Add user message
    this.addMessage('user', question);
    
    // Show typing indicator
    const typingId = this.addMessage('assistant', '...', true);
    
    try {
      // Get response from AI
      const result = await aiAssistant.ask(question);
      
      // Remove typing indicator
      const typingMsg = document.getElementById(typingId);
      typingMsg?.remove();
      
      // Add assistant response
      this.addMessage('assistant', result.answer);
      
      // Add suggestions if any
      if (result.suggestions && result.suggestions.length > 0) {
        this.addSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error('Erro ao processar pergunta:', error);
      
      const typingMsg = document.getElementById(typingId);
      typingMsg?.remove();
      
      this.addMessage('assistant', 'Desculpe, ocorreu um erro. Tente novamente.');
    }
  }

  private addMessage(role: 'user' | 'assistant', content: string, isTyping: boolean = false): string {
    const messageId = `msg_${Date.now()}`;
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${role} ${isTyping ? 'typing' : ''}`;
    messageEl.id = messageId;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'US' : 'AI';
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message-content';
    contentEl.textContent = content;
    
    messageEl.appendChild(avatar);
    messageEl.appendChild(contentEl);
    
    this.chatMessages.appendChild(messageEl);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
    return messageId;
  }

  private addSuggestions(suggestions: string[]): void {
    const suggestionsEl = document.createElement('div');
    suggestionsEl.className = 'message-suggestions';
    
    suggestions.forEach(suggestion => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.textContent = suggestion;
      btn.addEventListener('click', () => {
        this.chatInput.value = suggestion;
        this.sendMessage();
      });
      suggestionsEl.appendChild(btn);
    });
    
    this.chatMessages.appendChild(suggestionsEl);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  /**
   * CLASH DETECTION
   */
  private async runClashDetection(): Promise<void> {
    const btn = this.container.querySelector('#detectClashesBtn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Detectando...';
    
    try {
      const clashes = await bimAI.detectClashes({
        progressCallback: (progress: number) => {
          btn.textContent = `${Math.round(progress)}%`;
        }
      });
      
      btn.textContent = 'Detectar Colisões';
      btn.disabled = false;
      
      this.displayClashes(clashes);
    } catch (error) {
      console.error('Erro ao detectar colisões:', error);
      btn.textContent = 'Erro';
      setTimeout(() => {
        btn.textContent = 'Detectar Colisões';
        btn.disabled = false;
      }, 2000);
    }
  }

  private displayClashes(clashes: ClashResult[]): void {
    const statsContainer = this.container.querySelector('#clashesStats')!;
    const listContainer = this.container.querySelector('#clashesList')!;
    
    // Statistics
    const critical = clashes.filter(c => c.severity === 'critical').length;
    const major = clashes.filter(c => c.severity === 'major').length;
    const minor = clashes.filter(c => c.severity === 'minor').length;
    
    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card critical">
          <div class="stat-number">${critical}</div>
          <div class="stat-label">Críticas</div>
        </div>
        <div class="stat-card major">
          <div class="stat-number">${major}</div>
          <div class="stat-label">Importantes</div>
        </div>
        <div class="stat-card minor">
          <div class="stat-number">${minor}</div>
          <div class="stat-label">Menores</div>
        </div>
        <div class="stat-card total">
          <div class="stat-number">${clashes.length}</div>
          <div class="stat-label">Total</div>
        </div>
      </div>
    `;
    
    // List
    if (clashes.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">Nenhuma colisão detectada.</div>';
      return;
    }
    
    listContainer.innerHTML = clashes.map((clash, i) => `
      <div class="clash-item ${clash.severity}">
        <div class="clash-header">
          <span class="clash-number">#${i + 1}</span>
          <span class="clash-severity">${this.getSeverityLabel(clash.severity)}</span>
          <span class="clash-volume">${(clash.intersectionVolume * 1000).toFixed(2)}L</span>
        </div>
        <div class="clash-description">${clash.description}</div>
        ${clash.suggestedFix ? `<div class="clash-fix">${clash.suggestedFix}</div>` : ''}
        <button class="locate-btn" onclick="window.locateClash(${clash.elementA.expressID}, ${clash.elementB.expressID})">
          Localizar
        </button>
      </div>
    `).join('');
  }

  private getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      critical: 'Crítica',
      major: 'Importante',
      minor: 'Menor'
    };
    return labels[severity] || severity;
  }

  /**
   * COST ESTIMATION
   */
  private async runCostEstimation(): Promise<void> {
    const btn = this.container.querySelector('#estimateCostsBtn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Calculando...';
    
    try {
      const analysis = await bimAI.estimateCosts();
      
      btn.textContent = 'Estimar Custos';
      btn.disabled = false;
      
      this.displayCosts(analysis);
    } catch (error) {
      console.error('Erro ao estimar custos:', error);
      btn.textContent = 'Erro';
      setTimeout(() => {
        btn.textContent = 'Estimar Custos';
        btn.disabled = false;
      }, 2000);
    }
  }

  private displayCosts(analysis: CostAnalysis): void {
    const summaryContainer = this.container.querySelector('#costsSummary')!;
    const breakdownContainer = this.container.querySelector('#costsBreakdown')!;
    
    // Summary
    const formatted = analysis.totalEstimated.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    
    summaryContainer.innerHTML = `
      <div class="cost-summary-card">
        <div class="cost-total">${formatted}</div>
        <div class="cost-label">Custo Total Estimado</div>
        <div class="cost-confidence">
          Confiança: ${(analysis.confidenceLevel * 100).toFixed(0)}%
        </div>
        ${analysis.warnings.length > 0 ? `
          <div class="cost-warnings">
            ${analysis.warnings.length} avisos
          </div>
        ` : ''}
      </div>
    `;
    
    // Breakdown
    breakdownContainer.innerHTML = `
      <table class="costs-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Quantidade</th>
            <th>Custo Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${analysis.breakdown.map((item: any) => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity.toFixed(2)}</td>
              <td>R$ ${item.unitCost.toFixed(2)}</td>
              <td><strong>R$ ${item.total.toLocaleString('pt-BR')}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${analysis.warnings.length > 0 ? `
        <div class="warnings-section">
          <h4>Avisos</h4>
          <ul>
            ${analysis.warnings.map((w: string) => `<li>${w}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }

  /**
   * OPTIMIZATION
   */
  private async runOptimizationAnalysis(): Promise<void> {
    const btn = this.container.querySelector('#analyzeOptimizationBtn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Analisando...';
    
    try {
      const suggestions = bimAI.generateOptimizationSuggestions();
      
      btn.textContent = 'Analisar';
      btn.disabled = false;
      
      this.displayOptimizations(suggestions);
    } catch (error) {
      console.error('Erro ao analisar otimizações:', error);
      btn.textContent = 'Erro';
      setTimeout(() => {
        btn.textContent = 'Analisar';
        btn.disabled = false;
      }, 2000);
    }
  }

  private displayOptimizations(suggestions: OptimizationSuggestion[]): void {
    const container = this.container.querySelector('#optimizationSuggestions')!;
    
    if (suggestions.length === 0) {
      container.innerHTML = '<div class="empty-state">Projeto já está otimizado.</div>';
      return;
    }
    
    container.innerHTML = suggestions.map(sug => `
      <div class="optimization-card ${sug.priority}">
        <div class="opt-header">
          <span class="opt-icon">${this.getOptimizationIcon(sug.type)}</span>
          <span class="opt-title">${sug.title}</span>
          <span class="opt-priority">${this.getPriorityLabel(sug.priority)}</span>
        </div>
        <div class="opt-description">${sug.description}</div>
        <div class="opt-saving">
          Economia potencial: R$ ${sug.potentialSaving.toLocaleString('pt-BR')}
        </div>
        <div class="opt-action">
          <strong>Ação:</strong> ${sug.action}
        </div>
      </div>
    `).join('');
  }

  private getOptimizationIcon(type: string): string {
    const icons: Record<string, string> = {
      material: 'MAT',
      structure: 'STR',
      layout: 'LAY',
      cost: 'CST'
    };
    return icons[type] || 'OPT';
  }

  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    return labels[priority] || priority;
  }

  /**
   * EXPORT
   */
  private exportClashes(): void {
    const clashes = bimAI.getCachedClashes();
    
    if (clashes.length === 0) {
      alert('Execute a detecção de colisões primeiro');
      return;
    }
    
    const csv = this.clashesToCSV(clashes);
    this.downloadFile(csv, 'colisoes.csv', 'text/csv');
  }

  private clashesToCSV(clashes: ClashResult[]): string {
    const headers = ['#', 'Severidade', 'Elemento A', 'Elemento B', 'Volume (L)', 'Descrição', 'Solução'];
    const rows = clashes.map((c, i) => [
      i + 1,
      c.severity,
      c.elementA.expressID,
      c.elementB.expressID,
      (c.intersectionVolume * 1000).toFixed(2),
      c.description,
      c.suggestedFix || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private exportCosts(): void {
    const costs = bimAI.getCachedCosts();
    
    if (!costs) {
      alert('Execute a estimativa de custos primeiro');
      return;
    }
    
    const csv = this.costsToCSV(costs);
    this.downloadFile(csv, 'custos.csv', 'text/csv');
  }

  private costsToCSV(costs: CostAnalysis): string {
    const headers = ['Categoria', 'Descrição', 'Quantidade', 'Custo Unit.', 'Total'];
    const rows = costs.breakdown.map((item: any) => [
      item.category,
      item.description,
      item.quantity.toFixed(2),
      item.unitCost.toFixed(2),
      item.total.toFixed(2)
    ]);
    
    return [headers, ...rows]
      .map((row: Array<string | number>) => row.map((cell: string | number) => `"${cell}"`).join(','))
      .join('\n');
  }

  private displayTimeline(timeline: any): void {
    const container = this.container.querySelector('#timelineSummary');
    if (!container) return;
    container.innerHTML = `
      <div class="timeline-summary-card">
        <div class="timeline-duration">${timeline?.durationDays ?? timeline?.duration ?? '—'}</div>
        <div class="timeline-label">dias estimados</div>
      </div>
    `;
  }

  private displayRisks(risks: any[]): void {
    const container = this.container.querySelector('#risksList');
    if (!container) return;
    container.innerHTML = risks.length
      ? risks.map((risk, index) => `
        <div class="risk-item ${risk.level || risk.severity || 'medium'}">
          <div class="risk-header">
            <span class="risk-level">${risk.level || risk.severity || 'Risco'}</span>
            <span class="risk-score">#${index + 1}</span>
          </div>
          <div class="risk-description">${risk.description || risk.title || 'Risco identificado no modelo.'}</div>
        </div>
      `).join('')
      : '<div class="empty-state">Nenhum risco crítico identificado.</div>';
  }

  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private exportTimeline(): void {
    alert('Exportação de cronograma em desenvolvimento!');
  }

  private exportRisks(): void {
    alert('Exportação de riscos em desenvolvimento!');
  }

  /**
   * Show/Hide
   */
  show(): void {
    this.container.style.display = 'flex';
    this.isVisible = true;
    
    // Load initial chat message
    if (this.chatMessages.children.length === 0) {
      this.addMessage('assistant', 'Olá! Sou seu assistente de IA para projetos BIM. Como posso ajudar?');
    }
  }

  hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Atualizar dashboard com resultados da análise
   */
  updateWithAnalysis(analysis: {
    summary: string;
    clashes: any[];
    costs: any;
    timeline: any;
    risks: any[];
    clusters: any[];
    anomalies: any[];
    optimizations: any[];
  }): void {
    console.log('📊 Atualizando dashboard com resultados da análise...');
    
    // Mostrar mensagem no chat sobre a análise
    this.addMessage('assistant', `Análise concluída! Encontrei:`);
    this.addMessage('assistant', 
      `• ${analysis.clashes.length} colisões\n` +
      `• Custo estimado: ${analysis.costs.totalEstimated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n` +
      `• ${analysis.risks.length} riscos identificados\n` +
      `• ${analysis.optimizations.length} sugestões de otimização`
    );
    
    // Atualizar abas automaticamente
    if (analysis.clashes.length > 0) {
      this.displayClashes(analysis.clashes);
    }
    
    if (analysis.costs) {
      this.displayCosts(analysis.costs);
    }
    
    if (analysis.timeline) {
      this.displayTimeline(analysis.timeline);
    }
    
    if (analysis.risks && analysis.risks.length > 0) {
      this.displayRisks(analysis.risks);
    }
    
    if (analysis.optimizations.length > 0) {
      this.displayOptimizations(analysis.optimizations);
    }
    
    console.log('✅ Dashboard atualizado com sucesso!');
  }
}

