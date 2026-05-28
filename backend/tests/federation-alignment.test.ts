import { describe, it, expect, beforeEach } from 'vitest';
import { FederationAlignmentService } from '../src/modules/federation/federation-alignment.service';

describe('Federation Alignment Service - Unit Tests', () => {
  let alignmentService: FederationAlignmentService;

  beforeEach(() => {
    alignmentService = new FederationAlignmentService();
  });

  describe('Auto-Alignment', () => {
    it('should auto-align models using reference points', async () => {
      const mockModel1Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('3eQ_J8z0D0vRrL6o8J6$pQ',$,'Test Project 1',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCBUILDING('BuildingGuid1',$,'Building 1',$,$,#101,$,$,.ELEMENT.,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((10.,20.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const mockModel2Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model2.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('3eQ_J8z0D0vRrL6o8J6$pR',$,'Test Project 2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#200=IFCBUILDING('BuildingGuid2',$,'Building 2',$,$,#201,$,$,.ELEMENT.,$,$,$);
#201=IFCLOCALPLACEMENT($,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((15.,25.,5.));
ENDSEC;
END-ISO-10303-21;
      `;

      const config = {
        method: 'reference-points' as const,
        referencePoints: [
          {
            model1: { x: 10, y: 20, z: 0 },
            model2: { x: 15, y: 25, z: 5 },
            weight: 1.0,
          },
        ],
        tolerance: 0.01,
      };

      const result = await alignmentService.autoAlign(
        [
          { id: 'model1', content: mockModel1Content },
          { id: 'model2', content: mockModel2Content },
        ],
        config
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.alignments).toHaveLength(1); // model2 aligned to model1 (reference)
      expect(result.alignments[0].modelId).toBe('model2');
      expect(result.alignments[0].transformation).toBeDefined();
      expect(result.alignments[0].transformation.translation).toBeDefined();
      expect(result.alignments[0].accuracy).toBeGreaterThan(0);
    });

    it('should align single model to coordinate system', async () => {
      const mockContent = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('ProjectGuid1',$,'Test Project',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCBUILDING('BuildingGuid',$,'Building',$,$,#101,$,$,.ELEMENT.,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((100.,200.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const targetOrigin = { x: 0, y: 0, z: 0 };
      const targetRotation = { x: 0, y: 0, z: 0 };

      const result = await alignmentService.alignSingleModel(
        mockContent,
        targetOrigin,
        targetRotation
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transformation).toBeDefined();
      expect(result.transformation.translation).toBeDefined();
      expect(result.transformation.rotation).toBeDefined();
    });

    it('should align model to grid', async () => {
      const mockContent = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('ProjectGuid1',$,'Test Project',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCGRID('GridGuid',$,'Grid',$,$,#101,(#102,#103),(#104));
#101=IFCLOCALPLACEMENT($,#110);
#102=IFCGRIDAXIS($,'A',#111,.T.);
#103=IFCGRIDAXIS($,'B',#112,.T.);
#104=IFCGRIDAXIS($,'1',#113,.T.);
#110=IFCAXIS2PLACEMENT3D(#120,$,$);
#111=IFCPOLYLINE((#121,#122));
#112=IFCPOLYLINE((#123,#124));
#113=IFCPOLYLINE((#125,#126));
#120=IFCCARTESIANPOINT((0.,0.,0.));
#121=IFCCARTESIANPOINT((0.,0.,0.));
#122=IFCCARTESIANPOINT((0.,10.,0.));
#123=IFCCARTESIANPOINT((5.,0.,0.));
#124=IFCCARTESIANPOINT((5.,10.,0.));
#125=IFCCARTESIANPOINT((0.,0.,0.));
#126=IFCCARTESIANPOINT((10.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const gridSpacing = { x: 5, y: 5, z: 0 };
      const gridOrigin = { x: 0, y: 0, z: 0 };

      const result = await alignmentService.alignToGrid(
        mockContent,
        gridSpacing,
        gridOrigin
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transformation).toBeDefined();
      expect(result.gridInfo).toBeDefined();
      expect(result.gridInfo.spacing).toEqual(gridSpacing);
    });
  });

  describe('Alignment Detection', () => {
    it('should detect alignment suggestions between models', async () => {
      const mockModel1 = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('ProjectA',$,'Project A',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCBUILDING('BuildingA',$,'Building A',$,$,#101,$,$,.ELEMENT.,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const mockModel2 = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model2.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('ProjectB',$,'Project B',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#200=IFCBUILDING('BuildingB',$,'Building B',$,$,#201,$,$,.ELEMENT.,$,$,$);
#201=IFCLOCALPLACEMENT($,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((50.,50.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const suggestions = await alignmentService.detectAlignment([
        { id: 'model1', content: mockModel1 },
        { id: 'model2', content: mockModel2 },
      ]);

      expect(suggestions).toBeDefined();
      expect(suggestions.suggestions).toBeDefined();
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].method).toBeDefined();
      expect(suggestions.suggestions[0].confidence).toBeGreaterThanOrEqual(0);
      expect(suggestions.suggestions[0].confidence).toBeLessThanOrEqual(1);
    });

    it('should identify common reference points', async () => {
      const mockContent = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('ProjectGuid',$,'Test Project',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCBUILDING('Building1',$,'Building',$,$,#101,$,$,.ELEMENT.,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((10.,20.,0.));
#200=IFCCOLUMN('Column1',$,'Column',$,$,#201,$,$,$);
#201=IFCLOCALPLACEMENT(#101,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((5.,5.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const suggestions = await alignmentService.detectAlignment([
        { id: 'model', content: mockContent },
      ]);

      expect(suggestions).toBeDefined();
      expect(suggestions.referencePoints).toBeDefined();
    });
  });

  describe('Alignment Validation', () => {
    it('should validate alignment accuracy', async () => {
      const mockTransformation = {
        translation: { x: 5, y: 10, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };

      const mockReferencePoints = [
        {
          model1: { x: 0, y: 0, z: 0 },
          model2: { x: 5, y: 10, z: 0 },
          weight: 1.0,
        },
        {
          model1: { x: 10, y: 0, z: 0 },
          model2: { x: 15, y: 10, z: 0 },
          weight: 1.0,
        },
      ];

      const validation = await alignmentService.validateAlignment(
        mockTransformation,
        mockReferencePoints
      );

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.rmsError).toBeGreaterThanOrEqual(0);
      expect(validation.maxError).toBeGreaterThanOrEqual(0);
      expect(validation.accuracy).toBeGreaterThanOrEqual(0);
      expect(validation.accuracy).toBeLessThanOrEqual(100);
    });

    it('should detect invalid alignment with high error', async () => {
      const mockTransformation = {
        translation: { x: 100, y: 200, z: 50 }, // Wrong transformation
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };

      const mockReferencePoints = [
        {
          model1: { x: 0, y: 0, z: 0 },
          model2: { x: 5, y: 10, z: 0 },
          weight: 1.0,
        },
      ];

      const validation = await alignmentService.validateAlignment(
        mockTransformation,
        mockReferencePoints,
        0.1 // Low tolerance
      );

      expect(validation.isValid).toBe(false);
      expect(validation.rmsError).toBeGreaterThan(0.1);
    });
  });

  describe('Alignment Report', () => {
    it('should generate alignment report', async () => {
      const mockAlignmentResult = {
        success: true,
        alignments: [
          {
            modelId: 'model2',
            transformation: {
              translation: { x: 5, y: 10, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            method: 'reference-points' as const,
            accuracy: 98.5,
            referenceModelId: 'model1',
          },
        ],
        method: 'reference-points' as const,
        timestamp: new Date().toISOString(),
      };

      const report = await alignmentService.generateAlignmentReport(
        mockAlignmentResult
      );

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalModels).toBe(1);
      expect(report.summary.alignedModels).toBe(1);
      expect(report.summary.method).toBe('reference-points');
      expect(report.summary.averageAccuracy).toBe(98.5);
      expect(report.details).toBeDefined();
      expect(report.details.length).toBe(1);
      expect(report.details[0].modelId).toBe('model2');
      expect(report.details[0].status).toBe('aligned');
      expect(report.timestamp).toBeDefined();
    });

    it('should handle failed alignments in report', async () => {
      const mockAlignmentResult = {
        success: false,
        alignments: [],
        method: 'icp' as const,
        timestamp: new Date().toISOString(),
        error: 'Insufficient reference points',
      };

      const report = await alignmentService.generateAlignmentReport(
        mockAlignmentResult
      );

      expect(report).toBeDefined();
      expect(report.summary.totalModels).toBe(0);
      expect(report.summary.alignedModels).toBe(0);
      expect(report.summary.failedModels).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty model list', async () => {
      const config = {
        method: 'reference-points' as const,
        referencePoints: [],
        tolerance: 0.01,
      };

      await expect(
        alignmentService.autoAlign([], config)
      ).rejects.toThrow();
    });

    it('should handle invalid IFC content', async () => {
      const invalidContent = 'INVALID IFC CONTENT';
      const targetOrigin = { x: 0, y: 0, z: 0 };
      const targetRotation = { x: 0, y: 0, z: 0 };

      const result = await alignmentService.alignSingleModel(
        invalidContent,
        targetOrigin,
        targetRotation
      );

      expect(result.success).toBe(false);
    });

    it('should handle missing reference points', async () => {
      const mockContent = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('ProjectGuid',$,'Test',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
ENDSEC;
END-ISO-10303-21;
      `;

      const config = {
        method: 'reference-points' as const,
        referencePoints: [], // Empty
        tolerance: 0.01,
      };

      const result = await alignmentService.autoAlign(
        [{ id: 'model', content: mockContent }],
        config
      );

      expect(result.success).toBe(false);
    });
  });
});
