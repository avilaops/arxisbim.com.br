import * as THREE from 'three';
import { ScaleManager } from './ScaleManager';

/**
 * CoordinateSystem - Sistema de coordenadas global
 * Gerencia transformações entre sistemas de coordenadas (local, global, georreferenciado)
 */
export class CoordinateSystem {
  private static instance: CoordinateSystem;
  private scaleManager: ScaleManager;

  // Sistema de coordenadas global (WGS84/EPSG:4326)
  private globalOrigin: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private globalRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  private globalScale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  // Transformações entre sistemas
  private localToGlobalMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private globalToLocalMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Configurações de georreferenciamento
  private geoReference: GeoReference = {
    enabled: false,
    latitude: 0,
    longitude: 0,
    altitude: 0,
    epsg: 'EPSG:4326',
    accuracy: 'HIGH'
  };

  // Parâmetros dos elipsoides suportados
  private readonly ELLIPSOIDS = {
    WGS84: {
      a: 6378137.0,        // semi-major axis
      f: 1/298.257223563,  // flattening
      name: 'WGS84'
    },
    GRS80: {
      a: 6378137.0,        // mesmo semi-major axis do WGS84
      f: 1/298.257222101,  // flattening ligeiramente diferente
      name: 'GRS80 (SIRGAS 2000)'
    }
  };

  private constructor() {
    this.scaleManager = ScaleManager.getInstance();
    this.updateTransformationMatrices();
  }

  public static getInstance(): CoordinateSystem {
    if (!CoordinateSystem.instance) {
      CoordinateSystem.instance = new CoordinateSystem();
    }
    return CoordinateSystem.instance;
  }

  /**
   * Define origem global do projeto
   */
  public setGlobalOrigin(origin: THREE.Vector3): void {
    this.globalOrigin.copy(origin);
    this.updateTransformationMatrices();
    console.log(`🌍 Global origin set: (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)})`);
  }

  /**
   * Define rotação global
   */
  public setGlobalRotation(rotation: THREE.Euler): void {
    this.globalRotation.copy(rotation);
    this.updateTransformationMatrices();
    console.log(`🔄 Global rotation set: (${rotation.x.toFixed(2)}, ${rotation.y.toFixed(2)}, ${rotation.z.toFixed(2)})`);
  }

  /**
   * Configura SIRGAS 2000 (sistema brasileiro)
   */
  public setSIRGAS2000(latitude: number, longitude: number, altitude: number = 0, utmZone?: number): void {
    // Determina o EPSG baseado na zona UTM se fornecida
    let epsg = 'EPSG:4674'; // SIRGAS 2000 geográfico

    if (utmZone) {
      // SIRGAS 2000 UTM zones para Brasil (25S a 45S)
      const utmBase = 31965; // EPSG:31965 = SIRGAS 2000 / UTM zone 25S
      epsg = `EPSG:${utmBase + (utmZone - 25)}`;
    }

    this.setGeoReference({
      enabled: true,
      latitude,
      longitude,
      altitude,
      epsg,
      accuracy: 'HIGH'
    });

    console.log(`🇧🇷 SIRGAS 2000 configurado: ${latitude}, ${longitude} (EPSG: ${epsg})`);
  }

  /**
   * Verifica se está usando SIRGAS 2000
   */
  public isUsingSIRGAS2000(): boolean {
    return this.getEllipsoidFromEPSG(this.geoReference.epsg) === 'GRS80';
  }

  /**
   * Configura georreferenciamento
   */
  public setGeoReference(geoRef: Partial<GeoReference>): void {
    this.geoReference = { ...this.geoReference, ...geoRef };
    console.log(`📍 Georeference configured: ${this.geoReference.latitude}, ${this.geoReference.longitude}`);

    if (this.geoReference.enabled) {
      this.applyGeoReference();
    }
  }

  /**
   * Aplica georreferenciamento ao sistema de coordenadas
   */
  private applyGeoReference(): void {
    // Determina o elipsoide baseado no EPSG
    const ellipsoid = this.getEllipsoidFromEPSG(this.geoReference.epsg);

    // Converte coordenadas geográficas para cartesianas
    const cartesian = this.geographicToCartesian(
      this.geoReference.latitude,
      this.geoReference.longitude,
      this.geoReference.altitude,
      ellipsoid
    );

    this.setGlobalOrigin(cartesian);
    console.log(`🗺️ Applied georeference (${ellipsoid}): ${cartesian.x.toFixed(2)}, ${cartesian.y.toFixed(2)}, ${cartesian.z.toFixed(2)}`);
  }

  /**
   * Determina o elipsoide baseado no código EPSG
   */
  private getEllipsoidFromEPSG(epsg: string): 'WGS84' | 'GRS80' {
    // SIRGAS 2000 usa GRS80
    const sirgasEPSGs = [
      'EPSG:4674', // SIRGAS 2000
      'EPSG:31965', // SIRGAS 2000 / UTM zone 25S (Brazil)
      'EPSG:31966', // SIRGAS 2000 / UTM zone 26S
      'EPSG:31967', // SIRGAS 2000 / UTM zone 27S
      'EPSG:31968', // SIRGAS 2000 / UTM zone 28S
      'EPSG:31969', // SIRGAS 2000 / UTM zone 29S
      'EPSG:31970', // SIRGAS 2000 / UTM zone 30S
      'EPSG:31971', // SIRGAS 2000 / UTM zone 31S
      'EPSG:31972', // SIRGAS 2000 / UTM zone 32S
      'EPSG:31973', // SIRGAS 2000 / UTM zone 33S
      'EPSG:31974', // SIRGAS 2000 / UTM zone 34S
      'EPSG:31975', // SIRGAS 2000 / UTM zone 35S
      'EPSG:31976', // SIRGAS 2000 / UTM zone 36S
      'EPSG:31977', // SIRGAS 2000 / UTM zone 37S
      'EPSG:31978', // SIRGAS 2000 / UTM zone 38S
      'EPSG:31979', // SIRGAS 2000 / UTM zone 39S
      'EPSG:31980', // SIRGAS 2000 / UTM zone 40S
      'EPSG:31981', // SIRGAS 2000 / UTM zone 41S
      'EPSG:31982', // SIRGAS 2000 / UTM zone 42S
      'EPSG:31983', // SIRGAS 2000 / UTM zone 43S
      'EPSG:31984', // SIRGAS 2000 / UTM zone 44S
      'EPSG:31985', // SIRGAS 2000 / UTM zone 45S
    ];

    if (sirgasEPSGs.includes(epsg.toUpperCase())) {
      return 'GRS80';
    }

    // Default para WGS84
    return 'WGS84';
  }

  /**
   * Converte coordenadas geográficas (lat/lon) para cartesianas
   */
  private geographicToCartesian(lat: number, lon: number, alt: number = 0, ellipsoid: 'WGS84' | 'GRS80' = 'WGS84'): THREE.Vector3 {
    const ellipsoidParams = this.ELLIPSOIDS[ellipsoid];
    const a = ellipsoidParams.a; // semi-major axis
    const f = ellipsoidParams.f; // flattening
    const b = a * (1 - f); // semi-minor axis

    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;

    // Convert to ECEF (Earth-Centered, Earth-Fixed)
    const N = a / Math.sqrt(1 - f * f * Math.sin(latRad) * Math.sin(latRad));

    const x = (N + alt) * Math.cos(latRad) * Math.cos(lonRad);
    const y = (N + alt) * Math.cos(latRad) * Math.sin(lonRad);
    const z = (b * b / (a * a) * N + alt) * Math.sin(latRad);

    return new THREE.Vector3(x, y, z);
  }

  /**
   * Converte coordenadas cartesianas para geográficas
   */
  public cartesianToGeographic(position: THREE.Vector3, ellipsoid: 'WGS84' | 'GRS80' = 'WGS84'): { lat: number, lon: number, alt: number } {
    const ellipsoidParams = this.ELLIPSOIDS[ellipsoid];
    const a = ellipsoidParams.a;
    const f = ellipsoidParams.f;
    const b = a * (1 - f);
    const e2 = 2 * f - f * f;

    const x = position.x;
    const y = position.y;
    const z = position.z;

    const p = Math.sqrt(x * x + y * y);
    const theta = Math.atan2(z * a, p * b);

    const lat = Math.atan2(
      z + e2 * b * Math.sin(theta) * Math.sin(theta) * Math.sin(theta),
      p - e2 * a * Math.cos(theta) * Math.cos(theta) * Math.cos(theta)
    );

    const lon = Math.atan2(y, x);
    const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
    const alt = p / Math.cos(lat) - N;

    return {
      lat: lat * 180 / Math.PI,
      lon: lon * 180 / Math.PI,
      alt: alt
    };
  }

  /**
   * Transforma coordenadas locais para globais
   */
  public localToGlobal(localPosition: THREE.Vector3): THREE.Vector3 {
    const globalPos = localPosition.clone();
    globalPos.applyMatrix4(this.localToGlobalMatrix);
    return globalPos;
  }

  /**
   * Transforma coordenadas globais para locais
   */
  public globalToLocal(globalPosition: THREE.Vector3): THREE.Vector3 {
    const localPos = globalPosition.clone();
    localPos.applyMatrix4(this.globalToLocalMatrix);
    return localPos;
  }

  /**
   * Aplica transformação de coordenadas a um objeto
   */
  public applyToObject(object: THREE.Object3D, useGlobal: boolean = false): void {
    if (useGlobal) {
      object.position.copy(this.localToGlobal(object.position));
      object.rotation.copy(this.globalRotation);
    } else {
      // Aplica escala métrica primeiro
      this.scaleManager.applyScale(object);
    }
  }

  /**
   * Atualiza matrizes de transformação
   */
  private updateTransformationMatrices(): void {
    // Cria matriz de transformação local -> global
    this.localToGlobalMatrix.makeRotationFromEuler(this.globalRotation);
    this.localToGlobalMatrix.setPosition(this.globalOrigin);

    // Cria matriz inversa global -> local
    this.globalToLocalMatrix.copy(this.localToGlobalMatrix).invert();
  }

  /**
   * Converte coordenadas IFC para sistema global
   */
  public convertIFCCoordinates(ifcCoords: number[]): THREE.Vector3 {
    // Primeiro converte unidades IFC para metros
    const metersCoords = this.scaleManager.convertIFCCoordinates(ifcCoords);

    // Depois aplica transformação para coordenadas globais
    return this.localToGlobal(metersCoords);
  }

  /**
   * Valida coordenadas do sistema
   */
  public validateCoordinates(position: THREE.Vector3): boolean {
    // Verifica se coordenadas são razoáveis
    const maxCoord = 20000000; // ~20Mm (aprox. raio da Terra)
    const minCoord = -20000000;

    if (position.x < minCoord || position.x > maxCoord ||
        position.y < minCoord || position.y > maxCoord ||
        position.z < minCoord || position.z > maxCoord) {
      console.warn(`⚠️ Coordinates out of range: (${position.x}, ${position.y}, ${position.z})`);
      return false;
    }

    return true;
  }

  /**
   * Obtém estatísticas do sistema de coordenadas
   */
  public getStats(): CoordinateStats {
    const ellipsoid = this.getEllipsoidFromEPSG(this.geoReference.epsg);
    const ellipsoidInfo = this.ELLIPSOIDS[ellipsoid];

    return {
      globalOrigin: this.globalOrigin.clone(),
      globalRotation: this.globalRotation.clone(),
      geoReference: { ...this.geoReference },
      hasGeoReference: this.geoReference.enabled,
      scaleStats: this.scaleManager.getScaleStats(),
      ellipsoid: ellipsoidInfo,
      isSIRGAS2000: ellipsoid === 'GRS80'
    };
  }

  /**
   * Reseta configurações de coordenadas
   */
  public reset(): void {
    this.globalOrigin.set(0, 0, 0);
    this.globalRotation.set(0, 0, 0);
    this.globalScale.set(1, 1, 1);
    this.geoReference.enabled = false;
    this.updateTransformationMatrices();
    console.log('🔄 Coordinate system reset');
  }

  /**
   * Carrega configuração de coordenadas de arquivo IFC
   */
  public loadFromIFC(ifcData: any): void {
    try {
      // Tenta extrair informações de georreferenciamento do IFC
      const geoRef = this.extractGeoReferenceFromIFC(ifcData);
      if (geoRef) {
        // Detecta automaticamente SIRGAS 2000 para coordenadas brasileiras
        if (this.isBrazilianCoordinates(geoRef.latitude, geoRef.longitude)) {
          geoRef.epsg = 'EPSG:4674'; // SIRGAS 2000
          console.log('🇧🇷 Coordenadas brasileiras detectadas - usando SIRGAS 2000');
        }
        this.setGeoReference(geoRef);
      }

      // Tenta extrair sistema de coordenadas do projeto
      const coordSystem = this.extractCoordinateSystemFromIFC(ifcData);
      if (coordSystem) {
        this.setGlobalOrigin(coordSystem.origin);
        this.setGlobalRotation(coordSystem.rotation);
      }

    } catch (error) {
      console.warn('⚠️ Could not load coordinate system from IFC:', error);
    }
  }

  /**
   * Verifica se as coordenadas são do Brasil
   */
  private isBrazilianCoordinates(lat: number, lon: number): boolean {
    // Limites aproximados do Brasil
    return lat >= -35 && lat <= 5 && lon >= -75 && lon <= -30;
  }

  /**
   * Extrai georreferenciamento do IFC
   */
  private extractGeoReferenceFromIFC(ifcData: any): Partial<GeoReference> | null {
    // Procura por entidades de georreferenciamento no IFC
    // (Implementação simplificada - em produção seria mais robusta)
    try {
      // Procura por IfcMapConversion ou IfcProjectedCRS
      if (ifcData?.project?.geoReference) {
        return {
          enabled: true,
          latitude: ifcData.project.geoReference.latitude || 0,
          longitude: ifcData.project.geoReference.longitude || 0,
          altitude: ifcData.project.geoReference.altitude || 0,
          epsg: ifcData.project.geoReference.epsg || 'EPSG:4326'
        };
      }
    } catch (error) {
      // Silently fail
    }
    return null;
  }

  /**
   * Extrai sistema de coordenadas do IFC
   */
  private extractCoordinateSystemFromIFC(ifcData: any): { origin: THREE.Vector3, rotation: THREE.Euler } | null {
    try {
      // Procura por informações de sistema de coordenadas
      if (ifcData?.project?.coordinateSystem) {
        const cs = ifcData.project.coordinateSystem;
        return {
          origin: new THREE.Vector3(cs.originX || 0, cs.originY || 0, cs.originZ || 0),
          rotation: new THREE.Euler(cs.rotationX || 0, cs.rotationY || 0, cs.rotationZ || 0)
        };
      }
    } catch (error) {
      // Silently fail
    }
    return null;
  }
}

export interface GeoReference {
  enabled: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  epsg: string; // Ex: 'EPSG:4326' (WGS84), 'EPSG:4674' (SIRGAS 2000), 'EPSG:31983' (SIRGAS 2000 UTM 43S)
  accuracy: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CoordinateStats {
  globalOrigin: THREE.Vector3;
  globalRotation: THREE.Euler;
  geoReference: GeoReference;
  hasGeoReference: boolean;
  scaleStats: any;
  ellipsoid: {
    a: number;
    f: number;
    name: string;
  };
  isSIRGAS2000: boolean;
}