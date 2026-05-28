/**
 * SecurityTestingService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getSecurityTestingService } from './SecurityTestingService';

describe('SecurityTestingService', () => {
  let service: ReturnType<typeof getSecurityTestingService>;

  beforeEach(() => {
    service = getSecurityTestingService();
  });

  describe('Security Tests', () => {
    it('should run XSS test', async () => {
      const test = await service.runTest('xss');

      expect(test.id).toBeDefined();
      expect(test.type).toBe('xss');
      expect(['passed', 'failed']).toContain(test.status);
    });

    it('should run CSRF test', async () => {
      const test = await service.runTest('csrf');

      expect(test.type).toBe('csrf');
      expect(test.result).toBeDefined();
    });

    it('should run injection test', async () => {
      const test = await service.runTest('injection');

      expect(test.type).toBe('injection');
      expect(test.completedAt).toBeDefined();
    });

    it('should run auth test', async () => {
      const test = await service.runTest('auth');

      expect(test.type).toBe('auth');
    });

    it('should run config test', async () => {
      const test = await service.runTest('config');

      expect(test.type).toBe('config');
    });

    it('should run dependency test', async () => {
      const test = await service.runTest('dependency');

      expect(test.type).toBe('dependency');
    });
  });

  describe('Full Security Scan', () => {
    it('should run full security scan', async () => {
      const report = await service.runFullSecurityScan();

      expect(report.id).toBeDefined();
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
      expect(report.tests.length).toBeGreaterThan(0);
    });

    it('should generate report summary', async () => {
      const report = await service.runFullSecurityScan();

      expect(report.summary.total).toBe(report.tests.length);
      expect(report.summary.passed).toBeDefined();
      expect(report.summary.failed).toBeDefined();
    });
  });

  describe('Test Management', () => {
    it('should get test by ID', async () => {
      const test = await service.runTest('xss');
      const found = service.getTest(test.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(test.id);
    });

    it('should list all tests', async () => {
      await service.runTest('xss');
      await service.runTest('csrf');

      const tests = service.listTests();
      expect(tests.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Report Management', () => {
    it('should get report by ID', async () => {
      const report = await service.runFullSecurityScan();
      const found = service.getReport(report.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(report.id);
    });

    it('should list all reports', async () => {
      await service.runFullSecurityScan();
      await service.runFullSecurityScan();

      const reports = service.listReports();
      expect(reports.length).toBeGreaterThanOrEqual(2);
    });
  });
});
