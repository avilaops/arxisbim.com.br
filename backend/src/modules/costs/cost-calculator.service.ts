import type { Sql } from 'postgres';
import Decimal from 'decimal.js';
import { CostCacheService } from './cost-cache.service.js';

export interface CostElement {
  global_id: string;
  ifc_type: string;
  storey_id: number | null;
  quantity: string; // DECIMAL as string
  unit: string;
  unit_price: string; // DECIMAL as string
  total_cost: string; // DECIMAL as string
}

export interface CostBreakdown {
  by_type: Record<
    string,
    { quantity: string; unit: string; total_cost: string; count: number }
  >;
  by_storey: Record<string, { total_cost: string; storey_name?: string }>;
  by_category: Record<string, { total_cost: string }>;
}

export interface CostCalculation {
  scenario_id: string;
  total_cost: string; // DECIMAL(14,2)
  breakdown: CostBreakdown;
  elements: CostElement[];
  element_count: number;
  execution_time_ms: number;
  calculated_at: Date;
}

export class CostCalculatorService {
  // Configurar Decimal.js para finanças (2 casas decimais)
  private readonly DECIMAL_CONFIG = { precision: 14, rounding: 1 }; // ROUND_HALF_UP
  private cache: CostCacheService;

  constructor(private sql: Sql) {
    Decimal.set(this.DECIMAL_CONFIG);
    this.cache = new CostCacheService(sql);
  }

  /**
   * Calcula custo total do cenário
   * Junta: quantity (S20) × unit_price (S19/S21)
   */
  async calculateScenarioCost(scenarioId: string): Promise<CostCalculation> {
    const startTime = Date.now();

    // Passo 1: Ler element_cost_links com preços
    const links = await this.sql<
      Array<{
        global_id: string;
        ifc_type: string;
        storey_id: number | null;
        storey_name: string | null;
        quantity: string;
        quantity_unit: string;
        unit_price: string;
        override_price: string | null;
      }>
    >`
      SELECT
        ecl.element_global_id as global_id,
        ep.ifc_type,
        ep.storey_id,
        NULL as storey_name,
        ecl.quantity,
        ci.unit as quantity_unit,
        COALESCE(ecl.override_price, ci.unit_price) as unit_price,
        ecl.override_price
      FROM element_cost_links ecl
      JOIN cost_items ci ON ecl.cost_item_id = ci.id
      JOIN element_properties ep ON
        ep.global_id = ecl.element_global_id
      WHERE ecl.scenario_id = ${scenarioId}
      LIMIT 100000
    `;

    if (links.length === 0) {
      return {
        scenario_id: scenarioId,
        total_cost: '0.00',
        breakdown: {
          by_type: {},
          by_storey: {},
          by_category: {},
        },
        elements: [],
        element_count: 0,
        execution_time_ms: Date.now() - startTime,
        calculated_at: new Date(),
      };
    }

    // Passo 2: Calcular custo por elemento
    const elements: CostElement[] = [];
    let totalCost = new Decimal('0');
    const breakdownByType: Record<
      string,
      {
        quantity: Decimal;
        unit: string;
        total_cost: Decimal;
        count: number;
      }
    > = {};
    const breakdownByStorey: Record<string, { total_cost: Decimal }> = {};
    const breakdownByCategory: Record<string, { total_cost: Decimal }> = {};

    for (const link of links) {
      const qty = new Decimal(link.quantity);
      const price = new Decimal(link.unit_price);
      const cost = qty.times(price).toDecimalPlaces(2);

      totalCost = totalCost.plus(cost);

      elements.push({
        global_id: link.global_id,
        ifc_type: link.ifc_type,
        storey_id: link.storey_id,
        quantity: link.quantity,
        unit: link.quantity_unit,
        unit_price: link.unit_price,
        total_cost: cost.toString(),
      });

      // Agregação por tipo
      if (!breakdownByType[link.ifc_type]) {
        breakdownByType[link.ifc_type] = {
          quantity: new Decimal('0'),
          unit: link.quantity_unit,
          total_cost: new Decimal('0'),
          count: 0,
        };
      }
      breakdownByType[link.ifc_type].quantity =
        breakdownByType[link.ifc_type].quantity.plus(qty);
      breakdownByType[link.ifc_type].total_cost =
        breakdownByType[link.ifc_type].total_cost.plus(cost);
      breakdownByType[link.ifc_type].count++;

      // Agregação por pavimento
      const storeyKey = `${link.storey_id || 'null'}`;
      if (!breakdownByStorey[storeyKey]) {
        breakdownByStorey[storeyKey] = {
          total_cost: new Decimal('0'),
        };
      }
      breakdownByStorey[storeyKey].total_cost =
        breakdownByStorey[storeyKey].total_cost.plus(cost);

      // Agregação por categoria (heurística simples por tipo IFC)
      const category = this.inferCategory(link.ifc_type);
      if (!breakdownByCategory[category]) {
        breakdownByCategory[category] = {
          total_cost: new Decimal('0'),
        };
      }
      breakdownByCategory[category].total_cost =
        breakdownByCategory[category].total_cost.plus(cost);
    }

    // Passo 3: Converter Decimals para strings
    const breakdown: CostBreakdown = {
      by_type: Object.entries(breakdownByType).reduce(
        (acc, [type, data]) => {
          acc[type] = {
            quantity: data.quantity.toString(),
            unit: data.unit,
            total_cost: data.total_cost.toFixed(2),
            count: data.count,
          };
          return acc;
        },
        {} as Record<string, any>
      ),
      by_storey: Object.entries(breakdownByStorey).reduce(
        (acc, [storey, data]) => {
          acc[storey] = {
            total_cost: data.total_cost.toFixed(2),
          };
          return acc;
        },
        {} as Record<string, any>
      ),
      by_category: Object.entries(breakdownByCategory).reduce(
        (acc, [cat, data]) => {
          acc[cat] = {
            total_cost: data.total_cost.toFixed(2),
          };
          return acc;
        },
        {} as Record<string, any>
      ),
    };

    // Passo 4: Guardar no histórico
    await this.saveCostCalculation(scenarioId, totalCost.toFixed(2), breakdown);

    return {
      scenario_id: scenarioId,
      total_cost: totalCost.toFixed(2),
      breakdown,
      elements,
      element_count: links.length,
      execution_time_ms: Date.now() - startTime,
      calculated_at: new Date(),
    };
  }

  /**
   * Inferir categoria a partir do tipo IFC
   */
  private inferCategory(ifcType: string): string {
    if (
      [
        'IfcWall',
        'IfcSlab',
        'IfcColumn',
        'IfcBeam',
        'IfcStair',
        'IfcRoof',
      ].includes(ifcType)
    ) {
      return 'structure';
    }
    if (
      [
        'IfcPipe',
        'IfcPipeFitting',
        'IfcDuctFitting',
        'IfcPlate',
        'IfcMember',
      ].includes(ifcType)
    ) {
      return 'mep';
    }
    if (
      ['IfcDoor', 'IfcWindow', 'IfcCurtainWall', 'IfcSpace'].includes(ifcType)
    ) {
      return 'architecture';
    }
    return 'other';
  }

  /**
   * Guardar cálculo no histórico para auditoria
   */
  private async saveCostCalculation(
    scenarioId: string,
    totalCost: string,
    breakdown: CostBreakdown
  ): Promise<void> {
    try {
      await this.sql`
        INSERT INTO cost_calculations (
          scenario_id, total_cost, breakdown_by_type,
          breakdown_by_storey, breakdown_by_category, element_count
        ) VALUES (
          ${scenarioId}, ${totalCost},
          ${JSON.stringify(breakdown.by_type)},
          ${JSON.stringify(breakdown.by_storey)},
          ${JSON.stringify(breakdown.by_category)},
          0
        )
      `;

      // Denormalizar em scenarios para query rápida
      await this.sql`
        UPDATE scenarios
        SET cached_total_cost = ${totalCost},
            cached_cost_updated_at = NOW()
        WHERE id = ${scenarioId}
      `;
    } catch (err) {
      console.warn('[CostCalculator] Failed to save calculation:', err);
      // Continua mesmo se falhar (não é crítico)
    }
  }

  /**
   * Obter cálculo do histórico
   */
  async getLatestCalculation(
    scenarioId: string
  ): Promise<CostCalculation | null> {
    const result = await this.sql<
      Array<{
        total_cost: string;
        breakdown_by_type: Record<string, any>;
        breakdown_by_storey: Record<string, any>;
        breakdown_by_category: Record<string, any>;
        calculated_at: Date;
      }>
    >`
      SELECT
        total_cost, breakdown_by_type, breakdown_by_storey,
        breakdown_by_category, calculated_at
      FROM cost_calculations
      WHERE scenario_id = ${scenarioId}
      ORDER BY calculated_at DESC
      LIMIT 1
    `;

    if (!result.length) return null;

    const calc = result[0];
    return {
      scenario_id: scenarioId,
      total_cost: calc.total_cost,
      breakdown: {
        by_type: calc.breakdown_by_type,
        by_storey: calc.breakdown_by_storey,
        by_category: calc.breakdown_by_category,
      },
      elements: [], // não guardamos elementos no histórico
      element_count: 0,
      execution_time_ms: 0,
      calculated_at: calc.calculated_at,
    };
  }
}
