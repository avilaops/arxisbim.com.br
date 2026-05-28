/**
 * Scenario Controller
 * REST API endpoints para gerenciamento de cenários 3D
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ScenarioService } from '../scenario.service.js';
export declare class ScenarioController {
    private scenarioService;
    constructor(scenarioService: ScenarioService);
    /**
     * Criar novo cenário
     * POST /api/v1/scenarios
     */
    create(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Listar cenários
     * GET /api/v1/scenarios
     */
    list(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Obter cenário por ID
     * GET /api/v1/scenarios/:id
     */
    getById(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Atualizar cenário
     * PATCH /api/v1/scenarios/:id
     */
    update(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Deletar cenário
     * DELETE /api/v1/scenarios/:id
     */
    delete(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Obter minimapa do cenário
     * GET /api/v1/scenarios/:id/minimap
     */
    getMinimap(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Teleportar jogador
     * POST /api/v1/scenarios/:id/teleport
     */
    teleport(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    /**
     * Atualizar posição do jogador (game loop tick)
     * POST /api/v1/scenarios/:id/update
     */
    updatePosition(request: FastifyRequest, reply: FastifyReply): Promise<never>;
}
//# sourceMappingURL=scenario.controller.d.ts.map