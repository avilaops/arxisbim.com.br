/// <reference lib="webworker" />

/**
 * IFC Streaming Worker - Processamento paralelo de arquivos IFC
 * Executa análise e carregamento de chunks em background
 */

interface IFCChunk {
  id: string;
  entities: string[];
  boundingBox: any;
  priority: number;
  loaded: boolean;
  data?: any;
}

interface StreamJob {
  id: string;
  type: 'ifc_analysis' | 'chunk_load' | 'geometry_process';
  file?: File;
  priority: number;
  status: string;
  camera?: any;
  chunks?: IFCChunk[];
  loadedChunks?: Set<string>;
  chunk?: IFCChunk;
  parentJobId?: string;
}

// Cache interno do worker
const geometryCache = new Map<string, any>();
const materialCache = new Map<string, any>();

/**
 * Processa mensagens do thread principal
 */
self.onmessage = async (event: MessageEvent) => {
  const { type, job } = event.data;

  try {
    switch (type) {
      case 'process_job':
        await processJob(job);
        break;
      case 'cancel_job':
        cancelJob(job.id);
        break;
      case 'clear_cache':
        clearCache();
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      jobId: job?.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Processa um job de streaming
 */
async function processJob(job: StreamJob): Promise<void> {
  console.log(`🔄 Worker processando job: ${job.id} (${job.type})`);

  switch (job.type) {
    case 'ifc_analysis':
      await processIFCAnalysis(job);
      break;
    case 'chunk_load':
      await processChunkLoad(job);
      break;
    case 'geometry_process':
      await processGeometry(job);
      break;
  }
}

/**
 * Processa análise inicial do arquivo IFC
 */
async function processIFCAnalysis(job: StreamJob): Promise<void> {
  if (!job.file) {
    throw new Error('Arquivo IFC não fornecido para análise');
  }

  console.log(`📊 Iniciando análise IFC: ${job.file.name}`);

  try {
    // Simula análise do arquivo IFC
    // Em produção, isso usaria web-ifc para analisar o arquivo
    const analysis = await analyzeIFCFile(job.file);

    self.postMessage({
      type: 'analysis_complete',
      jobId: job.id,
      result: analysis
    });

  } catch (error) {
    throw new Error(`Falha na análise IFC: ${error}`);
  }
}

/**
 * Análise simulada do arquivo IFC
 * Em produção, isso seria feito com web-ifc
 */
async function analyzeIFCFile(file: File): Promise<any> {
  // Simula processamento do arquivo
  await delay(100); // Simula tempo de análise

  // Análise simulada baseada no tamanho do arquivo
  const fileSizeMB = file.size / (1024 * 1024);
  const estimatedEntities = Math.max(100, Math.floor(fileSizeMB * 200)); // ~200 entidades por MB

  // Cria árvore espacial simulada
  const spatialTree = createSpatialTree(estimatedEntities);

  // Estatísticas por tipo
  const entitiesByType = new Map([
    ['WALL', Math.floor(estimatedEntities * 0.3)],
    ['SLAB', Math.floor(estimatedEntities * 0.2)],
    ['BEAM', Math.floor(estimatedEntities * 0.15)],
    ['COLUMN', Math.floor(estimatedEntities * 0.1)],
    ['DOOR', Math.floor(estimatedEntities * 0.05)],
    ['WINDOW', Math.floor(estimatedEntities * 0.05)],
    ['OTHER', Math.floor(estimatedEntities * 0.15)]
  ]);

  // Bounding box estimada
  const boundingBox = {
    min: { x: -50, y: -50, z: 0 },
    max: { x: 50, y: 50, z: 20 }
  };

  return {
    totalEntities: estimatedEntities,
    boundingBox,
    entitiesByType: Array.from(entitiesByType.entries()),
    spatialTree,
    fileSize: file.size,
    analysisTime: Date.now()
  };
}

/**
 * Cria árvore espacial simulada para dividir o modelo
 */
function createSpatialTree(totalEntities: number): any {
  const nodes: any[] = [];
  const chunkSize = 50; // entidades por chunk
  const chunks = Math.ceil(totalEntities / chunkSize);

  for (let i = 0; i < chunks; i++) {
    const node = {
      id: `node-${i}`,
      boundingBox: {
        min: {
          x: -50 + (i % 5) * 20,
          y: -50 + Math.floor(i / 5) * 20,
          z: 0
        },
        max: {
          x: -30 + (i % 5) * 20,
          y: -30 + Math.floor(i / 5) * 20,
          z: 20
        }
      },
      entities: Array.from({ length: Math.min(chunkSize, totalEntities - i * chunkSize) },
        (_, j) => `entity-${i * chunkSize + j}`),
      level: 0,
      children: []
    };

    nodes.push(node);
  }

  return {
    nodes,
    depth: 1,
    totalNodes: nodes.length
  };
}

/**
 * Processa carregamento de um chunk
 */
async function processChunkLoad(job: StreamJob): Promise<void> {
  if (!job.chunk) {
    throw new Error('Chunk não fornecido para carregamento');
  }

  const { chunk } = job;
  console.log(`📦 Carregando chunk: ${chunk.id} (${chunk.entities.length} entidades)`);

  try {
    // Simula carregamento das entidades do chunk
    const entities = await loadChunkEntities(chunk);
    const geometries = await generateChunkGeometries(chunk);
    const materials = await generateChunkMaterials(chunk);

    self.postMessage({
      type: 'chunk_loaded',
      jobId: job.id,
      result: {
        chunkId: chunk.id,
        entities,
        geometries,
        materials,
        loadTime: Date.now()
      }
    });

  } catch (error) {
    throw new Error(`Falha no carregamento do chunk ${chunk.id}: ${error}`);
  }
}

/**
 * Carrega entidades de um chunk
 */
async function loadChunkEntities(chunk: IFCChunk): Promise<any[]> {
  const entities: any[] = [];

  for (const entityId of chunk.entities) {
    // Simula criação de entidade
    const entity = {
      id: entityId,
      type: getRandomIFCType(),
      transform: {
        position: {
          x: (Math.random() - 0.5) * 100,
          y: (Math.random() - 0.5) * 100,
          z: Math.random() * 20
        },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      mesh: {
        geometryId: `${chunk.id}-geom-${entityId}`,
        materialId: `${chunk.id}-mat-${entityId}`
      },
      lod: {
        minDistance: 10,
        maxDistance: 1000
      }
    };

    entities.push(entity);

    // Pequena pausa para simular processamento
    await delay(1);
  }

  return entities;
}

/**
 * Gera geometrias para um chunk
 */
async function generateChunkGeometries(chunk: IFCChunk): Promise<any[]> {
  const geometries: any[] = [];

  // Gera geometrias únicas por tipo
  const uniqueTypes = [...new Set(chunk.entities.map(id => getRandomIFCType()))];

  for (const type of uniqueTypes) {
    const geometry = generateGeometryForType(type);
    geometries.push(geometry);

    // Cache da geometria
    geometryCache.set(`${chunk.id}-geom-${type}`, geometry);
  }

  return geometries;
}

/**
 * Gera materiais para um chunk
 */
async function generateChunkMaterials(chunk: IFCChunk): Promise<any[]> {
  const materials: any[] = [];

  // Materiais por tipo IFC
  const typeMaterials = {
    'WALL': { color: 0xcccccc, roughness: 0.8, metalness: 0.1 },
    'SLAB': { color: 0x888888, roughness: 0.9, metalness: 0.0 },
    'BEAM': { color: 0x666666, roughness: 0.7, metalness: 0.2 },
    'COLUMN': { color: 0x444444, roughness: 0.6, metalness: 0.3 },
    'DOOR': { color: 0x8B4513, roughness: 0.8, metalness: 0.0 },
    'WINDOW': { color: 0x87CEEB, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.7 },
    'OTHER': { color: 0x999999, roughness: 0.8, metalness: 0.1 }
  };

  for (const [type, materialProps] of Object.entries(typeMaterials)) {
    const material = {
      id: `${chunk.id}-mat-${type}`,
      ...materialProps
    };

    materials.push(material);

    // Cache do material
    materialCache.set(material.id, material);
  }

  return materials;
}

/**
 * Gera geometria baseada no tipo IFC
 */
function generateGeometryForType(type: string): any {
  let geometry: any;

  switch (type) {
    case 'WALL':
      // Parede retangular
      geometry = {
        type: 'box',
        width: 0.3,
        height: 3.0,
        depth: 4.0
      };
      break;

    case 'SLAB':
      // Laje plana
      geometry = {
        type: 'box',
        width: 4.0,
        height: 0.2,
        depth: 4.0
      };
      break;

    case 'BEAM':
      // Viga retangular
      geometry = {
        type: 'box',
        width: 0.3,
        height: 0.6,
        depth: 4.0
      };
      break;

    case 'COLUMN':
      // Pilar quadrado
      geometry = {
        type: 'box',
        width: 0.4,
        height: 3.0,
        depth: 0.4
      };
      break;

    case 'DOOR':
      // Porta retangular
      geometry = {
        type: 'box',
        width: 0.1,
        height: 2.1,
        depth: 0.9
      };
      break;

    case 'WINDOW':
      // Janela plana
      geometry = {
        type: 'plane',
        width: 1.2,
        height: 1.5
      };
      break;

    default:
      // Geometria genérica
      geometry = {
        type: 'box',
        width: 1.0,
        height: 1.0,
        depth: 1.0
      };
  }

  return {
    id: `geom-${type}-${Date.now()}`,
    type: geometry.type,
    parameters: geometry,
    attributes: generateGeometryAttributes(geometry),
    timestamp: Date.now()
  };
}

/**
 * Gera atributos de geometria (vértices, normais, etc.)
 */
function generateGeometryAttributes(geometry: any): any {
  // Simulação de atributos de geometria Three.js
  // Em produção, isso seria gerado pelo web-ifc ou calculado

  switch (geometry.type) {
    case 'box':
      return {
        position: {
          array: new Float32Array([
            // Vértices de um cubo (simplificado)
            -geometry.width/2, -geometry.height/2, geometry.depth/2,
             geometry.width/2, -geometry.height/2, geometry.depth/2,
             geometry.width/2,  geometry.height/2, geometry.depth/2,
            -geometry.width/2,  geometry.height/2, geometry.depth/2,
            -geometry.width/2, -geometry.height/2, -geometry.depth/2,
             geometry.width/2, -geometry.height/2, -geometry.depth/2,
             geometry.width/2,  geometry.height/2, -geometry.depth/2,
            -geometry.width/2,  geometry.height/2, -geometry.depth/2
          ]),
          itemSize: 3
        },
        normal: {
          array: new Float32Array([
            // Normais (simplificado)
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0
          ]),
          itemSize: 3
        }
      };

    case 'plane':
      return {
        position: {
          array: new Float32Array([
            -geometry.width/2, -geometry.height/2, 0,
             geometry.width/2, -geometry.height/2, 0,
             geometry.width/2,  geometry.height/2, 0,
            -geometry.width/2,  geometry.height/2, 0
          ]),
          itemSize: 3
        },
        normal: {
          array: new Float32Array([
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1
          ]),
          itemSize: 3
        }
      };

    default:
      return {};
  }
}

/**
 * Retorna tipo IFC aleatório para simulação
 */
function getRandomIFCType(): string {
  const types = ['WALL', 'SLAB', 'BEAM', 'COLUMN', 'DOOR', 'WINDOW', 'OTHER'];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Processa geometria adicional
 */
async function processGeometry(job: StreamJob): Promise<void> {
  // Implementação futura para processamento avançado de geometria
  console.log(`🔺 Processando geometria: ${job.id}`);
}

/**
 * Cancela um job em andamento
 */
function cancelJob(jobId: string): void {
  console.log(`🛑 Cancelando job: ${jobId}`);
  // Implementação de cancelamento
}

/**
 * Limpa cache do worker
 */
function clearCache(): void {
  geometryCache.clear();
  materialCache.clear();
  console.log('🧹 Cache do worker limpo');
}

/**
 * Utilitário de delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log de inicialização
console.log('🚀 IFC Streaming Worker inicializado');