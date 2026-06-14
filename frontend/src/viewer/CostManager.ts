import { EventTarget } from 'event-target-shim';

export class CostManager extends EventTarget {
  private showPanel = false;
  private scenarioId: string | null = null;

  togglePanel(scenarioId?: string) {
    if (scenarioId) this.scenarioId = scenarioId;
    this.showPanel = !this.showPanel;
    this.dispatchEvent(new CustomEvent('panel-toggle', {
      detail: { visible: this.showPanel, scenarioId: this.scenarioId }
    }));
  }

  setVisible(visible: boolean, scenarioId?: string) {
    this.showPanel = visible;
    if (scenarioId) this.scenarioId = scenarioId;
    this.dispatchEvent(new CustomEvent('panel-toggle', {
      detail: { visible: this.showPanel, scenarioId: this.scenarioId }
    }));
  }

  isVisible() {
    return this.showPanel;
  }

  getScenarioId() {
    return this.scenarioId;
  }
}

export const costManager = new CostManager();
