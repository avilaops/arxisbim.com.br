import type { FastifyRequest, FastifyReply } from 'fastify';
import { IfcService } from './ifc.service.js';
import { IfcPropertiesService } from './ifc-properties.service.js';
import { IfcClassificationsService } from './ifc-classifications.service.js';
import { IfcTypesService } from './ifc-types.service.js';
import { IfcGeometryService } from './ifc-geometry.service.js';
import { IfcRelationshipsService } from './ifc-relationships.service.js';
import { IfcSpacesService } from './ifc-spaces.service.js';
import { IfcStructuralService } from './ifc-structural.service.js';
import { IfcOpeningsService } from './ifc-openings.service.js';
import { IfcSchedulesService } from './ifc-schedules.service.js';
import { IfcCostsService } from './ifc-costs.service.js';
import { IfcEnergyService } from './ifc-energy.service.js';
import { IfcCoordinationService } from './ifc-coordination.service.js';
import { IfcSiteService } from './ifc-site.service.js';
import { IfcEquipmentService } from './ifc-equipment.service.js';
import { IfcTransportService } from './ifc-transport.service.js';
import { IfcPerformanceService } from './ifc-performance.service.js';
import { storage } from '../../core/storage/index.js';

export class IfcDomainsController {
  private propertiesService: IfcPropertiesService;
  private classificationsService: IfcClassificationsService;
  private typesService: IfcTypesService;
  private geometryService: IfcGeometryService;
  private relationshipsService: IfcRelationshipsService;
  private spacesService: IfcSpacesService;
  private structuralService: IfcStructuralService;
  private openingsService: IfcOpeningsService;
  private schedulesService: IfcSchedulesService;
  private costsService: IfcCostsService;
  private energyService: IfcEnergyService;
  private coordinationService: IfcCoordinationService;
  private siteService: IfcSiteService;
  private equipmentService: IfcEquipmentService;
  private transportService: IfcTransportService;
  private performanceService: IfcPerformanceService;

  constructor(private ifcService: IfcService) {
    this.propertiesService = new IfcPropertiesService();
    this.classificationsService = new IfcClassificationsService();
    this.typesService = new IfcTypesService();
    this.geometryService = new IfcGeometryService();
    this.relationshipsService = new IfcRelationshipsService();
    this.spacesService = new IfcSpacesService();
    this.structuralService = new IfcStructuralService();
    this.openingsService = new IfcOpeningsService();
    this.schedulesService = new IfcSchedulesService();
    this.costsService = new IfcCostsService();
    this.energyService = new IfcEnergyService();
    this.coordinationService = new IfcCoordinationService();
    this.siteService = new IfcSiteService();
    this.equipmentService = new IfcEquipmentService();
    this.transportService = new IfcTransportService();
    this.performanceService = new IfcPerformanceService();
  }

  /**
   * Get property sets
   * GET /api/v1/ifc/:id/properties
   */
  async getProperties(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const propertySets = this.propertiesService.extractPropertySets(content);
      const stats = this.propertiesService.getPropertyStats(propertySets);

      return reply.send({
        ifcModelId: id,
        propertySets,
        stats,
      });
    } catch (error: any) {
      console.error('Get properties error:', error);
      return reply.code(500).send({ error: 'Failed to get properties' });
    }
  }

  /**
   * Get classifications
   * GET /api/v1/ifc/:id/classifications
   */
  async getClassifications(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const classifications = this.classificationsService.extractClassifications(content);
      const systems = this.classificationsService.extractClassificationSystems(content);
      const stats = this.classificationsService.getClassificationStats(classifications);

      return reply.send({
        ifcModelId: id,
        classifications,
        systems,
        stats,
      });
    } catch (error: any) {
      console.error('Get classifications error:', error);
      return reply.code(500).send({ error: 'Failed to get classifications' });
    }
  }

  /**
   * Get type objects
   * GET /api/v1/ifc/:id/types
   */
  async getTypes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const types = this.typesService.extractTypeObjects(content);
      const usage = this.typesService.analyzeTypeUsage(types);
      const distribution = this.typesService.getTypeDistribution(types);

      return reply.send({
        ifcModelId: id,
        types,
        usage,
        distribution,
      });
    } catch (error: any) {
      console.error('Get types error:', error);
      return reply.code(500).send({ error: 'Failed to get types' });
    }
  }

  /**
   * Get geometry analysis
   * GET /api/v1/ifc/:id/geometry
   */
  async getGeometry(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const geometryTypes = this.geometryService.extractGeometryTypes(content);
      const complexity = this.geometryService.analyzeGeometryComplexity(content);
      const representations = this.geometryService.detectRepresentationTypes(content);

      return reply.send({
        ifcModelId: id,
        geometryTypes,
        complexity,
        representations,
      });
    } catch (error: any) {
      console.error('Get geometry error:', error);
      return reply.code(500).send({ error: 'Failed to analyze geometry' });
    }
  }

  /**
   * Get relationships analysis
   * GET /api/v1/ifc/:id/relationships
   */
  async getRelationships(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const relationships = this.relationshipsService.extractRelationships(content);
      const analysis = this.relationshipsService.analyzeRelationships(relationships);
      const spatialStructure = this.relationshipsService.extractSpatialStructure(content);

      return reply.send({
        ifcModelId: id,
        relationships: relationships.slice(0, 100),
        analysis,
        spatialStructure,
      });
    } catch (error: any) {
      console.error('Get relationships error:', error);
      return reply.code(500).send({ error: 'Failed to analyze relationships' });
    }
  }

  /**
   * Get spaces analysis
   * GET /api/v1/ifc/:id/spaces
   */
  async getSpaces(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const spaces = this.spacesService.extractSpaces(content);
      const zones = this.spacesService.extractZones(content);
      const analysis = this.spacesService.analyzeSpaces(spaces);
      const program = this.spacesService.calculateAreaProgram(spaces);

      return reply.send({
        ifcModelId: id,
        spaces,
        zones,
        analysis,
        program,
      });
    } catch (error: any) {
      console.error('Get spaces error:', error);
      return reply.code(500).send({ error: 'Failed to analyze spaces' });
    }
  }

  /**
   * Get structural analysis
   * GET /api/v1/ifc/:id/structural
   */
  async getStructural(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.structuralService.extractStructuralElements(content);
      const analysis = this.structuralService.analyzeStructural(elements);
      const grid = this.structuralService.analyzeStructuralGrid(elements);
      const foundations = this.structuralService.analyzeFoundations(content);

      return reply.send({
        ifcModelId: id,
        elements,
        analysis,
        grid,
        foundations,
      });
    } catch (error: any) {
      console.error('Get structural error:', error);
      return reply.code(500).send({ error: 'Failed to analyze structural elements' });
    }
  }

  /**
   * Get openings analysis (doors, windows)
   * GET /api/v1/ifc/:id/openings
   */
  async getOpenings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const openings = this.openingsService.extractOpenings(content);
      const analysis = this.openingsService.analyzeOpenings(openings);
      const doors = this.openingsService.extractDoors(content);
      const windows = this.openingsService.extractWindows(content);

      return reply.send({
        ifcModelId: id,
        openings,
        analysis,
        doors,
        windows,
      });
    } catch (error: any) {
      console.error('Get openings error:', error);
      return reply.code(500).send({ error: 'Failed to analyze openings' });
    }
  }

  /**
   * Get project schedule (4D)
   * GET /api/v1/ifc/:id/schedule
   */
  async getSchedule(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const tasks = this.schedulesService.extractTasks(content);
      const schedules = this.schedulesService.extractSchedules(content);
      const analysis = this.schedulesService.analyzeSchedule(tasks);
      const progress = this.schedulesService.calculateProgress(tasks);
      const mapping4D = this.schedulesService.extract4DMapping(content);

      return reply.send({
        ifcModelId: id,
        tasks,
        schedules,
        analysis,
        progress,
        mapping4D: mapping4D.slice(0, 100),
      });
    } catch (error: any) {
      console.error('Get schedule error:', error);
      return reply.code(500).send({ error: 'Failed to analyze schedule' });
    }
  }

  /**
   * Get cost analysis (5D)
   * GET /api/v1/ifc/:id/costs
   */
  async getCosts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const items = this.costsService.extractCostItems(content);
      const schedules = this.costsService.extractCostSchedules(content);
      const analysis = this.costsService.analyzeCosts(items);
      const breakdown = this.costsService.generateCostBreakdown(items);
      const byDiscipline = this.costsService.estimateCostByDiscipline(items);

      return reply.send({
        ifcModelId: id,
        items,
        schedules,
        analysis,
        breakdown,
        byDiscipline,
      });
    } catch (error: any) {
      console.error('Get costs error:', error);
      return reply.code(500).send({ error: 'Failed to analyze costs' });
    }
  }

  /**
   * Get energy analysis
   * GET /api/v1/ifc/:id/energy
   */
  async getEnergy(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.energyService.extractEnergyElements(content);
      const analysis = this.energyService.analyzeEnergy(elements);
      const sustainability = this.energyService.analyzeSustainability(analysis);
      const solarGain = this.energyService.calculateSolarGain(
        elements.filter(e => e.elementType === 'IFCWINDOW')
      );

      return reply.send({
        ifcModelId: id,
        elements,
        analysis,
        sustainability,
        solarGain,
      });
    } catch (error: any) {
      console.error('Get energy error:', error);
      return reply.code(500).send({ error: 'Failed to analyze energy performance' });
    }
  }

  /**
   * Get coordination analysis (clash detection)
   * GET /api/v1/ifc/:id/coordination
   */
  async getCoordination(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const clashes = this.coordinationService.detectClashes(content);
      const analysis = this.coordinationService.analyzeClashes(clashes);
      const report = this.coordinationService.generateCoordinationReport(id, clashes);
      const conflictZones = this.coordinationService.identifyConflictZones(clashes);
      const validation = this.coordinationService.validateCoordination(clashes);

      return reply.send({
        ifcModelId: id,
        clashes: clashes.slice(0, 100),
        analysis,
        report,
        conflictZones,
        validation,
      });
    } catch (error: any) {
      console.error('Get coordination error:', error);
      return reply.code(500).send({ error: 'Failed to analyze coordination' });
    }
  }

  /**
   * Get site & civil works analysis
   * GET /api/v1/ifc/:id/site
   */
  async getSite(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const siteElements = this.siteService.extractSiteElements(content);
      const civilElements = this.siteService.extractCivilElements(content);
      const siteAnalysis = this.siteService.analyzeSite(siteElements);
      const infrastructure = this.siteService.analyzeCivilInfrastructure(civilElements);
      const earthworks = this.siteService.calculateEarthworks(siteElements);
      const validation = this.siteService.validateSiteLayout(siteElements, civilElements);
      const report = this.siteService.generateSiteReport(siteElements, siteAnalysis);

      return reply.send({
        ifcModelId: id,
        siteElements,
        civilElements,
        siteAnalysis,
        infrastructure,
        earthworks,
        validation,
        report,
      });
    } catch (error: any) {
      console.error('Get site analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze site' });
    }
  }

  /**
   * Get equipment & furniture analysis
   * GET /api/v1/ifc/:id/equipment
   */
  async getEquipment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const furniture = this.equipmentService.extractFurniture(content);
      const equipment = this.equipmentService.extractEquipment(content);
      const allEquipment = [...furniture, ...equipment];
      const analysis = this.equipmentService.analyzeEquipment(allEquipment);
      const schedule = this.equipmentService.generateFurnitureSchedule(allEquipment);
      const utilization = this.equipmentService.analyzeSpaceUtilization(allEquipment);
      const costs = this.equipmentService.estimateEquipmentCosts(allEquipment);
      const validation = this.equipmentService.validateEquipment(allEquipment);
      const report = this.equipmentService.generateProcurementReport(allEquipment);

      return reply.send({
        ifcModelId: id,
        furniture,
        equipment,
        analysis,
        schedule,
        utilization,
        costs,
        validation,
        report,
      });
    } catch (error: any) {
      console.error('Get equipment analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze equipment' });
    }
  }

  /**
   * Get transport elements analysis
   * GET /api/v1/ifc/:id/transport
   */
  async getTransport(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.transportService.extractTransportElements(content);
      const analysis = this.transportService.analyzeTransport(elements);
      const groups = this.transportService.groupElevators(elements);
      const performance = this.transportService.calculatePerformance(elements);
      const validation = this.transportService.validateTransportSystem(elements);
      const costs = this.transportService.estimateTransportCosts(elements);
      const report = this.transportService.generateTransportReport(elements, performance);

      return reply.send({
        ifcModelId: id,
        elements,
        analysis,
        groups,
        performance,
        validation,
        costs,
        report,
      });
    } catch (error: any) {
      console.error('Get transport analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze transport' });
    }
  }

  /**
   * Get performance analysis (acoustic, lighting, etc.)
   * GET /api/v1/ifc/:id/performance
   */
  async getPerformance(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const ifcModel = await this.ifcService.getIfcById(id, user.tenantId);
      if (!ifcModel) {
        return reply.code(404).send({ error: 'IFC model not found' });
      }

      const content = await storage.downloadText(ifcModel.fileUrl);

      const elements = this.performanceService.extractPerformanceElements(content);
      const performance = this.performanceService.analyzePerformance(elements);
      const validation = this.performanceService.validatePerformance(performance);
      const report = this.performanceService.generatePerformanceReport(performance);
      const benchmark = this.performanceService.benchmarkPerformance(performance, 'office');

      return reply.send({
        ifcModelId: id,
        elements,
        performance,
        validation,
        report,
        benchmark,
      });
    } catch (error: any) {
      console.error('Get performance analysis error:', error);
      return reply.code(500).send({ error: 'Failed to analyze performance' });
    }
  }
}
