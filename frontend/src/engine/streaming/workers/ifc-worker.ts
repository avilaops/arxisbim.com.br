/**
 * IFC Worker - Processamento assíncrono de arquivos IFC
 * Executa parsing IFC em Web Worker para não bloquear a thread principal
 */

// Import web-ifc types (worker context)
declare const self: DedicatedWorkerGlobalScope;

interface IFCWorkerMessage {
  type: 'parse' | 'progress' | 'error' | 'complete';
  data?: any;
  id?: string;
}

self.onmessage = async (event: MessageEvent<IFCWorkerMessage>) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'parse':
        await handleParseIFC(data, id);
        break;
      default:
        self.postMessage({ type: 'error', error: 'Unknown message type', id });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message, id });
  }
};

async function handleParseIFC(data: ArrayBuffer, id: string) {
  // Import web-ifc dynamically in worker
  const { IFCLoader } = await import('web-ifc-three');

  self.postMessage({ type: 'progress', progress: 0.1, message: 'Initializing IFC loader', id });

  const loader = new IFCLoader();
  loader.ifcManager.setWasmPath('https://cdn.jsdelivr.net/npm/web-ifc@0.0.52/');

  self.postMessage({ type: 'progress', progress: 0.3, message: 'Parsing IFC data', id });

  // Create blob URL for the data
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const model = await loader.loadAsync(url);

  self.postMessage({ type: 'progress', progress: 0.8, message: 'Processing geometry', id });

  // Extract geometry data
  const geometryData = extractGeometryData(model);

  URL.revokeObjectURL(url);

  self.postMessage({
    type: 'complete',
    data: geometryData,
    id
  });
}

function extractGeometryData(model: any) {
  const geometries: any[] = [];

  model.traverse((child: any) => {
    if (child.isMesh && child.geometry) {
      geometries.push({
        expressID: child.userData?.expressID,
        position: child.geometry.attributes.position?.array,
        normal: child.geometry.attributes.normal?.array,
        index: child.geometry.index?.array,
        matrix: child.matrix.toArray(),
        material: {
          color: child.material?.color?.getHex(),
          transparent: child.material?.transparent,
          opacity: child.material?.opacity
        }
      });
    }
  });

  return geometries;
}