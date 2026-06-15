export class CostManager {
  private showPanel = false;
  private scenarioId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  togglePanel(scenarioId?: string) {
    if (scenarioId) this.scenarioId = scenarioId;
    this.showPanel = !this.showPanel;
    this.emit('panel-toggle', { visible: this.showPanel, scenarioId: this.scenarioId });
  }

  setVisible(visible: boolean, scenarioId?: string) {
    this.showPanel = visible;
    if (scenarioId) this.scenarioId = scenarioId;
    this.emit('panel-toggle', { visible: this.showPanel, scenarioId: this.scenarioId });
  }

  isVisible() {
    return this.showPanel;
  }

  getScenarioId() {
    return this.scenarioId;
  }

  addEventListener(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  removeEventListener(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, detail: any) {
    this.listeners.get(event)?.forEach(callback => {
      (callback as any)({ detail });
    });
  }
}

export const costManager = new CostManager();
