/**
 * GDPRService
 * Serviço de compliance LGPD/GDPR para gerenciamento de dados pessoais
 * Gerencia consentimento, direitos do titular e conformidade
 */

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'marketing' | 'analytics' | 'personalization' | 'essential';
  granted: boolean;
  grantedAt: string;
  revokedAt?: string;
  version: string;
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  type: 'access' | 'deletion' | 'portability' | 'rectification' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
  result?: string;
  reason?: string;
}

export interface DataProcessingRecord {
  id: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interest' | 'public_task' | 'legitimate_interest';
  dataCategories: string[];
  retentionPeriod: string;
  thirdParties: string[];
}

class GDPRService {
  private consents: Map<string, ConsentRecord> = new Map();
  private requests: Map<string, DataSubjectRequest> = new Map();
  private processingRecords: Map<string, DataProcessingRecord> = new Map();
  private currentPolicyVersion: string = '1.0';

  constructor() {
    this.initializeProcessingRecords();
  }

  /**
   * Inicializa registros de processamento de dados
   */
  private initializeProcessingRecords(): void {
    this.processingRecords.set('user_profile', {
      id: 'user_profile',
      purpose: 'Gerenciamento de perfil de usuário',
      legalBasis: 'contract',
      dataCategories: ['nome', 'email', 'preferências'],
      retentionPeriod: '2 anos após encerramento',
      thirdParties: [],
    });

    this.processingRecords.set('analytics', {
      id: 'analytics',
      purpose: 'Análise de uso e melhoria do serviço',
      legalBasis: 'legitimate_interest',
      dataCategories: ['dados de navegação', 'interações', 'performance'],
      retentionPeriod: '12 meses',
      thirdParties: [],
    });

    this.processingRecords.set('collaboration', {
      id: 'collaboration',
      purpose: 'Colaboração em tempo real',
      legalBasis: 'contract',
      dataCategories: ['presença', 'mensagens', 'seleções'],
      retentionPeriod: 'enquanto ativo',
      thirdParties: [],
    });

    console.log('[GDPRService] Processing records initialized');
  }

  /**
   * Registra consentimento
   */
  recordConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean
  ): ConsentRecord {
    const consent: ConsentRecord = {
      id: this.generateConsentId(),
      userId,
      consentType,
      granted,
      grantedAt: new Date().toISOString(),
      version: this.currentPolicyVersion,
    };

    this.consents.set(consent.id, consent);
    console.log('[GDPRService] Consent recorded:', consentType, 'granted:', granted);
    return consent;
  }

  /**
   * Revoga consentimento
   */
  revokeConsent(consentId: string): boolean {
    const consent = this.consents.get(consentId);
    if (!consent) {
      return false;
    }

    consent.granted = false;
    consent.revokedAt = new Date().toISOString();

    console.log('[GDPRService] Consent revoked:', consentId);
    return true;
  }

  /**
   * Verifica consentimento
   */
  hasConsent(userId: string, consentType: ConsentRecord['consentType']): boolean {
    const userConsents = Array.from(this.consents.values())
      .filter(c => c.userId === userId && c.consentType === consentType);

    if (userConsents.length === 0) {
      return false;
    }

    const latestConsent = userConsents[userConsents.length - 1];
    return latestConsent.granted && !latestConsent.revokedAt;
  }

  /**
   * Cria solicitação de titular de dados
   */
  createDataSubjectRequest(
    userId: string,
    type: DataSubjectRequest['type'],
    reason?: string
  ): DataSubjectRequest {
    const request: DataSubjectRequest = {
      id: this.generateRequestId(),
      userId,
      type,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reason,
    };

    this.requests.set(request.id, request);
    console.log('[GDPRService] Data subject request created:', type);
    return request;
  }

  /**
   * Processa solicitação de acesso
   */
  async processAccessRequest(requestId: string): Promise<Record<string, any>> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    request.status = 'processing';

    // Simular coleta de dados
    const userData = {
      userId: request.userId,
      consents: this.getUserConsents(request.userId),
      requests: this.getUserRequests(request.userId),
      lastActivity: new Date().toISOString(),
    };

    request.status = 'completed';
    request.completedAt = new Date().toISOString();
    request.result = JSON.stringify(userData);

    console.log('[GDPRService] Access request processed:', requestId);
    return userData;
  }

  /**
   * Processa solicitação de exclusão
   */
  async processDeletionRequest(requestId: string): Promise<boolean> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    request.status = 'processing';

    // Simular exclusão de dados
    // Em produção, excluir dados de todos os sistemas
    this.consents = new Map(
      Array.from(this.consents.entries()).filter(([_, c]) => c.userId !== request.userId)
    );

    request.status = 'completed';
    request.completedAt = new Date().toISOString();
    request.result = 'Dados excluídos com sucesso';

    console.log('[GDPRService] Deletion request processed:', requestId);
    return true;
  }

  /**
   * Processa solicitação de portabilidade
   */
  async processPortabilityRequest(requestId: string): Promise<string> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    request.status = 'processing';

    // Simular exportação de dados
    const userData = await this.processAccessRequest(requestId);
    const exportData = JSON.stringify(userData, null, 2);

    request.status = 'completed';
    request.completedAt = new Date().toISOString();
    request.result = 'Dados exportados com sucesso';

    console.log('[GDPRService] Portability request processed:', requestId);
    return exportData;
  }

  /**
   * Retorna consentimentos do usuário
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return Array.from(this.consents.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime());
  }

  /**
   * Retorna solicitações do usuário
   */
  getUserRequests(userId: string): DataSubjectRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }

  /**
   * Retorna registro de processamento
   */
  getProcessingRecord(recordId: string): DataProcessingRecord | undefined {
    return this.processingRecords.get(recordId);
  }

  /**
   * Lista todos os registros de processamento
   */
  listProcessingRecords(): DataProcessingRecord[] {
    return Array.from(this.processingRecords.values());
  }

  /**
   * Gera relatório de conformidade
   */
  generateComplianceReport(): {
    totalConsents: number;
    activeConsents: number;
    pendingRequests: number;
    completedRequests: number;
    processingRecords: number;
  } {
    const totalConsents = this.consents.size;
    const activeConsents = Array.from(this.consents.values()).filter(c => c.granted && !c.revokedAt).length;
    const pendingRequests = Array.from(this.requests.values()).filter(r => r.status === 'pending').length;
    const completedRequests = Array.from(this.requests.values()).filter(r => r.status === 'completed').length;
    const processingRecords = this.processingRecords.size;

    return {
      totalConsents,
      activeConsents,
      pendingRequests,
      completedRequests,
      processingRecords,
    };
  }

  /**
   * Atualiza versão da política
   */
  updatePolicyVersion(newVersion: string): void {
    this.currentPolicyVersion = newVersion;
    console.log('[GDPRService] Policy version updated:', newVersion);
  }

  /**
   * Verifica se consentimento precisa ser renovado
   */
  needsConsentRenewal(userId: string, consentType: ConsentRecord['consentType']): boolean {
    const userConsents = this.getUserConsents(userId).filter(c => c.consentType === consentType);
    
    if (userConsents.length === 0) {
      return true;
    }

    const latestConsent = userConsents[0];
    
    // Se versão do consentimento for diferente da atual, precisa renovar
    if (latestConsent.version !== this.currentPolicyVersion) {
      return true;
    }

    // Se consentimento foi revogado, precisa renovar
    if (latestConsent.revokedAt) {
      return true;
    }

    return false;
  }

  /**
   * Gera ID de consentimento
   */
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gera ID de solicitação
   */
  private generateRequestId(): string {
    return `request_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.consents.clear();
    this.requests.clear();
    this.processingRecords.clear();
    console.log('[GDPRService] Disposed');
  }
}

// Singleton instance
let gdprServiceInstance: GDPRService | null = null;

export function getGDPRService(): GDPRService {
  if (!gdprServiceInstance) {
    gdprServiceInstance = new GDPRService();
  }
  return gdprServiceInstance;
}

export default GDPRService;
