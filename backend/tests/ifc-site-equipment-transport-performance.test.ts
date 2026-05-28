import { describe, it, expect } from 'vitest';
import { IfcSiteService } from '../src/modules/ifc/ifc-site.service';
import { IfcEquipmentService } from '../src/modules/ifc/ifc-equipment.service';
import { IfcTransportService } from '../src/modules/ifc/ifc-transport.service';
import { IfcPerformanceService } from '../src/modules/ifc/ifc-performance.service';

const MOCK_IFC_SITE = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('site.ifc','2024-01-01T00:00:00',(''),(''),('IfcOpenShell'),'','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('project',$,'Test Project',$,$,$,$,(#2),#3);
#100=IFCSITE('Site 01',$,$,$,$);
#101=IFCCIVILELEMENTTYPE('Road Access',$,$,$,$);
#102=IFCGEOGRAPHICELEMENT('Drainage System',$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

const MOCK_IFC_EQUIPMENT = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('equipment.ifc','2024-01-01T00:00:00',(''),(''),('IfcOpenShell'),'','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('project',$,'Test Project',$,$,$,$,(#2),#3);
#200=IFCFURNISHINGELEMENT('Office Chair',$,$,$,$);
#201=IFCFURNISHINGELEMENT('Desk',$,$,$,$);
#202=IFCEQUIPMENTELEMENT('Server Equipment',$,$,$,$);
#203=IFCELECTRICAPPLIANCE('Refrigerator',$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

const MOCK_IFC_TRANSPORT = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('transport.ifc','2024-01-01T00:00:00',(''),(''),('IfcOpenShell'),'','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('project',$,'Test Project',$,$,$,$,(#2),#3);
#300=IFCTRANSPORTELEMENT('Elevator 01',$,$,$,$);
#301=IFCTRANSPORTELEMENT('Escalator Main',$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

const MOCK_IFC_PERFORMANCE = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('performance.ifc','2024-01-01T00:00:00',(''),(''),('IfcOpenShell'),'','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('project',$,'Test Project',$,$,$,$,(#2),#3);
#400=IFCWALL('Acoustic Wall',$,$,$,$);
#401=IFCWINDOW('Window with Light',$,$,$,$);
ENDSEC;
END-ISO-10303-21;
`;

describe('IFC Site & Civil Works Service', () => {
  const siteService = new IfcSiteService();

  describe('Site Elements Extraction', () => {
    it('should extract site elements', () => {
      const elements = siteService.extractSiteElements(MOCK_IFC_SITE);
      
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0]).toHaveProperty('elementId');
      expect(elements[0]).toHaveProperty('elementType', 'IFCSITE');
      expect(elements[0]).toHaveProperty('name');
    });

    it('should extract civil infrastructure elements', () => {
      const elements = siteService.extractCivilElements(MOCK_IFC_SITE);
      
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0]).toHaveProperty('category');
    });
  });

  describe('Site Analysis', () => {
    it('should analyze site characteristics', () => {
      const elements = siteService.extractSiteElements(MOCK_IFC_SITE);
      const analysis = siteService.analyzeSite(elements);
      
      expect(analysis).toHaveProperty('totalArea');
      expect(analysis).toHaveProperty('buildableArea');
      expect(analysis).toHaveProperty('coverage');
      expect(analysis).toHaveProperty('topography');
      expect(analysis.topography).toHaveProperty('slope');
    });

    it('should analyze civil infrastructure distribution', () => {
      const elements = siteService.extractCivilElements(MOCK_IFC_SITE);
      const infrastructure = siteService.analyzeCivilInfrastructure(elements);
      
      expect(infrastructure).toHaveProperty('total');
      expect(infrastructure).toHaveProperty('roads');
      expect(infrastructure).toHaveProperty('drainage');
    });

    it('should calculate earthwork volumes', () => {
      const elements = siteService.extractSiteElements(MOCK_IFC_SITE);
      const earthworks = siteService.calculateEarthworks(elements);
      
      expect(earthworks).toHaveProperty('cutVolume');
      expect(earthworks).toHaveProperty('fillVolume');
      expect(earthworks).toHaveProperty('netVolume');
      expect(earthworks).toHaveProperty('balanceRatio');
    });
  });

  describe('Site Validation', () => {
    it('should validate site layout', () => {
      const siteElements = siteService.extractSiteElements(MOCK_IFC_SITE);
      const civilElements = siteService.extractCivilElements(MOCK_IFC_SITE);
      const validation = siteService.validateSiteLayout(siteElements, civilElements);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(validation).toHaveProperty('recommendations');
      expect(validation).toHaveProperty('complianceScore');
    });

    it('should generate site report', () => {
      const elements = siteService.extractSiteElements(MOCK_IFC_SITE);
      const analysis = siteService.analyzeSite(elements);
      const report = siteService.generateSiteReport(elements, analysis);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('keyMetrics');
      expect(report).toHaveProperty('recommendations');
    });
  });
});

describe('IFC Equipment & Furniture Service', () => {
  const equipmentService = new IfcEquipmentService();

  describe('Equipment Extraction', () => {
    it('should extract furniture elements', () => {
      const furniture = equipmentService.extractFurniture(MOCK_IFC_EQUIPMENT);
      
      expect(furniture.length).toBeGreaterThan(0);
      expect(furniture[0]).toHaveProperty('category', 'furniture');
      expect(furniture[0]).toHaveProperty('quantity');
    });

    it('should extract equipment elements', () => {
      const equipment = equipmentService.extractEquipment(MOCK_IFC_EQUIPMENT);
      
      expect(equipment.length).toBeGreaterThan(0);
      expect(equipment[0]).toHaveProperty('elementType');
    });
  });

  describe('Equipment Analysis', () => {
    it('should analyze equipment distribution', () => {
      const furniture = equipmentService.extractFurniture(MOCK_IFC_EQUIPMENT);
      const equipment = equipmentService.extractEquipment(MOCK_IFC_EQUIPMENT);
      const allItems = [...furniture, ...equipment];
      const analysis = equipmentService.analyzeEquipment(allItems);
      
      expect(analysis).toHaveProperty('totalItems');
      expect(analysis).toHaveProperty('byCategory');
      expect(analysis).toHaveProperty('byType');
    });

    it('should generate furniture schedule', () => {
      const furniture = equipmentService.extractFurniture(MOCK_IFC_EQUIPMENT);
      const schedule = equipmentService.generateFurnitureSchedule(furniture);
      
      expect(Array.isArray(schedule)).toBe(true);
      if (schedule.length > 0) {
        expect(schedule[0]).toHaveProperty('category');
        expect(schedule[0]).toHaveProperty('items');
        expect(schedule[0]).toHaveProperty('totalQuantity');
      }
    });

    it('should analyze space utilization', () => {
      const furniture = equipmentService.extractFurniture(MOCK_IFC_EQUIPMENT);
      const utilization = equipmentService.analyzeSpaceUtilization(furniture);
      
      expect(Array.isArray(utilization)).toBe(true);
      if (utilization.length > 0) {
        expect(utilization[0]).toHaveProperty('density');
        expect(utilization[0]).toHaveProperty('utilization');
      }
    });
  });

  describe('Equipment Validation & Costs', () => {
    it('should validate equipment completeness', () => {
      const furniture = equipmentService.extractFurniture(MOCK_IFC_EQUIPMENT);
      const validation = equipmentService.validateEquipment(furniture);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('completeness');
    });

    it('should estimate equipment costs', () => {
      const furniture = equipmentService.extractFurniture(MOCK_IFC_EQUIPMENT);
      const costs = equipmentService.estimateEquipmentCosts(furniture);
      
      expect(costs).toHaveProperty('total');
      expect(costs).toHaveProperty('byCategory');
      expect(costs).toHaveProperty('breakdown');
    });

    it('should generate procurement report', () => {
      const furniture = equipmentService.extractFurniture(MOCK_IFC_EQUIPMENT);
      const report = equipmentService.generateProcurementReport(furniture);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('totalItems');
      expect(report).toHaveProperty('estimatedCost');
    });
  });
});

describe('IFC Transport Elements Service', () => {
  const transportService = new IfcTransportService();

  describe('Transport Extraction', () => {
    it('should extract transport elements', () => {
      const elements = transportService.extractTransportElements(MOCK_IFC_TRANSPORT);
      
      expect(elements.length).toBeGreaterThan(0);
      expect(elements[0]).toHaveProperty('category');
    });
  });

  describe('Transport Analysis', () => {
    it('should analyze transport distribution', () => {
      const elements = transportService.extractTransportElements(MOCK_IFC_TRANSPORT);
      const analysis = transportService.analyzeTransport(elements);
      
      expect(analysis).toHaveProperty('totalElements');
      expect(analysis).toHaveProperty('byType');
      expect(analysis).toHaveProperty('totalCapacity');
    });

    it('should group elevators into zones', () => {
      const elements = transportService.extractTransportElements(MOCK_IFC_TRANSPORT);
      const groups = transportService.groupElevators(elements);
      
      expect(Array.isArray(groups)).toBe(true);
    });

    it('should calculate transport performance', () => {
      const elements = transportService.extractTransportElements(MOCK_IFC_TRANSPORT);
      const performance = transportService.calculatePerformance(elements);
      
      expect(performance).toHaveProperty('waitTime');
      expect(performance).toHaveProperty('efficiency');
      expect(performance).toHaveProperty('adequacy');
    });
  });

  describe('Transport Validation & Costs', () => {
    it('should validate transport system', () => {
      const elements = transportService.extractTransportElements(MOCK_IFC_TRANSPORT);
      const validation = transportService.validateTransportSystem(elements);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('complianceScore');
    });

    it('should estimate transport costs', () => {
      const elements = transportService.extractTransportElements(MOCK_IFC_TRANSPORT);
      const costs = transportService.estimateTransportCosts(elements);
      
      expect(costs).toHaveProperty('total');
      expect(costs).toHaveProperty('breakdown');
    });

    it('should generate transport report', () => {
      const elements = transportService.extractTransportElements(MOCK_IFC_TRANSPORT);
      const performance = transportService.calculatePerformance(elements);
      const report = transportService.generateTransportReport(elements, performance);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('keyMetrics');
    });
  });
});

describe('IFC Performance Analysis Service', () => {
  const performanceService = new IfcPerformanceService();

  describe('Performance Extraction', () => {
    it('should extract performance elements', () => {
      const elements = performanceService.extractPerformanceElements(MOCK_IFC_PERFORMANCE);
      
      expect(Array.isArray(elements)).toBe(true);
    });
  });

  describe('Acoustic & Lighting Analysis', () => {
    it('should analyze acoustic performance', () => {
      const elements = performanceService.extractPerformanceElements(MOCK_IFC_PERFORMANCE);
      const acoustic = performanceService.analyzeAcoustic(elements);
      
      expect(acoustic).toHaveProperty('soundTransmissionClass');
      expect(acoustic).toHaveProperty('noiseCriteria');
      expect(acoustic).toHaveProperty('adequacy');
    });

    it('should analyze lighting performance', () => {
      const elements = performanceService.extractPerformanceElements(MOCK_IFC_PERFORMANCE);
      const lighting = performanceService.analyzeLighting(elements);
      
      expect(lighting).toHaveProperty('illuminance');
      expect(lighting).toHaveProperty('uniformity');
      expect(lighting).toHaveProperty('adequacy');
    });

    it('should analyze overall performance', () => {
      const elements = performanceService.extractPerformanceElements(MOCK_IFC_PERFORMANCE);
      const performance = performanceService.analyzePerformance(elements);
      
      expect(performance).toHaveProperty('acoustic');
      expect(performance).toHaveProperty('lighting');
      expect(performance).toHaveProperty('thermal');
      expect(performance).toHaveProperty('airQuality');
    });
  });

  describe('Performance Validation & Reports', () => {
    it('should validate performance against standards', () => {
      const elements = performanceService.extractPerformanceElements(MOCK_IFC_PERFORMANCE);
      const performance = performanceService.analyzePerformance(elements);
      const validation = performanceService.validatePerformance(performance);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('overallScore');
      expect(validation).toHaveProperty('recommendations');
    });

    it('should generate performance report', () => {
      const elements = performanceService.extractPerformanceElements(MOCK_IFC_PERFORMANCE);
      const performance = performanceService.analyzePerformance(elements);
      const report = performanceService.generatePerformanceReport(performance);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('ratings');
    });

    it('should benchmark performance', () => {
      const elements = performanceService.extractPerformanceElements(MOCK_IFC_PERFORMANCE);
      const performance = performanceService.analyzePerformance(elements);
      const benchmark = performanceService.benchmarkPerformance(performance, 'office');
      
      expect(Array.isArray(benchmark)).toBe(true);
      if (benchmark.length > 0) {
        expect(benchmark[0]).toHaveProperty('category');
        expect(benchmark[0]).toHaveProperty('actual');
        expect(benchmark[0]).toHaveProperty('benchmark');
        expect(benchmark[0]).toHaveProperty('status');
      }
    });
  });
});
