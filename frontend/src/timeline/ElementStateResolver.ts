export type ElementVisualState = 'not_started' | 'active' | 'complete';

export class ElementStateResolver {
  private elementToActivitiesMap = new Map<string, Array<{
    earlyStart: Date;
    earlyFinish: Date;
    stateDuring: string;
  }>>();

  /**
   * Sets and indexes activities for state resolution
   */
  public setActivities(activities: any[]): void {
    this.elementToActivitiesMap.clear();

    for (const act of activities) {
      const earlyStart = this.parseUTCDate(act.earlyStart || act.plannedStart);
      const earlyFinish = this.parseUTCDate(act.earlyFinish || act.plannedEnd);
      
      const elements = act.elements || [];
      for (const el of elements) {
        const key = String(el.globalId).trim();
        if (!key) continue;

        if (!this.elementToActivitiesMap.has(key)) {
          this.elementToActivitiesMap.set(key, []);
        }

        this.elementToActivitiesMap.get(key)!.push({
          earlyStart,
          earlyFinish,
          stateDuring: el.stateDuring || 'active'
        });
      }
    }
  }

  /**
   * Resolves the visual state of an element at the given date
   */
  public getElementState(globalId: string, expressId: string, currentDate: Date): ElementVisualState {
    const timestamp = currentDate.getTime();
    
    // Look up by globalId first, fallback to expressId
    let links = this.elementToActivitiesMap.get(String(globalId).trim());
    if (!links && expressId) {
      links = this.elementToActivitiesMap.get(String(expressId).trim());
    }

    if (!links || links.length === 0) {
      // Elements not associated with any activity are considered "complete" (fully visible)
      return 'complete';
    }

    let hasActive = false;
    let hasComplete = false;

    for (const link of links) {
      const start = link.earlyStart.getTime();
      const end = link.earlyFinish.getTime();

      if (timestamp >= start && timestamp <= end) {
        hasActive = true;
      } else if (timestamp > end) {
        hasComplete = true;
      }
    }

    if (hasActive) return 'active';
    if (hasComplete) return 'complete';
    return 'not_started';
  }

  private parseUTCDate(dateStr: string | Date): Date {
    if (dateStr instanceof Date) return dateStr;
    const [year, month, day] = String(dateStr).split('T')[0].split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
}
