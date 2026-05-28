/**
 * Scenario Controller
 * REST API endpoints para gerenciamento de cenários 3D
 */
import { randomUUID } from 'node:crypto';
import { createScenarioSchema, updateScenarioSchema, teleportSchema, scenarioQuerySchema, } from './scenario.schemas.js';
export class ScenarioController {
    scenarioService;
    constructor(scenarioService) {
        this.scenarioService = scenarioService;
    }
    /**
     * Criar novo cenário
     * POST /api/v1/scenarios
     */
    async create(request, reply) {
        try {
            const body = createScenarioSchema.parse(request.body);
            const user = request.user;
            const scenarioId = randomUUID();
            const scenario = await this.scenarioService.createScenario(scenarioId, body.projectId, body.name, body.config, body.description, {
                tenantId: user?.tenantId,
                createdBy: user?.userId,
                presetId: body.presetId,
            });
            return reply.code(201).send({
                success: true,
                data: scenario,
            });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Listar cenários
     * GET /api/v1/scenarios
     */
    async list(request, reply) {
        try {
            const query = scenarioQuerySchema.parse(request.query);
            const user = request.user;
            const scenarios = await this.scenarioService.listScenarios(user?.tenantId, query.projectId);
            // Aplicar paginação
            const total = scenarios.length;
            const paginatedScenarios = scenarios.slice(query.offset, query.offset + query.limit);
            return reply.send({
                success: true,
                data: paginatedScenarios,
                meta: {
                    total,
                    limit: query.limit,
                    offset: query.offset,
                },
            });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Obter cenário por ID
     * GET /api/v1/scenarios/:id
     */
    async getById(request, reply) {
        try {
            const { id } = request.params;
            const user = request.user;
            const scenario = await this.scenarioService.getScenario(id, user?.tenantId);
            if (!scenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            return reply.send({
                success: true,
                data: scenario,
            });
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Atualizar cenário
     * PATCH /api/v1/scenarios/:id
     */
    async update(request, reply) {
        try {
            const { id } = request.params;
            const user = request.user;
            const body = updateScenarioSchema.parse(request.body);
            const scenario = await this.scenarioService.getScenario(id, user?.tenantId);
            if (!scenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            const updatedScenario = await this.scenarioService.updateScenarioConfig(id, {
                name: body.name,
                description: body.description,
                config: (body.config || {}),
            }, user?.tenantId);
            return reply.send({
                success: true,
                data: updatedScenario,
            });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Deletar cenário
     * DELETE /api/v1/scenarios/:id
     */
    async delete(request, reply) {
        try {
            const { id } = request.params;
            const user = request.user;
            const scenario = await this.scenarioService.getScenario(id, user?.tenantId);
            if (!scenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            const deleted = await this.scenarioService.deleteScenario(id, user?.tenantId);
            if (!deleted) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            return reply.code(204).send();
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Obter minimapa do cenário
     * GET /api/v1/scenarios/:id/minimap
     */
    async getMinimap(request, reply) {
        try {
            const { id } = request.params;
            const { format } = request.query;
            const user = request.user;
            const scenario = await this.scenarioService.getScenario(id, user?.tenantId);
            if (!scenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            if (format === 'svg') {
                const svg = await this.scenarioService.getMinimapSVG(id);
                if (!svg) {
                    return reply.code(404).send({
                        success: false,
                        error: 'Minimapa não disponível',
                    });
                }
                return reply
                    .header('Content-Type', 'image/svg+xml')
                    .send(svg);
            }
            else {
                const data = await this.scenarioService.getMinimapData(id);
                if (!data) {
                    return reply.code(404).send({
                        success: false,
                        error: 'Minimapa não disponível',
                    });
                }
                return reply.send({
                    success: true,
                    data,
                });
            }
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Teleportar jogador
     * POST /api/v1/scenarios/:id/teleport
     */
    async teleport(request, reply) {
        try {
            const { id } = request.params;
            const body = teleportSchema.parse(request.body);
            const user = request.user;
            const existingScenario = await this.scenarioService.getScenario(id, user?.tenantId);
            if (!existingScenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            const scenario = await this.scenarioService.teleportPlayer(id, body, user?.tenantId);
            if (!scenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            return reply.send({
                success: true,
                data: scenario,
            });
        }
        catch (error) {
            return reply.code(400).send({
                success: false,
                error: error.message,
            });
        }
    }
    /**
     * Atualizar posição do jogador (game loop tick)
     * POST /api/v1/scenarios/:id/update
     */
    async updatePosition(request, reply) {
        try {
            const { id } = request.params;
            const { deltaTime } = request.body;
            const user = request.user;
            const existingScenario = await this.scenarioService.getScenario(id, user?.tenantId);
            if (!existingScenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            const scenario = await this.scenarioService.updateScenario(id, deltaTime || 0.016, // 60 FPS default
            user?.tenantId);
            if (!scenario) {
                return reply.code(404).send({
                    success: false,
                    error: 'Cenário não encontrado',
                });
            }
            return reply.send({
                success: true,
                data: scenario,
            });
        }
        catch (error) {
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }
}
//# sourceMappingURL=scenario.controller.js.map