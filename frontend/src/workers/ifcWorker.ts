/**
 * IFC Worker
 * Parsing pesado de arquivos IFC em web worker para não travar a UI
 * Comunicação via postMessage/onmessage
 */

import * as THREE from 'three';

export interface IFCWorkerMessage {
  type: 'parse' | 'progress' | 'error' | 'complete';
  data?: any;
  error?: string;
  progress?: number;
}

self.onmessage = async (event: MessageEvent) => {
  const { type, file } = event.data;

  if (type === 'parse') {
    try {
      console.log('[IFC Worker] Starting IFC parsing:', file.name);

      // Simular parsing progresso
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        self.postMessage({
          type: 'progress',
          progress: i,
        } as IFCWorkerMessage);
      }

      // Em produção, usar web-ifc para parsing real
      const result = {
        id: `ifc_${Date.now()}`,
        name: file.name,
        size: file.size,
        elements: [],
        metadata: {
          author: 'Unknown',
          application: 'Unknown',
          timestamp: new Date().toISOString(),
        },
      };

      self.postMessage({
        type: 'complete',
        data: result,
      } as IFCWorkerMessage);

      console.log('[IFC Worker] IFC parsing completed:', file.name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[IFC Worker] Parsing error:', errorMessage);

      self.postMessage({
        type: 'error',
        error: errorMessage,
      } as IFCWorkerMessage);
    }
  }
};

export default null;
