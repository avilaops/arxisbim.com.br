import { describe, it, expect, beforeEach } from 'vitest';
import { IfcParserService } from '../src/modules/ifc/ifc-parser.service';
import { IfcElementsService } from '../src/modules/ifc/ifc-elements.service';

describe('IFC Parser - Advanced Features', () => {
  let parserService: IfcParserService;

  beforeEach(() => {
    parserService = new IfcParserService();
  });

  describe('IFC Version Detection', () => {
    it('should detect IFC4.3 version', () => {
      const content = `FILE_SCHEMA(('IFC4X3'));`;
      const result = parserService.detectIfcVersion(content);
      
      expect(result.version).toBe('IFC4.3');
      expect(result.confidence).toBe(100);
    });

    it('should detect IFC4 version', () => {
      const content = `FILE_SCHEMA(('IFC4'));`;
      const result = parserService.detectIfcVersion(content);
      
      expect(result.version).toBe('IFC4');
      expect(result.confidence).toBe(100);
    });

    it('should detect IFC2X3 version', () => {
      const content = `FILE_SCHEMA(('IFC2X3'));`;
      const result = parserService.detectIfcVersion(content);
      
      expect(result.version).toBe('IFC2X3');
      expect(result.confidence).toBe(100);
    });

    it('should return unknown for invalid schema', () => {
      const content = `FILE_SCHEMA(('INVALID'));`;
      const result = parserService.detectIfcVersion(content);
      
      expect(result.version).toBe('unknown');
      expect(result.confidence).toBe(50);
    });
  });

  describe('Element Extraction', () => {
    it('should extract IFCWALL elements', () => {
      const content = `
        #100=IFCWALL('guid1',$,$,$,$,$,$);
        #101=IFCWALL('guid2',$,$,$,$,$,$);
        #102=IFCBEAM('guid3',$,$,$,$,$,$);
      `;
      const elements = parserService.extractElements(content);
      
      const walls = elements.find(el => el.elementType === 'IFCWALL');
      expect(walls).toBeDefined();
      expect(walls?.count).toBe(2);
    });

    it('should extract multiple element types', () => {
      const content = `
        #100=IFCWALL('guid1',$,$,$,$,$,$);
        #101=IFCBEAM('guid2',$,$,$,$,$,$);
        #102=IFCCOLUMN('guid3',$,$,$,$,$,$);
        #103=IFCSLAB('guid4',$,$,$,$,$,$);
      `;
      const elements = parserService.extractElements(content);
      
      expect(elements.length).toBeGreaterThanOrEqual(4);
      expect(elements.some(el => el.elementType === 'IFCWALL')).toBe(true);
      expect(elements.some(el => el.elementType === 'IFCBEAM')).toBe(true);
      expect(elements.some(el => el.elementType === 'IFCCOLUMN')).toBe(true);
      expect(elements.some(el => el.elementType === 'IFCSLAB')).toBe(true);
    });
  });

  describe('Entity Counting', () => {
    it('should count total entities', () => {
      const content = `
#1=IFCPROJECT('guid1',$,$,$,$,$,$,$,$);
#2=IFCWALL('guid2',$,$,$,$,$,$);
#3=IFCBEAM('guid3',$,$,$,$,$,$);
#4=IFCRELDEFINESBYTYPE('guid4',$,$,$,$,$);
#5=IFCPROPERTYSET('guid5',$,$,$,$);
      `;
      const entities = parserService.countEntities(content);
      
      expect(entities.total).toBeGreaterThan(0);
      expect(entities.geometric).toBeGreaterThan(0);
    });
  });

  describe('Hierarchy Extraction', () => {
    it('should extract site and buildings', () => {
      const content = `
        #10=IFCSITE('site-guid',$,$,$,$,$,$,$,$,$);
        #20=IFCBUILDING('building-guid',$,$,$,$,$,$,$,$,$);
        #30=IFCBUILDINGSTOREY('storey-guid',$,$,$,$,$,$,$,$);
      `;
      const hierarchy = parserService.extractHierarchy(content);
      
      expect(hierarchy.site).toBeDefined();
      expect(hierarchy.buildings.length).toBeGreaterThan(0);
      expect(hierarchy.storeys.length).toBeGreaterThan(0);
    });
  });

  describe('Complexity Analysis', () => {
    it('should classify simple models', () => {
      const content = `
        #1=IFCPROJECT('guid1',$,$,$,$,$,$,$,$);
        #2=IFCWALL('guid2',$,$,$,$,$,$);
        #3=IFCBEAM('guid3',$,$,$,$,$,$);
      `;
      const complexity = parserService.analyzeComplexity(content);
      
      expect(complexity.level).toBe('simple');
      expect(complexity.score).toBeLessThan(50);
    });

    it('should provide complexity factors', () => {
      const content = `
        #1=IFCPROJECT('guid1',$,$,$,$,$,$,$,$);
        #2=IFCWALL('guid2',$,$,$,$,$,$);
        #3=IFCBEAM('guid3',$,$,$,$,$,$);
      `;
      const complexity = parserService.analyzeComplexity(content);
      
      expect(complexity.factors).toHaveProperty('entityCount');
      expect(complexity.factors).toHaveProperty('elementCount');
      expect(complexity.factors).toHaveProperty('relationshipCount');
      expect(complexity.factors).toHaveProperty('propertyCount');
    });
  });

  describe('Schema Validation', () => {
    it('should validate complete IFC file', () => {
      const content = `ISO-10303-21;
HEADER;
FILE_SCHEMA(('IFC2X3'));
ENDSEC;
DATA;
#1=IFCPROJECT('guid',$,$,$,$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;`;
      
      const validation = parserService.validateSchema(content, 'IFC2X3');
      
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should detect missing sections', () => {
      const content = `ISO-10303-21;`;
      
      const validation = parserService.validateSchema(content, 'IFC2X3');
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should warn about version mismatch', () => {
      const content = `ISO-10303-21;
HEADER;
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
ENDSEC;
END-ISO-10303-21;`;
      
      const validation = parserService.validateSchema(content, 'IFC2X3');
      
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('GUID Extraction', () => {
    it('should extract all GUIDs', () => {
      const content = `
        #1=IFCWALL('3O4aOqn_j0A9h3K$Z5P3Wp',$,$,$,$,$,$);
        #2=IFCBEAM('2S9bRtx_k1B8j4L$A6Q4Xq',$,$,$,$,$,$);
      `;
      const guids = parserService.extractGUIDs(content);
      
      expect(guids.length).toBe(2);
      expect(guids[0]).toHaveLength(22);
      expect(guids[1]).toHaveLength(22);
    });
  });
});
