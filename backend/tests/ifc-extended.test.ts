import { describe, it, expect } from 'vitest';
import { IfcPropertiesService } from '../src/modules/ifc/ifc-properties.service';
import { IfcClassificationsService } from '../src/modules/ifc/ifc-classifications.service';
import { IfcTypesService } from '../src/modules/ifc/ifc-types.service';
import { IfcGeometryService } from '../src/modules/ifc/ifc-geometry.service';

describe('IFC Extended Services - Unit Tests', () => {
  describe('Properties Service', () => {
    const propertiesService = new IfcPropertiesService();

    it('should extract property sets', () => {
      const mockIfc = `
#100=IFCPROPERTYSET('Pset_WallCommon',...);
#101=IFCPROPERTYSET('Pset_SlabCommon',...);
`;

      const propertySets = propertiesService.extractPropertySets(mockIfc);

      expect(propertySets.length).toBe(2);
      expect(propertySets[0].name).toBe('Pset_WallCommon');
      expect(propertySets[1].name).toBe('Pset_SlabCommon');
    });

    it('should extract single value properties', () => {
      const mockIfc = `
#200=IFCPROPERTYSINGLEVALUE('IsExternal',\$,.T.,\$);
#201=IFCPROPERTYSINGLEVALUE('LoadBearing',\$,.F.,\$);
#202=IFCPROPERTYSINGLEVALUE('FireRating',\$,'120min',\$);
`;

      const properties = propertiesService.extractSingleValueProperties(mockIfc);

      expect(properties.length).toBe(3);
      expect(properties[0].name).toBe('IsExternal');
      expect(properties[0].value).toBe(true);
      expect(properties[1].value).toBe(false);
    });

    it('should calculate property statistics', () => {
      const propertySets = [
        { propertySetId: '#1', name: 'Pset_WallCommon', properties: [{}, {}] },
        { propertySetId: '#2', name: 'Pset_WallCommon', properties: [{}] },
        { propertySetId: '#3', name: 'Pset_SlabCommon', properties: [{}, {}, {}] },
      ];

      const stats = propertiesService.getPropertyStats(propertySets);

      expect(stats.totalPropertySets).toBe(3);
      expect(stats.totalProperties).toBe(6);
      expect(stats.averagePropertiesPerSet).toBe(2);
      expect(stats.commonPropertySets[0].name).toBe('Pset_WallCommon');
      expect(stats.commonPropertySets[0].count).toBe(2);
    });

    it('should validate property set completeness', () => {
      const propertySets = [
        { name: 'Pset_WallCommon', properties: [] },
        { name: 'Pset_SlabCommon', properties: [] },
      ];

      const validation = propertiesService.validatePropertySets(propertySets);

      expect(validation.coverage).toBeGreaterThan(0);
      expect(validation.missingCommonPsets.length).toBeGreaterThan(0);
    });
  });

  describe('Classifications Service', () => {
    const classificationsService = new IfcClassificationsService();

    it('should extract classifications', () => {
      const mockIfc = `
#300=IFCCLASSIFICATIONREFERENCE('Ss_25_10',\$,'Wall systems',\$);
#301=IFCCLASSIFICATIONREFERENCE('Ss_20_50',\$,'Floor construction',\$);
`;

      const classifications = classificationsService.extractClassifications(mockIfc);

      expect(classifications.length).toBe(2);
      expect(classifications[0].code).toBe('Ss_25_10');
      expect(classifications[0].name).toBe('Wall systems');
    });

    it('should detect classification system type', () => {
      const uniclass = classificationsService.detectClassificationSystem('Uniclass 2015');
      const omniclass = classificationsService.detectClassificationSystem('OmniClass Table 23');

      expect(uniclass.type).toBe('uniclass');
      expect(uniclass.confidence).toBe(100);
      expect(omniclass.type).toBe('omniclass');
    });

    it('should calculate classification statistics', () => {
      const classifications = [
        { classificationId: '#1', system: 'Uniclass', code: 'Ss_25_10' },
        { classificationId: '#2', system: 'Uniclass', code: 'Ss_25_10' },
        { classificationId: '#3', system: 'OmniClass', code: '23-15' },
      ];

      const stats = classificationsService.getClassificationStats(classifications);

      expect(stats.totalClassifications).toBe(3);
      expect(stats.bySystems['Uniclass']).toBe(2);
      expect(stats.bySystems['OmniClass']).toBe(1);
      expect(stats.mostUsedCodes[0].code).toBe('Ss_25_10');
      expect(stats.mostUsedCodes[0].count).toBe(2);
    });

    it('should validate classification coverage', () => {
      const validation = classificationsService.validateCoverage(100, 75);

      expect(validation.coverage).toBe(75);
      expect(validation.level).toBe('high');
    });

    it('should detect no classification', () => {
      const validation = classificationsService.validateCoverage(100, 0);

      expect(validation.coverage).toBe(0);
      expect(validation.level).toBe('none');
      expect(validation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Types Service', () => {
    const typesService = new IfcTypesService();

    it('should extract type objects', () => {
      const mockIfc = `
#400=IFCWALLTYPE('StandardWall',...);
#401=IFCSLABTYPE('ConcreteFloor',...);
#402=IFCBEAMTYPE('SteelBeam',...);
`;

      const types = typesService.extractTypeObjects(mockIfc);

      expect(types.length).toBe(3);
      expect(types[0].typeName).toBe('StandardWall');
      expect(types[0].category).toBe('Walls');
    });

    it('should analyze type usage', () => {
      const types = [
        { typeId: '#1', typeName: 'Type A', instances: 10 },
        { typeId: '#2', typeName: 'Type B', instances: 5 },
        { typeId: '#3', typeName: 'Type C', instances: 0 },
      ];

      const usage = typesService.analyzeTypeUsage(types);

      expect(usage.totalTypes).toBe(3);
      expect(usage.totalInstances).toBe(15);
      expect(usage.averageInstancesPerType).toBe(5);
      expect(usage.unusedTypes).toContain('Type C');
      expect(usage.mostUsedTypes[0].typeName).toBe('Type A');
    });

    it('should detect duplicate type names', () => {
      const types = [
        { typeId: '#1', typeName: 'StandardWall' },
        { typeId: '#2', typeName: 'StandardWall' },
        { typeId: '#3', typeName: 'StandardWall' },
        { typeId: '#4', typeName: 'UniqueType' },
      ];

      const duplicates = typesService.detectDuplicateTypes(types);

      expect(duplicates.length).toBe(1);
      expect(duplicates[0].duplicateName).toBe('StandardWall');
      expect(duplicates[0].count).toBe(3);
    });

    it('should validate type standardization', () => {
      const types = [
        { typeName: 'Proper Name', instances: 10 },
        { typeName: 'Another Type', instances: 5 },
      ];

      const validation = typesService.validateTypeStandardization(types);

      expect(validation.standardizationScore).toBeGreaterThan(0);
      expect(validation.standardizationScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Geometry Service', () => {
    const geometryService = new IfcGeometryService();

    it('should extract geometry types', () => {
      const mockIfc = `
#500=IFCEXTRUDEDAREASOLID(...);
#501=IFCEXTRUDEDAREASOLID(...);
#502=IFCFACETEDBREP(...);
`;

      const geometryTypes = geometryService.extractGeometryTypes(mockIfc);

      expect(geometryTypes.length).toBeGreaterThan(0);
      const extrusions = geometryTypes.find(gt => gt.geometryType === 'IFCEXTRUDEDAREASOLID');
      expect(extrusions).toBeDefined();
      expect(extrusions?.count).toBe(2);
    });

    it('should analyze geometry complexity', () => {
      const mockIfc = `
#500=IFCEXTRUDEDAREASOLID(...);
#501=IFCFACETEDBREP(...);
#502=IFCBOOLEANRESULT(...);
`;

      const complexity = geometryService.analyzeGeometryComplexity(mockIfc);

      expect(complexity.complexity).toBeDefined();
      expect(['simple', 'moderate', 'complex', 'very_complex']).toContain(complexity.complexity);
      expect(complexity.geometricEntities).toBeGreaterThan(0);
    });

    it('should detect representation types', () => {
      const mockIfc = `
IFCSHAPEREPRESENTATION(#10,'Body','Body',...);
IFCSHAPEREPRESENTATION(#11,'Axis','Axis',...);
`;

      const repTypes = geometryService.detectRepresentationTypes(mockIfc);

      expect(repTypes.length).toBeGreaterThan(0);
    });

    it('should analyze coordinate systems', () => {
      const mockIfc = `
#600=IFCCARTESIANPOINT((0.,0.,0.));
#601=IFCAXIS2PLACEMENT3D(...);
#602=IFCLOCALPLACEMENT(...);
`;

      const coords = geometryService.analyzeCoordinateSystems(mockIfc);

      expect(coords.cartesianPoints).toBe(1);
      expect(coords.axis2Placements).toBe(1);
      expect(coords.localPlacements).toBe(1);
    });

    it('should detect geometry issues', () => {
      const mockIfc = `
#700=IFCFACETEDBREP(...);
#701=IFCSHAPEREPRESENTATION(...);
`;

      const issues = geometryService.detectGeometryIssues(mockIfc);

      expect(issues.hasIssues).toBeDefined();
      expect(Array.isArray(issues.issues)).toBe(true);
    });
  });
});
