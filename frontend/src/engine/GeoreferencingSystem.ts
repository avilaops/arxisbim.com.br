/**
 * Georeferencing System
 * Sistema de coordenadas globais (georreferenciadas)
 * Converte entre coordenadas geográficas (lat/long) e coordenadas locais (cartesianas)
 */

import * as THREE from 'three';
import { metricPrecision } from './MetricPrecisionSystem';

export interface GeographicCoordinates {
  latitude: number; // graus
  longitude: number; // graus
  altitude: number; // metros acima do nível do mar
}

export interface LocalCoordinates {
  x: number; // metros (leste/oeste)
  y: number; // metros (altitude)
  z: number; // metros (norte/sul)
}

export interface GeoreferenceOrigin {
  geographic: GeographicCoordinates;
  local: LocalCoordinates;
  rotation: number; // rotação em graus (norte verdadeiro)
}

export class GeoreferencingSystem {
  private origin: GeoreferenceOrigin | null = null;
  private readonly EARTH_RADIUS = 6371000; // metros
  private readonly DEG_TO_RAD = Math.PI / 180;
  private readonly RAD_TO_DEG = 180 / Math.PI;
  private transformMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private inverseMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor() {
    console.log('🌍 Georeferencing System initialized');
  }

  /**
   * Define a origem do sistema de coordenadas local
   */
  public setOrigin(origin: GeoreferenceOrigin): void {
    this.origin = origin;
    this.updateTransformMatrices();
    
    console.log(`🌍 Origin set:`, {
      lat: origin.geographic.latitude.toFixed(6),
      lon: origin.geographic.longitude.toFixed(6),
      alt: origin.geographic.altitude.toFixed(2),
      rotation: origin.rotation.toFixed(2)
    });
  }

  /**
   * Atualiza matrizes de transformação
   */
  private updateTransformMatrices(): void {
    if (!this.origin) return;

    // Create rotation matrix (rotate around Y axis)
    const rotation = this.origin.rotation * this.DEG_TO_RAD;
    this.transformMatrix.makeRotationY(rotation);
    
    // Add translation
    this.transformMatrix.setPosition(
      this.origin.local.x,
      this.origin.local.y,
      this.origin.local.z
    );

    // Compute inverse
    this.inverseMatrix.copy(this.transformMatrix).invert();
  }

  /**
   * Converte coordenadas geográficas para locais (cartesianas)
   * Usa projeção UTM simplificada
   */
  public geographicToLocal(geo: GeographicCoordinates): LocalCoordinates {
    if (!this.origin) {
      console.warn('⚠️ No origin set, using 0,0,0');
      return { x: 0, y: 0, z: 0 };
    }

    const origin = this.origin.geographic;

    // Delta em graus
    const dLat = geo.latitude - origin.latitude;
    const dLon = geo.longitude - origin.longitude;
    const dAlt = geo.altitude - origin.altitude;

    // Converte delta lat/lon para metros
    // 1 grau de latitude ≈ 111,320 metros
    // 1 grau de longitude ≈ 111,320 * cos(latitude) metros
    const latMeters = dLat * 111320;
    const avgLat = (geo.latitude + origin.latitude) / 2;
    const lonMeters = dLon * 111320 * Math.cos(avgLat * this.DEG_TO_RAD);

    // Coordenadas locais antes da rotação
    const localBeforeRotation = new THREE.Vector3(
      lonMeters, // leste/oeste
      dAlt, // altitude
      -latMeters // norte/sul (invertido para Three.js convention)
    );

    // Aplica rotação
    localBeforeRotation.applyMatrix4(this.transformMatrix);

    return {
      x: metricPrecision.round(localBeforeRotation.x + this.origin.local.x),
      y: metricPrecision.round(localBeforeRotation.y + this.origin.local.y),
      z: metricPrecision.round(localBeforeRotation.z + this.origin.local.z)
    };
  }

  /**
   * Converte coordenadas locais para geográficas
   */
  public localToGeographic(local: LocalCoordinates): GeographicCoordinates {
    if (!this.origin) {
      console.warn('⚠️ No origin set, returning origin');
      return { latitude: 0, longitude: 0, altitude: 0 };
    }

    // Remove offset da origem
    const relative = new THREE.Vector3(
      local.x - this.origin.local.x,
      local.y - this.origin.local.y,
      local.z - this.origin.local.z
    );

    // Remove rotação
    relative.applyMatrix4(this.inverseMatrix);

    const origin = this.origin.geographic;

    // Converte metros de volta para graus
    const dLatMeters = -relative.z; // inverte Z de volta
    const dLonMeters = relative.x;
    const dAlt = relative.y;

    const dLat = dLatMeters / 111320;
    const avgLat = origin.latitude + dLat / 2;
    const dLon = dLonMeters / (111320 * Math.cos(avgLat * this.DEG_TO_RAD));

    return {
      latitude: origin.latitude + dLat,
      longitude: origin.longitude + dLon,
      altitude: origin.altitude + dAlt
    };
  }

  /**
   * Converte Vector3 (Three.js) para coordenadas geográficas
   */
  public vector3ToGeographic(vector: THREE.Vector3): GeographicCoordinates {
    return this.localToGeographic({
      x: vector.x,
      y: vector.y,
      z: vector.z
    });
  }

  /**
   * Converte coordenadas geográficas para Vector3 (Three.js)
   */
  public geographicToVector3(geo: GeographicCoordinates): THREE.Vector3 {
    const local = this.geographicToLocal(geo);
    return new THREE.Vector3(local.x, local.y, local.z);
  }

  /**
   * Calcula distância entre duas coordenadas geográficas (Haversine)
   */
  public geographicDistance(
    geo1: GeographicCoordinates,
    geo2: GeographicCoordinates
  ): number {
    return metricPrecision.geographicDistance(
      geo1.latitude,
      geo1.longitude,
      geo2.latitude,
      geo2.longitude
    );
  }

  /**
   * Calcula bearing (azimute) entre dois pontos geográficos
   * Retorna ângulo em graus (0° = Norte, 90° = Leste)
   */
  public bearing(
    geo1: GeographicCoordinates,
    geo2: GeographicCoordinates
  ): number {
    const lat1 = geo1.latitude * this.DEG_TO_RAD;
    const lat2 = geo2.latitude * this.DEG_TO_RAD;
    const dLon = (geo2.longitude - geo1.longitude) * this.DEG_TO_RAD;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * this.RAD_TO_DEG;
    return (bearing + 360) % 360; // Normaliza para 0-360
  }

  /**
   * Calcula ponto a uma distância e bearing de um ponto inicial
   */
  public destinationPoint(
    start: GeographicCoordinates,
    distance: number,
    bearing: number
  ): GeographicCoordinates {
    const lat1 = start.latitude * this.DEG_TO_RAD;
    const lon1 = start.longitude * this.DEG_TO_RAD;
    const bearingRad = bearing * this.DEG_TO_RAD;
    const angularDistance = distance / this.EARTH_RADIUS;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
    );

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
      );

    return {
      latitude: lat2 * this.RAD_TO_DEG,
      longitude: lon2 * this.RAD_TO_DEG,
      altitude: start.altitude
    };
  }

  /**
   * Formata coordenadas geográficas
   */
  public formatGeographic(geo: GeographicCoordinates): string {
    const latDir = geo.latitude >= 0 ? 'N' : 'S';
    const lonDir = geo.longitude >= 0 ? 'E' : 'W';
    
    return `${Math.abs(geo.latitude).toFixed(6)}° ${latDir}, ${Math.abs(geo.longitude).toFixed(6)}° ${lonDir}, ${geo.altitude.toFixed(2)}m`;
  }

  /**
   * Formata coordenadas no formato DMS (Degrees, Minutes, Seconds)
   */
  public formatDMS(geo: GeographicCoordinates): string {
    const formatDMS = (decimal: number, isLat: boolean): string => {
      const abs = Math.abs(decimal);
      const degrees = Math.floor(abs);
      const minutesDecimal = (abs - degrees) * 60;
      const minutes = Math.floor(minutesDecimal);
      const seconds = (minutesDecimal - minutes) * 60;
      
      const dir = isLat 
        ? (decimal >= 0 ? 'N' : 'S')
        : (decimal >= 0 ? 'E' : 'W');
      
      return `${degrees}° ${minutes}' ${seconds.toFixed(2)}" ${dir}`;
    };

    const lat = formatDMS(geo.latitude, true);
    const lon = formatDMS(geo.longitude, false);
    
    return `${lat}, ${lon}, ${geo.altitude.toFixed(2)}m`;
  }

  /**
   * Retorna a origem atual
   */
  public getOrigin(): GeoreferenceOrigin | null {
    return this.origin ? { ...this.origin } : null;
  }

  /**
   * Verifica se sistema está georreferenciado
   */
  public isGeoreferenced(): boolean {
    return this.origin !== null;
  }

  /**
   * Remove georreferenciamento
   */
  public clearOrigin(): void {
    this.origin = null;
    this.transformMatrix.identity();
    this.inverseMatrix.identity();
    console.log('🌍 Georeference cleared');
  }
}

// Singleton instance
export const georeferencing = new GeoreferencingSystem();
