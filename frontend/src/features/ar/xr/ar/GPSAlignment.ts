/**
 * GPSAlignment - Sistema de Alinhamento por GPS + Bússola
 * 
 * Usa Geolocation API e DeviceOrientation para alinhamento rápido
 * Menos preciso que manual, mas muito mais rápido
 */

import { Vector3, Matrix4, Quaternion, Euler } from 'three';
import { GeoreferencingSystem } from '../../../../engine/GeoreferencingSystem';

/**
 * Coordenadas GPS
 */
export interface GPSCoordinates {
  latitude: number;      // Graus (-90 a +90)
  longitude: number;     // Graus (-180 a +180)
  altitude?: number;     // Metros acima do nível do mar
  accuracy: number;      // Raio de erro em metros
  heading?: number;      // Direção da bússola (0-360°, 0=Norte)
  timestamp: Date;
}

/**
 * Configuração de origem do projeto (ponto de referência)
 */
export interface ProjectOrigin {
  gps: GPSCoordinates;   // Coordenadas GPS da origem (0,0,0) do modelo
  northDegrees: number;  // Ângulo do norte do projeto vs norte verdadeiro (0-360°)
}

/**
 * GPSAlignment - Sistema de alinhamento por GPS
 */
export class GPSAlignment {
  private geoSystem: GeoreferencingSystem;
  private watchId: number | null = null;
  private currentPosition: GPSCoordinates | null = null;
  private currentHeading: number | null = null;

  constructor() {
    this.geoSystem = new GeoreferencingSystem();
  }

  /**
   * Solicita permissão e inicia tracking de GPS
   */
  public async startTracking(): Promise<void> {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported by browser');
    }

    return new Promise((resolve, reject) => {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? undefined,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            timestamp: new Date(position.timestamp)
          };

          console.log(`📍 GPS Updated:`, {
            lat: position.coords.latitude.toFixed(6),
            lon: position.coords.longitude.toFixed(6),
            accuracy: `±${position.coords.accuracy.toFixed(1)}m`
          });

          resolve();
        },
        (error) => {
          console.error('❌ GPS Error:', error.message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    });
  }

  /**
   * Para tracking de GPS
   */
  public stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('🛑 GPS tracking stopped');
    }
  }

  /**
   * Obtém posição GPS atual (single shot)
   */
  public async getCurrentPosition(): Promise<GPSCoordinates> {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gps: GPSCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? undefined,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading ?? undefined,
            timestamp: new Date(position.timestamp)
          };

          this.currentPosition = gps;
          resolve(gps);
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Obtém direção da bússola (compass heading)
   */
  public async getHeading(): Promise<number> {
    // iOS 13+ requer permissão explícita
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Device orientation permission denied');
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Compass heading timeout'));
      }, 5000);

      const handleOrientation = (event: DeviceOrientationEvent) => {
        let heading: number | null = null;

        // iOS usa webkitCompassHeading
        if (typeof (event as any).webkitCompassHeading !== 'undefined') {
          heading = (event as any).webkitCompassHeading;
        }
        // Android usa alpha (0 = Norte, 90 = Leste, 180 = Sul, 270 = Oeste)
        else if (event.alpha !== null && event.absolute) {
          heading = 360 - event.alpha; // Inverter para match iOS
        }

        if (heading !== null) {
          clearTimeout(timeout);
          window.removeEventListener('deviceorientation', handleOrientation);
          
          this.currentHeading = heading;
          console.log(`🧭 Compass: ${heading.toFixed(1)}° (0=North)`);
          
          resolve(heading);
        }
      };

      window.addEventListener('deviceorientation', handleOrientation, { once: false });
    });
  }

  /**
   * Calcula alinhamento baseado em GPS + Bússola
   */
  public alignModelToGPS(
    projectOrigin: ProjectOrigin,
    currentGPS?: GPSCoordinates
  ): Matrix4 {
    const gps = currentGPS || this.currentPosition;

    if (!gps) {
      throw new Error('No GPS position available. Call getCurrentPosition() first.');
    }

    // 1. Calcula offset em metros da origem do projeto
    const offset = this.geoSystem.latLongToLocal(
      gps.latitude,
      gps.longitude,
      projectOrigin.gps.latitude,
      projectOrigin.gps.longitude,
      gps.altitude,
      projectOrigin.gps.altitude
    );

    console.log(`📐 GPS Offset from origin: (${offset.x.toFixed(2)}, ${offset.y.toFixed(2)}, ${offset.z.toFixed(2)}) m`);

    // 2. Calcula rotação baseada em heading (bússola)
    const rotation = new Quaternion();
    
    if (this.currentHeading !== null) {
      // Corrige heading com o norte do projeto
      const correctedHeading = this.currentHeading - projectOrigin.northDegrees;
      
      // Converte para radianos (rotação no eixo Y)
      const headingRad = THREE.MathUtils.degToRad(correctedHeading);
      
      // Cria quaternion de rotação
      rotation.setFromEuler(new Euler(0, headingRad, 0, 'YXZ'));

      console.log(`🧭 Rotation: ${correctedHeading.toFixed(1)}° from project north`);
    }

    // 3. Monta matriz de transformação
    const transform = new Matrix4();
    transform.compose(
      offset,                      // Translation
      rotation,                    // Rotation
      new Vector3(1, 1, 1)        // Scale (always 1)
    );

    return transform;
  }

  /**
   * Define origem GPS do projeto (pode ser calculada do modelo IFC)
   */
  public setProjectOrigin(lat: number, lon: number, alt: number = 0, northDegrees: number = 0): ProjectOrigin {
    const origin: ProjectOrigin = {
      gps: {
        latitude: lat,
        longitude: lon,
        altitude: alt,
        accuracy: 0,
        timestamp: new Date()
      },
      northDegrees
    };

    // Salva no georeferencing system
    this.geoSystem.setOrigin(lat, lon, alt);

    console.log(`🌐 Project origin set:`, {
      lat: lat.toFixed(6),
      lon: lon.toFixed(6),
      alt: alt.toFixed(1),
      north: `${northDegrees}°`
    });

    return origin;
  }

  /**
   * Tenta extrair origem GPS de metadados IFC
   */
  public async extractOriginFromIFC(ifcModel: any): Promise<ProjectOrigin | null> {
    // TODO: Ler IfcSite.RefLatitude, RefLongitude, RefElevation
    // Implementar quando integrado com web-ifc
    
    console.warn('⚠️ extractOriginFromIFC not yet implemented');
    return null;
  }

  /**
   * Calcula precisão estimada do alinhamento
   */
  public getEstimatedAccuracy(): number {
    if (!this.currentPosition) {
      return Infinity;
    }

    // GPS accuracy + compass error (~5 graus = ~0.9m a 10m de distância)
    const gpsAccuracy = this.currentPosition.accuracy;
    const compassAccuracy = 0.9; // Estimativa conservadora

    return Math.sqrt(gpsAccuracy * gpsAccuracy + compassAccuracy * compassAccuracy);
  }

  /**
   * Verifica se GPS está pronto para uso
   */
  public isReady(): boolean {
    return this.currentPosition !== null && 
           this.currentPosition.accuracy < 20; // Aceita até 20m de erro
  }

  /**
   * Getters
   */
  public getLastPosition(): GPSCoordinates | null {
    return this.currentPosition;
  }

  public getLastHeading(): number | null {
    return this.currentHeading;
  }
}

/**
 * Singleton instance
 */
export const gpsAlignment = new GPSAlignment();

/**
 * Helper: Converte DMS (Degrees Minutes Seconds) para decimal
 * Útil para ler coordenadas IFC em formato DMS
 */
export function dmsToDecimal(degrees: number, minutes: number, seconds: number): number {
  return degrees + minutes / 60 + seconds / 3600;
}

/**
 * Helper: Converte decimal para DMS
 */
export function decimalToDMS(decimal: number): { degrees: number; minutes: number; seconds: number } {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;

  return {
    degrees: decimal < 0 ? -degrees : degrees,
    minutes,
    seconds
  };
}
