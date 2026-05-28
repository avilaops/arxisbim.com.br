import { describe, it, expect } from 'vitest';
import { IfcMaterialsService } from '../src/modules/ifc/ifc-materials.service';
import { IfcQuantitiesService } from '../src/modules/ifc/ifc-quantities.service';
import { IfcMepService } from '../src/modules/ifc/ifc-mep.service';

describe('IFC Advanced Services - Unit Tests', () => {
  describe('Materials Service', () => {
    const materialsService = new IfcMaterialsService();

    it('should extract materials from IFC content', () => {
      const mockIfc = `
#10=IFCMATERIAL('Concrete');
#11=IFCMATERIAL('Steel');
#12=IFCMATERIAL('Glass');
`;
      
      const materials = materialsService.extractMaterials(mockIfc);
      
      expect(materials.length).toBe(3);
      expect(materials[0].name).toBe('Concrete');
      expect(materials[0].category).toBe('concrete');
      expect(materials[1].name).toBe('Steel');
      expect(materials[1].category).toBe('steel');
    });

    it('should categorize materials correctly', () => {
      const mockIfc = `
#10=IFCMATERIAL('Concrete C30/37');
#11=IFCMATERIAL('Steel S355');
#12=IFCMATERIAL('Wooden Panel');
#13=IFCMATERIAL('Glass 8mm');
#14=IFCMATERIAL('Brick Masonry');
`;
      
      const materials = materialsService.extractMaterials(mockIfc);
      
      expect(materials.find(m => m.name.includes('Concrete'))?.category).toBe('concrete');
      expect(materials.find(m => m.name.includes('Steel'))?.category).toBe('steel');
      expect(materials.find(m => m.name.includes('Wooden'))?.category).toBe('wood');
      expect(materials.find(m => m.name.includes('Glass'))?.category).toBe('glass');
      expect(materials.find(m => m.name.includes('Brick'))?.category).toBe('masonry');
    });

    it('should generate material statistics', () => {
      const materials = [
        { materialId: '#1', name: 'Concrete', category: 'concrete' },
        { materialId: '#2', name: 'Concrete', category: 'concrete' },
        { materialId: '#3', name: 'Steel', category: 'steel' },
      ];

      const stats = materialsService.getMaterialStats(materials);

      expect(stats.totalMaterials).toBe(3);
      expect(stats.byCategory.concrete).toBe(2);
      expect(stats.byCategory.steel).toBe(1);
      expect(stats.topMaterials[0].name).toBe('Concrete');
      expect(stats.topMaterials[0].count).toBe(2);
    });
  });

  describe('Quantities Service', () => {
    const quantitiesService = new IfcQuantitiesService();

    it('should extract length quantities', () => {
      const mockIfc = `
#100=IFCQUANTITYLENGTH('Length',\$,\$,5.5);
#101=IFCQUANTITYLENGTH('Length',\$,\$,10.0);
`;

      const quantities = quantitiesService.extractCommonQuantities(mockIfc);

      expect(quantities.lengths.length).toBe(2);
      expect(quantities.lengths[0].value).toBe(5.5);
      expect(quantities.lengths[1].value).toBe(10.0);
    });

    it('should extract area quantities', () => {
      const mockIfc = `
#200=IFCQUANTITYAREA('GrossArea',\$,\$,25.5);
#201=IFCQUANTITYAREA('NetArea',\$,\$,20.0);
`;

      const quantities = quantitiesService.extractCommonQuantities(mockIfc);

      expect(quantities.areas.length).toBe(2);
      expect(quantities.areas[0].value).toBe(25.5);
      expect(quantities.areas[0].unit).toBe('m²');
    });

    it('should extract volume quantities', () => {
      const mockIfc = `
#300=IFCQUANTITYVOLUME('Volume',\$,\$,15.75);
`;

      const quantities = quantitiesService.extractCommonQuantities(mockIfc);

      expect(quantities.volumes.length).toBe(1);
      expect(quantities.volumes[0].value).toBe(15.75);
      expect(quantities.volumes[0].unit).toBe('m³');
    });

    it('should generate takeoff report', () => {
      const elements = [
        { elementType: 'IFCWALL', count: 10 },
        { elementType: 'IFCSLAB', count: 5 },
      ];

      const quantities = {
        lengths: [{ elementId: '#1', value: 100 }],
        areas: [{ elementId: '#2', value: 50 }],
        volumes: [{ elementId: '#3', value: 25 }],
      };

      const report = quantitiesService.generateTakeoffReport(elements, quantities);

      expect(report.summary.totalElements).toBe(15);
      expect(report.summary.totalLength).toBe(100);
      expect(report.summary.totalArea).toBe(50);
      expect(report.summary.totalVolume).toBe(25);
      expect(report.byType.length).toBe(2);
    });
  });

  describe('MEP Service', () => {
    const mepService = new IfcMepService();

    it('should extract HVAC elements', () => {
      const mockIfc = `
#100=IFCDUCTSEGMENT(...);
#101=IFCDUCTSEGMENT(...);
#102=IFCDUCTFITTING(...);
#103=IFCAIRTERMINAL(...);
`;

      const systems = mepService.extractMepSystems(mockIfc);
      const hvacSystem = systems.find(s => s.systemType === 'hvac');

      expect(hvacSystem).toBeDefined();
      expect(hvacSystem?.totalElements).toBeGreaterThan(0);
    });

    it('should extract plumbing elements', () => {
      const mockIfc = `
#200=IFCPIPESEGMENT(...);
#201=IFCPIPEFITTING(...);
#202=IFCVALVE(...);
#203=IFCSANITARYTERMINAL(...);
`;

      const systems = mepService.extractMepSystems(mockIfc);
      const plumbingSystem = systems.find(s => s.systemType === 'plumbing');

      expect(plumbingSystem).toBeDefined();
      expect(plumbingSystem?.elements.length).toBeGreaterThan(0);
    });

    it('should extract electrical elements', () => {
      const mockIfc = `
#300=IFCCABLESEGMENT(...);
#301=IFCCABLECARRIERSEGMENT(...);
#302=IFCLIGHTFIXTURE(...);
#303=IFCOUTLET(...);
`;

      const systems = mepService.extractMepSystems(mockIfc);
      const electricalSystem = systems.find(s => s.systemType === 'electrical');

      expect(electricalSystem).toBeDefined();
    });

    it('should analyze ductwork network', () => {
      const mockIfc = `
#100=IFCDUCTSEGMENT(...);
#101=IFCDUCTSEGMENT(...);
#102=IFCDUCTSEGMENT(...);
#103=IFCDUCTFITTING(...);
#104=IFCAIRTERMINAL(...);
`;

      const ductwork = mepService.analyzeDuctwork(mockIfc);

      expect(ductwork.totalDucts).toBe(3);
      expect(ductwork.totalFittings).toBe(1);
      expect(ductwork.terminals).toBe(1);
      expect(ductwork.complexity).toBe('simple');
    });

    it('should analyze piping network', () => {
      const mockIfc = `
#200=IFCPIPESEGMENT(...);
#201=IFCPIPESEGMENT(...);
#202=IFCPIPEFITTING(...);
#203=IFCVALVE(...);
#204=IFCSANITARYTERMINAL(...);
`;

      const piping = mepService.analyzePiping(mockIfc);

      expect(piping.totalPipes).toBe(2);
      expect(piping.totalFittings).toBe(1);
      expect(piping.valves).toBe(1);
      expect(piping.terminals).toBe(1);
    });

    it('should analyze electrical system', () => {
      const mockIfc = `
#300=IFCCABLESEGMENT(...);
#301=IFCCABLECARRIERSEGMENT(...);
#302=IFCLIGHTFIXTURE(...);
#303=IFCOUTLET(...);
#304=IFCDISTRIBUTIONBOARD(...);
`;

      const electrical = mepService.analyzeElectrical(mockIfc);

      expect(electrical.totalCables).toBe(1);
      expect(electrical.totalConduits).toBe(1);
      expect(electrical.lightFixtures).toBe(1);
      expect(electrical.outlets).toBe(1);
      expect(electrical.distributionBoards).toBe(1);
    });

    it('should generate MEP summary', () => {
      const mockIfc = `
#100=IFCDUCTSEGMENT(...);
#200=IFCPIPESEGMENT(...);
#300=IFCCABLESEGMENT(...);
`;

      const summary = mepService.getMepSummary(mockIfc);

      expect(summary.hasMep).toBe(true);
      expect(summary.systems.hvac).toBe(true);
      expect(summary.systems.plumbing).toBe(true);
      expect(summary.systems.electrical).toBe(true);
      expect(summary.totalMepElements).toBeGreaterThan(0);
    });

    it('should detect no MEP elements', () => {
      const mockIfc = `
#100=IFCWALL(...);
#101=IFCSLAB(...);
`;

      const summary = mepService.getMepSummary(mockIfc);

      expect(summary.hasMep).toBe(false);
      expect(summary.complexity).toBe('none');
      expect(summary.totalMepElements).toBe(0);
    });
  });
});
