/**
 * SunPositionCalculator — Posição real do Sol por GPS + data/hora
 *
 * Algoritmo astronômico simplificado (NOAA Solar Calculator).
 * Retorna elevação e azimute do Sol para qualquer local/horário do mundo.
 *
 * Uso: simulação solar real para análise de sombras, eficiência energética,
 * estudo de insolação em projetos BIM.
 *
 * Precisão: ±0.5° (suficiente para visualização arquitetônica).
 * Para precisão de engenharia solar usar SPA (NREL).
 */

export interface SunPosition {
  elevation: number;  // graus acima do horizonte (0-90)
  azimuth:   number;  // graus a partir do norte (0-360)
}

export interface GPSLocation {
  latitude:  number;  // -90 a +90
  longitude: number;  // -180 a +180
  timezone:  number;  // offset em horas vs UTC (Brasil: -3)
}

// Cidades brasileiras comuns
export const COMMON_LOCATIONS: Record<string, GPSLocation> = {
  saoPaulo:      { latitude: -23.5505, longitude: -46.6333, timezone: -3 },
  rioDeJaneiro:  { latitude: -22.9068, longitude: -43.1729, timezone: -3 },
  brasilia:      { latitude: -15.7942, longitude: -47.8825, timezone: -3 },
  belém:         { latitude: -1.4558,  longitude: -48.4902, timezone: -3 },
  portoAlegre:   { latitude: -30.0346, longitude: -51.2177, timezone: -3 },
  manaus:        { latitude: -3.1190,  longitude: -60.0217, timezone: -4 },
  recife:        { latitude: -8.0476,  longitude: -34.8770, timezone: -3 },
  saoLuis:       { latitude: -2.5297,  longitude: -44.3028, timezone: -3 },
};

export class SunPositionCalculator {
  /**
   * Calcula posição do sol para data/hora local + GPS
   * @param date Date object (será convertido para UTC internamente)
   * @param loc GPS + timezone
   */
  static calculate(date: Date, loc: GPSLocation): SunPosition {
    const { latitude, longitude, timezone } = loc;

    // Dia juliano (NOAA)
    const julian = this.toJulian(date);
    const T = (julian - 2451545.0) / 36525.0; // séculos julianos desde J2000

    // Geometria solar (algoritmo NOAA simplificado)
    const L0 = this.normalizeDeg(280.46646 + T * (36000.76983 + T * 0.0003032));
    const M  = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e  = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

    const Mrad = this.toRad(M);
    const C = Math.sin(Mrad)        * (1.914602 - T * (0.004817 + 0.000014 * T))
            + Math.sin(2 * Mrad)    * (0.019993 - 0.000101 * T)
            + Math.sin(3 * Mrad)    * 0.000289;

    const trueLong = L0 + C;
    const omega    = 125.04 - 1934.136 * T;
    const lambda   = trueLong - 0.00569 - 0.00478 * Math.sin(this.toRad(omega));

    // Obliquidade
    const eps0 = 23 + (26 + ((21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813)))) / 60) / 60;
    const eps  = eps0 + 0.00256 * Math.cos(this.toRad(omega));

    // Declinação solar
    const dec = this.toDeg(Math.asin(Math.sin(this.toRad(eps)) * Math.sin(this.toRad(lambda))));

    // Equation of time (minutos)
    const y = Math.tan(this.toRad(eps / 2)) ** 2;
    const eqTime = 4 * this.toDeg(
      y * Math.sin(2 * this.toRad(L0))
      - 2 * e * Math.sin(Mrad)
      + 4 * e * y * Math.sin(Mrad) * Math.cos(2 * this.toRad(L0))
      - 0.5 * y * y * Math.sin(4 * this.toRad(L0))
      - 1.25 * e * e * Math.sin(2 * Mrad)
    );

    // True solar time (minutos do dia)
    const hours   = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    const trueSolarTime = (hours * 60 + eqTime + 4 * longitude - 60 * timezone) % 1440;

    // Hour angle (graus)
    let hourAngle = trueSolarTime / 4 - 180;
    if (hourAngle < -180) hourAngle += 360;

    // Zenith e elevação
    const latRad = this.toRad(latitude);
    const decRad = this.toRad(dec);
    const haRad  = this.toRad(hourAngle);

    const cosZenith = Math.sin(latRad) * Math.sin(decRad)
                    + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
    const zenith = this.toDeg(Math.acos(Math.max(-1, Math.min(1, cosZenith))));
    const elevation = 90 - zenith;

    // Azimute
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * Math.cos(this.toRad(zenith)))
                / (Math.cos(latRad) * Math.sin(this.toRad(zenith)));
    let azimuth = this.toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
    if (hourAngle > 0) azimuth = 360 - azimuth;

    return {
      elevation: Math.max(-90, Math.min(90, elevation)),
      azimuth:   this.normalizeDeg(azimuth),
    };
  }

  /**
   * Retorna preset de céu adequado para a elevação atual
   */
  static suggestSkyPreset(elevation: number): 'NOON' | 'MORNING' | 'GOLDEN_HOUR' | 'DUSK' | 'OVERCAST' {
    if (elevation >= 45)  return 'NOON';
    if (elevation >= 15)  return 'MORNING';
    if (elevation >= 3)   return 'GOLDEN_HOUR';
    if (elevation >= -3)  return 'DUSK';
    return 'OVERCAST'; // noite — fallback (preset de noite não implementado ainda)
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private static toJulian(date: Date): number {
    // Algoritmo Meeus
    let y = date.getUTCFullYear();
    let m = date.getUTCMonth() + 1;
    const d = date.getUTCDate()
            + date.getUTCHours()   / 24
            + date.getUTCMinutes() / 1440
            + date.getUTCSeconds() / 86400;

    if (m <= 2) { y--; m += 12; }
    const A = Math.floor(y / 100);
    const B = 2 - A + Math.floor(A / 4);

    return Math.floor(365.25 * (y + 4716))
         + Math.floor(30.6001 * (m + 1))
         + d + B - 1524.5;
  }

  private static toRad(deg: number): number { return deg * Math.PI / 180; }
  private static toDeg(rad: number): number { return rad * 180 / Math.PI; }
  private static normalizeDeg(deg: number): number {
    while (deg < 0)    deg += 360;
    while (deg >= 360) deg -= 360;
    return deg;
  }
}
