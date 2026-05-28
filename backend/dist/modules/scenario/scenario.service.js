/**
 * Scenario Service
 * Serviço principal para gerenciamento de cenários 3D
 */
import { InputHandler } from './core/input-handler.js';
import { MovementController } from './core/movement-controller.js';
import { CameraController } from './core/camera-controller.js';
import { PlayerStateManager } from './core/player-state.js';
import { MinimapSystem } from './rendering/minimap.js';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { DEFAULT_SCENARIO_CONFIG } from './constants/defaults.js';
export class ScenarioService {
    inputHandler;
    movementController;
    cameraController;
    playerStateManager;
    minimapSystem;
    activeScenarios = new Map();
    constructor() {
        this.inputHandler = new InputHandler();
        this.movementController = new MovementController();
        this.cameraController = new CameraController();
        this.playerStateManager = new PlayerStateManager();
    }
    /**
     * Cria novo cenário
     */
    async createScenario(id, projectId, name, config, description, ownership) {
        if (!ownership?.tenantId) {
            throw new Error('tenantId is required to create scenario');
        }
        const normalizedConfig = this.normalizeConfig(config);
        const playerState = this.playerStateManager.createInitialState(normalizedConfig);
        // Inicializa minimapa se habilitado
        if (normalizedConfig.enableMinimap) {
            this.minimapSystem = new MinimapSystem(normalizedConfig.minimapConfig);
        }
        const scenario = {
            id,
            projectId,
            name,
            description,
            tenantId: ownership?.tenantId,
            createdBy: ownership?.createdBy,
            camera: {
                position: { ...normalizedConfig.initialPosition },
                rotation: { ...normalizedConfig.initialRotation },
                fov: 75, // Field of View padrão
            },
            player: playerState,
            config: normalizedConfig,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const [saved] = await db
            .insert(scenarios)
            .values({
            id,
            tenantId: ownership.tenantId,
            projectId,
            createdBy: ownership.createdBy,
            name,
            description,
            presetId: ownership.presetId,
            camera: scenario.camera,
            player: scenario.player,
            config: scenario.config,
            metadata: ownership.metadata,
        })
            .returning();
        const persisted = this.toScenarioState(saved);
        this.activeScenarios.set(persisted.id, persisted);
        return persisted;
    }
    /**
     * Atualiza cenário baseado em frame de jogo (game loop)
     * @param scenarioId ID do cenário
     * @param deltaTime Tempo decorrido desde último frame (segundos)
     * @returns Estado atualizado do cenário
     */
    async updateScenario(scenarioId, deltaTime, tenantId) {
        const scenario = await this.getScenario(scenarioId, tenantId);
        if (!scenario)
            return null;
        const inputState = this.inputHandler.getInputState();
        // Atualiza movimento
        const newVelocity = this.movementController.calculateMovement(inputState, scenario.player, deltaTime);
        const newPosition = this.movementController.updatePosition(scenario.player.position, newVelocity, deltaTime);
        // Atualiza rotação da câmera
        const newRotation = this.cameraController.updateRotation(scenario.player.rotation, inputState, scenario.player.rotationSpeed, deltaTime);
        // Atualiza estado do jogador
        let updatedPlayer = this.playerStateManager.updatePosition(scenario.player, newPosition);
        updatedPlayer = this.playerStateManager.updateRotation(updatedPlayer, newRotation);
        updatedPlayer = this.playerStateManager.updateVelocity(updatedPlayer, newVelocity);
        updatedPlayer = this.playerStateManager.setCrouching(updatedPlayer, inputState.crouch);
        updatedPlayer = this.playerStateManager.setSprinting(updatedPlayer, inputState.sprint && !inputState.crouch);
        // Atualiza cenário
        const updatedScenario = {
            ...scenario,
            player: updatedPlayer,
            camera: {
                position: newPosition,
                rotation: newRotation,
                fov: scenario.camera.fov,
            },
            updatedAt: new Date().toISOString(),
        };
        await this.persistState(updatedScenario);
        this.activeScenarios.set(scenarioId, updatedScenario);
        return updatedScenario;
    }
    /**
     * Processa input do teclado
     */
    handleKeyDown(keyCode) {
        this.inputHandler.handleKeyDown(keyCode);
    }
    /**
     * Processa soltura de tecla
     */
    handleKeyUp(keyCode) {
        this.inputHandler.handleKeyUp(keyCode);
    }
    /**
     * Gera dados do minimapa
     */
    async getMinimapData(scenarioId) {
        const scenario = await this.getScenario(scenarioId);
        if (!scenario || !this.minimapSystem)
            return null;
        return this.minimapSystem.generateMinimapData(scenario.player.position, scenario.player.rotation.yaw);
    }
    /**
     * Gera SVG do minimapa
     */
    async getMinimapSVG(scenarioId) {
        const minimapData = await this.getMinimapData(scenarioId);
        if (!minimapData || !this.minimapSystem)
            return null;
        return this.minimapSystem.generateMinimapSVG(minimapData);
    }
    /**
     * Obtém cenário por ID
     */
    async getScenario(scenarioId, tenantId) {
        const cached = this.activeScenarios.get(scenarioId);
        if (cached) {
            return !tenantId || cached.tenantId === tenantId ? cached : null;
        }
        const conditions = [eq(scenarios.id, scenarioId)];
        if (tenantId)
            conditions.push(eq(scenarios.tenantId, tenantId));
        const [row] = await db
            .select()
            .from(scenarios)
            .where(and(...conditions))
            .limit(1);
        if (!row)
            return null;
        const scenario = this.toScenarioState(row);
        this.activeScenarios.set(scenario.id, scenario);
        if (scenario.config.enableMinimap) {
            this.minimapSystem = new MinimapSystem(scenario.config.minimapConfig);
        }
        return scenario;
    }
    /**
     * Lista todos os cenários
     */
    async listScenarios(tenantId, projectId) {
        const conditions = [];
        if (tenantId)
            conditions.push(eq(scenarios.tenantId, tenantId));
        if (projectId)
            conditions.push(eq(scenarios.projectId, projectId));
        const rows = await db
            .select()
            .from(scenarios)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(scenarios.updatedAt));
        const persisted = rows.map((row) => this.toScenarioState(row));
        for (const scenario of persisted) {
            this.activeScenarios.set(scenario.id, scenario);
        }
        return persisted;
    }
    /**
     * Remove cenário
     */
    async deleteScenario(scenarioId, tenantId) {
        const conditions = [eq(scenarios.id, scenarioId)];
        if (tenantId)
            conditions.push(eq(scenarios.tenantId, tenantId));
        const deleted = await db
            .delete(scenarios)
            .where(and(...conditions))
            .returning({ id: scenarios.id });
        this.activeScenarios.delete(scenarioId);
        return deleted.length > 0;
    }
    /**
     * Atualiza configuração do cenário
     */
    async updateScenarioConfig(scenarioId, updates, tenantId) {
        const scenario = await this.getScenario(scenarioId, tenantId);
        if (!scenario)
            return null;
        const hasScenarioFields = 'config' in updates || 'name' in updates || 'description' in updates;
        const scenarioUpdates = hasScenarioFields
            ? updates
            : { config: updates };
        const mergedConfig = this.normalizeConfig({ ...scenario.config, ...scenarioUpdates.config });
        const updatedScenario = {
            ...scenario,
            name: scenarioUpdates.name ?? scenario.name,
            description: scenarioUpdates.description ?? scenario.description,
            config: mergedConfig,
            updatedAt: new Date().toISOString(),
        };
        const conditions = [eq(scenarios.id, scenarioId)];
        if (tenantId)
            conditions.push(eq(scenarios.tenantId, tenantId));
        const [saved] = await db
            .update(scenarios)
            .set({
            name: updatedScenario.name,
            description: updatedScenario.description,
            config: updatedScenario.config,
            camera: updatedScenario.camera,
            player: updatedScenario.player,
            updatedAt: new Date(),
        })
            .where(and(...conditions))
            .returning();
        if (!saved)
            return null;
        const persisted = this.toScenarioState(saved);
        this.activeScenarios.set(scenarioId, persisted);
        return persisted;
    }
    /**
     * Teleporta jogador para posição específica
     */
    async teleportPlayer(scenarioId, position, tenantId) {
        const scenario = await this.getScenario(scenarioId, tenantId);
        if (!scenario)
            return null;
        const updatedPlayer = this.playerStateManager.updatePosition(scenario.player, position);
        const updatedScenario = {
            ...scenario,
            player: updatedPlayer,
            camera: {
                ...scenario.camera,
                position,
            },
            updatedAt: new Date().toISOString(),
        };
        await this.persistState(updatedScenario);
        this.activeScenarios.set(scenarioId, updatedScenario);
        return updatedScenario;
    }
    /**
     * Reseta inputs (útil quando perde foco da janela)
     */
    resetInputs() {
        this.inputHandler.reset();
    }
    /**
     * Obtém estado atual dos inputs
     */
    getInputState() {
        return this.inputHandler.getInputState();
    }
    normalizeConfig(config) {
        return {
            ...DEFAULT_SCENARIO_CONFIG,
            ...config,
            initialPosition: {
                ...DEFAULT_SCENARIO_CONFIG.initialPosition,
                ...config.initialPosition,
            },
            initialRotation: {
                ...DEFAULT_SCENARIO_CONFIG.initialRotation,
                ...config.initialRotation,
            },
            minimapConfig: {
                ...DEFAULT_SCENARIO_CONFIG.minimapConfig,
                ...config.minimapConfig,
            },
        };
    }
    toScenarioState(row) {
        return {
            id: row.id,
            projectId: row.projectId,
            tenantId: row.tenantId,
            createdBy: row.createdBy || undefined,
            name: row.name,
            description: row.description || undefined,
            camera: row.camera,
            player: row.player,
            config: row.config,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }
    async persistState(scenario) {
        await db
            .update(scenarios)
            .set({
            camera: scenario.camera,
            player: scenario.player,
            config: scenario.config,
            updatedAt: new Date(),
        })
            .where(eq(scenarios.id, scenario.id));
    }
}
//# sourceMappingURL=scenario.service.js.map