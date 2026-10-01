/**
 * GDPRService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getGDPRService } from './GDPRService';

describe('GDPRService', () => {
  let service: ReturnType<typeof getGDPRService>;

  beforeEach(() => {
    service = getGDPRService();
  });

  describe('Consent Management', () => {
    it('should record consent', () => {
      const consent = service.recordConsent('user-1', 'analytics', true);

      expect(consent.id).toBeDefined();
      expect(consent.userId).toBe('user-1');
      expect(consent.granted).toBe(true);
    });

    it('should revoke consent', () => {
      const consent = service.recordConsent('user-1', 'analytics', true);
      const revoked = service.revokeConsent(consent.id);

      expect(revoked).toBe(true);
      expect(service.getUserConsents('user-1')[0].granted).toBe(false);
    });

    it('should check if user has consent', () => {
      service.recordConsent('user-1', 'analytics', true);
      const hasConsent = service.hasConsent('user-1', 'analytics');

      expect(hasConsent).toBe(true);
    });

    it('should return false for non-existent consent', () => {
      // `getGDPRService()` devolve um singleton: o consentimento gravado nos
      // testes acima continua lá. Um usuário próprio é o que o caso realmente
      // descreve — ninguém registrou consentimento para ele.
      const hasConsent = service.hasConsent('user-sem-consentimento', 'analytics');
      expect(hasConsent).toBe(false);
    });
  });

  describe('Data Subject Requests', () => {
    it('should create access request', () => {
      const request = service.createDataSubjectRequest('user-1', 'access');

      expect(request.id).toBeDefined();
      expect(request.type).toBe('access');
      expect(request.status).toBe('pending');
    });

    it('should process access request', async () => {
      const request = service.createDataSubjectRequest('user-1', 'access');
      const result = await service.processAccessRequest(request.id);

      expect(result).toBeDefined();
      expect(request.status).toBe('completed');
    });

    it('should process deletion request', async () => {
      const request = service.createDataSubjectRequest('user-1', 'deletion');
      const result = await service.processDeletionRequest(request.id);

      expect(result).toBe(true);
      expect(request.status).toBe('completed');
    });

    it('should process portability request', async () => {
      const request = service.createDataSubjectRequest('user-1', 'portability');
      const result = await service.processPortabilityRequest(request.id);

      expect(typeof result).toBe('string');
      expect(request.status).toBe('completed');
    });
  });

  describe('Processing Records', () => {
    it('should return processing record', () => {
      const record = service.getProcessingRecord('user_profile');

      expect(record).toBeDefined();
      expect(record?.purpose).toBeDefined();
      expect(record?.legalBasis).toBeDefined();
    });

    it('should list all processing records', () => {
      const records = service.listProcessingRecords();

      expect(records.length).toBeGreaterThan(0);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report', () => {
      service.recordConsent('user-1', 'analytics', true);
      service.recordConsent('user-2', 'marketing', false);

      const report = service.generateComplianceReport();

      expect(report.totalConsents).toBeGreaterThan(0);
      expect(report.activeConsents).toBeDefined();
      expect(report.processingRecords).toBeGreaterThan(0);
    });
  });

  describe('Policy Management', () => {
    it('should update policy version', () => {
      service.updatePolicyVersion('2.0');

      const report = service.generateComplianceReport();
      // Version update is tracked internally
      expect(report).toBeDefined();
    });

    it('should check if consent needs renewal', () => {
      // O caso acima já move a política para 2.0 no mesmo singleton: o
      // consentimento nascia com 2.0 e o `updatePolicyVersion('2.0')` daqui
      // virava no-op, então nada precisava renovar. Usuário próprio e uma
      // versão de fato nova deixam o caso independente da ordem dos testes.
      service.recordConsent('user-renovacao', 'analytics', true);
      service.updatePolicyVersion('3.0');

      const needsRenewal = service.needsConsentRenewal('user-renovacao', 'analytics');
      expect(needsRenewal).toBe(true);
    });
  });
});
