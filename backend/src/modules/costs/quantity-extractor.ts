/**
 * Extrator de quantitativos IFC → Takeoff
 * Hierarquia de fonte:
 * 1. Qto_*BaseQuantities (IFC standard)
 * 2. BaseQuantities proprietário (Revit, ArchiCAD)
 * 3. Cálculo geométrico direto (fallback)
 */

export type QuantitySource = 'qto_pset' | 'pset_custom' | 'geometric_fallback';
export type QuantityType = 'area_m2' | 'volume_m3' | 'length_m' | 'count_un';

export interface ExtractedQuantity {
  value: string; // DECIMAL as string
  unit: string;
  source: QuantitySource;
  confidence: 'high' | 'medium' | 'low'; // high=Qto_, medium=custom Pset, low=geometric
  psetName?: string; // fonte original (ex: 'Qto_WallBaseQuantities')
  fieldName?: string; // campo original (ex: 'GrossArea')
}

// Mapeamento IFC Type → Quantidade principal esperada
export const QUANTITY_MAP: Record<
  string,
  { primaryType: QuantityType; unit: string; psets: string[]; fields: string[] }
> = {
  IfcWall: {
    primaryType: 'area_m2',
    unit: 'm²',
    psets: ['Qto_WallBaseQuantities', 'BaseQuantities'],
    fields: ['GrossArea', 'Area'],
  },
  IfcSlab: {
    primaryType: 'area_m2',
    unit: 'm²',
    psets: ['Qto_SlabBaseQuantities', 'BaseQuantities'],
    fields: ['GrossArea', 'Area'],
  },
  IfcRoof: {
    primaryType: 'area_m2',
    unit: 'm²',
    psets: ['Qto_RoofBaseQuantities', 'BaseQuantities'],
    fields: ['GrossArea', 'Area'],
  },
  IfcColumn: {
    primaryType: 'volume_m3',
    unit: 'm³',
    psets: ['Qto_ColumnBaseQuantities', 'BaseQuantities'],
    fields: ['GrossVolume', 'Volume'],
  },
  IfcBeam: {
    primaryType: 'volume_m3',
    unit: 'm³',
    psets: ['Qto_BeamBaseQuantities', 'BaseQuantities'],
    fields: ['GrossVolume', 'Volume'],
  },
  IfcDoor: {
    primaryType: 'count_un',
    unit: 'un',
    psets: ['Qto_DoorBaseQuantities', 'BaseQuantities'],
    fields: ['Count', 'Count'],
  },
  IfcWindow: {
    primaryType: 'count_un',
    unit: 'un',
    psets: ['Qto_WindowBaseQuantities', 'BaseQuantities'],
    fields: ['Count', 'Count'],
  },
  IfcPipeFitting: {
    primaryType: 'length_m',
    unit: 'm',
    psets: ['Qto_PipeFittingBaseQuantities', 'BaseQuantities'],
    fields: ['Length', 'Length'],
  },
  IfcPipe: {
    primaryType: 'length_m',
    unit: 'm',
    psets: ['Qto_PipeBaseQuantities', 'BaseQuantities'],
    fields: ['Length', 'Length'],
  },
  IfcStair: {
    primaryType: 'volume_m3',
    unit: 'm³',
    psets: ['Qto_StairBaseQuantities', 'BaseQuantities'],
    fields: ['GrossVolume', 'Volume'],
  },
};

/**
 * Extrai quantidade de um elemento IFC a partir de PropertySets ou fallback geométrico
 */
export function extractQuantity(
  ifcType: string,
  properties: Record<string, any> | null,
  geometricFallback: {
    area_m2?: string;
    volume_m3?: string;
    length_m?: string;
    count_un?: string;
  }
): ExtractedQuantity | null {
  const mapping = QUANTITY_MAP[ifcType];
  if (!mapping) return null; // tipo não mapeado

  // Passo 1: Tentar Qto_*BaseQuantities (standard IFC)
  if (properties) {
    const result = tryExtractFromPsets(properties, mapping, 'qto');
    if (result) return result;

    // Passo 2: Tentar BaseQuantities proprietário
    const customResult = tryExtractFromPsets(properties, mapping, 'custom');
    if (customResult) return customResult;
  }

  // Passo 3: Fallback geométrico
  return tryGeometricFallback(mapping, geometricFallback);
}

/**
 * Tenta extrair de PropertySets (Qto_ ou custom)
 */
function tryExtractFromPsets(
  properties: Record<string, any>,
  mapping: (typeof QUANTITY_MAP)[string],
  mode: 'qto' | 'custom'
): ExtractedQuantity | null {
  const psetNames = mode === 'qto'
    ? mapping.psets.filter(p => p.startsWith('Qto_'))
    : mapping.psets.filter(p => !p.startsWith('Qto_'));

  for (const psetName of psetNames) {
    const pset = properties[psetName];
    if (!pset || typeof pset !== 'object') continue;

    for (const fieldName of mapping.fields) {
      const value = pset[fieldName];
      if (value === null || value === undefined) continue;

      // Normalizar valor para string com 4 casas decimais
      const normalized = normalizeDecimal(value, 4);
      if (normalized === '0.0000') continue; // ignorar zeros

      return {
        value: normalized,
        unit: mapping.unit,
        source: mode === 'qto' ? 'qto_pset' : 'pset_custom',
        confidence: mode === 'qto' ? 'high' : 'medium',
        psetName,
        fieldName,
      };
    }
  }

  return null;
}

/**
 * Tenta usar dimensões geométricas como fallback
 */
function tryGeometricFallback(
  mapping: (typeof QUANTITY_MAP)[string],
  fallback: { area_m2?: string; volume_m3?: string; length_m?: string; count_un?: string }
): ExtractedQuantity | null {
  const value = fallback[mapping.primaryType];
  if (!value) return null;

  const normalized = normalizeDecimal(value, 4);
  if (normalized === '0.0000') return null;

  return {
    value: normalized,
    unit: mapping.unit,
    source: 'geometric_fallback',
    confidence: 'low',
  };
}

/**
 * Normaliza números para DECIMAL(14,4) format
 */
function normalizeDecimal(value: unknown, decimals: number): string {
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? '0.0000' : num.toFixed(decimals);
  }
  if (typeof value === 'number') {
    return value.toFixed(decimals);
  }
  return '0.0000';
}

/**
 * Monta summary de quantitativos por tipo
 */
export interface TakeoffSummary {
  ifc_type: string;
  storey_id: number | null;
  storey_name: string | null;
  count: number;
  total_quantity: string; // DECIMAL
  unit: string;
  source: QuantitySource;
  confidence: 'high' | 'medium' | 'low';
}

export function buildSummaryByTypeAndStorey(
  quantities: Array<{
    ifc_type: string;
    storey_id: number | null;
    storey_name: string | null;
    quantity: ExtractedQuantity;
  }>
): TakeoffSummary[] {
  const grouped = new Map<string, typeof quantities>();

  for (const item of quantities) {
    const key = `${item.ifc_type}|${item.storey_id || 'null'}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const summaries: TakeoffSummary[] = [];
  for (const [, group] of grouped) {
    if (group.length === 0) continue;

    const first = group[0];
    const source = first.quantity.source;
    const unit = first.quantity.unit;

    // Somar quantidades
    const total = group
      .reduce((sum, item) => {
        return sum + parseFloat(item.quantity.value);
      }, 0)
      .toFixed(4);

    summaries.push({
      ifc_type: first.ifc_type,
      storey_id: first.storey_id,
      storey_name: first.storey_name,
      count: group.length,
      total_quantity: total,
      unit,
      source,
      confidence: first.quantity.confidence,
    });
  }

  return summaries.sort((a, b) => {
    // Ordenar por pavimento (null last), depois por tipo
    if (a.storey_id !== b.storey_id) {
      return (a.storey_id ?? Infinity) - (b.storey_id ?? Infinity);
    }
    return a.ifc_type.localeCompare(b.ifc_type);
  });
}
