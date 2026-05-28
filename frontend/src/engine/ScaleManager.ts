import * as THREE from 'three';

/**
 * ScaleManager - Gerenciador de escalas métricas
 * Garante que 1 unidade Three.js = 1 metro real
 */
export class ScaleManager {
  private static instance: ScaleManager;
  private globalScale: number = 1.0; // Fator de escala global
  private unitsPerMeter: number = 1.0; // Unidades por metro
  private targetUnitsPerMeter: number = 1.0; // Alvo: 1 unidade = 1 metro

  private constructor() {}

  public static getInstance(): ScaleManager {
    if (!ScaleManager.instance) {
      ScaleManager.instance = new ScaleManager();
    }
    return ScaleManager.instance;
  }

  /**
   * Define unidades por metro baseado no arquivo IFC
   */
  public setUnitsFromIFC(ifcData: any): void {
    // IFC normalmente usa milímetros como unidades base
    // Mas pode variar por projeto

    // Tenta detectar unidades do IFC
    const units = this.detectIFCUnits(ifcData);
    this.unitsPerMeter = units;

    // Calcula escala necessária para atingir 1 unidade = 1 metro
    this.globalScale = this.targetUnitsPerMeter / this.unitsPerMeter;

    console.log(`📏 IFC Units: ${this.unitsPerMeter} units/meter, Scale: ${this.globalScale}`);
  }

  /**
   * Detecta unidades do arquivo IFC
   */
  private detectIFCUnits(ifcData: any): number {
    // Padrão IFC: muitas implementações usam milímetros
    // web-ifc normalmente converte para metros, mas vamos verificar

    // Verifica se há metadados de unidades
    if (ifcData?.units) {
      const unitType = ifcData.units.type;
      switch (unitType) {
        case 'MILLIMETRE':
          return 1000; // 1000mm = 1m
        case 'CENTIMETRE':
          return 100;  // 100cm = 1m
        case 'METRE':
          return 1;    // 1m = 1m
        case 'INCH':
          return 1 / 0.0254; // ~39.37 inches = 1m
        default:
          console.warn(`Unknown IFC unit type: ${unitType}, assuming meters`);
          return 1;
      }
    }

    // Fallback: assume milímetros (comum em IFC)
    console.warn('No unit information found in IFC, assuming millimeters');
    return 1000;
  }

  /**
   * Aplica escala a um objeto Three.js
   */
  public applyScale(object: THREE.Object3D): void {
    if (this.globalScale !== 1.0) {
      object.scale.multiplyScalar(this.globalScale);
      console.log(`📏 Applied scale ${this.globalScale} to object`);
    }
  }

  /**
   * Converte valor de unidades IFC para metros
   */
  public ifcUnitsToMeters(value: number): number {
    return value / this.unitsPerMeter;
  }

  /**
   * Converte valor de metros para unidades IFC
   */
  public metersToIfcUnits(value: number): number {
    return value * this.unitsPerMeter;
  }

  /**
   * Converte coordenadas IFC para coordenadas Three.js (metros)
   */
  public convertIFCCoordinates(coordinates: number[]): THREE.Vector3 {
    return new THREE.Vector3(
      this.ifcUnitsToMeters(coordinates[0] || 0),
      this.ifcUnitsToMeters(coordinates[1] || 0),
      this.ifcUnitsToMeters(coordinates[2] || 0)
    );
  }

  /**
   * Valida se as medições estão corretas
   */
  public validateMeasurements(object: THREE.Object3D): boolean {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());

    // Verifica se dimensões são razoáveis para um prédio (máx 1000m em qualquer direção)
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (maxDimension > 1000) {
      console.warn(`⚠️ Object dimensions seem too large: ${maxDimension}m. Check scale settings.`);
      return false;
    }

    // Verifica se não é muito pequeno (mín 0.1m)
    if (maxDimension < 0.1) {
      console.warn(`⚠️ Object dimensions seem too small: ${maxDimension}m. Check scale settings.`);
      return false;
    }

    console.log(`✅ Measurements validated: ${size.x.toFixed(2)}m x ${size.y.toFixed(2)}m x ${size.z.toFixed(2)}m`);
    return true;
  }

  /**
   * Obtém estatísticas de escala
   */
  public getScaleStats(): ScaleStats {
    return {
      globalScale: this.globalScale,
      unitsPerMeter: this.unitsPerMeter,
      targetUnitsPerMeter: this.targetUnitsPerMeter,
      isMetric: this.unitsPerMeter === 1.0
    };
  }

  /**
   * Reseta configurações de escala
   */
  public reset(): void {
    this.globalScale = 1.0;
    this.unitsPerMeter = 1.0;
    console.log('🔄 Scale settings reset');
  }
}

export interface ScaleStats {
  globalScale: number;
  unitsPerMeter: number;
  targetUnitsPerMeter: number;
  isMetric: boolean;
}