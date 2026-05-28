/**
 * AdvancedAnalyticsService
 * Analytics avançado com dashboards, heatmaps e funis de conversão
 * Coleta e analisa dados de uso, interação e performance
 */

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  lastUpdated: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'heatmap' | 'funnel' | 'table';
  title: string;
  config: Record<string, any>;
  data: any;
  position: { x: number; y: number; w: number; h: number };
}

export interface DashboardLayout {
  columns: number;
  rows: number;
}

export interface HeatmapData {
  x: number;
  y: number;
  value: number;
  label?: string;
}

export interface FunnelStep {
  name: string;
  value: number;
  conversionRate?: number;
}

export interface FunnelData {
  steps: FunnelStep[];
  totalConversion: number;
}

class AdvancedAnalyticsService {
  private dashboards: Map<string, Dashboard> = new Map();
  private eventHistory: Map<string, number> = new Map();
  private userInteractions: Map<string, number> = new Map();

  /**
   * Cria novo dashboard
   */
  createDashboard(name: string, layout: DashboardLayout): Dashboard {
    const dashboard: Dashboard = {
      id: this.generateId(),
      name,
      widgets: [],
      layout,
      lastUpdated: new Date().toISOString(),
    };

    this.dashboards.set(dashboard.id, dashboard);
    console.log('[AdvancedAnalyticsService] Dashboard created:', dashboard.id);
    return dashboard;
  }

  /**
   * Adiciona widget ao dashboard
   */
  addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id'>): DashboardWidget | null {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return null;
    }

    const newWidget: DashboardWidget = {
      ...widget,
      id: this.generateId(),
    };

    dashboard.widgets.push(newWidget);
    dashboard.lastUpdated = new Date().toISOString();

    console.log('[AdvancedAnalyticsService] Widget added:', newWidget.id);
    return newWidget;
  }

  /**
   * Remove widget do dashboard
   */
  removeWidget(dashboardId: string, widgetId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return false;
    }

    const index = dashboard.widgets.findIndex(w => w.id === widgetId);
    if (index === -1) {
      return false;
    }

    dashboard.widgets.splice(index, 1);
    dashboard.lastUpdated = new Date().toISOString();

    console.log('[AdvancedAnalyticsService] Widget removed:', widgetId);
    return true;
  }

  /**
   * Rastreia evento
   */
  trackEvent(eventName: string, value: number = 1): void {
    const current = this.eventHistory.get(eventName) || 0;
    this.eventHistory.set(eventName, current + value);
  }

  /**
   * Rastreia interação do usuário
   */
  trackInteraction(elementId: string, value: number = 1): void {
    const current = this.userInteractions.get(elementId) || 0;
    this.userInteractions.set(elementId, current + value);
  }

  /**
   * Gera dados de heatmap baseado em interações
   */
  generateHeatmapData(areaWidth: number, areaHeight: number, gridSize: number = 20): HeatmapData[] {
    const heatmapData: HeatmapData[] = [];
    const cols = Math.ceil(areaWidth / gridSize);
    const rows = Math.ceil(areaHeight / gridSize);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cellId = `cell_${x}_${y}`;
        const value = this.userInteractions.get(cellId) || 0;

        if (value > 0) {
          heatmapData.push({
            x: x * gridSize,
            y: y * gridSize,
            value,
          });
        }
      }
    }

    return heatmapData;
  }

  /**
   * Gera dados de funil de conversão
   */
  generateFunnelData(steps: string[]): FunnelData {
    const funnelSteps: FunnelStep[] = [];
    let previousValue = 0;

    steps.forEach((step, index) => {
      const value = this.eventHistory.get(step) || 0;
      const conversionRate = previousValue > 0 ? (value / previousValue) * 100 : 100;

      funnelSteps.push({
        name: step,
        value,
        conversionRate: index > 0 ? conversionRate : undefined,
      });

      previousValue = value;
    });

    const totalConversion = steps.length > 1 
      ? (funnelSteps[funnelSteps.length - 1].value / funnelSteps[0].value) * 100 
      : 100;

    return {
      steps: funnelSteps,
      totalConversion,
    };
  }

  /**
   * Atualiza dados de widget
   */
  updateWidgetData(dashboardId: string, widgetId: string, data: any): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return false;
    }

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) {
      return false;
    }

    widget.data = data;
    dashboard.lastUpdated = new Date().toISOString();

    console.log('[AdvancedAnalyticsService] Widget data updated:', widgetId);
    return true;
  }

  /**
   * Retorna dashboard por ID
   */
  getDashboard(dashboardId: string): Dashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Lista todos os dashboards
   */
  listDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Cria dashboard padrão com widgets comuns
   */
  createDefaultDashboard(): Dashboard {
    const dashboard = this.createDashboard('Dashboard Padrão', {
      columns: 3,
      rows: 3,
    });

    // Widget de métrica principal
    this.addWidget(dashboard.id, {
      type: 'metric',
      title: 'Total de Usuários',
      config: { format: 'number' },
      data: { value: 0 },
      position: { x: 0, y: 0, w: 1, h: 1 },
    });

    // Widget de gráfico de linha
    this.addWidget(dashboard.id, {
      type: 'chart',
      title: 'Atividade ao Longo do Tempo',
      config: { chartType: 'line' },
      data: { labels: [], values: [] },
      position: { x: 1, y: 0, w: 2, h: 1 },
    });

    // Widget de heatmap
    this.addWidget(dashboard.id, {
      type: 'heatmap',
      title: 'Mapa de Calor de Interações',
      config: { gridSize: 20 },
      data: [],
      position: { x: 0, y: 1, w: 2, h: 2 },
    });

    // Widget de funil
    this.addWidget(dashboard.id, {
      type: 'funnel',
      title: 'Funil de Conversão',
      config: {},
      data: { steps: [], totalConversion: 0 },
      position: { x: 2, y: 1, w: 1, h: 2 },
    });

    return dashboard;
  }

  /**
   * Exporta dados de dashboard
   */
  exportDashboardData(dashboardId: string, format: 'json' | 'csv'): string {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    if (format === 'json') {
      return JSON.stringify(dashboard, null, 2);
    }

    // CSV export
    let csv = 'Widget Type,Title,Data\n';
    dashboard.widgets.forEach(widget => {
      csv += `${widget.type},"${widget.title}","${JSON.stringify(widget.data)}"\n`;
    });

    return csv;
  }

  /**
   * Limpa histórico de eventos
   */
  clearEventHistory(): void {
    this.eventHistory.clear();
    console.log('[AdvancedAnalyticsService] Event history cleared');
  }

  /**
   * Limpa histórico de interações
   */
  clearInteractionHistory(): void {
    this.userInteractions.clear();
    console.log('[AdvancedAnalyticsService] Interaction history cleared');
  }

  /**
   * Retorna estatísticas agregadas
   */
  getAggregatedStats(): Record<string, number> {
    const totalEvents = Array.from(this.eventHistory.values()).reduce((sum, val) => sum + val, 0);
    const totalInteractions = Array.from(this.userInteractions.values()).reduce((sum, val) => sum + val, 0);
    const uniqueEvents = this.eventHistory.size;
    const uniqueInteractions = this.userInteractions.size;

    return {
      totalEvents,
      totalInteractions,
      uniqueEvents,
      uniqueInteractions,
      dashboardCount: this.dashboards.size,
    };
  }

  /**
   * Gera ID único
   */
  private generateId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa todos os recursos
   */
  dispose(): void {
    this.dashboards.clear();
    this.eventHistory.clear();
    this.userInteractions.clear();
    console.log('[AdvancedAnalyticsService] Disposed');
  }
}

// Singleton instance
let advancedAnalyticsServiceInstance: AdvancedAnalyticsService | null = null;

export function getAdvancedAnalyticsService(): AdvancedAnalyticsService {
  if (!advancedAnalyticsServiceInstance) {
    advancedAnalyticsServiceInstance = new AdvancedAnalyticsService();
  }
  return advancedAnalyticsServiceInstance;
}

export default AdvancedAnalyticsService;
