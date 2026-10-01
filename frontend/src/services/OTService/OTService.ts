/**
 * OTService (Operational Transformation)
 * Sincronização de edições colaborativas com resolução de conflitos
 * Permite múltiplos usuários editarem o mesmo modelo simultaneamente
 */

export interface OTOperation {
  id: string;
  type: 'insert' | 'delete' | 'modify' | 'move';
  userId: string;
  timestamp: number;
  position: number;
  length?: number;
  content?: any;
  elementId?: string;
}

export interface OTTransform {
  operation: OTOperation;
  transformed: OTOperation;
  conflict: boolean;
}

export interface OTConflict {
  operation1: OTOperation;
  operation2: OTOperation;
  type: 'concurrent' | 'causal';
  resolution: 'merge' | 'override' | 'manual';
}

class OTService {
  private operations: OTOperation[] = [];
  private pendingOperations: Map<string, OTOperation[]> = new Map();
  private resolvedConflicts: OTConflict[] = [];
  private currentVersion: number = 0;

  /**
   * Aplica operação localmente
   */
  applyOperation(operation: OTOperation): OTOperation {
    operation.id = this.generateOperationId();
    operation.timestamp = Date.now();

    this.operations.push(operation);
    this.currentVersion++;

    console.log('[OTService] Operation applied:', operation.id, 'type:', operation.type);
    return operation;
  }

  /**
   * Transforma operação recebida do servidor
   */
  transformOperation(remoteOperation: OTOperation): OTTransform {
    const localOperations = this.operations.filter(
      op => op.timestamp > remoteOperation.timestamp
    );

    let transformed = { ...remoteOperation };

    for (const localOp of localOperations) {
      const result = this.transform(transformed, localOp);
      transformed = result.transformed;

      if (result.conflict) {
        console.warn('[OTService] Conflict detected between:', remoteOperation.id, 'and', localOp.id);
      }
    }

    const transformResult: OTTransform = {
      operation: remoteOperation,
      transformed,
      conflict: transformed !== remoteOperation,
    };

    return transformResult;
  }

  /**
   * Transforma duas operações (algoritmo OT)
   */
  private transform(op1: OTOperation, op2: OTOperation): OTTransform {
    // Se as operações são do mesmo usuário, não precisa transformar
    if (op1.userId === op2.userId) {
      return {
        operation: op1,
        transformed: op1,
        conflict: false,
      };
    }

    // Transformação baseada em tipo de operação
    switch (op1.type) {
      case 'insert':
        return this.transformInsert(op1, op2);
      case 'delete':
        return this.transformDelete(op1, op2);
      case 'modify':
        return this.transformModify(op1, op2);
      case 'move':
        return this.transformMove(op1, op2);
      default:
        return {
          operation: op1,
          transformed: op1,
          conflict: false,
        };
    }
  }

  /**
   * Transforma operação de inserção
   */
  private transformInsert(op1: OTOperation, op2: OTOperation): OTTransform {
    const transformed = { ...op1 };

    if (op2.type === 'insert') {
      // Se op2 inseriu antes de op1, ajustar posição
      if (op2.position <= op1.position) {
        transformed.position += op2.length || 0;
      }
    } else if (op2.type === 'delete') {
      // Se op2 deletou antes de op1, ajustar posição
      if (op2.position < op1.position) {
        transformed.position -= op2.length || 0;
      }
    }

    return {
      operation: op1,
      transformed,
      conflict: op2.type === 'delete' && op2.position === op1.position,
    };
  }

  /**
   * Transforma operação de deleção
   */
  private transformDelete(op1: OTOperation, op2: OTOperation): OTTransform {
    const transformed = { ...op1 };

    if (op2.type === 'insert') {
      // Se op2 inseriu antes de op1, ajustar posição
      if (op2.position < op1.position) {
        transformed.position += op2.length || 0;
      }
    } else if (op2.type === 'delete') {
      // Se op2 deletou antes de op1, ajustar posição
      if (op2.position < op1.position) {
        transformed.position -= op2.length || 0;
      }
    }

    return {
      operation: op1,
      transformed,
      conflict: op2.type === 'delete' && op2.position === op1.position,
    };
  }

  /**
   * Transforma operação de modificação
   */
  private transformModify(op1: OTOperation, op2: OTOperation): OTTransform {
    // Modificações no mesmo elemento causam conflito
    if (op1.elementId === op2.elementId) {
      return {
        operation: op1,
        transformed: op1,
        conflict: true,
      };
    }

    return {
      operation: op1,
      transformed: op1,
      conflict: false,
    };
  }

  /**
   * Transforma operação de movimento
   */
  private transformMove(op1: OTOperation, op2: OTOperation): OTTransform {
    // Movimentos do mesmo elemento causam conflito
    if (op1.elementId === op2.elementId) {
      return {
        operation: op1,
        transformed: op1,
        conflict: true,
      };
    }

    return {
      operation: op1,
      transformed: op1,
      conflict: false,
    };
  }

  /**
   * Detecta conflitos entre operações
   */
  detectConflicts(operations: OTOperation[]): OTConflict[] {
    const conflicts: OTConflict[] = [];

    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        const op1 = operations[i];
        const op2 = operations[j];

        if (op1.userId === op2.userId) {
          continue;
        }

        const transform = this.transform(op1, op2);
        if (transform.conflict) {
          conflicts.push({
            operation1: op1,
            operation2: op2,
            type: 'concurrent',
            resolution: 'manual',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflito automaticamente
   */
  resolveConflict(conflict: OTConflict, resolution: 'merge' | 'override'): OTOperation {
    const resolved: OTConflict = {
      ...conflict,
      resolution,
    };

    this.resolvedConflicts.push(resolved);

    if (resolution === 'override') {
      // Override: usa a operação mais recente
      const latest = conflict.operation1.timestamp > conflict.operation2.timestamp
        ? conflict.operation1
        : conflict.operation2;
      console.log('[OTService] Conflict resolved by override:', latest.id);
      return latest;
    } else {
      // Merge: combina as operações
      const merged: OTOperation = {
        ...conflict.operation1,
        content: this.mergeContent(conflict.operation1.content, conflict.operation2.content),
      };
      console.log('[OTService] Conflict resolved by merge:', merged.id);
      return merged;
    }
  }

  /**
   * Mescla conteúdo de duas operações
   */
  private mergeContent(content1: any, content2: any): any {
    if (typeof content1 === 'object' && typeof content2 === 'object') {
      return { ...content1, ...content2 };
    }
    return content2 || content1;
  }

  /**
   * Adiciona operação pendente
   */
  addPendingOperation(userId: string, operation: OTOperation): void {
    if (!this.pendingOperations.has(userId)) {
      this.pendingOperations.set(userId, []);
    }
    this.pendingOperations.get(userId)!.push(operation);
  }

  /**
   * Remove operações pendentes de um usuário
   */
  clearPendingOperations(userId: string): void {
    this.pendingOperations.delete(userId);
  }

  /**
   * Retorna histórico de operações
   */
  getOperations(): OTOperation[] {
    return [...this.operations];
  }

  /**
   * Retorna operações de um usuário
   */
  getUserOperations(userId: string): OTOperation[] {
    return this.operations.filter(op => op.userId === userId);
  }

  /**
   * Retorna conflitos resolvidos
   */
  getResolvedConflicts(): OTConflict[] {
    return [...this.resolvedConflicts];
  }

  /**
   * Retorna versão atual
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Limpa histórico de operações
   */
  clearHistory(): void {
    this.operations = [];
    this.currentVersion = 0;
    console.log('[OTService] History cleared');
  }

  /**
   * Gera ID de operação
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.clearHistory();
    this.pendingOperations.clear();
    this.resolvedConflicts = [];
    console.log('[OTService] Disposed');
  }
}

// Singleton instance
let otServiceInstance: OTService | null = null;

export function getOTService(): OTService {
  if (!otServiceInstance) {
    otServiceInstance = new OTService();
  }
  return otServiceInstance;
}

export default OTService;
