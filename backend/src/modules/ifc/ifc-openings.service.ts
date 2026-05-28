/**
 * IFC Openings Service
 * Análise de aberturas (portas, janelas, furos)
 */

export interface IfcOpening {
  openingId: string;
  openingType: 'door' | 'window' | 'opening' | 'recess';
  name?: string;
  width?: number;
  height?: number;
  area?: number;
  hostElement?: string;
  level?: string;
}

export interface DoorAnalysis {
  totalDoors: number;
  byType: Record<string, number>;
  averageWidth: number;
  averageHeight: number;
  singleDoors: number;
  doubleDoors: number;
}

export interface WindowAnalysis {
  totalWindows: number;
  byType: Record<string, number>;
  totalGlazedArea: number;
  averageWidth: number;
  averageHeight: number;
}

export interface OpeningAnalysis {
  doors: DoorAnalysis;
  windows: WindowAnalysis;
  otherOpenings: number;
  wallToWindowRatio?: number;
}

export class IfcOpeningsService {
  /**
   * Extrai todas as aberturas (portas, janelas, openings)
   */
  extractOpenings(ifcContent: string): IfcOpening[] {
    const openings: IfcOpening[] = [];

    // Doors
    openings.push(...this.extractDoors(ifcContent));

    // Windows
    openings.push(...this.extractWindows(ifcContent));

    // Generic openings
    openings.push(...this.extractGenericOpenings(ifcContent));

    return openings;
  }

  /**
   * Extrai portas
   */
  extractDoors(ifcContent: string): IfcOpening[] {
    const doors: IfcOpening[] = [];
    const doorPattern = /#(\d+)=IFCDOOR\('([^']*)'[^)]*\)/g;

    let match;
    while ((match = doorPattern.exec(ifcContent)) !== null) {
      const openingId = `#${match[1]}`;
      doors.push({
        openingId,
        openingType: 'door',
        name: match[2] || 'Door',
        width: this.extractDimension(ifcContent, openingId, 'Width'),
        height: this.extractDimension(ifcContent, openingId, 'Height'),
        hostElement: this.findHostElement(ifcContent, openingId),
      });
    }

    return doors;
  }

  /**
   * Extrai janelas
   */
  extractWindows(ifcContent: string): IfcOpening[] {
    const windows: IfcOpening[] = [];
    const windowPattern = /#(\d+)=IFCWINDOW\('([^']*)'[^)]*\)/g;

    let match;
    while ((match = windowPattern.exec(ifcContent)) !== null) {
      const openingId = `#${match[1]}`;
      const width = this.extractDimension(ifcContent, openingId, 'Width');
      const height = this.extractDimension(ifcContent, openingId, 'Height');

      windows.push({
        openingId,
        openingType: 'window',
        name: match[2] || 'Window',
        width,
        height,
        area: width && height ? width * height : undefined,
        hostElement: this.findHostElement(ifcContent, openingId),
      });
    }

    return windows;
  }

  /**
   * Extrai aberturas genéricas (IFCOPENINGELEMENT)
   */
  extractGenericOpenings(ifcContent: string): IfcOpening[] {
    const openings: IfcOpening[] = [];
    const openingPattern = /#(\d+)=IFCOPENINGELEMENT\(/g;

    let match;
    while ((match = openingPattern.exec(ifcContent)) !== null) {
      const openingId = `#${match[1]}`;
      openings.push({
        openingId,
        openingType: 'opening',
        hostElement: this.findHostElement(ifcContent, openingId),
      });
    }

    return openings;
  }

  /**
   * Analisa portas
   */
  analyzeDoors(doors: IfcOpening[]): DoorAnalysis {
    const byType: Record<string, number> = {};
    let totalWidth = 0;
    let totalHeight = 0;
    let countWidth = 0;
    let countHeight = 0;
    let singleDoors = 0;
    let doubleDoors = 0;

    for (const door of doors) {
      const typeName = door.name || 'Unknown';
      byType[typeName] = (byType[typeName] || 0) + 1;

      if (door.width) {
        totalWidth += door.width;
        countWidth++;

        // Single door typically < 1.2m, double door >= 1.2m
        if (door.width < 1.2) {
          singleDoors++;
        } else {
          doubleDoors++;
        }
      }

      if (door.height) {
        totalHeight += door.height;
        countHeight++;
      }
    }

    return {
      totalDoors: doors.length,
      byType,
      averageWidth: countWidth > 0 ? totalWidth / countWidth : 0,
      averageHeight: countHeight > 0 ? totalHeight / countHeight : 0,
      singleDoors,
      doubleDoors,
    };
  }

  /**
   * Analisa janelas
   */
  analyzeWindows(windows: IfcOpening[]): WindowAnalysis {
    const byType: Record<string, number> = {};
    let totalGlazedArea = 0;
    let totalWidth = 0;
    let totalHeight = 0;
    let countWidth = 0;
    let countHeight = 0;

    for (const window of windows) {
      const typeName = window.name || 'Unknown';
      byType[typeName] = (byType[typeName] || 0) + 1;

      if (window.area) {
        totalGlazedArea += window.area;
      }

      if (window.width) {
        totalWidth += window.width;
        countWidth++;
      }

      if (window.height) {
        totalHeight += window.height;
        countHeight++;
      }
    }

    return {
      totalWindows: windows.length,
      byType,
      totalGlazedArea,
      averageWidth: countWidth > 0 ? totalWidth / countWidth : 0,
      averageHeight: countHeight > 0 ? totalHeight / countHeight : 0,
    };
  }

  /**
   * Análise completa de aberturas
   */
  analyzeOpenings(openings: IfcOpening[]): OpeningAnalysis {
    const doors = openings.filter((o) => o.openingType === 'door');
    const windows = openings.filter((o) => o.openingType === 'window');
    const otherOpenings = openings.filter(
      (o) => o.openingType !== 'door' && o.openingType !== 'window'
    ).length;

    return {
      doors: this.analyzeDoors(doors),
      windows: this.analyzeWindows(windows),
      otherOpenings,
    };
  }

  /**
   * Calcula relação janela/parede (WWR - Window to Wall Ratio)
   */
  calculateWWR(
    windows: IfcOpening[],
    totalWallArea: number
  ): {
    wwr: number;
    totalGlazedArea: number;
    totalWallArea: number;
    recommendation: string;
  } {
    const totalGlazedArea = windows.reduce(
      (sum, w) => sum + (w.area || 0),
      0
    );
    const wwr = totalWallArea > 0 ? (totalGlazedArea / totalWallArea) * 100 : 0;

    let recommendation = '';

    if (wwr < 20) {
      recommendation = 'Low WWR - consider increasing glazed area for natural lighting';
    } else if (wwr > 40) {
      recommendation = 'High WWR - may impact thermal performance and energy efficiency';
    } else {
      recommendation = 'WWR within optimal range (20-40%)';
    }

    return {
      wwr,
      totalGlazedArea,
      totalWallArea,
      recommendation,
    };
  }

  /**
   * Valida aberturas
   */
  validateOpenings(openings: IfcOpening[]): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validar dimensões de portas
    const doorsNoDims = openings.filter(
      (o) => o.openingType === 'door' && (!o.width || !o.height)
    );
    if (doorsNoDims.length > 0) {
      issues.push(`${doorsNoDims.length} doors without dimensions`);
      recommendations.push('Add width and height to all doors');
    }

    // Validar dimensões de janelas
    const windowsNoDims = openings.filter(
      (o) => o.openingType === 'window' && (!o.width || !o.height)
    );
    if (windowsNoDims.length > 0) {
      issues.push(`${windowsNoDims.length} windows without dimensions`);
      recommendations.push('Add width and height to all windows');
    }

    // Validar host elements
    const noHost = openings.filter((o) => !o.hostElement);
    if (noHost.length > 0) {
      issues.push(`${noHost.length} openings not assigned to host elements`);
      recommendations.push('Use IFCRELVOIDSELEMENT to assign openings to walls');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Extrai dimensão (Width/Height) de um opening
   */
  private extractDimension(
    ifcContent: string,
    openingId: string,
    dimType: 'Width' | 'Height'
  ): number | undefined {
    const pattern = new RegExp(
      `${openingId}[^#]*IFCQUANTITYLENGTH\\('Overall${dimType}'[^,]*,([0-9.]+)`,
      'i'
    );
    const match = ifcContent.match(pattern);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Encontra elemento host (parede) da abertura
   */
  private findHostElement(ifcContent: string, openingId: string): string | undefined {
    // IFCRELVOIDSELEMENT relaciona opening com host
    const pattern = new RegExp(
      `IFCRELVOIDSELEMENT\\([^,]*,[^,]*,[^,]*,([^,]+),${openingId}\\)`,
      'i'
    );
    const match = ifcContent.match(pattern);
    return match ? match[1].trim() : undefined;
  }
}
