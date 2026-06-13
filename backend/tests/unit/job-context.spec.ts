import { describe, it, expect, vi } from 'vitest';
import { createJobLogger, newJobId } from '../../src/core/observability/job-context.js';
import { REDACTED } from '../../src/core/observability/redact.js';

describe('job-context', () => {
  it('newJobId returns distinct uuids', () => {
    const a = newJobId(); const b = newJobId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('injects job_id + origin_req_id (pino arg order: obj, msg) and redacts', () => {
    const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const log = createJobLogger(sink, {
      jobType: 'email.send', jobId: 'job-1', originReqId: 'req-abc', tenantId: 't1',
    });
    log.info('email sent', { emailId: 'e1', password: 'leak' });

    expect(sink.info).toHaveBeenCalledOnce();
    const [obj, msg] = sink.info.mock.calls[0];
    expect(msg).toBe('email sent');
    expect(obj.job_type).toBe('email.send');
    expect(obj.job_id).toBe('job-1');
    expect(obj.origin_req_id).toBe('req-abc');
    expect(obj.tenant_id).toBe('t1');
    expect(obj.emailId).toBe('e1');
    expect(obj.password).toBe(REDACTED); // sensível redigido
  });

  it('origin_req_id is null for scheduled (no originating request)', () => {
    const sink = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const log = createJobLogger(sink, { jobType: 'billing.sweep', jobId: 'j', originReqId: null });
    log.warn('sweep partial');
    expect(sink.warn.mock.calls[0][0].origin_req_id).toBeNull();
  });
});
