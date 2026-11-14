import { parentPort } from 'node:worker_threads';
import { extractProperties, type ElementMeta } from './ifc-properties.extractor.js';

parentPort?.on('message', async (input: { buffer: ArrayBuffer; elements: ElementMeta[]; lengthUnit: string }) => {
  try {
    parentPort!.postMessage({ ok: true, properties: await extractProperties(input.buffer, input.elements, input.lengthUnit) });
  } catch (error) {
    parentPort!.postMessage({ ok: false, message: error instanceof Error ? error.message : String(error) });
  }
});
