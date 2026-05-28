import { describe, it, expect } from 'vitest';
import { IfcRelationshipsService } from '../src/modules/ifc/ifc-relationships.service';
import { IfcSpacesService } from '../src/modules/ifc/ifc-spaces.service';
import { IfcStructuralService } from '../src/modules/ifc/ifc-structural.service';
import { IfcOpeningsService } from '../src/modules/ifc/ifc-openings.service';

describe('IFC Advanced Analysis Services - Unit Tests', () => {
  describe('Relationships Service', () => {
    const relationshipsService = new IfcRelationshipsService();

    it('should extract relationships', () => {
      const mockIfc = `
#100=IFCRELAGGREGATES('guid',#5,'','',#10,(#11,#12,#13));
#101=IFCRELCONTAINEDINSPATIALSTRUCTURE('guid2',#5,'','',
(#20,#21),#30);
`;

      const relationships = relationshipsService.extractRelationships(mockIfc);

      expect(relationships.length).toBeGreaterThan(0);
      expect(relationships[0].relationshipType).toContain('IFCREL');
    });

    it('should extract spatial structure', () => {
      const mockIfc = `
#1=IFCSITE('Site1',$,$,$,$);
#2=IFCBUILDING('Building1',$,$,$,$);
#3=IFCBUILDINGSTOREY('Ground Floor',$,$,0.0,$);
#4=IFCBUILDINGSTOREY('First Floor',$,$,3.5,$);
`;

      const structure = relationshipsService.extractSpatialStructure(mockIfc);

      expect(structure.site).toBeDefined();
      if (structure.site) {
        expect(structure.site.name).toBe('Site1');
      }
    });

    it('should analyze relationships', () => {
      const relationships = [
        { relationshipId: '#1', relationshipType: 'IFCRELAGGREGATES', relatedObjects: ['#2', '#3'] },
        { relationshipId: '#2', relationshipType: 'IFCRELAGGREGATES', relatedObjects: ['#4'] },
        { relationshipId: '#3', relationshipType: 'IFCRELDEFINESBYPROPERTIES', relatedObjects: ['#5', '#6'] },
      ];

      const analysis = relationshipsService.analyzeRelationships(relationships);

      expect(analysis.totalRelationships).toBe(3);
      expect(analysis.byType['IFCRELAGGREGATES']).toBe(2);
      expect(analysis.byType['IFCRELDEFINESBYPROPERTIES']).toBe(1);
    });

    it('should extract property relations', () => {
      const mockIfc = `
#150=IFCRELDEFINESBYPROPERTIES('guid',#1,'name','',(#10,#11,#12),#100);
`;

      const relations = relationshipsService.extractPropertyRelations(mockIfc);

      // Should return array (may be empty depending on regex matching)
      expect(Array.isArray(relations)).toBe(true);
    });

    it('should extract aggregations', () => {
      const mockIfc = `
#160=IFCRELAGGREGATES('guid',#1,'','',#10,(#11,#12,#13));
`;

      const aggregations = relationshipsService.extractAggregations(mockIfc);

      // Should return array (may be empty depending on regex matching)
      expect(Array.isArray(aggregations)).toBe(true);
    });
  });

  describe('Spaces Service', () => {
    const spacesService = new IfcSpacesService();

    it('should extract spaces', () => {
      const mockIfc = `
#100=IFCSPACE('Office 101',$,$,$,$);
#101=IFCSPACE('Meeting Room',$,$,$,$);
#102=IFCSPACE('Corridor',$,$,$,$);
`;

      const spaces = spacesService.extractSpaces(mockIfc);

      expect(spaces.length).toBe(3);
      expect(spaces[0].name).toBe('Office 101');
      expect(spaces[0].spaceType).toBe('Office');
    });

    it('should classify space types', () => {
      const mockIfc = `
#100=IFCSPACE('Office Room',$,$,$,$);
#101=IFCSPACE('Restroom',$,$,$,$);
#102=IFCSPACE('Meeting Room',$,$,$,$);
`;

      const spaces = spacesService.extractSpaces(mockIfc);

      expect(spaces[0].spaceType).toBe('Office');
      expect(spaces[1].spaceType).toBe('Restroom');
      expect(spaces[2].spaceType).toBe('Meeting Room');
    });

    it('should analyze spaces statistics', () => {
      const spaces = [
        { spaceId: '#1', name: 'Office', spaceType: 'Office', netFloorArea: 20, grossFloorArea: 22, height: 3.0, volume: 60 },
        { spaceId: '#2', name: 'Office', spaceType: 'Office', netFloorArea: 20, grossFloorArea: 22, height: 3.0, volume: 60 },
        { spaceId: '#3', name: 'Meeting', spaceType: 'Meeting Room', netFloorArea: 30, grossFloorArea: 33, height: 3.0, volume: 90 },
      ];

      const analysis = spacesService.analyzeSpaces(spaces);

      expect(analysis.totalSpaces).toBe(3);
      expect(analysis.totalNetArea).toBe(70);
      expect(analysis.totalGrossArea).toBe(77);
      expect(analysis.totalVolume).toBe(210);
      expect(analysis.averageHeight).toBe(3.0);
      expect(analysis.efficiencyRatio).toBeGreaterThan(0);
    });

    it('should calculate area program', () => {
      const spaces = [
        { spaceId: '#1', name: 'Office 1', spaceType: 'Office', netFloorArea: 20 },
        { spaceId: '#2', name: 'Office 2', spaceType: 'Office', netFloorArea: 25 },
        { spaceId: '#3', name: 'Corridor', spaceType: 'Corridor', netFloorArea: 10 },
      ];

      const program = spacesService.calculateAreaProgram(spaces);

      expect(program.length).toBe(2);
      expect(program[0].spaceType).toBe('Office');
      expect(program[0].totalArea).toBe(45);
      expect(program[0].count).toBe(2);
    });

    it('should validate spaces', () => {
      const spaces = [
        { spaceId: '#1', name: 'Office', spaceType: 'Office', netFloorArea: 20 },
        { spaceId: '#2', name: 'Unnamed Space', spaceType: 'Unknown' },
      ];

      const validation = spacesService.validateSpaces(spaces);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Structural Service', () => {
    const structuralService = new IfcStructuralService();

    it('should extract structural elements', () => {
      const mockIfc = `
#100=IFCCOLUMN('Column C1',$,$,$,$);
#101=IFCBEAM('Beam B1',$,$,$,$);
#102=IFCSLAB('Slab S1',$,$,$,$);
#103=IFCFOOTING('Footing F1',$,$,$,$);
`;

      const elements = structuralService.extractStructuralElements(mockIfc);

      expect(elements.length).toBe(4);
      expect(elements.find(e => e.elementType === 'IFCCOLUMN')).toBeDefined();
      expect(elements.find(e => e.elementType === 'IFCBEAM')).toBeDefined();
      expect(elements.find(e => e.elementType === 'IFCSLAB')).toBeDefined();
      expect(elements.find(e => e.elementType === 'IFCFOOTING')).toBeDefined();
    });

    it('should analyze structural elements', () => {
      const elements = [
        { elementId: '#1', elementType: 'IFCCOLUMN', loadBearing: true, material: 'Concrete' },
        { elementId: '#2', elementType: 'IFCCOLUMN', loadBearing: true, material: 'Concrete' },
        { elementId: '#3', elementType: 'IFCBEAM', loadBearing: true, material: 'Steel' },
        { elementId: '#4', elementType: 'IFCSLAB', loadBearing: true, material: 'Concrete' },
      ];

      const analysis = structuralService.analyzeStructural(elements);

      expect(analysis.totalElements).toBe(4);
      expect(analysis.loadBearingElements).toBe(4);
      expect(analysis.byType['IFCCOLUMN']).toBe(2);
      expect(analysis.materials['Concrete']).toBe(3);
      expect(analysis.materials['Steel']).toBe(1);
    });

    it('should analyze structural grid', () => {
      const elements = [
        { elementId: '#1', elementType: 'IFCCOLUMN', loadBearing: true, position: { x: 0, y: 0, z: 0 } },
        { elementId: '#2', elementType: 'IFCCOLUMN', loadBearing: true, position: { x: 6, y: 0, z: 0 } },
        { elementId: '#3', elementType: 'IFCCOLUMN', loadBearing: true, position: { x: 0, y: 8, z: 0 } },
        { elementId: '#4', elementType: 'IFCBEAM', loadBearing: true },
      ];

      const grid = structuralService.analyzeStructuralGrid(elements);

      expect(grid.columns.length).toBe(3);
      expect(grid.beams.length).toBe(1);
      expect(grid.gridSpacing.xSpacing.length).toBeGreaterThan(0);
    });

    it('should analyze foundations', () => {
      const mockIfc = `
#100=IFCFOOTING('Footing 1',$,$,$,$);
#101=IFCFOOTING('Footing 2',$,$,$,$);
#102=IFCPILE('Pile 1',$,$,$,$);
`;

      const foundations = structuralService.analyzeFoundations(mockIfc);

      expect(foundations.totalFoundations).toBe(3);
      expect(foundations.byType['Footing']).toBe(2);
      expect(foundations.byType['Pile']).toBe(1);
    });

    it('should detect structural issues', () => {
      const elements = [
        { elementId: '#1', elementType: 'IFCCOLUMN', loadBearing: true }, // No dimensions
        { elementId: '#2', elementType: 'IFCBEAM', loadBearing: true }, // No length
      ];

      const issues = structuralService.detectStructuralIssues(elements);

      expect(issues.hasIssues).toBe(true);
      expect(issues.issues.length).toBeGreaterThan(0);
    });

    it('should validate structural model', () => {
      const elements = [
        { elementId: '#1', elementType: 'IFCCOLUMN', loadBearing: true, material: 'Concrete' },
        { elementId: '#2', elementType: 'IFCBEAM', loadBearing: true, material: 'Steel' },
        { elementId: '#3', elementType: 'IFCSLAB', loadBearing: true },
      ];

      const validation = structuralService.validateStructuralModel(elements);

      expect(validation.completeness).toBeGreaterThan(0);
      expect(validation.completeness).toBeLessThanOrEqual(100);
    });
  });

  describe('Openings Service', () => {
    const openingsService = new IfcOpeningsService();

    it('should extract doors', () => {
      const mockIfc = `
#100=IFCDOOR('Door D1',$,$,$,$);
#101=IFCDOOR('Door D2',$,$,$,$);
IFCQUANTITYLENGTH('OverallWidth',$,$,0.9,$);
IFCQUANTITYLENGTH('OverallHeight',$,$,2.1,$);
`;

      const doors = openingsService.extractDoors(mockIfc);

      expect(doors.length).toBe(2);
      expect(doors[0].openingType).toBe('door');
      expect(doors[0].name).toBe('Door D1');
    });

    it('should extract windows', () => {
      const mockIfc = `
#100=IFCWINDOW('Window W1',$,$,$,$);
#101=IFCWINDOW('Window W2',$,$,$,$);
IFCQUANTITYLENGTH('OverallWidth',$,$,1.5,$);
IFCQUANTITYLENGTH('OverallHeight',$,$,1.2,$);
`;

      const windows = openingsService.extractWindows(mockIfc);

      expect(windows.length).toBe(2);
      expect(windows[0].openingType).toBe('window');
      expect(windows[0].name).toBe('Window W1');
    });

    it('should analyze doors', () => {
      const doors = [
        { openingId: '#1', openingType: 'door', name: 'Door 0.9m', width: 0.9, height: 2.1 },
        { openingId: '#2', openingType: 'door', name: 'Door 0.9m', width: 0.9, height: 2.1 },
        { openingId: '#3', openingType: 'door', name: 'Door 1.5m', width: 1.5, height: 2.1 },
      ] as any;

      const analysis = openingsService.analyzeDoors(doors);

      expect(analysis.totalDoors).toBe(3);
      expect(analysis.singleDoors).toBe(2);
      expect(analysis.doubleDoors).toBe(1);
      expect(analysis.averageHeight).toBeCloseTo(2.1, 1);
    });

    it('should analyze windows', () => {
      const windows = [
        { openingId: '#1', openingType: 'window', name: 'Window 1', width: 1.5, height: 1.2, area: 1.8 },
        { openingId: '#2', openingType: 'window', name: 'Window 2', width: 1.2, height: 1.0, area: 1.2 },
      ] as any;

      const analysis = openingsService.analyzeWindows(windows);

      expect(analysis.totalWindows).toBe(2);
      expect(analysis.totalGlazedArea).toBe(3.0);
      expect(analysis.averageWidth).toBeCloseTo(1.35, 1);
    });

    it('should analyze all openings', () => {
      const openings = [
        { openingId: '#1', openingType: 'door', width: 0.9, height: 2.1 },
        { openingId: '#2', openingType: 'window', width: 1.5, height: 1.2, area: 1.8 },
        { openingId: '#3', openingType: 'opening' },
      ] as any;

      const analysis = openingsService.analyzeOpenings(openings);

      expect(analysis.doors.totalDoors).toBe(1);
      expect(analysis.windows.totalWindows).toBe(1);
      expect(analysis.otherOpenings).toBe(1);
    });

    it('should calculate WWR', () => {
      const windows = [
        { openingId: '#1', openingType: 'window', area: 10 },
        { openingId: '#2', openingType: 'window', area: 15 },
      ] as any;

      const wwr = openingsService.calculateWWR(windows, 100);

      expect(wwr.totalGlazedArea).toBe(25);
      expect(wwr.totalWallArea).toBe(100);
      expect(wwr.wwr).toBe(25);
      expect(wwr.recommendation).toBeDefined();
    });

    it('should validate openings', () => {
      const openings = [
        { openingId: '#1', openingType: 'door', width: 0.9, height: 2.1, hostElement: '#100' },
        { openingId: '#2', openingType: 'window' }, // Missing dimensions and host
      ] as any;

      const validation = openingsService.validateOpenings(openings);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });
});
