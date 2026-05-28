/**
 * AuditService
 * Auditoria avançada de ações com logs imutáveis
 * Rastreia todas as ações críticas para compliance e segurança
 */

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  result: 'success' | 'failure' | 'partial';
  severity: 'low' | 'medium' | 'high' | 'critical';
  immutable: boolean;
  hash: string;
}

export interface AuditFilter {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  severity?: string;
}

export interface AuditConfig {
  retentionDays: number;
  enableImmutableLogs: boolean;
  logLevel: 'all' | 'important' | 'critical';
  enableExport: boolean;
}

class AuditService {
  private logs: AuditLog[] = [];
  private config: AuditConfig;
  private currentHash: string = '';

  constructor() {
    this.config = {
      retentionDays: 90,
      enableImmutableLogs: true,
      logLevel: 'important',
      enableExport: true,
    };
  }

  /**
   * Registra ação de auditoria
   */
  async logAction(
    userId: string,
    action: string,
    resource: string,
    details: Record<string, any>,
    result: 'success' | 'failure' | 'partial' = 'success',
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      resourceId: details.resourceId,
      details,
      ipAddress: await this.getIPAddress(),
      userAgent: navigator.userAgent,
      result,
      severity,
      immutable: this.config.enableImmutableLogs,
      hash: '',
    };

    // Calcular hash para imutabilidade
    if (log.immutable) {
      log.hash = this.calculateHash(log);
    }

    this.logs.push(log);
    this.updateChainHash();

    console.log('[AuditService] Action logged:', action, 'by:', userId);
    return log;
  }

  /**
   * Calcula hash criptográfico do log
   */
  private calculateHash(log: AuditLog): string {
    const data = JSON.stringify({
      id: log.id,
      timestamp: log.timestamp,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      details: log.details,
      result: log.result,
    });

    // Simular hash SHA-256 (em produção usar Web Crypto API)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Atualiza hash da cadeia de logs
   */
  private updateChainHash(): void {
    if (this.logs.length === 0) {
      this.currentHash = '';
      return;
    }

    const lastLog = this.logs[this.logs.length - 1];
    const chainData = JSON.stringify({
      ...lastLog,
      previousHash: this.currentHash,
    });
    
    let hash = 0;
    for (let i = 0; i < chainData.length; i++) {
      const char = chainData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    this.currentHash = Math.abs(hash).toString(16);
  }

  /**
   * Obtém endereço IP (simulado)
   */
  private async getIPAddress(): Promise<string> {
    // Em produção, usar API externa para obter IP real
    return '192.168.1.1';
  }

  /**
   * Verifica integridade dos logs
   */
  verifyIntegrity(): { valid: boolean; tamperedLogs: string[] } {
    const tamperedLogs: string[] = [];

    for (const log of this.logs) {
      if (log.immutable) {
        const expectedHash = this.calculateHash(log);
        if (expectedHash !== log.hash) {
          tamperedLogs.push(log.id);
        }
      }
    }

    return {
      valid: tamperedLogs.length === 0,
      tamperedLogs,
    };
  }

  /**
   * Busca logs com filtros
   */
  queryLogs(filter: AuditFilter): AuditLog[] {
    let filtered = [...this.logs];

    if (filter.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId);
    }

    if (filter.action) {
      filtered = filtered.filter(log => log.action === filter.action);
    }

    if (filter.resource) {
      filtered = filtered.filter(log => log.resource === filter.resource);
    }

    if (filter.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filter.endDate!);
    }

    if (filter.severity) {
      filtered = filtered.filter(log => log.severity === filter.severity);
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Retorna logs por usuário
   */
  getUserLogs(userId: string): AuditLog[] {
    return this.logs.filter(log => log.userId === userId);
  }

  /**
   * Retorna logs por recurso
   */
  getResourceLogs(resource: string, resourceId?: string): AuditLog[] {
    return this.logs.filter(log => 
      log.resource === resource && 
      (!resourceId || log.resourceId === resourceId)
    );
  }

  /**
   * Retorna logs críticos
   */
  getCriticalLogs(): AuditLog[] {
    return this.logs.filter(log => log.severity === 'critical');
  }

  /**
   * Retorna logs de falhas
   */
  getFailedLogs(): AuditLog[] {
    return this.logs.filter(log => log.result === 'failure');
  }

  /**
   * Exporta logs para CSV
   */
  exportToCSV(filter?: AuditFilter): string {
    const logs = filter ? this.queryLogs(filter) : this.logs;

    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'Action',
      'Resource',
      'Resource ID',
      'Result',
      'Severity',
      'IP Address',
      'User Agent',
    ];

    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.userId,
      log.action,
      log.resource,
      log.resourceId || '',
      log.result,
      log.severity,
      log.ipAddress || '',
      log.userAgent || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Exporta logs para JSON
   */
 exportToJSON(filter?: AuditFilter): string {
    const logs = filter ? this.queryLogs(filter) : this.logs;
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Remove logs antigos baseado em retenção
   */
  cleanupOldLogs(): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => 
      new Date(log.timestamp) >= cutoffDate
    );

    const removedCount = initialCount - this.logs.length;
    console.log('[AuditService] Cleaned up', removedCount, 'old logs');

    return removedCount;
  }

  /**
   * Gera relatório de auditoria
   */
  generateReport(filter?: AuditFilter): {
    totalLogs: number;
    successCount: number;
    failureCount: number;
    criticalCount: number;
    topActions: Record<string, number>;
    topUsers: Record<string, number>;
    timeRange: { start: string; end: string };
  } {
    const logs = filter ? this.queryLogs(filter) : this.logs;

    const successCount = logs.filter(log => log.result === 'success').length;
    const failureCount = logs.filter(log => log.result === 'failure').length;
    const criticalCount = logs.filter(log => log.severity === 'critical').length;

    const topActions: Record<string, number> = {};
    const topUsers: Record<string, number> = {};

    logs.forEach(log => {
      topActions[log.action] = (topActions[log.action] || 0) + 1;
      topUsers[log.userId] = (topUsers[log.userId] || 0) + 1;
    });

    const timeRange = {
      start: logs.length > 0 ? logs[logs.length - 1].timestamp : '',
      end: logs.length > 0 ? logs[0].timestamp : '',
    };

    return {
      totalLogs: logs.length,
      successCount,
      failureCount,
      criticalCount,
      topActions,
      topUsers,
      timeRange,
    };
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[AuditService] Config updated:', config);
  }

  /**
   * Retorna configuração
   */
  getConfig(): AuditConfig {
    return { ...this.config };
  }

  /**
   * Retorna hash atual da cadeia
   */
  getCurrentChainHash(): string {
    return this.currentHash;
  }

  /**
   * Limpa todos os logs (cuidado: operação irreversível)
   */
  clearLogs(): void {
    this.logs = [];
    this.currentHash = '';
    console.log('[AuditService] All logs cleared');
  }

  /**
   * Gera ID de log
   */
  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.logs = [];
    this.currentHash = '';
    console.log('[AuditService] Disposed');
  }
}

// Singleton instance
let auditServiceInstance: AuditService | null = null;

export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService();
  }
  return auditServiceInstance;
}

export default AuditService;
