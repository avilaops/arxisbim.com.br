/**
 * Scenario Routes
 * Definição de rotas REST API para cenários 3D
 */
import { authenticateRequest } from '../../../core/auth/middleware.js';
import { ScenarioController } from './scenario.controller.js';
import { ScenarioService } from '../scenario.service.js';
export async function scenarioRoutes(fastify) {
    const scenarioService = new ScenarioService();
    const controller = new ScenarioController(scenarioService);
    // Criar cenário
    fastify.post('/scenarios', {
        schema: {
            description: 'Criar novo cenário 3D',
            tags: ['scenarios'],
            body: {
                type: 'object',
                required: ['projectId', 'name'],
                properties: {
                    projectId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    presetId: { type: 'string', maxLength: 80 },
                    config: {
                        type: 'object',
                        additionalProperties: true,
                        properties: {
                            movementSpeed: { type: 'number' },
                            rotationSpeed: { type: 'number' },
                            enableMinimap: { type: 'boolean' },
                        },
                    },
                },
            },
            response: {
                201: {
                    description: 'Cenário criado com sucesso',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object', additionalProperties: true },
                    },
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.create.bind(controller),
    });
    // Listar cenários
    fastify.get('/scenarios', {
        schema: {
            description: 'Listar cenários',
            tags: ['scenarios'],
            querystring: {
                type: 'object',
                properties: {
                    projectId: { type: 'string', format: 'uuid' },
                    limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
                    offset: { type: 'number', minimum: 0, default: 0 },
                },
            },
            response: {
                200: {
                    description: 'Lista de cenários',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'array',
                            items: { type: 'object', additionalProperties: true },
                        },
                        meta: {
                            type: 'object',
                            properties: {
                                total: { type: 'number' },
                                limit: { type: 'number' },
                                offset: { type: 'number' },
                            },
                        },
                    },
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.list.bind(controller),
    });
    // Obter cenário por ID
    fastify.get('/scenarios/:id', {
        schema: {
            description: 'Obter cenário por ID',
            tags: ['scenarios'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            response: {
                200: {
                    description: 'Cenário encontrado',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object', additionalProperties: true },
                    },
                },
                404: {
                    description: 'Cenário não encontrado',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        error: { type: 'string' },
                    },
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.getById.bind(controller),
    });
    // Atualizar cenário
    fastify.patch('/scenarios/:id', {
        schema: {
            description: 'Atualizar configuração do cenário',
            tags: ['scenarios'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    config: { type: 'object', additionalProperties: true },
                },
            },
            response: {
                200: {
                    description: 'Cenário atualizado',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object', additionalProperties: true },
                    },
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.update.bind(controller),
    });
    // Deletar cenário
    fastify.delete('/scenarios/:id', {
        schema: {
            description: 'Deletar cenário',
            tags: ['scenarios'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            response: {
                204: {
                    description: 'Cenário deletado',
                    type: 'null',
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.delete.bind(controller),
    });
    // Obter minimapa
    fastify.get('/scenarios/:id/minimap', {
        schema: {
            description: 'Obter minimapa do cenário',
            tags: ['scenarios'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            querystring: {
                type: 'object',
                properties: {
                    format: { type: 'string', enum: ['svg', 'json'], default: 'json' },
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.getMinimap.bind(controller),
    });
    // Teleportar jogador
    fastify.post('/scenarios/:id/teleport', {
        schema: {
            description: 'Teleportar jogador para posição específica',
            tags: ['scenarios'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                required: ['x', 'y', 'z'],
                properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    z: { type: 'number' },
                },
            },
            response: {
                200: {
                    description: 'Jogador teleportado',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object', additionalProperties: true },
                    },
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.teleport.bind(controller),
    });
    // Atualizar posição (game loop)
    fastify.post('/scenarios/:id/update', {
        schema: {
            description: 'Atualizar estado do cenário (game loop tick)',
            tags: ['scenarios'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'string' },
                },
            },
            body: {
                type: 'object',
                properties: {
                    deltaTime: { type: 'number', description: 'Tempo em segundos desde último frame' },
                },
            },
            response: {
                200: {
                    description: 'Estado atualizado',
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'object', additionalProperties: true },
                    },
                },
            },
        },
        preHandler: authenticateRequest,
        handler: controller.updatePosition.bind(controller),
    });
}
//# sourceMappingURL=scenario.routes.js.map