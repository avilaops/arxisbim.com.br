import { describe, it, expect, beforeEach } from 'vitest';
import { IfcComparisonService } from '../src/modules/ifc/ifc-comparison.service';

describe('IFC Comparison Service - Unit Tests', () => {
  let comparisonService: IfcComparisonService;

  beforeEach(() => {
    comparisonService = new IfcComparisonService();
  });

  describe('Model Comparison', () => {
    it('should detect added elements between versions', async () => {
      const model1Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 1',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall A',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const model2Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall A',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
#200=IFCDOOR('Door1',$,'Door A',$,$,#201,$,$,$,$);
#201=IFCLOCALPLACEMENT($,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((5.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const comparison = await comparisonService.compare(
        model1Content,
        model2Content,
        'model1',
        'model2'
      );

      expect(comparison).toBeDefined();
      expect(comparison.added.length).toBe(1);
      expect(comparison.added[0].elementId).toBe('#200');
      expect(comparison.added[0].type).toBe('IFCDOOR');
      expect(comparison.added[0].name).toBe('Door A');
    });

    it('should detect removed elements between versions', async () => {
      const model1Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 1',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall A',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
#200=IFCCOLUMN('Column1',$,'Column A',$,$,#201,$,$,$);
#201=IFCLOCALPLACEMENT($,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((10.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const model2Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall A',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const comparison = await comparisonService.compare(
        model1Content,
        model2Content,
        'model1',
        'model2'
      );

      expect(comparison.removed.length).toBe(1);
      expect(comparison.removed[0].elementId).toBe('#200');
      expect(comparison.removed[0].type).toBe('IFCCOLUMN');
    });

    it('should detect modified elements between versions', async () => {
      const model1Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 1',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall A',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const model2Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall B Modified',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const comparison = await comparisonService.compare(
        model1Content,
        model2Content,
        'model1',
        'model2'
      );

      expect(comparison.modified.length).toBe(1);
      expect(comparison.modified[0].elementId).toBe('#100');
      expect(comparison.modified[0].type).toBe('IFCWALL');
      expect(comparison.modified[0].changes).toBeDefined();
      expect(comparison.modified[0].changes.properties.length).toBeGreaterThan(0);
    });

    it('should detect geometry changes', async () => {
      const model1Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 1',$,$,$,$,(#10),#11);
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
      `;

      const model2Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((10.,20.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const comparison = await comparisonService.compare(
        model1Content,
        model2Content,
        'model1',
        'model2'
      );

      expect(comparison.modified.length).toBe(1);
      expect(comparison.modified[0].changes.geometry).toBeDefined();
      expect(comparison.modified[0].changes.geometry.positionChanged).toBe(true);
    });
  });

  describe('Change Report Generation', () => {
    it('should generate comprehensive change report', async () => {
      const mockComparison = {
        model1Id: 'model1',
        model2Id: 'model2',
        added: [
          {
            elementId: '#200',
            type: 'IFCDOOR',
            name: 'Door A',
            properties: { Height: 2100, Width: 900 },
          },
        ],
        removed: [
          {
            elementId: '#150',
            type: 'IFCWINDOW',
            name: 'Window X',
            properties: {},
          },
        ],
        modified: [
          {
            elementId: '#100',
            type: 'IFCWALL',
            name: 'Wall A',
            changes: {
              properties: [
                { name: 'Height', oldValue: 3000, newValue: 3500 },
              ],
              geometry: {
                positionChanged: true,
                translation: { x: 5, y: 0, z: 0 },
              },
            },
          },
        ],
        unchanged: [],
        summary: {
          totalElements1: 3,
          totalElements2: 3,
          addedCount: 1,
          removedCount: 1,
          modifiedCount: 1,
          unchangedCount: 0,
        },
        timestamp: new Date().toISOString(),
      };

      const report = await comparisonService.generateChangeReport(mockComparison);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalChanges).toBe(3);
      expect(report.summary.added).toBe(1);
      expect(report.summary.removed).toBe(1);
      expect(report.summary.modified).toBe(1);
      expect(report.details).toBeDefined();
      expect(report.details.addedElements).toHaveLength(1);
      expect(report.details.removedElements).toHaveLength(1);
      expect(report.details.modifiedElements).toHaveLength(1);
      expect(report.impact).toBeDefined();
    });

    it('should analyze change impact', async () => {
      const mockComparison = {
        model1Id: 'model1',
        model2Id: 'model2',
        added: [
          {
            elementId: '#200',
            type: 'IFCBEAM',
            name: 'Beam',
            properties: {},
          },
          {
            elementId: '#201',
            type: 'IFCCOLUMN',
            name: 'Column',
            properties: {},
          },
        ],
        removed: [],
        modified: [
          {
            elementId: '#100',
            type: 'IFCWALL',
            name: 'Wall',
            changes: {
              properties: [
                { name: 'LoadBearing', oldValue: false, newValue: true },
              ],
              geometry: {},
            },
          },
        ],
        unchanged: [],
        summary: {
          totalElements1: 1,
          totalElements2: 3,
          addedCount: 2,
          removedCount: 0,
          modifiedCount: 1,
          unchangedCount: 0,
        },
        timestamp: new Date().toISOString(),
      };

      const report = await comparisonService.generateChangeReport(mockComparison);

      expect(report.impact).toBeDefined();
      expect(report.impact.severity).toBeDefined();
      expect(report.impact.affectedDisciplines).toBeDefined();
      expect(report.impact.affectedDisciplines).toContain('structure');
    });
  });

  describe('Multi-Version Tracking', () => {
    it('should track changes across multiple versions', async () => {
      const versions = [
        {
          id: 'v1',
          content: `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project',$,'V1',$,$,$,$,(#10),#11);
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
          date: '2024-01-01T00:00:00Z',
        },
        {
          id: 'v2',
          content: `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project',$,'V2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall Modified',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
#200=IFCDOOR('Door1',$,'Door',$,$,#201,$,$,$,$);
#201=IFCLOCALPLACEMENT($,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((5.,0.,0.));
ENDSEC;
END-ISO-10303-21;
          `,
          date: '2024-01-02T00:00:00Z',
        },
        {
          id: 'v3',
          content: `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v3.ifc','2024-01-03T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project',$,'V3',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall Modified',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
#200=IFCDOOR('Door1',$,'Door',$,$,#201,$,$,$,$);
#201=IFCLOCALPLACEMENT($,#202);
#202=IFCAXIS2PLACEMENT3D(#203,$,$);
#203=IFCCARTESIANPOINT((5.,0.,0.));
#300=IFCWINDOW('Window1',$,'Window',$,$,#301,$,$,$,$,$);
#301=IFCLOCALPLACEMENT($,#302);
#302=IFCAXIS2PLACEMENT3D(#303,$,$);
#303=IFCCARTESIANPOINT((10.,0.,1.));
ENDSEC;
END-ISO-10303-21;
          `,
          date: '2024-01-03T00:00:00Z',
        },
      ];

      const tracking = await comparisonService.trackChanges(versions);

      expect(tracking).toBeDefined();
      expect(tracking.versions).toHaveLength(3);
      expect(tracking.changeHistory).toBeDefined();
      expect(tracking.changeHistory.length).toBe(2); // v1->v2, v2->v3
      expect(tracking.timeline).toBeDefined();
      expect(tracking.summary).toBeDefined();
      expect(tracking.summary.totalVersions).toBe(3);
    });

    it('should identify element lifecycle', async () => {
      const versions = [
        {
          id: 'v1',
          content: `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project',$,'V1',$,$,$,$,(#10),#11);
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
          date: '2024-01-01T00:00:00Z',
        },
        {
          id: 'v2',
          content: `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project',$,'V2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
ENDSEC;
END-ISO-10303-21;
          `,
          date: '2024-01-02T00:00:00Z',
        },
      ];

      const tracking = await comparisonService.trackChanges(versions);

      expect(tracking.elementLifecycle).toBeDefined();
      const wallLifecycle = tracking.elementLifecycle['#100'];
      expect(wallLifecycle).toBeDefined();
      expect(wallLifecycle.created).toBe('v1');
      expect(wallLifecycle.removed).toBe('v2');
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicting changes', async () => {
      const mockComparison = {
        model1Id: 'base',
        model2Id: 'branch',
        added: [],
        removed: [
          {
            elementId: '#100',
            type: 'IFCWALL',
            name: 'Wall A',
            properties: {},
          },
        ],
        modified: [
          {
            elementId: '#100',
            type: 'IFCWALL',
            name: 'Wall A Modified',
            changes: {
              properties: [
                { name: 'Height', oldValue: 3000, newValue: 3500 },
              ],
              geometry: {},
            },
          },
        ],
        unchanged: [],
        summary: {
          totalElements1: 1,
          totalElements2: 1,
          addedCount: 0,
          removedCount: 1,
          modifiedCount: 1,
          unchangedCount: 0,
        },
        timestamp: new Date().toISOString(),
      };

      const conflicts = await comparisonService.detectChangeConflicts(
        mockComparison
      );

      expect(conflicts).toBeDefined();
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0].elementId).toBe('#100');
      expect(conflicts[0].conflictType).toBe('modify-delete');
      expect(conflicts[0].severity).toBeDefined();
    });

    it('should detect spatial conflicts', async () => {
      const mockComparison = {
        model1Id: 'model1',
        model2Id: 'model2',
        added: [
          {
            elementId: '#200',
            type: 'IFCDOOR',
            name: 'Door',
            properties: {},
            location: { x: 10, y: 0, z: 0 },
          },
        ],
        removed: [],
        modified: [
          {
            elementId: '#100',
            type: 'IFCWALL',
            name: 'Wall',
            changes: {
              properties: [],
              geometry: {
                positionChanged: true,
                translation: { x: 10, y: 0, z: 0 },
              },
            },
            location: { x: 10, y: 0, z: 0 },
          },
        ],
        unchanged: [],
        summary: {
          totalElements1: 1,
          totalElements2: 2,
          addedCount: 1,
          removedCount: 0,
          modifiedCount: 1,
          unchangedCount: 0,
        },
        timestamp: new Date().toISOString(),
      };

      const conflicts = await comparisonService.detectChangeConflicts(
        mockComparison
      );

      const spatialConflict = conflicts.find(
        (c) => c.conflictType === 'spatial-overlap'
      );
      expect(spatialConflict).toBeDefined();
    });
  });

  describe('Comparison Options', () => {
    it('should ignore specific property changes when configured', async () => {
      const model1Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 1',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall A',$,'Description A',#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const model2Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall A',$,'Description B',#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const options = {
        ignoreProperties: ['Description'],
        geometryTolerance: 0.001,
      };

      const comparison = await comparisonService.compare(
        model1Content,
        model2Content,
        'model1',
        'model2',
        options
      );

      expect(comparison.modified.length).toBe(0); // Description ignored
    });

    it('should use geometry tolerance', async () => {
      const model1Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v1.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 1',$,$,$,$,(#10),#11);
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
      `;

      const model2Content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('v2.ifc','2024-01-02T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Version 2',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#100=IFCWALL('Wall1',$,'Wall',$,$,#101,$,$,$);
#101=IFCLOCALPLACEMENT($,#102);
#102=IFCAXIS2PLACEMENT3D(#103,$,$);
#103=IFCCARTESIANPOINT((0.0001,0.,0.));
ENDSEC;
END-ISO-10303-21;
      `;

      const options = {
        geometryTolerance: 0.01, // 10mm tolerance
      };

      const comparison = await comparisonService.compare(
        model1Content,
        model2Content,
        'model1',
        'model2',
        options
      );

      expect(comparison.modified.length).toBe(0); // Within tolerance
    });
  });

  describe('Edge Cases', () => {
    it('should handle identical models', async () => {
      const content = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('model.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Test',$,$,$,$,(#10),#11);
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
      `;

      const comparison = await comparisonService.compare(
        content,
        content,
        'model1',
        'model2'
      );

      expect(comparison.added.length).toBe(0);
      expect(comparison.removed.length).toBe(0);
      expect(comparison.modified.length).toBe(0);
      expect(comparison.unchanged.length).toBeGreaterThan(0);
    });

    it('should handle empty models', async () => {
      const emptyContent = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('empty.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Empty',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
ENDSEC;
END-ISO-10303-21;
      `;

      const comparison = await comparisonService.compare(
        emptyContent,
        emptyContent,
        'model1',
        'model2'
      );

      expect(comparison).toBeDefined();
      expect(comparison.summary.totalElements1).toBe(0);
      expect(comparison.summary.totalElements2).toBe(0);
    });

    it('should handle invalid IFC content gracefully', async () => {
      const validContent = `
ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [CoordinationView]'),'2;1');
FILE_NAME('valid.ifc','2024-01-01T00:00:00',(''),(''),'','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('Project1',$,'Valid',$,$,$,$,(#10),#11);
#10=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.E-05,#12,$);
#11=IFCUNITASSIGNMENT((#20));
#12=IFCAXIS2PLACEMENT3D(#13,$,$);
#13=IFCCARTESIANPOINT((0.,0.,0.));
#20=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
ENDSEC;
END-ISO-10303-21;
      `;

      const invalidContent = 'INVALID IFC CONTENT';

      await expect(
        comparisonService.compare(
          validContent,
          invalidContent,
          'model1',
          'model2'
        )
      ).rejects.toThrow();
    });
  });
});
