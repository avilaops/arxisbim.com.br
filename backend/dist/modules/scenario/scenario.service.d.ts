/**
 * Scenario Service
 * Serviço principal para gerenciamento de cenários 3D
 */
import type { ScenarioState, ScenarioConfig, InputState, MinimapData } from './types/index.js';
export declare class ScenarioService {
    private inputHandler;
    private movementController;
    private cameraController;
    private playerStateManager;
    private minimapSystem?;
    private activeScenarios;
    constructor();
    /**
     * Cria novo cenário
     */
    createScenario(id: string, projectId: string, name: string, config: ScenarioConfig, description?: string, ownership?: {
        tenantId?: string;
        createdBy?: string;
        presetId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<ScenarioState>;
    /**
     * Atualiza cenário baseado em frame de jogo (game loop)
     * @param scenarioId ID do cenário
     * @param deltaTime Tempo decorrido desde último frame (segundos)
     * @returns Estado atualizado do cenário
     */
    updateScenario(scenarioId: string, deltaTime: number, tenantId?: string): Promise<ScenarioState | null>;
    /**
     * Processa input do teclado
     */
    handleKeyDown(keyCode: string): void;
    /**
     * Processa soltura de tecla
     */
    handleKeyUp(keyCode: string): void;
    /**
     * Gera dados do minimapa
     */
    getMinimapData(scenarioId: string): Promise<MinimapData | null>;
    /**
     * Gera SVG do minimapa
     */
    getMinimapSVG(scenarioId: string): Promise<string | null>;
    /**
     * Obtém cenário por ID
     */
    getScenario(scenarioId: string, tenantId?: string): Promise<ScenarioState | null>;
    /**
     * Lista todos os cenários
     */
    listScenarios(tenantId?: string, projectId?: string): Promise<ScenarioState[]>;
    /**
     * Remove cenário
     */
    deleteScenario(scenarioId: string, tenantId?: string): Promise<boolean>;
    /**
     * Atualiza configuração do cenário
     */
    updateScenarioConfig(scenarioId: string, updates: Partial<ScenarioConfig> | {
        name?: string;
        description?: string;
        config?: Partial<ScenarioConfig>;
    }, tenantId?: string): Promise<ScenarioState | null>;
    /**
     * Teleporta jogador para posição específica
     */
    teleportPlayer(scenarioId: string, position: {
        x: number;
        y: number;
        z: number;
    }, tenantId?: string): Promise<ScenarioState | null>;
    /**
     * Reseta inputs (útil quando perde foco da janela)
     */
    resetInputs(): void;
    /**
     * Obtém estado atual dos inputs
     */
    getInputState(): Readonly<InputState>;
    private normalizeConfig;
    private toScenarioState;
    private persistState;
}
//# sourceMappingURL=scenario.service.d.ts.map