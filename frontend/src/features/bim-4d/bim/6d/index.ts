/**
 * BIM 6D - Facilities Management
 * 
 * Gestão de facilities pós-construção:
 * - Operação e manutenção (O&M)
 * - Gestão de ativos
 * - Manutenção preventiva/corretiva
 * - Histórico de intervenções
 * - Integração com sistemas prediais (HVAC, elétrica, etc)
 */

// TODO: Implementar funcionalidades 6D
// Placeholder para desenvolvimento futuro

export interface Asset {
  id: string;
  ifcGuid: string;
  type: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: Date;
  warrantyExpiry?: Date;
  maintenanceHistory: MaintenanceRecord[];
}

export interface MaintenanceRecord {
  id: string;
  date: Date;
  type: 'preventive' | 'corrective';
  description: string;
  technician?: string;
  cost?: number;
}

export class BIM6DManager {
  // Placeholder - será implementado conforme roadmap
}
