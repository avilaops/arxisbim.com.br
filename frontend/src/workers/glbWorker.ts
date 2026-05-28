/**
 * GLB Worker
 * Parsing pesado de arquivos GLB/GLTF em web worker para não travar a UI
 * Comunicação via postMessage/onmessage
 */

export interface GLBWorkerMessage {
  type: 'parse' | 'progress' | 'error' | 'complete';
  data?: any;
  error?: string;
  progress?: number;
}

self.onmessage = async (event: MessageEvent) => {
  const { type, file } = event.data;

  if (type === 'parse') {
    try {
      console.log('[GLB Worker] Starting GLB parsing:', file.name);

      // Simular parsing progresso
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 30));
        self.postMessage({
          type: 'progress',
          progress: i,
        } as GLBWorkerMessage);
      }

      // Em produção, usar GLTFLoader para parsing real
      const result = {
        id: `glb_${Date.now()}`,
        name: file.name,
        size: file.size,
        scenes: [],
        meshes: [],
        materials: [],
        animations: [],
        metadata: {
          version: '2.0',
          generator: 'Unknown',
        },
      };

      self.postMessage({
        type: 'complete',
        data: result,
      } as GLBWorkerMessage);

      console.log('[GLB Worker] GLB parsing completed:', file.name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[GLB Worker] Parsing error:', errorMessage);

      self.postMessage({
        type: 'error',
        error: errorMessage,
      } as GLBWorkerMessage);
    }
  }
};

export default null;
