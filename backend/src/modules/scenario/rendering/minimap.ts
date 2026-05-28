/**
 * Minimap System
 * Sistema de minimapa para visualização da posição no cenário
 * Posicionado no canto superior esquerdo por padrão
 */

import type { MinimapConfig, MinimapData, Vector3 } from '../types/index.js';
import { DEFAULT_MINIMAP_CONFIG } from '../constants/defaults.js';

export class MinimapSystem {
  private config: MinimapConfig;

  constructor(config: MinimapConfig) {
    this.config = config;
  }

  /**
   * Gera dados do minimapa baseado na posição do jogador
   */
  generateMinimapData(
    playerPosition: Vector3,
    playerYaw: number,
    scenarioBounds?: {
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
    }
  ): MinimapData {
    const bounds = scenarioBounds || {
      minX: playerPosition.x - 100,
      maxX: playerPosition.x + 100,
      minZ: playerPosition.z - 100,
      maxZ: playerPosition.z + 100,
    };

    return {
      playerPosition,
      playerRotation: playerYaw,
      bounds,
      markers: [],
    };
  }

  /**
   * Converte coordenadas do mundo 3D para coordenadas do minimapa
   */
  worldToMinimapCoordinates(
    worldPosition: Vector3,
    bounds: MinimapData['bounds']
  ): { x: number; y: number } {
    // Normaliza posição (0-1)
    const normalizedX = (worldPosition.x - bounds.minX) / (bounds.maxX - bounds.minX);
    const normalizedZ = (worldPosition.z - bounds.minZ) / (bounds.maxZ - bounds.minZ);

    // Converte para pixels do minimapa
    return {
      x: normalizedX * this.config.width,
      y: (1 - normalizedZ) * this.config.height, // Inverte Y para coordenadas de tela
    };
  }

  /**
   * Gera SVG do minimapa para renderização
   */
  generateMinimapSVG(data: MinimapData): string {
    const minimapPos = this.worldToMinimapCoordinates(data.playerPosition, data.bounds);
    const arrowRotation = -data.playerRotation; // Negativo para corresponder ao sistema de coordenadas

    let svg = `
      <svg width="${this.config.width}" height="${this.config.height}" 
           xmlns="http://www.w3.org/2000/svg"
           style="position: absolute; ${this.getPositionStyle()}; 
                  background: ${this.config.backgroundColor}; 
                  border: 2px solid ${this.config.borderColor}; 
                  border-radius: 4px;">
        
        <!-- Grid de fundo -->
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="${this.config.width}" height="${this.config.height}" fill="url(#grid)" />
        
        <!-- Marcadores -->
        ${this.renderMarkers(data.markers || [], data.bounds)}
        
        <!-- Jogador (seta indicando direção) -->
        <g transform="translate(${minimapPos.x}, ${minimapPos.y}) rotate(${arrowRotation})">
          <polygon points="0,-8 6,8 0,4 -6,8" fill="#00ff00" stroke="#ffffff" stroke-width="1"/>
        </g>
        
        <!-- Coordenadas -->
        <text x="5" y="15" fill="#ffffff" font-size="10" font-family="monospace">
          X: ${Math.round(data.playerPosition.x)}
        </text>
        <text x="5" y="28" fill="#ffffff" font-size="10" font-family="monospace">
          Z: ${Math.round(data.playerPosition.z)}
        </text>
        <text x="5" y="41" fill="#ffffff" font-size="10" font-family="monospace">
          Y: ${Math.round(data.playerPosition.y)}
        </text>
      </svg>
    `;

    return svg.trim();
  }

  /**
   * Renderiza marcadores no minimapa
   */
  private renderMarkers(
    markers: MinimapData['markers'],
    bounds: MinimapData['bounds']
  ): string {
    if (!markers || markers.length === 0) return '';

    return markers
      .map((marker) => {
        const pos = this.worldToMinimapCoordinates(marker.position, bounds);
        return `
          <circle cx="${pos.x}" cy="${pos.y}" r="4" fill="${marker.color}" stroke="#ffffff" stroke-width="1"/>
          <text x="${pos.x + 8}" y="${pos.y + 4}" fill="#ffffff" font-size="9" font-family="sans-serif">
            ${marker.label}
          </text>
        `;
      })
      .join('');
  }

  /**
   * Retorna estilo CSS de posicionamento baseado na config
   */
  private getPositionStyle(): string {
    const positions = {
      'top-left': 'top: 10px; left: 10px;',
      'top-right': 'top: 10px; right: 10px;',
      'bottom-left': 'bottom: 10px; left: 10px;',
      'bottom-right': 'bottom: 10px; right: 10px;',
    };

    return positions[this.config.position] || positions['top-left'];
  }

  /**
   * Adiciona marcador ao minimapa
   */
  addMarker(
    data: MinimapData,
    position: Vector3,
    label: string,
    color: string = '#ff0000'
  ): MinimapData {
    return {
      ...data,
      markers: [
        ...(data.markers || []),
        { position, label, color },
      ],
    };
  }

  /**
   * Remove marcador do minimapa
   */
  removeMarker(data: MinimapData, label: string): MinimapData {
    return {
      ...data,
      markers: (data.markers || []).filter((m) => m.label !== label),
    };
  }

  /**
   * Atualiza configuração do minimapa
   */
  updateConfig(newConfig: Partial<MinimapConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Retorna configuração atual
   */
  getConfig(): Readonly<MinimapConfig> {
    return { ...this.config };
  }

  /**
   * Calcula bounds automáticos baseado em posições
   */
  calculateAutoBounds(
    positions: Vector3[],
    padding: number = 50
  ): MinimapData['bounds'] {
    if (positions.length === 0) {
      return { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
    }

    const xs = positions.map((p) => p.x);
    const zs = positions.map((p) => p.z);

    return {
      minX: Math.min(...xs) - padding,
      maxX: Math.max(...xs) + padding,
      minZ: Math.min(...zs) - padding,
      maxZ: Math.max(...zs) + padding,
    };
  }
}
