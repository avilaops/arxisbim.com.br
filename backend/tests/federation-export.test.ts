import { describe, it, expect, beforeEach } from 'vitest';
import { FederationExportService } from '../src/modules/federation/federation-export.service';

describe('Federation Export Service - Unit Tests', () => {
  let exportService: FederationExportService;

  beforeEach(() => {
    exportService = new FederationExportService();
  });

  describe('BCF Export', () => {
    it('should export federation to BCF format', async () => {
      const mockFederation = {
        id: 'federation-123',
        name: 'Test Federation',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Architecture Model',
            discipline: 'architecture',
            visible: true,
          },
          {
            id: 'model2',
            ifcModelId: 'ifc-2',
            name: 'Structure Model',
            discipline: 'structure',
            visible: true,
          },
        ],
      };

      const mockClashes = [
        {
          id: 'clash-1',
          type: 'hard-clash',
          severity: 'high',
          element1: { modelId: 'model1', elementId: '#100', type: 'IfcWall' },
          element2: { modelId: 'model2', elementId: '#200', type: 'IfcColumn' },
          location: { x: 10, y: 20, z: 5 },
          description: 'Wall intersects with column',
        },
      ];

      const options = {
        includeModels: true,
        includeClashes: true,
        includeViewpoints: true,
      };

      const result = await exportService.export(
        mockFederation as any,
        'bcf',
        options
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.format).toBe('bcf');
      expect(result.filePath).toBeDefined();
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should create BCF from clashes', async () => {
      const mockClashes = [
        {
          id: 'clash-1',
          type: 'hard-clash',
          severity: 'high',
          element1: { modelId: 'model1', elementId: '#100', type: 'IfcWall' },
          element2: { modelId: 'model2', elementId: '#200', type: 'IfcColumn' },
          location: { x: 10, y: 20, z: 5 },
          description: 'Wall-Column intersection',
        },
        {
          id: 'clash-2',
          type: 'soft-clash',
          severity: 'medium',
          element1: { modelId: 'model1', elementId: '#101', type: 'IfcDoor' },
          element2: { modelId: 'model3', elementId: '#300', type: 'IfcPipe' },
          location: { x: 15, y: 25, z: 3 },
          description: 'Door-Pipe clearance issue',
        },
      ];

      const result = await exportService.createBCFFromClashes(mockClashes, {
        projectName: 'Test Project',
        author: 'Test User',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.issueCount).toBe(2);
      expect(result.filePath).toBeDefined();
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].title).toContain('clash-1');
      expect(result.issues[0].priority).toBeDefined();
      expect(result.issues[1].title).toContain('clash-2');
    });
  });

  describe('glTF Export', () => {
    it('should export federation to glTF format', async () => {
      const mockFederation = {
        id: 'federation-456',
        name: 'Web Federation',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Architecture',
            discipline: 'architecture',
            visible: true,
            transformation: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
          },
        ],
      };

      const options = {
        binary: true, // glb format
        embedTextures: true,
        optimizeGeometry: true,
      };

      const result = await exportService.export(
        mockFederation as any,
        'gltf',
        options
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.format).toBe('gltf');
      expect(result.filePath).toBeDefined();
      expect(result.filePath).toContain('.glb');
    });

    it('should export as ASCII glTF when binary is false', async () => {
      const mockFederation = {
        id: 'federation-789',
        name: 'ASCII Federation',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Model',
            discipline: 'architecture',
            visible: true,
          },
        ],
      };

      const options = {
        binary: false,
        embedTextures: false,
      };

      const result = await exportService.export(
        mockFederation as any,
        'gltf',
        options
      );

      expect(result.filePath).toContain('.gltf');
    });
  });

  describe('FBX Export', () => {
    it('should export federation to FBX format', async () => {
      const mockFederation = {
        id: 'federation-fbx',
        name: 'FBX Federation',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Architecture',
            discipline: 'architecture',
            visible: true,
          },
        ],
      };

      const options = {
        version: '2020',
        embedTextures: true,
      };

      const result = await exportService.export(
        mockFederation as any,
        'fbx',
        options
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.format).toBe('fbx');
      expect(result.filePath).toContain('.fbx');
    });
  });

  describe('Merged IFC Export', () => {
    it('should export federation as merged IFC', async () => {
      const mockFederation = {
        id: 'federation-ifc',
        name: 'IFC Merge',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Arch',
            discipline: 'architecture',
            visible: true,
            content: `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('arch.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('ArchProj',$,'Architecture',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
            `,
          },
          {
            id: 'model2',
            ifcModelId: 'ifc-2',
            name: 'Struct',
            discipline: 'structure',
            visible: true,
            content: `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('struct.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('StructProj',$,'Structure',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#200=IFCCOLUMN('Column1',$,'Column',$,$,#201,$,$,$);
#201=IFCLOCALPLACEMENT($,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((10.,0.,0.));
ENDSEC;
END-ISO-10303-21;
            `,
          },
        ],
      };

      const options = {
        mergeStrategy: 'single-project',
        preserveGUIDs: true,
      };

      const result = await exportService.export(
        mockFederation as any,
        'ifc-merge',
        options
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.format).toBe('ifc-merge');
      expect(result.filePath).toContain('.ifc');
    });
  });

  describe('JSON Export', () => {
    it('should export federation to JSON', async () => {
      const mockFederation = {
        id: 'federation-json',
        name: 'JSON Export',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Model',
            discipline: 'architecture',
            visible: true,
          },
        ],
      };

      const options = {
        includeMetadata: true,
        includeGeometry: false,
        pretty: true,
      };

      const result = await exportService.export(
        mockFederation as any,
        'json',
        options
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.filePath).toContain('.json');
    });
  });

  describe('Export History', () => {
    it('should track export history', async () => {
      const federationId = 'federation-123';

      // Simulate multiple exports
      const mockFederation = {
        id: federationId,
        name: 'Test Federation',
        models: [],
      };

      await exportService.export(mockFederation as any, 'bcf', {});
      await exportService.export(mockFederation as any, 'gltf', {});
      await exportService.export(mockFederation as any, 'json', {});

      const history = await exportService.getExportHistory(federationId);

      expect(history).toBeDefined();
      expect(history.length).toBe(3);
      expect(history[0].format).toBe('bcf');
      expect(history[1].format).toBe('gltf');
      expect(history[2].format).toBe('json');
      expect(history[0].timestamp).toBeDefined();
      expect(history[0].fileSize).toBeGreaterThan(0);
    });

    it('should limit export history entries', async () => {
      const federationId = 'federation-456';
      const mockFederation = {
        id: federationId,
        name: 'Test',
        models: [],
      };

      // Export 15 times
      for (let i = 0; i < 15; i++) {
        await exportService.export(mockFederation as any, 'json', {});
      }

      const history = await exportService.getExportHistory(federationId, 10);

      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Export Size Estimation', () => {
    it('should estimate export size for BCF', async () => {
      const mockFederation = {
        id: 'federation-123',
        name: 'Test',
        models: [
          { id: 'model1', ifcModelId: 'ifc-1', name: 'Model 1' },
          { id: 'model2', ifcModelId: 'ifc-2', name: 'Model 2' },
        ],
      };

      const estimation = await exportService.estimateExportSize(
        mockFederation as any,
        'bcf'
      );

      expect(estimation).toBeDefined();
      expect(estimation.format).toBe('bcf');
      expect(estimation.estimatedSizeBytes).toBeGreaterThan(0);
      expect(estimation.estimatedDurationSeconds).toBeGreaterThan(0);
      expect(estimation.factors).toBeDefined();
      expect(estimation.factors.modelCount).toBe(2);
    });

    it('should estimate export size for glTF', async () => {
      const mockFederation = {
        id: 'federation-456',
        name: 'Large Federation',
        models: Array.from({ length: 10 }, (_, i) => ({
          id: `model${i}`,
          ifcModelId: `ifc-${i}`,
          name: `Model ${i}`,
        })),
      };

      const estimation = await exportService.estimateExportSize(
        mockFederation as any,
        'gltf'
      );

      expect(estimation.estimatedSizeBytes).toBeGreaterThan(0);
      expect(estimation.factors.modelCount).toBe(10);
      expect(estimation.estimatedDurationSeconds).toBeGreaterThan(0);
    });

    it('should account for geometry complexity in estimation', async () => {
      const simpleFederation = {
        id: 'simple',
        name: 'Simple',
        models: [{ id: 'model1', ifcModelId: 'ifc-1', name: 'Simple' }],
      };

      const complexFederation = {
        id: 'complex',
        name: 'Complex',
        models: Array.from({ length: 50 }, (_, i) => ({
          id: `model${i}`,
          ifcModelId: `ifc-${i}`,
          name: `Complex ${i}`,
        })),
      };

      const simpleEstimation = await exportService.estimateExportSize(
        simpleFederation as any,
        'gltf'
      );

      const complexEstimation = await exportService.estimateExportSize(
        complexFederation as any,
        'gltf'
      );

      expect(complexEstimation.estimatedSizeBytes).toBeGreaterThan(
        simpleEstimation.estimatedSizeBytes
      );
      expect(complexEstimation.estimatedDurationSeconds).toBeGreaterThan(
        simpleEstimation.estimatedDurationSeconds
      );
    });
  });

  describe('Export Options', () => {
    it('should apply LOD (Level of Detail) options', async () => {
      const mockFederation = {
        id: 'federation-lod',
        name: 'LOD Test',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Model',
            discipline: 'architecture',
            visible: true,
          },
        ],
      };

      const options = {
        lod: 'low',
        decimationRatio: 0.5,
      };

      const result = await exportService.export(
        mockFederation as any,
        'gltf',
        options
      );

      expect(result.success).toBe(true);
      // Low LOD should produce smaller file
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should filter models by discipline', async () => {
      const mockFederation = {
        id: 'federation-filter',
        name: 'Filter Test',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Arch',
            discipline: 'architecture',
            visible: true,
          },
          {
            id: 'model2',
            ifcModelId: 'ifc-2',
            name: 'MEP',
            discipline: 'mep',
            visible: true,
          },
          {
            id: 'model3',
            ifcModelId: 'ifc-3',
            name: 'Struct',
            discipline: 'structure',
            visible: true,
          },
        ],
      };

      const options = {
        filterDisciplines: ['architecture', 'structure'],
      };

      const result = await exportService.export(
        mockFederation as any,
        'gltf',
        options
      );

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.exportedModels).toBe(2); // Only arch + structure
    });

    it('should handle compression options', async () => {
      const mockFederation = {
        id: 'federation-compress',
        name: 'Compression Test',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-1',
            name: 'Model',
            discipline: 'architecture',
            visible: true,
          },
        ],
      };

      const options = {
        compress: true,
        compressionLevel: 9,
      };

      const result = await exportService.export(
        mockFederation as any,
        'gltf',
        options
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid export format', async () => {
      const mockFederation = {
        id: 'federation-123',
        name: 'Test',
        models: [],
      };

      await expect(
        exportService.export(mockFederation as any, 'invalid-format' as any, {})
      ).rejects.toThrow();
    });

    it('should handle empty federation', async () => {
      const emptyFederation = {
        id: 'empty',
        name: 'Empty',
        models: [],
      };

      const result = await exportService.export(
        emptyFederation as any,
        'gltf',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing IFC content', async () => {
      const mockFederation = {
        id: 'federation-missing',
        name: 'Missing Content',
        models: [
          {
            id: 'model1',
            ifcModelId: 'ifc-nonexistent',
            name: 'Missing',
            discipline: 'architecture',
            visible: true,
          },
        ],
      };

      const result = await exportService.export(
        mockFederation as any,
        'ifc-merge',
        {}
      );

      expect(result.success).toBe(false);
    });
  });
});
