import { describe, it, expect } from 'vitest';
import { IfcSchedulesService } from '../src/modules/ifc/ifc-schedules.service';
import { IfcCostsService } from '../src/modules/ifc/ifc-costs.service';
import { IfcEnergyService } from '../src/modules/ifc/ifc-energy.service';
import { IfcCoordinationService } from '../src/modules/ifc/ifc-coordination.service';

const MOCK_IFC_CONTENT = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('test.ifc','2024-01-01T00:00:00',(''),(''),('IfcOpenShell'),'','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('project',$,'Test Project',$,$,$,$,(#2),#3);
#100=IFCTASK('Foundation Works',$,$,$,$);
#101=IFCWORKSCHEDULE('Main Schedule',$,$,$,$);
#200=IFCCOSTITEM('Concrete Works',$,$,$,$);
#201=IFCCOSTSCHEDULE('Project Budget',$,$,$,$);
#300=IFCWALL('External Wall',$,$,$,$);
#301=IFCWINDOW('Window W1',$,$,$,$);
#302=IFCBEAM('Beam B1',$,$,$,$);
#303=IFCDUCTFITTING('Duct D1',$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

describe('IFC Services - 4D/5D/6D Integration Tests', () => {
  const schedulesService = new IfcSchedulesService();
  const costsService = new IfcCostsService();
  const energyService = new IfcEnergyService();
  const coordinationService = new IfcCoordinationService();

  describe('Schedules Service Integration', () => {
    it('should extract and analyze complete schedule workflow', () => {
      const tasks = schedulesService.extractTasks(MOCK_IFC_CONTENT);
      const schedules = schedulesService.extractSchedules(MOCK_IFC_CONTENT);
      
      expect(tasks.length).toBeGreaterThan(0);
      expect(schedules.length).toBeGreaterThan(0);
      
      const analysis = schedulesService.analyzeSchedule(tasks);
      expect(analysis.totalTasks).toBe(tasks.length);
      expect(analysis.phases).toBeDefined();
    });

    it('should calculate progress and validate schedule', () => {
      const tasks = schedulesService.extractTasks(MOCK_IFC_CONTENT);
      const progress = schedulesService.calculateProgress(tasks);
      
      expect(progress.percentComplete).toBeGreaterThanOrEqual(0);
      expect(progress.percentComplete).toBeLessThanOrEqual(100);
      
      const validation = schedulesService.validateSchedule(tasks);
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
    });

    it('should extract 4D mapping successfully', () => {
      const mapping = schedulesService.extract4DMapping(MOCK_IFC_CONTENT);
      expect(Array.isArray(mapping)).toBe(true);
    });
  });

  describe('Costs Service Integration', () => {
    it('should extract and analyze complete cost workflow', () => {
      const items = costsService.extractCostItems(MOCK_IFC_CONTENT);
      const schedules = costsService.extractCostSchedules(MOCK_IFC_CONTENT);
      
      expect(items.length).toBeGreaterThan(0);
      expect(schedules.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('name');
      expect(items[0]).toHaveProperty('category');
    });

    it('should analyze costs and generate breakdown', () => {
      const items = costsService.extractCostItems(MOCK_IFC_CONTENT);
      const analysis = costsService.analyzeCosts(items);
      
      expect(analysis).toHaveProperty('totalCost');
      expect(analysis).toHaveProperty('byCategory');
      
      const breakdown = costsService.generateCostBreakdown(items);
      expect(breakdown).toHaveProperty('grandTotal');
      expect(breakdown).toHaveProperty('structure');
    });

    it('should estimate costs by discipline', () => {
      const items = costsService.extractCostItems(MOCK_IFC_CONTENT);
      const byDiscipline = costsService.estimateCostByDiscipline(items);
      
      expect(Array.isArray(byDiscipline)).toBe(true);
    });

    it('should validate cost data', () => {
      const items = costsService.extractCostItems(MOCK_IFC_CONTENT);
      const validation = costsService.validateCosts(items);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('recommendations');
    });
  });

  describe('Energy Service Integration', () => {
    it('should extract energy elements and analyze performance', () => {
      const elements = energyService.extractEnergyElements(MOCK_IFC_CONTENT);
      
      expect(elements.length).toBeGreaterThan(0);
      
      const analysis = energyService.analyzeEnergy(elements);
      expect(analysis).toHaveProperty('windowToWallRatio');
      expect(analysis).toHaveProperty('averageUValue');
      expect(analysis).toHaveProperty('thermalEnvelope');
    });

    it('should analyze sustainability metrics', () => {
      const elements = energyService.extractEnergyElements(MOCK_IFC_CONTENT);
      const analysis = energyService.analyzeEnergy(elements);
      const sustainability = energyService.analyzeSustainability(analysis);
      
      expect(sustainability).toHaveProperty('energyEfficiencyRating');
      expect(['A', 'B', 'C', 'D', 'E']).toContain(sustainability.energyEfficiencyRating);
      expect(Array.isArray(sustainability.recommendations)).toBe(true);
    });

    it('should calculate solar gain for windows', () => {
      const elements = energyService.extractEnergyElements(MOCK_IFC_CONTENT);
      const windows = elements.filter(e => e.elementType === 'IFCWINDOW');
      const solarGain = energyService.calculateSolarGain(windows);
      
      expect(solarGain).toHaveProperty('totalGlazedArea');
      expect(solarGain).toHaveProperty('solarHeatGainCoefficient');
      expect(solarGain).toHaveProperty('estimatedSolarGain');
    });

    it('should validate energy data', () => {
      const elements = energyService.extractEnergyElements(MOCK_IFC_CONTENT);
      const validation = energyService.validateEnergyData(elements);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('recommendations');
    });
  });

  describe('Coordination Service Integration', () => {
    it('should detect clashes and analyze coordination', () => {
      const clashes = coordinationService.detectClashes(MOCK_IFC_CONTENT);
      
      expect(Array.isArray(clashes)).toBe(true);
      
      const analysis = coordinationService.analyzeClashes(clashes);
      expect(analysis).toHaveProperty('totalClashes');
      expect(analysis).toHaveProperty('bySeverity');
      expect(analysis).toHaveProperty('clashMatrix');
    });

    it('should generate coordination report', () => {
      const clashes = coordinationService.detectClashes(MOCK_IFC_CONTENT);
      const report = coordinationService.generateCoordinationReport('model-123', clashes);
      
      expect(report).toHaveProperty('modelId', 'model-123');
      expect(report).toHaveProperty('analyzedDate');
      expect(report.analyzedDate).toBeInstanceOf(Date);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should identify conflict zones', () => {
      const clashes = coordinationService.detectClashes(MOCK_IFC_CONTENT);
      const zones = coordinationService.identifyConflictZones(clashes);
      
      expect(Array.isArray(zones)).toBe(true);
    });

    it('should prioritize clashes by severity', () => {
      const mockClashes = [
        { clashId: '#1', type: 'soft' as const, severity: 'minor' as const, element1: '#10', element2: '#20' },
        { clashId: '#2', type: 'hard' as const, severity: 'critical' as const, element1: '#11', element2: '#21' },
      ];
      
      const prioritized = coordinationService.prioritizeClashes(mockClashes);
      expect(prioritized[0].severity).toBe('critical');
    });

    it('should validate coordination with score', () => {
      const clashes = coordinationService.detectClashes(MOCK_IFC_CONTENT);
      const validation = coordinationService.validateCoordination(clashes);
      
      expect(validation).toHaveProperty('coordinationScore');
      expect(validation.coordinationScore).toBeGreaterThanOrEqual(0);
      expect(validation.coordinationScore).toBeLessThanOrEqual(100);
      expect(validation).toHaveProperty('isValid');
    });
  });
});
