/**
 * Taxonomia de tipos IFC (S14) — CONFIGURAÇÃO (dado), nunca lógica hard-coded.
 *
 * Vira contrato p/ S10 (filtros de disciplina), S20 (agrupar quantitativos),
 * S25 (4D por tipo), S30 (comparação por categoria). Mudar a taxonomia depois
 * que há dados de cliente NÃO pode exigir migração de dados — só atualizar este
 * mapa (ou o override JSONB por projeto). Tipos não mapeados → `other` (cinza),
 * NUNCA somem.
 */

export type TypeCategory = 'structural' | 'architectural' | 'mep' | 'furniture' | 'site' | 'other';

export interface TypeInfo {
  category: TypeCategory;
  label: string;
  color: string;
}

export const TYPE_MAP_VERSION = 1 as const;

/** Cor/label de fallback p/ tipos sem mapeamento. */
export const UNMAPPED: TypeInfo = { category: 'other', label: 'Outro', color: '#9CA3AF' };

/** Mapeamento padrão IFC Type → categoria do produto (chaves PascalCase). */
export const DEFAULT_TYPE_MAP: Record<string, TypeInfo> = {
  // estrutural
  IfcColumn: { category: 'structural', label: 'Pilar', color: '#8B7355' },
  IfcBeam: { category: 'structural', label: 'Viga', color: '#A0855B' },
  IfcSlab: { category: 'structural', label: 'Laje', color: '#B8A88A' },
  IfcFooting: { category: 'structural', label: 'Fundação', color: '#6B5B45' },
  IfcPile: { category: 'structural', label: 'Estaca', color: '#5B4D3A' },
  IfcMember: { category: 'structural', label: 'Membro', color: '#9C8463' },
  IfcPlate: { category: 'structural', label: 'Placa', color: '#AD9670' },
  IfcReinforcingBar: { category: 'structural', label: 'Armadura', color: '#7A6A50' },
  // arquitetônico
  IfcWall: { category: 'architectural', label: 'Parede', color: '#D4C5A9' },
  IfcWallStandardCase: { category: 'architectural', label: 'Parede', color: '#D4C5A9' },
  IfcDoor: { category: 'architectural', label: 'Porta', color: '#8B4513' },
  IfcWindow: { category: 'architectural', label: 'Janela', color: '#87CEEB' },
  IfcStair: { category: 'architectural', label: 'Escada', color: '#C8B99C' },
  IfcStairFlight: { category: 'architectural', label: 'Lance de escada', color: '#C8B99C' },
  IfcRamp: { category: 'architectural', label: 'Rampa', color: '#C8B99C' },
  IfcRailing: { category: 'architectural', label: 'Guarda-corpo', color: '#B0A080' },
  IfcRoof: { category: 'architectural', label: 'Cobertura', color: '#A52A2A' },
  IfcCovering: { category: 'architectural', label: 'Revestimento', color: '#CDBA96' },
  IfcCurtainWall: { category: 'architectural', label: 'Fachada cortina', color: '#9FB6CD' },
  // MEP
  IfcPipeSegment: { category: 'mep', label: 'Tubulação', color: '#4169E1' },
  IfcDuctSegment: { category: 'mep', label: 'Duto', color: '#20B2AA' },
  IfcCableCarrierSegment: { category: 'mep', label: 'Eletrocalha', color: '#FFD700' },
  IfcCableSegment: { category: 'mep', label: 'Cabo', color: '#DAA520' },
  IfcFlowSegment: { category: 'mep', label: 'Fluxo', color: '#5F9EA0' },
  IfcFlowFitting: { category: 'mep', label: 'Conexão', color: '#48A0A0' },
  IfcFlowTerminal: { category: 'mep', label: 'Terminal', color: '#3CB0A0' },
  IfcFlowController: { category: 'mep', label: 'Controlador', color: '#2EA08C' },
  // mobiliário / terreno
  IfcFurnishingElement: { category: 'furniture', label: 'Mobiliário', color: '#DEB887' },
  IfcFurniture: { category: 'furniture', label: 'Mobiliário', color: '#DEB887' },
  IfcSystemFurnitureElement: { category: 'furniture', label: 'Mobiliário', color: '#DEB887' },
  IfcSite: { category: 'site', label: 'Terreno', color: '#228B22' },
  IfcEarthworksFill: { category: 'site', label: 'Aterro', color: '#6B8E23' },
  IfcGeographicElement: { category: 'site', label: 'Geográfico', color: '#2E8B57' },
};

// Lookup case-insensitive (IfcWall === IFCWALL === ifcwall).
const lowerIndex = new Map<string, TypeInfo>();
for (const [k, v] of Object.entries(DEFAULT_TYPE_MAP)) lowerIndex.set(k.toLowerCase(), v);

/** Override por projeto: { stateVersion, map: { IfcWall: {...} } }. */
export interface ProjectTypeMap {
  typeMapVersion: number;
  map: Record<string, Partial<TypeInfo>>;
}

/**
 * Resolve o TypeInfo de um tipo IFC, aplicando override do projeto se houver.
 * Tipo desconhecido → UNMAPPED (cinza), nunca null.
 */
export function resolveTypeInfo(ifcType: string, override?: ProjectTypeMap | null): TypeInfo {
  const key = ifcType.toLowerCase();
  const base = lowerIndex.get(key) ?? UNMAPPED;
  if (override?.map) {
    // override pode usar qualquer casing.
    const ov = override.map[ifcType] ?? override.map[Object.keys(override.map).find((k) => k.toLowerCase() === key) ?? ''];
    if (ov) return { category: ov.category ?? base.category, label: ov.label ?? base.label, color: ov.color ?? base.color };
  }
  return base;
}

/** Mapa efetivo (default + override) — consumido pelo viewer/legenda. */
export function effectiveTypeMap(override?: ProjectTypeMap | null): Record<string, TypeInfo> {
  const out: Record<string, TypeInfo> = { ...DEFAULT_TYPE_MAP };
  if (override?.map) {
    for (const [type, partial] of Object.entries(override.map)) {
      const base = out[type] ?? lowerIndex.get(type.toLowerCase()) ?? UNMAPPED;
      out[type] = { category: partial.category ?? base.category, label: partial.label ?? base.label, color: partial.color ?? base.color };
    }
  }
  return out;
}

/** Bridge p/ o S10: resolver tipo→categoria (= DisciplineResolver do VisibilityManager). */
export function toCategoryResolver(override?: ProjectTypeMap | null): (ifcType: string) => TypeCategory {
  return (ifcType: string) => resolveTypeInfo(ifcType, override).category;
}
