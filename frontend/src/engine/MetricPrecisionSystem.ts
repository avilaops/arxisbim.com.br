/**
 * Metric Precision System
 * Garante precisão milimétrica (1:1) em todas as operações de medição e coordenadas
 * Evita erros de ponto flutuante e mantém precisão métrica real
 */

import * as THREE from 'three';

export interface PrecisionConfig {
  unit: 'mm' | 'cm' | 'm' | 'km'; // unidade base do sistema
  decimals: number; // casas decimais de precisão
  tolerance: number; // tolerância para comparações (ex: 0.001m = 1mm)
}

export class MetricPrecisionSystem {
  private config: PrecisionConfig;
  private scaleFactor: number; // fator de conversão para metros
  private readonly EARTH_RADIUS = 6371000; // metros

  constructor(config: Partial<PrecisionConfig> = {}) {
    this.config = {
      unit: config.unit ?? 'm',
      decimals: config.decimals ?? 3, // 3 casas = precisão mm
      tolerance: config.tolerance ?? 0.001 // 1mm
    };

    // Define fator de escala baseado na unidade
    switch (this.config.unit) {
      case 'mm': this.scaleFactor = 0.001; break;
      case 'cm': this.scaleFactor = 0.01; break;
      case 'm': this.scaleFactor = 1; break;
      case 'km': this.scaleFactor = 1000; break;
    }

    console.log(`📐 Metric Precision System initialized: ${this.config.unit}, ${this.config.decimals} decimals, tolerance ${this.config.tolerance}m`);
  }

  /**
   * Arredonda valor para precisão configurada
   */
  public round(value: number): number {
    const factor = Math.pow(10, this.config.decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * Converte valor da unidade base para metros
   */
  public toMeters(value: number): number {
    return this.round(value * this.scaleFactor);
  }

  /**
   * Converte metros para unidade base
   */
  public fromMeters(meters: number): number {
    return this.round(meters / this.scaleFactor);
  }

  /**
   * Converte Vector3 para metros
   */
  public vectorToMeters(vector: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      this.toMeters(vector.x),
      this.toMeters(vector.y),
      this.toMeters(vector.z)
    );
  }

  /**
   * Converte Vector3 de metros para unidade base
   */
  public vectorFromMeters(vector: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      this.fromMeters(vector.x),
      this.fromMeters(vector.y),
      this.fromMeters(vector.z)
    );
  }

  /**
   * Calcula distância entre dois pontos com precisão
   */
  public distance(p1: THREE.Vector3, p2: THREE.Vector3): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return this.round(this.toMeters(dist));
  }

  /**
   * Calcula distância 2D (ignora Z)
   */
  public distance2D(p1: THREE.Vector3, p2: THREE.Vector3): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return this.round(this.toMeters(dist));
  }

  /**
   * Verifica se dois valores são iguais dentro da tolerância
   */
  public equals(a: number, b: number): boolean {
    return Math.abs(a - b) <= this.config.tolerance;
  }

  /**
   * Verifica se dois vetores são iguais dentro da tolerância
   */
  public vectorEquals(v1: THREE.Vector3, v2: THREE.Vector3): boolean {
    return (
      this.equals(v1.x, v2.x) &&
      this.equals(v1.y, v2.y) &&
      this.equals(v1.z, v2.z)
    );
  }

  /**
   * Calcula área de um retângulo
   */
  public rectangleArea(width: number, height: number): number {
    const w = this.toMeters(width);
    const h = this.toMeters(height);
    return this.round(w * h);
  }

  /**
   * Calcula área de um polígono 2D (algoritmo Shoelace)
   */
  public polygonArea(points: THREE.Vector2[]): number {
    if (points.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p1 = points[i];
      const p2 = points[j];
      area += this.toMeters(p1.x) * this.toMeters(p2.y);
      area -= this.toMeters(p2.x) * this.toMeters(p1.y);
    }

    return this.round(Math.abs(area) / 2);
  }

  /**
   * Calcula volume de um paralelepípedo (caixa)
   */
  public boxVolume(width: number, height: number, depth: number): number {
    const w = this.toMeters(width);
    const h = this.toMeters(height);
    const d = this.toMeters(depth);
    return this.round(w * h * d);
  }

  /**
   * Calcula volume a partir de bounding box
   */
  public boundingBoxVolume(bbox: THREE.Box3): number {
    const size = bbox.getSize(new THREE.Vector3());
    return this.boxVolume(size.x, size.y, size.z);
  }

  /**
   * Calcula ângulo entre dois vetores em graus
   */
  public angleBetween(v1: THREE.Vector3, v2: THREE.Vector3): number {
    const angle = v1.angleTo(v2) * (180 / Math.PI);
    return this.round(angle);
  }

  /**
   * Formata valor com unidade
   */
  public format(value: number, includeUnit: boolean = true): string {
    const rounded = this.round(value);
    if (includeUnit) {
      return `${rounded.toFixed(this.config.decimals)} ${this.config.unit}`;
    }
    return rounded.toFixed(this.config.decimals);
  }

  /**
   * Formata distância em metros com unidade apropriada
   */
  public formatDistance(meters: number): string {
    if (meters < 0.001) {
      return `${(meters * 1000000).toFixed(0)} µm`;
    } else if (meters < 1) {
      return `${(meters * 1000).toFixed(1)} mm`;
    } else if (meters < 1000) {
      return `${meters.toFixed(this.config.decimals)} m`;
    } else {
      return `${(meters / 1000).toFixed(2)} km`;
    }
  }

  /**
   * Formata área com unidade apropriada
   */
  public formatArea(squareMeters: number): string {
    if (squareMeters < 1) {
      return `${(squareMeters * 10000).toFixed(0)} cm²`;
    } else if (squareMeters < 10000) {
      return `${squareMeters.toFixed(2)} m²`;
    } else {
      return `${(squareMeters / 10000).toFixed(2)} ha`;
    }
  }

  /**
   * Formata volume com unidade apropriada
   */
  public formatVolume(cubicMeters: number): string {
    if (cubicMeters < 0.001) {
      return `${(cubicMeters * 1000000).toFixed(0)} cm³`;
    } else if (cubicMeters < 1) {
      return `${(cubicMeters * 1000).toFixed(0)} L`;
    } else {
      return `${cubicMeters.toFixed(3)} m³`;
    }
  }

  /**
   * Converte coordenadas geográficas (lat/long) para distância em metros
   * Haversine formula
   */
  public geographicDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS * c;

    return this.round(distance);
  }

  /**
   * Retorna configuração atual
   */
  public getConfig(): PrecisionConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configuração
   */
  public setConfig(config: Partial<PrecisionConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Atualiza scale factor se unidade mudou
    if (config.unit) {
      switch (config.unit) {
        case 'mm': this.scaleFactor = 0.001; break;
        case 'cm': this.scaleFactor = 0.01; break;
        case 'm': this.scaleFactor = 1; break;
        case 'km': this.scaleFactor = 1000; break;
      }
    }
  }
}

// Singleton instance
export const metricPrecision = new MetricPrecisionSystem();
