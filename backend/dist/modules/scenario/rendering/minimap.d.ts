/**
 * Minimap System
 * Sistema de minimapa para visualização da posição no cenário
 * Posicionado no canto superior esquerdo por padrão
 */
import type { MinimapConfig, MinimapData, Vector3 } from '../types/index.js';
export declare class MinimapSystem {
    private config;
    constructor(config: MinimapConfig);
    /**
     * Gera dados do minimapa baseado na posição do jogador
     */
    generateMinimapData(playerPosition: Vector3, playerYaw: number, scenarioBounds?: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
    }): MinimapData;
    /**
     * Converte coordenadas do mundo 3D para coordenadas do minimapa
     */
    worldToMinimapCoordinates(worldPosition: Vector3, bounds: MinimapData['bounds']): {
        x: number;
        y: number;
    };
    /**
     * Gera SVG do minimapa para renderização
     */
    generateMinimapSVG(data: MinimapData): string;
    /**
     * Renderiza marcadores no minimapa
     */
    private renderMarkers;
    /**
     * Retorna estilo CSS de posicionamento baseado na config
     */
    private getPositionStyle;
    /**
     * Adiciona marcador ao minimapa
     */
    addMarker(data: MinimapData, position: Vector3, label: string, color?: string): MinimapData;
    /**
     * Remove marcador do minimapa
     */
    removeMarker(data: MinimapData, label: string): MinimapData;
    /**
     * Atualiza configuração do minimapa
     */
    updateConfig(newConfig: Partial<MinimapConfig>): void;
    /**
     * Retorna configuração atual
     */
    getConfig(): Readonly<MinimapConfig>;
    /**
     * Calcula bounds automáticos baseado em posições
     */
    calculateAutoBounds(positions: Vector3[], padding?: number): MinimapData['bounds'];
}
//# sourceMappingURL=minimap.d.ts.map