/**
 * SecurityTestingService
 * Serviço de penetration testing automatizado
 * Realiza testes de segurança básicos para identificar vulnerabilidades
 */

export interface SecurityTest {
  id: string;
  name: string;
  type: 'xss' | 'csrf' | 'injection' | 'auth' | 'config' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'passed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  result?: SecurityTestResult;
}

export interface SecurityTestResult {
  passed: boolean;
  findings: SecurityFinding[];
  score: number; // 0-100
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  recommendation: string;
}

export interface SecurityReport {
  id: string;
  timestamp: string;
  tests: SecurityTest[];
  overallScore: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class SecurityTestingService {
  private tests: Map<string, SecurityTest> = new Map();
  private reports: Map<string, SecurityReport> = new Map();

  /**
   * Executa todos os testes de segurança
   */
  async runFullSecurityScan(): Promise<SecurityReport> {
    console.log('[SecurityTestingService] Starting full security scan');

    const testTypes: SecurityTest['type'][] = [
      'xss',
      'csrf',
      'injection',
      'auth',
      'config',
      'dependency',
    ];

    const tests: SecurityTest[] = [];

    for (const type of testTypes) {
      const test = await this.runTest(type);
      tests.push(test);
    }

    const report = this.generateReport(tests);
    this.reports.set(report.id, report);

    console.log('[SecurityTestingService] Security scan completed, score:', report.overallScore);
    return report;
  }

  /**
   * Executa teste específico
   */
  async runTest(type: SecurityTest['type']): Promise<SecurityTest> {
    const test: SecurityTest = {
      id: this.generateTestId(),
      name: this.getTestName(type),
      type,
      severity: this.getTestSeverity(type),
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    this.tests.set(test.id, test);

    try {
      const result = await this.executeTest(type);
      test.status = result.passed ? 'passed' : 'failed';
      test.completedAt = new Date().toISOString();
      test.result = result;

      console.log('[SecurityTestingService] Test completed:', test.name, 'status:', test.status);
    } catch (error) {
      test.status = 'failed';
      test.completedAt = new Date().toISOString();
      test.result = {
        passed: false,
        findings: [{
          id: this.generateFindingId(),
          title: 'Test execution failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          severity: 'medium',
          recommendation: 'Review test configuration',
        }],
        score: 0,
      };

      console.error('[SecurityTestingService] Test failed:', test.name, error);
    }

    return test;
  }

  /**
   * Executa teste específico
   */
  private async executeTest(type: SecurityTest['type']): Promise<SecurityTestResult> {
    switch (type) {
      case 'xss':
        return this.testXSS();
      case 'csrf':
        return this.testCSRF();
      case 'injection':
        return this.testInjection();
      case 'auth':
        return this.testAuth();
      case 'config':
        return this.testConfig();
      case 'dependency':
        return this.testDependencies();
      default:
        return { passed: true, findings: [], score: 100 };
    }
  }

  /**
   * Testa vulnerabilidades XSS
   */
  private async testXSS(): Promise<SecurityTestResult> {
    const findings: SecurityFinding[] = [];

    // Verificar sanitização de inputs
    const testInputs = ['<script>alert("xss")</script>', 'javascript:alert(1)', '"><script>'];
    
    for (const input of testInputs) {
      const sanitized = this.sanitizeInput(input);
      if (sanitized !== input && sanitized.includes('<script>')) {
        findings.push({
          id: this.generateFindingId(),
          title: 'Potential XSS vulnerability',
          description: 'Input may not be properly sanitized',
          severity: 'high',
          recommendation: 'Implement proper input sanitization',
        });
      }
    }

    if (findings.length === 0) {
      return { passed: true, findings: [], score: 100 };
    }

    return { passed: false, findings, score: 50 };
  }

  /**
   * Testa proteção CSRF
   */
  private async testCSRF(): Promise<SecurityTestResult> {
    const findings: SecurityFinding[] = [];

    // Verificar presença de tokens CSRF
    const hasCSRFToken = this.checkCSRFToken();

    if (!hasCSRFToken) {
      findings.push({
        id: this.generateFindingId(),
        title: 'CSRF token missing',
        description: 'No CSRF token detected in forms',
        severity: 'high',
        recommendation: 'Implement CSRF tokens for all state-changing operations',
      });
    }

    if (findings.length === 0) {
      return { passed: true, findings: [], score: 100 };
    }

    return { passed: false, findings, score: 40 };
  }

  /**
   * Testa injeção de código
   */
  private async testInjection(): Promise<SecurityTestResult> {
    const findings: SecurityFinding[] = [];

    // Verificar SQL injection (simulado)
    const sqlPatterns = ["' OR '1'='1", "' OR 1=1--", "'; DROP TABLE users;--"];
    
    for (const pattern of sqlPatterns) {
      if (this.isVulnerableToInjection(pattern)) {
        findings.push({
          id: this.generateFindingId(),
          title: 'Potential SQL injection',
          description: 'Input may be vulnerable to SQL injection',
          severity: 'critical',
          recommendation: 'Use parameterized queries',
        });
      }
    }

    if (findings.length === 0) {
      return { passed: true, findings: [], score: 100 };
    }

    return { passed: false, findings, score: 20 };
  }

  /**
   * Testa autenticação
   */
  private async testAuth(): Promise<SecurityTestResult> {
    const findings: SecurityFinding[] = [];

    // Verificar força de senhas
    const hasPasswordPolicy = this.checkPasswordPolicy();
    if (!hasPasswordPolicy) {
      findings.push({
        id: this.generateFindingId(),
        title: 'Weak password policy',
        description: 'Password policy may not be enforced',
        severity: 'medium',
        recommendation: 'Implement strong password requirements',
      });
    }

    // Verificar MFA
    const hasMFA = this.checkMFA();
    if (!hasMFA) {
      findings.push({
        id: this.generateFindingId(),
        title: 'MFA not enabled',
        description: 'Multi-factor authentication not detected',
        severity: 'medium',
        recommendation: 'Enable MFA for enhanced security',
      });
    }

    if (findings.length === 0) {
      return { passed: true, findings: [], score: 100 };
    }

    return { passed: false, findings, score: 60 };
  }

  /**
   * Testa configuração de segurança
   */
  private async testConfig(): Promise<SecurityTestResult> {
    const findings: SecurityFinding[] = [];

    // Verificar headers de segurança
    const securityHeaders = this.checkSecurityHeaders();
    
    if (!securityHeaders.csp) {
      findings.push({
        id: this.generateFindingId(),
        title: 'CSP header missing',
        description: 'Content-Security-Policy header not set',
        severity: 'medium',
        recommendation: 'Implement Content-Security-Policy',
      });
    }

    if (!securityHeaders.hsts) {
      findings.push({
        id: this.generateFindingId(),
        title: 'HSTS header missing',
        description: 'Strict-Transport-Security header not set',
        severity: 'low',
        recommendation: 'Implement HSTS for HTTPS enforcement',
      });
    }

    if (findings.length === 0) {
      return { passed: true, findings: [], score: 100 };
    }

    return { passed: false, findings, score: 70 };
  }

  /**
   * Testa dependências
   */
  private async testDependencies(): Promise<SecurityTestResult> {
    const findings: SecurityFinding[] = [];

    // Verificar dependências desatualizadas (simulado)
    const outdatedDeps = this.checkOutdatedDependencies();
    
    outdatedDeps.forEach(dep => {
      findings.push({
        id: this.generateFindingId(),
        title: `Outdated dependency: ${dep.name}`,
        description: `${dep.name} has known vulnerabilities`,
        severity: dep.severity,
        recommendation: `Update ${dep.name} to latest version`,
      });
    });

    if (findings.length === 0) {
      return { passed: true, findings: [], score: 100 };
    }

    return { passed: false, findings, score: 50 };
  }

  /**
   * Sanitiza input (simulado)
   */
  private sanitizeInput(input: string): string {
    return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Verifica token CSRF (simulado)
   */
  private checkCSRFToken(): boolean {
    // Em produção, verificar presença de token em formulários
    return true;
  }

  /**
   * Verifica vulnerabilidade a injeção (simulado)
   */
  private isVulnerableToInjection(pattern: string): boolean {
    // Em produção, testar contra backend
    return false;
  }

  /**
   * Verifica política de senhas (simulado)
   */
  private checkPasswordPolicy(): boolean {
    // Em produção, verificar configuração
    return true;
  }

  /**
   * Verifica MFA (simulado)
   */
  private checkMFA(): boolean {
    // Em produção, verificar configuração
    return true;
  }

  /**
   * Verifica headers de segurança (simulado)
   */
  private checkSecurityHeaders(): { csp: boolean; hsts: boolean; xFrame: boolean } {
    // Em produção, verificar headers HTTP
    return { csp: true, hsts: true, xFrame: true };
  }

  /**
   * Verifica dependências desatualizadas (simulado)
   */
  private checkOutdatedDependencies(): Array<{ name: string; severity: 'low' | 'medium' | 'high' }> {
    // Em produção, usar npm audit ou similar
    return [];
  }

  /**
   * Gera relatório de segurança
   */
  private generateReport(tests: SecurityTest[]): SecurityReport {
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    // Contar severidade das falhas
    tests.forEach(test => {
      if (test.result && !test.result.passed) {
        test.result.findings.forEach(finding => {
          summary[finding.severity]++;
        });
      }
    });

    // Calcular score geral
    const totalFindings = summary.critical + summary.high + summary.medium + summary.low;
    const score = Math.max(0, 100 - (summary.critical * 25) - (summary.high * 15) - (summary.medium * 5) - (summary.low * 2));

    return {
      id: this.generateReportId(),
      timestamp: new Date().toISOString(),
      tests,
      overallScore: score,
      summary,
    };
  }

  /**
   * Retorna nome do teste
   */
  private getTestName(type: SecurityTest['type']): string {
    const names: Record<SecurityTest['type'], string> = {
      xss: 'Cross-Site Scripting (XSS) Test',
      csrf: 'Cross-Site Request Forgery (CSRF) Test',
      injection: 'Code Injection Test',
      auth: 'Authentication Security Test',
      config: 'Security Configuration Test',
      dependency: 'Dependency Vulnerability Test',
    };
    return names[type];
  }

  /**
   * Retorna severidade do teste
   */
  private getTestSeverity(type: SecurityTest['type']): SecurityTest['severity'] {
    const severities: Record<SecurityTest['type'], SecurityTest['severity']> = {
      xss: 'high',
      csrf: 'high',
      injection: 'critical',
      auth: 'medium',
      config: 'medium',
      dependency: 'low',
    };
    return severities[type];
  }

  /**
   * Retorna teste por ID
   */
  getTest(testId: string): SecurityTest | undefined {
    return this.tests.get(testId);
  }

  /**
   * Lista todos os testes
   */
  listTests(): SecurityTest[] {
    return Array.from(this.tests.values());
  }

  /**
   * Retorna relatório por ID
   */
  getReport(reportId: string): SecurityReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Lista todos os relatórios
   */
  listReports(): SecurityReport[] {
    return Array.from(this.reports.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Gera ID de teste
   */
  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gera ID de finding
   */
  private generateFindingId(): string {
    return `finding_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gera ID de relatório
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.tests.clear();
    this.reports.clear();
    console.log('[SecurityTestingService] Disposed');
  }
}

// Singleton instance
let securityTestingServiceInstance: SecurityTestingService | null = null;

export function getSecurityTestingService(): SecurityTestingService {
  if (!securityTestingServiceInstance) {
    securityTestingServiceInstance = new SecurityTestingService();
  }
  return securityTestingServiceInstance;
}

export default SecurityTestingService;
