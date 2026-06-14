import type { Sql } from 'postgres';
import type { CreateCostTable, UpdateCostTable, CostTable, CreateCostItem, UpdateCostItem, CostItem, CreateElementCostLink, UpdateElementCostLink, ElementCostLink } from './costs.schemas.js';

export class CostsService {
  constructor(private sql: Sql) {}

  // ==================== COST TABLES ====================

  async createCostTable(projectId: string, userId: string, data: CreateCostTable): Promise<CostTable> {
    const result = await this.sql<CostTable[]>`
      INSERT INTO cost_tables (
        project_id, scenario_id, name, description, source, state_code, reference_month, created_by
      ) VALUES (
        ${projectId}, ${data.scenario_id || null}, ${data.name}, ${data.description || null},
        ${data.source}, ${data.state_code || null}, ${data.reference_month || null}, ${userId}
      )
      RETURNING *
    `;
    return result[0];
  }

  async getCostTable(tableId: string): Promise<CostTable | null> {
    const result = await this.sql<CostTable[]>`
      SELECT * FROM cost_tables WHERE id = ${tableId}
    `;
    return result[0] || null;
  }

  async listCostTablesByProject(projectId: string): Promise<CostTable[]> {
    return this.sql<CostTable[]>`
      SELECT * FROM cost_tables
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;
  }

  async listCostTablesByScenario(scenarioId: string): Promise<CostTable[]> {
    return this.sql<CostTable[]>`
      SELECT * FROM cost_tables
      WHERE scenario_id = ${scenarioId}
      ORDER BY created_at DESC
    `;
  }

  async updateCostTable(tableId: string, data: UpdateCostTable): Promise<CostTable> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.source !== undefined) updates.source = data.source;
    if (data.state_code !== undefined) updates.state_code = data.state_code;
    if (data.reference_month !== undefined) updates.reference_month = data.reference_month;
    updates.updated_at = new Date();

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return this.getCostTable(tableId) as Promise<CostTable>;
    }

    const result = await this.sql<CostTable[]>`
      UPDATE cost_tables
      SET ${this.sql(updates, ...keys)}
      WHERE id = ${tableId}
      RETURNING *
    `;
    return result[0];
  }

  async deleteCostTable(tableId: string): Promise<boolean> {
    const result = await this.sql`
      DELETE FROM cost_tables WHERE id = ${tableId}
    `;
    return result.count > 0;
  }

  // ==================== COST ITEMS ====================

  async createCostItem(tableId: string, data: CreateCostItem): Promise<CostItem> {
    const result = await this.sql<CostItem[]>`
      INSERT INTO cost_items (
        cost_table_id, code, description, unit, unit_price, notes
      ) VALUES (
        ${tableId}, ${data.code || null}, ${data.description}, ${data.unit},
        ${data.unit_price}, ${data.notes || null}
      )
      RETURNING *
    `;
    return result[0];
  }

  async getCostItem(itemId: string): Promise<CostItem | null> {
    const result = await this.sql<CostItem[]>`
      SELECT * FROM cost_items WHERE id = ${itemId}
    `;
    return result[0] || null;
  }

  async listCostItemsByTable(tableId: string): Promise<CostItem[]> {
    return this.sql<CostItem[]>`
      SELECT * FROM cost_items
      WHERE cost_table_id = ${tableId}
      ORDER BY code, description
    `;
  }

  async updateCostItem(itemId: string, data: UpdateCostItem): Promise<CostItem> {
    const updates: Record<string, unknown> = {};
    if (data.code !== undefined) updates.code = data.code;
    if (data.description !== undefined) updates.description = data.description;
    if (data.unit !== undefined) updates.unit = data.unit;
    if (data.unit_price !== undefined) updates.unit_price = data.unit_price;
    if (data.notes !== undefined) updates.notes = data.notes;
    updates.updated_at = new Date();

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return this.getCostItem(itemId) as Promise<CostItem>;
    }

    const result = await this.sql<CostItem[]>`
      UPDATE cost_items
      SET ${this.sql(updates, ...keys)}
      WHERE id = ${itemId}
      RETURNING *
    `;
    return result[0];
  }

  async deleteCostItem(itemId: string): Promise<boolean> {
    const result = await this.sql`
      DELETE FROM cost_items WHERE id = ${itemId}
    `;
    return result.count > 0;
  }

  // ==================== ELEMENT COST LINKS ====================

  async createElementCostLink(userId: string, data: CreateElementCostLink): Promise<ElementCostLink> {
    const result = await this.sql<ElementCostLink[]>`
      INSERT INTO element_cost_links (
        scenario_id, element_global_id, cost_item_id, quantity, quantity_unit,
        override_price, override_reason, note, created_by
      ) VALUES (
        ${data.scenario_id}, ${data.element_global_id}, ${data.cost_item_id},
        ${data.quantity}, ${data.quantity_unit || null},
        ${data.override_price || null}, ${data.override_reason || null},
        ${data.note || null}, ${userId}
      )
      RETURNING *
    `;
    return result[0];
  }

  async getElementCostLink(linkId: string): Promise<ElementCostLink | null> {
    const result = await this.sql<ElementCostLink[]>`
      SELECT * FROM element_cost_links WHERE id = ${linkId}
    `;
    return result[0] || null;
  }

  async listElementCostLinksByScenario(scenarioId: string): Promise<ElementCostLink[]> {
    return this.sql<ElementCostLink[]>`
      SELECT * FROM element_cost_links
      WHERE scenario_id = ${scenarioId}
      ORDER BY element_global_id
    `;
  }

  async listElementCostLinksByElement(elementGlobalId: string): Promise<ElementCostLink[]> {
    return this.sql<ElementCostLink[]>`
      SELECT * FROM element_cost_links
      WHERE element_global_id = ${elementGlobalId}
      ORDER BY created_at DESC
    `;
  }

  async updateElementCostLink(linkId: string, data: UpdateElementCostLink): Promise<ElementCostLink> {
    const updates: Record<string, unknown> = {};
    if (data.quantity !== undefined) updates.quantity = data.quantity;
    if (data.quantity_unit !== undefined) updates.quantity_unit = data.quantity_unit;
    if (data.override_price !== undefined) updates.override_price = data.override_price;
    if (data.override_reason !== undefined) updates.override_reason = data.override_reason;
    if (data.note !== undefined) updates.note = data.note;
    updates.updated_at = new Date();

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return this.getElementCostLink(linkId) as Promise<ElementCostLink>;
    }

    const result = await this.sql<ElementCostLink[]>`
      UPDATE element_cost_links
      SET ${this.sql(updates, ...keys)}
      WHERE id = ${linkId}
      RETURNING *
    `;
    return result[0];
  }

  async deleteElementCostLink(linkId: string): Promise<boolean> {
    const result = await this.sql`
      DELETE FROM element_cost_links WHERE id = ${linkId}
    `;
    return result.count > 0;
  }

  // ==================== CONVENIENCE QUERIES ====================

  /**
   * Get cost table with all items and element links
   */
  async getCostTableWithItems(tableId: string): Promise<{
    table: CostTable;
    items: CostItem[];
  } | null> {
    const table = await this.getCostTable(tableId);
    if (!table) return null;

    const items = await this.listCostItemsByTable(tableId);
    return { table, items };
  }

  /**
   * Get scenario cost summary (for S22 calculation)
   */
  async getScenarioCostSummary(scenarioId: string): Promise<{
    total_items_linked: number;
    items_with_override: number;
    scenarios_without_cost_table: boolean;
  }> {
    const links = await this.listElementCostLinksByScenario(scenarioId);
    const itemsWithOverride = links.filter(l => l.override_price).length;

    return {
      total_items_linked: links.length,
      items_with_override: itemsWithOverride,
      scenarios_without_cost_table: links.length === 0,
    };
  }
}
