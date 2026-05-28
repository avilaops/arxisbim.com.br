/**
 * Geometry Worker - Processamento assíncrono de geometria 3D
 * Otimiza geometrias, calcula bounds, LOD, etc.
 */

declare const self: DedicatedWorkerGlobalScope;

interface GeometryWorkerMessage {
  type: 'process' | 'optimize' | 'progress' | 'error' | 'complete';
  data?: any;
  id?: string;
}

interface GeometryData {
  expressID?: number;
  position?: Float32Array;
  normal?: Float32Array;
  index?: Uint32Array;
  matrix?: number[];
  material?: any;
}

self.onmessage = async (event: MessageEvent<GeometryWorkerMessage>) => {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'process':
        await handleProcessGeometry(data, id);
        break;
      case 'optimize':
        await handleOptimizeGeometry(data, id);
        break;
      default:
        self.postMessage({ type: 'error', error: 'Unknown message type', id });
    }
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message, id });
  }
};

async function handleProcessGeometry(geometries: GeometryData[], id: string) {
  self.postMessage({ type: 'progress', progress: 0.2, message: 'Processing geometries', id });

  const processedGeometries = geometries.map(geom => {
    // Calculate bounds
    const bounds = calculateBounds(geom);

    // Calculate LOD levels
    const lodLevels = generateLODLevels(geom);

    return {
      ...geom,
      bounds,
      lodLevels,
      vertexCount: geom.position ? geom.position.length / 3 : 0,
      triangleCount: geom.index ? geom.index.length / 3 : 0
    };
  });

  self.postMessage({ type: 'progress', progress: 0.8, message: 'Finalizing', id });

  self.postMessage({
    type: 'complete',
    data: processedGeometries,
    id
  });
}

async function handleOptimizeGeometry(geometry: GeometryData, id: string) {
  self.postMessage({ type: 'progress', progress: 0.3, message: 'Optimizing geometry', id });

  // Weld vertices, remove duplicates, etc.
  const optimized = {
    ...geometry,
    // Placeholder for optimization logic
    optimized: true
  };

  self.postMessage({
    type: 'complete',
    data: optimized,
    id
  });
}

function calculateBounds(geom: GeometryData) {
  if (!geom.position) return null;

  const positions = geom.position;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i], y = positions[i + 1], z = positions[i + 2];
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [maxX - minX, maxY - minY, maxZ - minZ]
  };
}

function generateLODLevels(geom: GeometryData) {
  // Simple LOD generation - reduce vertex count
  const levels = [1.0, 0.5, 0.25]; // Full, half, quarter resolution

  return levels.map(level => ({
    level,
    vertexCount: Math.floor((geom.position?.length || 0) / 3 * level),
    // In real implementation, would decimate mesh
  }));
}