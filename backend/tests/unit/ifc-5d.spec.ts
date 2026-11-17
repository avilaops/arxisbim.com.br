import { describe, expect, it } from 'vitest';
import { safeIfcStorageKey, extract5dProperties } from '../../src/modules/ifc/ifc-5d.service.js';
import { readFile } from 'node:fs/promises';

describe('IFC 5D • server-owned file access', () => {
  it('accepts canonical and legacy storage keys', () => {
    expect(safeIfcStorageKey('tenants/t/ifc/model.ifc', 't')).toBe('tenants/t/ifc/model.ifc');
    expect(safeIfcStorageKey('/api/v1/storage/tenants/t/ifc/model.ifc', 't')).toBe('tenants/t/ifc/model.ifc');
    expect(safeIfcStorageKey('ifc/old-upload.ifc', 't')).toBe('ifc/old-upload.ifc');
  });
  it.each(['https://localhost/secret.ifc', 'file:///etc/secret.ifc', '../file.ifc', 'ifc/%2e%2e/secret.ifc', 'C:\\secret.ifc', 'tenants/other/ifc/model.ifc'])('rejects unsafe or foreign key %s', (key) => {
    expect(() => safeIfcStorageKey(key, 't')).toThrow();
  });
  it('extracts real SI quantities from the IFC4 fixture without invented values', async () => {
    const buffer = await readFile(new URL('../fixtures/ifc/ac20-fzk-haus_ifc4.ifc', import.meta.url));
    const props = await extract5dProperties(buffer);
    expect(props.length).toBeGreaterThan(0);
    expect(props.some(p => p.areaM2 != null || p.volumeM3 != null || p.lengthM != null)).toBe(true);
    expect(props.some(p => p.areaM2 == null || p.volumeM3 == null || p.lengthM == null)).toBe(true);
    expect(new Set(props.map(p => p.expressID)).size).toBe(props.length);
    for (const p of props) for (const value of [p.areaM2, p.volumeM3, p.lengthM]) {
      if (value !== null) expect(Number.isFinite(value) && value >= 0).toBe(true);
    }
  }, 120_000);
  it('keeps the event loop responsive while extracting a full model', async () => {
    const buffer = await readFile(new URL('../fixtures/ifc/ac20-fzk-haus_ifc4.ifc', import.meta.url));
    let lastTick = Date.now(), longestPause = 0;
    const heartbeat = setInterval(() => { const now = Date.now(); longestPause = Math.max(longestPause, now - lastTick); lastTick = now; }, 20);
    try {
      await extract5dProperties(buffer);
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(longestPause).toBeLessThan(2000);
    } finally { clearInterval(heartbeat); }
  }, 120_000);
});
