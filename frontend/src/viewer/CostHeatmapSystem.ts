/**
 * CostHeatmapSystem - Color elements by cost using heatmap
 * Green (cheap) → Yellow → Red (expensive)
 * Normalized per element type for fair comparison
 */

import * as THREE from 'three';
import { getAPIClient } from '../api/v1/client.js';

export interface ElementCostData {
  global_id: string;
  ifc_type: string;
  total_cost: string;
}

export class CostHeatmapSystem {
  private costMap = new Map<string, ElementCostData>(); // global_id → cost
  private materialCache = new Map<string, THREE.Material>();
  private originalMaterials = new Map<THREE.Object3D, THREE.Material | THREE.Material[]>();
  private costRangeByType = new Map<string, { min: number; max: number }>();

  async loadCostsForScenario(scenarioId: string): Promise<void> {
    try {
      const client = getAPIClient();
      const res = await client.get(`/scenarios/${scenarioId}/cost-calculation`);
      const elements = res.data.elements || [];

      this.costMap.clear();
      this.costRangeByType.clear();

      // Index costs by global_id and track range by type
      for (const el of elements) {
        this.costMap.set(el.global_id, {
          global_id: el.global_id,
          ifc_type: el.ifc_type,
          total_cost: el.total_cost,
        });

        const cost = parseFloat(el.total_cost);
        const typeKey = el.ifc_type;

        if (!this.costRangeByType.has(typeKey)) {
          this.costRangeByType.set(typeKey, { min: cost, max: cost });
        } else {
          const range = this.costRangeByType.get(typeKey)!;
          range.min = Math.min(range.min, cost);
          range.max = Math.max(range.max, cost);
        }
      }
    } catch (err) {
      console.warn('[CostHeatmap] Failed to load costs:', err);
    }
  }

  applyHeatmap(scene: THREE.Scene): void {
    scene.traverse((child: THREE.Object3D) => {
      const mesh = child as any;
      if (!mesh.geometry || !mesh.material) return;

      const globalId = mesh.userData?.globalId || (child as any).name;
      const costData = this.costMap.get(globalId);

      if (costData) {
        // Save original material
        if (!this.originalMaterials.has(mesh)) {
          this.originalMaterials.set(mesh, mesh.material);
        }

        // Get heatmap color
        const color = this.getCostColor(costData);
        const heatmapMat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.7,
          metalness: 0.2,
        });

        mesh.material = heatmapMat;
        mesh.userData.costData = costData;
      }
    });
  }

  private getCostColor(costData: ElementCostData): THREE.Color {
    const range = this.costRangeByType.get(costData.ifc_type);
    if (!range || range.min === range.max) {
      return new THREE.Color(0xffff00); // yellow if single value
    }

    const cost = parseFloat(costData.total_cost);
    const normalized = (cost - range.min) / (range.max - range.min);

    // Green (0, 1, 0) → Yellow (1, 1, 0) → Red (1, 0, 0)
    let r: number, g: number, b: number;

    if (normalized < 0.5) {
      // Green to yellow
      const t = normalized * 2;
      r = t;
      g = 1;
      b = 0;
    } else {
      // Yellow to red
      const t = (normalized - 0.5) * 2;
      r = 1;
      g = 1 - t;
      b = 0;
    }

    return new THREE.Color(r, g, b);
  }

  clearHeatmap(scene: THREE.Scene): void {
    scene.traverse((child: THREE.Object3D) => {
      const mesh = child as any;
      if (this.originalMaterials.has(mesh)) {
        mesh.material = this.originalMaterials.get(mesh);
        this.originalMaterials.delete(mesh);
      }
    });
  }

  getElementCost(globalId: string): ElementCostData | undefined {
    return this.costMap.get(globalId);
  }

  getCostStats(): { total: number; min: number; max: number; count: number } {
    let total = 0;
    let min = Infinity;
    let max = -Infinity;
    let count = 0;

    for (const cost of this.costMap.values()) {
      const val = parseFloat(cost.total_cost);
      total += val;
      min = Math.min(min, val);
      max = Math.max(max, val);
      count++;
    }

    return { total, min, max: Math.max(max, 0), count };
  }
}

export const costHeatmapSystem = new CostHeatmapSystem();
