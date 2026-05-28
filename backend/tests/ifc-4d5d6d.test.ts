import { describe, it, expect } from 'vitest';
import { IfcSchedulesService } from '../src/modules/ifc/ifc-schedules.service';
import { IfcCostsService } from '../src/modules/ifc/ifc-costs.service';
import { IfcEnergyService } from '../src/modules/ifc/ifc-energy.service';
import { IfcCoordinationService } from '../src/modules/ifc/ifc-coordination.service';

describe('IFC 4D/5D/6D Services - Unit Tests', () => {
  describe('Schedules Service (4D)', () => {
    const schedulesService = new IfcSchedulesService();

    it('should extract tasks from schedule', () => {
      const mockIfc = `
#100=IFCTASK('Foundation Works',$,$,$,$);
#101=IFCTASK('Structure - Phase 1',$,$,$,$);
#102=IFCTASK('MEP Installation',$,$,$,$);
`;

      const tasks = schedulesService.extractTasks(mockIfc);

      expect(tasks.length).toBe(3);
      expect(tasks[0].name).toBe('Foundation Works');
      expect(tasks[1].name).toBe('Structure - Phase 1');
    });

    it('should extract work schedules', () => {
      const mockIfc = `
#200=IFCWORKSCHEDULE('Main Schedule',$,$,$,$);
#201=IFCWORKSCHEDULE('MEP Schedule',$,$,$,$);
`;

      const schedules = schedulesService.extractSchedules(mockIfc);

      expect(schedules.length).toBe(2);
      expect(schedules[0].name).toBe('Main Schedule');
      expect(schedules[1].name).toBe('MEP Schedule');
    });

    it('should analyze schedule with tasks', () => {
      const tasks = [
        { taskId: '#1', name: 'Task 1', isMilestone: false, status: 'COMPLETED' },
        { taskId: '#2', name: 'Task 2', isMilestone: true, status: 'IN_PROGRESS' },
        { taskId: '#3', name: 'Task 3', isMilestone: false, status: 'NOT_STARTED', duration: 10 },
        { taskId: '#4', name: 'Foundation-Work', isMilestone: false, status: 'COMPLETED', duration: 5 },
      ];

      const analysis = schedulesService.analyzeSchedule(tasks);

      expect(analysis.totalTasks).toBe(4);
      expect(analysis.totalMilestones).toBe(1);
      expect(analysis.completedTasks).toBe(2);
      expect(analysis.inProgressTasks).toBe(1);
      expect(analysis.notStartedTasks).toBe(1);
      expect(analysis.projectDuration).toBe(15);
      expect(analysis.phases.length).toBeGreaterThan(0);
    });

    it('should calculate project progress', () => {
      const tasks = [
        { taskId: '#1', name: 'Task 1', isMilestone: false, status: 'COMPLETED' },
        { taskId: '#2', name: 'Task 2', isMilestone: false, status: 'COMPLETED' },
        { taskId: '#3', name: 'Task 3', isMilestone: true, status: 'NOT_STARTED' },
        { taskId: '#4', name: 'Task 4', isMilestone: false, status: 'IN_PROGRESS' },
      ];

      const progress = schedulesService.calculateProgress(tasks);

      expect(progress.percentComplete).toBe(50);
      expect(progress.upcomingMilestones.length).toBeGreaterThan(0);
      expect(Array.isArray(progress.delayedTasks)).toBe(true);
    });

    it('should extract 4D mapping', () => {
      const mockIfc = `
#300=IFCRELASSIGNSTOTASK('guid',#1,'assign','',(#10,#11,#12),#100);
`;

      const mapping = schedulesService.extract4DMapping(mockIfc);

      expect(Array.isArray(mapping)).toBe(true);
    });

    it('should validate schedule', () => {
      const tasks = [
        { taskId: '#1', name: 'Task 1', isMilestone: false, startDate: new Date(), finishDate: new Date(), duration: 5 },
      ];

      const validation = schedulesService.validateSchedule(tasks);

      expect(validation.isValid).toBe(true);
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });
  });

  describe('Costs Service (5D)', () => {
    const costsService = new IfcCostsService();

    it('should extract cost items', () => {
      const mockIfc = `
#400=IFCCOSTITEM('Concrete Works',$,$,$,$);
#401=IFCCOSTITEM('Steel Structure',$,$,$,$);
#402=IFCCOSTITEM('MEP Installation',$,$,$,$);
`;

      const items = costsService.extractCostItems(mockIfc);

      expect(items.length).toBe(3);
      expect(items[0].name).toBe('Concrete Works');
      expect(items[0].category).toBeDefined();
    });

    it('should extract cost schedules', () => {
      const mockIfc = `
#500=IFCCOSTSCHEDULE('Project Budget',$,$,$,$);
#501=IFCCOSTSCHEDULE('Contingency Budget',$,$,$,$);
`;

      const schedules = costsService.extractCostSchedules(mockIfc);

      expect(schedules.length).toBe(2);
      expect(schedules[0].name).toBe('Project Budget');
    });

    it('should analyze costs', () => {
      const items = [
        { costItemId: '#1', name: 'Foundation', category: 'Structure', totalCost: 100000 },
        { costItemId: '#2', name: 'Walls', category: 'Structure', totalCost: 150000 },
        { costItemId: '#3', name: 'HVAC', category: 'MEP', totalCost: 50000 },
      ];

      const analysis = costsService.analyzeCosts(items, 400000);

      expect(analysis.totalCost).toBe(300000);
      expect(analysis.totalBudget).toBe(400000);
      expect(analysis.variance).toBe(100000);
      expect(analysis.variancePercent).toBe(25);
      expect(analysis.byCategory['Structure']).toBeDefined();
      expect(analysis.byCategory['Structure'].cost).toBe(250000);
      expect(analysis.topCostItems.length).toBeGreaterThan(0);
    });

    it('should estimate cost by discipline', () => {
      const items = [
        { costItemId: '#1', name: 'Arch - Walls', totalCost: 100000 },
        { costItemId: '#2', name: 'Struct - Columns', totalCost: 150000 },
        { costItemId: '#3', name: 'Struct - Beams', totalCost: 120000 },
        { costItemId: '#4', name: 'HVAC System', totalCost: 80000 },
      ];

      const byDiscipline = costsService.estimateCostByDiscipline(items);

      expect(byDiscipline.length).toBeGreaterThan(0);
      expect(byDiscipline[0].cost).toBeGreaterThan(0);
      expect(byDiscipline[0].itemCount).toBeGreaterThan(0);
    });

    it('should generate cost breakdown', () => {
      const items = [
        { costItemId: '#1', name: 'Item 1', category: 'Structure', totalCost: 100000 },
        { costItemId: '#2', name: 'Item 2', category: 'Structure', totalCost: 50000 },
        { costItemId: '#3', name: 'Item 3', category: 'MEP', totalCost: 75000 },
      ];

      const breakdown = costsService.generateCostBreakdown(items);

      expect(breakdown.grandTotal).toBe(225000);
      expect(breakdown.structure.length).toBeGreaterThan(0);
      expect(breakdown.structure[0].category).toBeDefined();
      expect(breakdown.structure[0].total).toBeGreaterThan(0);
    });

    it('should validate cost data', () => {
      const items = [
        { costItemId: '#1', name: 'Complete Item', totalCost: 100000, quantity: 10, unit: 'm3' },
        { costItemId: '#2', name: 'Incomplete Item' },
      ];

      const validation = costsService.validateCosts(items);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Energy Service (6D)', () => {
    const energyService = new IfcEnergyService();

    it('should extract energy elements', () => {
      const mockIfc = `
#600=IFCWALL('External Wall',$,$,$,$);
#601=IFCWINDOW('Window W1',$,$,$,$);
#602=IFCSLAB('Roof Slab',$,$,$,$);
`;

      const elements = energyService.extractEnergyElements(mockIfc);

      expect(elements.length).toBeGreaterThan(0);
      expect(elements.some(e => e.elementType === 'IFCWALL')).toBe(true);
    });

    it('should analyze energy performance', () => {
      const elements = [
        { elementId: '#1', elementType: 'IFCWALL', area: 100, energyProperties: { thermalTransmittance: 0.3 } },
        { elementId: '#2', elementType: 'IFCWINDOW', area: 20, energyProperties: { thermalTransmittance: 1.5 } },
        { elementId: '#3', elementType: 'IFCSLAB', area: 80, energyProperties: { thermalTransmittance: 0.25 } },
      ];

      const analysis = energyService.analyzeEnergy(elements);

      expect(analysis.totalExternalWallArea).toBeGreaterThanOrEqual(0);
      expect(analysis.totalWindowArea).toBeGreaterThanOrEqual(0);
      expect(analysis.windowToWallRatio).toBeGreaterThanOrEqual(0);
      expect(analysis.averageUValue).toBeGreaterThan(0);
      expect(analysis.thermalEnvelope).toBeDefined();
    });

    it('should analyze sustainability metrics', () => {
      const analysis = {
        totalExternalWallArea: 100,
        totalWindowArea: 30,
        totalRoofArea: 80,
        windowToWallRatio: 30,
        averageUValue: 0.8,
        thermalEnvelope: { walls: 0.3, windows: 1.5, roof: 0.25, floor: 0.3 },
        estimatedEnergyDemand: 80,
      };

      const sustainability = energyService.analyzeSustainability(analysis);

      expect(sustainability.energyEfficiencyRating).toBeDefined();
      expect(['A', 'B', 'C', 'D', 'E']).toContain(sustainability.energyEfficiencyRating);
      expect(Array.isArray(sustainability.recommendations)).toBe(true);
    });

    it('should calculate solar gain', () => {
      const windows = [
        { elementId: '#1', elementType: 'IFCWINDOW', area: 10 },
        { elementId: '#2', elementType: 'IFCWINDOW', area: 15 },
      ];

      const solarGain = energyService.calculateSolarGain(windows);

      expect(solarGain.totalGlazedArea).toBe(25);
      expect(solarGain.solarHeatGainCoefficient).toBeGreaterThan(0);
      expect(solarGain.estimatedSolarGain).toBeGreaterThan(0);
    });

    it('should validate energy data', () => {
      const elements = [
        { elementId: '#1', elementType: 'IFCWALL', area: 100, energyProperties: { thermalTransmittance: 0.3 } },
        { elementId: '#2', elementType: 'IFCWINDOW' }, // Missing properties
      ];

      const validation = energyService.validateEnergyData(elements);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Coordination Service', () => {
    const coordinationService = new IfcCoordinationService();

    it('should detect clashes', () => {
      const mockIfc = `
#700=IFCBEAM('Beam B1',$,$,$,$);
#701=IFCDUCTFITTING('Duct D1',$,$,$,$);
#702=IFCCOLUMN('Column C1',$,$,$,$);
`;

      const clashes = coordinationService.detectClashes(mockIfc);

      expect(Array.isArray(clashes)).toBe(true);
      // Note: Actual clash detection would require geometric analysis
    });

    it('should analyze clashes', () => {
      const clashes = [
        { clashId: '#1', type: 'hard', severity: 'critical', element1: '#10', element2: '#20', discipline1: 'MEP', discipline2: 'Structural' },
        { clashId: '#2', type: 'hard', severity: 'major', element1: '#11', element2: '#21', discipline1: 'MEP', discipline2: 'Structural' },
        { clashId: '#3', type: 'soft', severity: 'minor', element1: '#12', element2: '#22', discipline1: 'Architecture', discipline2: 'MEP' },
        { clashId: '#4', type: 'clearance', severity: 'minor', element1: '#13', element2: '#23', discipline1: 'MEP', discipline2: 'MEP' },
      ];

      const analysis = coordinationService.analyzeClashes(clashes);

      expect(analysis.totalClashes).toBe(4);
      expect(analysis.hardClashes).toBe(2);
      expect(analysis.softClashes).toBe(1);
      expect(analysis.clearanceClashes).toBe(1);
      expect(analysis.bySeverity.critical).toBe(1);
      expect(analysis.bySeverity.major).toBe(1);
      expect(analysis.bySeverity.minor).toBe(2);
      expect(analysis.clashMatrix.length).toBeGreaterThan(0);
    });

    it('should generate coordination report', () => {
      const clashes = [
        { clashId: '#1', type: 'hard', severity: 'major', element1: '#10', element2: '#20', discipline1: 'MEP', discipline2: 'Structural' },
      ];

      const report = coordinationService.generateCoordinationReport('model-123', clashes);

      expect(report.modelId).toBe('model-123');
      expect(report.analyzedDate).toBeInstanceOf(Date);
      expect(report.clashes.length).toBe(1);
      expect(report.analysis).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should identify conflict zones', () => {
      const clashes = [
        { clashId: '#1', type: 'hard', severity: 'major', element1: '#10', element2: '#20', location: { x: 0, y: 0, z: 0 } },
        { clashId: '#2', type: 'hard', severity: 'major', element1: '#11', element2: '#21', location: { x: 0, y: 0, z: 1 } },
        { clashId: '#3', type: 'hard', severity: 'major', element1: '#12', element2: '#22', location: { x: 0, y: 0, z: 3 } },
      ];

      const zones = coordinationService.identifyConflictZones(clashes);

      expect(zones.length).toBeGreaterThan(0);
      expect(zones[0].zone).toBeDefined();
      expect(zones[0].clashCount).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(zones[0].severity);
    });

    it('should prioritize clashes', () => {
      const clashes = [
        { clashId: '#1', type: 'soft', severity: 'minor', element1: '#10', element2: '#20' },
        { clashId: '#2', type: 'hard', severity: 'critical', element1: '#11', element2: '#21' },
        { clashId: '#3', type: 'hard', severity: 'major', element1: '#12', element2: '#22' },
      ];

      const prioritized = coordinationService.prioritizeClashes(clashes);

      expect(prioritized[0].severity).toBe('critical');
      expect(prioritized[prioritized.length - 1].severity).toBe('minor');
    });

    it('should validate coordination', () => {
      const clashes = [
        { clashId: '#1', type: 'hard', severity: 'major', element1: '#10', element2: '#20' },
        { clashId: '#2', type: 'soft', severity: 'minor', element1: '#11', element2: '#21' },
      ];

      const validation = coordinationService.validateCoordination(clashes);

      expect(validation.isValid).toBe(false); // Has hard clashes
      expect(validation.coordinationScore).toBeGreaterThanOrEqual(0);
      expect(validation.coordinationScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });
  });
});
