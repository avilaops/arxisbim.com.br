/**
 * IFC MEP Service
 * Analyzes MEP (Mechanical, Electrical, Plumbing) systems in IFC files
 */
export class IfcMepService {
  /**
   * Extract MEP systems
   */
  extractMepSystems(content: string): {
    systemType: 'hvac' | 'plumbing' | 'electrical' | 'fire' | 'other';
    elements: {
      elementType: string;
      count: number;
      ids: string[];
    }[];
    totalElements: number;
  }[] {
    const systems: Map<string, { elementType: string; count: number; ids: string[] }[]> = new Map();

    // HVAC elements
    const hvacTypes = [
      'IFCDUCT',
      'IFCDUCTSEGMENT',
      'IFCDUCTFITTING',
      'IFCAIRTOAIRHEATRECOVERY',
      'IFCAIRTERMINAL',
      'IFCAIRTERMINALBOX',
      'IFCCHILLER',
      'IFCBOILER',
      'IFCFAN',
      'IFCFILTER',
      'IFCPUMP',
      'IFCHEATEXCHANGER',
    ];

    // Plumbing elements
    const plumbingTypes = [
      'IFCPIPESEGMENT',
      'IFCPIPEFITTING',
      'IFCVALVE',
      'IFCSANITARYTERMINAL',
      'IFCWASTETERMINAL',
      'IFCFIRESUPPRESSIONTERMINAL',
      'IFCSTACKTERMINAL',
    ];

    // Electrical elements  
    const electricalTypes = [
      'IFCCABLECARRIERSEGMENT',
      'IFCCABLESEGMENT',
      'IFCCABLECARRIERFITTING',
      'IFCCABLEFITTING',
      'IFCDISTRIBUTIONBOARD',
      'IFCELECTRICALDISTRIBUTIONBOARD',
      'IFCLIGHTFIXTURE',
      'IFCOUTLET',
      'IFCSWITCHINGDEVICE',
      'IFCJUNCTIONBOX',
    ];

    // Fire protection
    const fireTypes = [
      'IFCFIRESUPPRESSIONTERMINAL',
      'IFCFIREHYDRANT',
      'IFCSPRINKLER',
      'IFCALARM',
    ];

    const extractSystem = (types: string[], systemType: string) => {
      const elements: { elementType: string; count: number; ids: string[] }[] = [];
      
      types.forEach(type => {
        const regex = new RegExp(`#(\\d+)\\s*=\\s*${type}\\s*\\(`, 'g');
        const matches = Array.from(content.matchAll(regex));
        
        if (matches.length > 0) {
          elements.push({
            elementType: type,
            count: matches.length,
            ids: matches.map(m => `#${m[1]}`),
          });
        }
      });

      if (elements.length > 0) {
        systems.set(systemType, elements);
      }
    };

    extractSystem(hvacTypes, 'hvac');
    extractSystem(plumbingTypes, 'plumbing');
    extractSystem(electricalTypes, 'electrical');
    extractSystem(fireTypes, 'fire');

    return Array.from(systems.entries()).map(([systemType, elements]) => ({
      systemType: systemType as 'hvac' | 'plumbing' | 'electrical' | 'fire' | 'other',
      elements,
      totalElements: elements.reduce((sum, el) => sum + el.count, 0),
    }));
  }

  /**
   * Analyze ductwork network
   */
  analyzeDuctwork(content: string): {
    totalDucts: number;
    totalFittings: number;
    terminals: number;
    estimatedLength: number;
    complexity: 'simple' | 'moderate' | 'complex';
  } {
    const ductMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCDUCTSEGMENT\s*\(/g));
    const fittingMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCDUCTFITTING\s*\(/g));
    const terminalMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCAIRTERMINAL\s*\(/g));

    const totalDucts = ductMatches.length;
    const totalFittings = fittingMatches.length;
    const terminals = terminalMatches.length;

    // Estimate complexity
    let complexity: 'simple' | 'moderate' | 'complex';
    const totalComponents = totalDucts + totalFittings + terminals;
    
    if (totalComponents < 50) {
      complexity = 'simple';
    } else if (totalComponents < 200) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }

    return {
      totalDucts,
      totalFittings,
      terminals,
      estimatedLength: totalDucts * 3, // Rough estimate: 3m per segment
      complexity,
    };
  }

  /**
   * Analyze piping network
   */
  analyzePiping(content: string): {
    totalPipes: number;
    totalFittings: number;
    valves: number;
    terminals: number;
    estimatedLength: number;
    systems: {
      water: number;
      sanitary: number;
      fire: number;
      other: number;
    };
  } {
    const pipeMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCPIPESEGMENT\s*\(/g));
    const fittingMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCPIPEFITTING\s*\(/g));
    const valveMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCVALVE\s*\(/g));
    const sanitaryMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCSANITARYTERMINAL\s*\(/g));
    const fireMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCFIRESUPPRESSIONTERMINAL\s*\(/g));

    return {
      totalPipes: pipeMatches.length,
      totalFittings: fittingMatches.length,
      valves: valveMatches.length,
      terminals: sanitaryMatches.length,
      estimatedLength: pipeMatches.length * 2.5, // Rough estimate: 2.5m per segment
      systems: {
        water: Math.floor(pipeMatches.length * 0.4), // Rough distribution
        sanitary: sanitaryMatches.length,
        fire: fireMatches.length,
        other: Math.floor(pipeMatches.length * 0.3),
      },
    };
  }

  /**
   * Analyze electrical distribution
   */
  analyzeElectrical(content: string): {
    totalCables: number;
    totalConduits: number;
      outlets: number;
    lightFixtures: number;
    distributionBoards: number;
    estimatedLength: number;
  } {
    const cableMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCCABLESEGMENT\s*\(/g));
    const conduitMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCCABLECARRIERSEGMENT\s*\(/g));
    const outletMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCOUTLET\s*\(/g));
    const lightMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCLIGHTFIXTURE\s*\(/g));
    const boardMatches = Array.from(content.matchAll(/#(\d+)\s*=\s*IFCDISTRIBUTIONBOARD\s*\(/g));

    return {
      totalCables: cableMatches.length,
      totalConduits: conduitMatches.length,
      outlets: outletMatches.length,
      lightFixtures: lightMatches.length,
      distributionBoards: boardMatches.length,
      estimatedLength: (cableMatches.length + conduitMatches.length) * 10, // 10m average
    };
  }

  /**
   * Get MEP statistics summary
   */
  getMepSummary(content: string): {
    hasMep: boolean;
    systems: {
      hvac: boolean;
      plumbing: boolean;
      electrical: boolean;
      fire: boolean;
    };
    totalMepElements: number;
    complexity: 'none' | 'simple' | 'moderate' | 'complex' | 'very_complex';
    recommendations: string[];
  } {
    const mepSystems = this.extractMepSystems(content);
    const totalMepElements = mepSystems.reduce((sum, sys) => sum + sys.totalElements, 0);

    const hasMep = totalMepElements > 0;
    const systems = {
      hvac: mepSystems.some(s => s.systemType === 'hvac'),
      plumbing: mepSystems.some(s => s.systemType === 'plumbing'),
      electrical: mepSystems.some(s => s.systemType === 'electrical'),
      fire: mepSystems.some(s => s.systemType === 'fire'),
    };

    let complexity: 'none' | 'simple' | 'moderate' | 'complex' | 'very_complex';
    if (totalMepElements === 0) {
      complexity = 'none';
    } else if (totalMepElements < 100) {
      complexity = 'simple';
    } else if (totalMepElements < 500) {
      complexity = 'moderate';
    } else if (totalMepElements < 2000) {
      complexity = 'complex';
    } else {
      complexity = 'very_complex';
    }

    const recommendations: string[] = [];
    if (complexity === 'very_complex') {
      recommendations.push('Very complex MEP - consider system-based model organization');
    }
    if (systems.hvac && systems.plumbing && systems.electrical) {
      recommendations.push('Full MEP coordination required - use clash detection');
    }
    if (totalMepElements > 1000) {
      recommendations.push('Large MEP model - optimize for performance');
    }

    return {
      hasMep,
      systems,
      totalMepElements,
      complexity,
      recommendations,
    };
  }
}
