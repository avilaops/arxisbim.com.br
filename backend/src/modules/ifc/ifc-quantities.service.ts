/**
 * IFC Quantities Service
 * Extracts and analyzes quantity takeoffs from IFC files
 */
export class IfcQuantitiesService {
  /**
   * Extract quantity sets from IFC file
   */
  extractQuantities(content: string): {
    elementId: string;
    quantitySetId: string;
    quantities: {
      name: string;
      type: string;
      value: number;
      unit: string;
    }[];
  }[] {
    const quantitySets: {
      elementId: string;
      quantitySetId: string;
      quantities: {
        name: string;
        type: string;
        value: number;
        unit: string;
      }[];
    }[] = [];

    // Match IFCELEMENTQUANTITY
    const quantityMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCELEMENTQUANTITY\s*\([^;]+;/g)
    );

    quantityMatches.forEach(match => {
      const quantitySetId = `#${match[1]}`;
      
      quantitySets.push({
        elementId: '', // Would need to trace relationships
        quantitySetId,
        quantities: [],
      });
    });

    return quantitySets;
  }

  /**
   * Extract common quantities (length, area, volume)
   */
  extractCommonQuantities(content: string): {
    lengths: { elementId: string; value: number; unit: string }[];
    areas: { elementId: string; value: number; unit: string }[];
    volumes: { elementId: string; value: number; unit: string }[];
  } {
    const lengths: { elementId: string; value: number; unit: string }[] = [];
    const areas: { elementId: string; value: number; unit: string }[] = [];
    const volumes: { elementId: string; value: number; unit: string }[] = [];

    // Match IFCQUANTITYLENGTH
    const lengthMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCQUANTITYLENGTH\s*\('([^']+)',\$,\$,([0-9.]+)/g)
    );

    lengthMatches.forEach(match => {
      lengths.push({
        elementId: `#${match[1]}`,
        value: parseFloat(match[3]),
        unit: 'm', // Typically meters in IFC
      });
    });

    // Match IFCQUANTITYAREA
    const areaMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCQUANTITYAREA\s*\('([^']+)',\$,\$,([0-9.]+)/g)
    );

    areaMatches.forEach(match => {
      areas.push({
        elementId: `#${match[1]}`,
        value: parseFloat(match[3]),
        unit: 'm²',
      });
    });

    // Match IFCQUANTITYVOLUME
    const volumeMatches = Array.from(
      content.matchAll(/#(\d+)\s*=\s*IFCQUANTITYVOLUME\s*\('([^']+)',\$,\$,([0-9.]+)/g)
    );

    volumeMatches.forEach(match => {
      volumes.push({
        elementId: `#${match[1]}`,
        value: parseFloat(match[3]),
        unit: 'm³',
      });
    });

    return { lengths, areas, volumes };
  }

  /**
   * Calculate total quantities by element type
   */
  calculateTotals(
    elements: { elementType: string; ids: string[] }[],
    quantities: {
      lengths: { elementId: string; value: number }[];
      areas: { elementId: string; value: number }[];
      volumes: { elementId: string; value: number }[];
    }
  ): {
    elementType: string;
    totalLength: number;
    totalArea: number;
    totalVolume: number;
    count: number;
  }[] {
    return elements.map(element => {
      const totalLength = quantities.lengths
        .filter(l => element.ids.includes(l.elementId))
        .reduce((sum, l) => sum + l.value, 0);

      const totalArea = quantities.areas
        .filter(a => element.ids.includes(a.elementId))
        .reduce((sum, a) => sum + a.value, 0);

      const totalVolume = quantities.volumes
        .filter(v => element.ids.includes(v.elementId))
        .reduce((sum, v) => sum + v.value, 0);

      return {
        elementType: element.elementType,
        totalLength: Math.round(totalLength * 100) / 100,
        totalArea: Math.round(totalArea * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
        count: element.ids.length,
      };
    });
  }

  /**
   * Generate quantity takeoff report
   */
  generateTakeoffReport(
    elements: { elementType: string; count: number }[],
    quantities: {
      lengths: { elementId: string; value: number }[];
      areas: { elementId: string; value: number }[];
      volumes: { elementId: string; value: number }[];
    }
  ): {
    summary: {
      totalElements: number;
      totalLength: number;
      totalArea: number;
      totalVolume: number;
    };
    byType: {
      elementType: string;
      count: number;
      length: number;
      area: number;
      volume: number;
    }[];
  } {
    const totalLength = quantities.lengths.reduce((sum, l) => sum + l.value, 0);
    const totalArea = quantities.areas.reduce((sum, a) => sum + a.value, 0);
    const totalVolume = quantities.volumes.reduce((sum, v) => sum + v.value, 0);
    const totalElements = elements.reduce((sum, e) => sum + e.count, 0);

    return {
      summary: {
        totalElements,
        totalLength: Math.round(totalLength * 100) / 100,
        totalArea: Math.round(totalArea * 100) / 100,
        totalVolume: Math.round(totalVolume * 100) / 100,
      },
      byType: elements.map(e => ({
        elementType: e.elementType,
        count: e.count,
        length: 0,
        area: 0,
        volume: 0,
      })),
    };
  }

  /**
   * Estimate costs based on quantities (simplified)
   */
  estimateCosts(
    quantities: {
      elementType: string;
      totalArea: number;
      totalVolume: number;
      count: number;
    }[],
    costDatabase: Record<string, { unit: string; price: number }>
  ): {
    elementType: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalCost: number;
  }[] {
    return quantities.map(q => {
      const costData = costDatabase[q.elementType] || { unit: 'un', price: 0 };
      const quantity = costData.unit === 'm²' ? q.totalArea :
                      costData.unit === 'm³' ? q.totalVolume :
                      q.count;

      return {
        elementType: q.elementType,
        quantity: Math.round(quantity * 100) / 100,
        unit: costData.unit,
        unitPrice: costData.price,
        totalCost: Math.round(quantity * costData.price * 100) / 100,
      };
    });
  }
}
