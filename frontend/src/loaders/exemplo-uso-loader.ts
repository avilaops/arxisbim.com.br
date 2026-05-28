/**
 * 🚀 EXEMPLO RÁPIDO - Como usar o IFC Loader Otimizado
 * 
 * Este arquivo mostra como integrar o loader otimizado no seu código
 */

import * as THREE from 'three';
import { IFCOptimizedLoader } from './loaders/IFCOptimizedLoader';
import { LODSystem } from './systems/LODSystem';
import { EntityManager } from './engine/ecs';
import { LoadingOverlay } from './ui/LoadingOverlay';

/**
 * EXEMPLO 1: Setup Básico
 */
export async function exemploBasico(
  scene: THREE.Scene,
  camera: THREE.Camera,
  file: File
) {
  console.log('📦 Exemplo 1: Carregamento básico');

  // 1. Criar sistemas necessários
  const entityManager = new EntityManager();
  const lodSystem = new LODSystem(camera, entityManager);

  // 2. Criar loader otimizado
  const loader = new IFCOptimizedLoader(
    scene,
    camera,
    lodSystem,
    entityManager
  );

  // 3. Criar UI de loading (opcional)
  const loadingUI = new LoadingOverlay();

  // 4. Carregar arquivo
  try {
    console.log('⏳ Carregando...');
    await loader.loadOptimized(file);
    console.log('✅ Sucesso!');

    // 5. Ver estatísticas
    const stats = loader.getStats();
    console.log('📊 Estatísticas:', stats);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * EXEMPLO 2: Com Eventos Customizados
 */
export async function exemploComEventos(
  scene: THREE.Scene,
  camera: THREE.Camera,
  file: File
) {
  console.log('📦 Exemplo 2: Com eventos customizados');

  const entityManager = new EntityManager();
  const lodSystem = new LODSystem(camera, entityManager);
  const loader = new IFCOptimizedLoader(scene, camera, lodSystem, entityManager);

  // Importar event bus
  const { eventBus, EventType } = await import('./core');

  // Escutar progresso
  eventBus.on(EventType.MODEL_LOAD_PROGRESS, (data: any) => {
    console.log(`📈 Progresso: ${data.progress}%`);
    
    if (data.loadedElements !== undefined) {
      console.log(`   Elementos: ${data.loadedElements}/${data.totalElements}`);
    }
  });

  // Escutar conclusão
  eventBus.on(EventType.MODEL_LOADED, () => {
    console.log('🎉 Modelo carregado com sucesso!');
    
    const stats = loader.getStats();
    console.log(`💾 Memória economizada: ${stats.instancing.memorySavedMB} MB`);
    console.log(`🎯 Draw calls economizados: ${stats.instancing.drawCallsSaved}`);
  });

  // Carregar
  await loader.loadOptimized(file);
}

/**
 * EXEMPLO 3: Com Configuração Customizada
 */
export async function exemploCustomizado(
  scene: THREE.Scene,
  camera: THREE.Camera,
  file: File
) {
  console.log('📦 Exemplo 3: Configuração customizada');

  const entityManager = new EntityManager();
  const lodSystem = new LODSystem(camera, entityManager);
  const loader = new IFCOptimizedLoader(scene, camera, lodSystem, entityManager);

  // Ajustar configurações (editar IFCOptimizedLoader.ts)
  // this.config.chunkSize = 50;  // Chunks menores
  // this.config.lodDistances = [0, 30, 100, 300];  // LOD mais agressivo

  await loader.loadOptimized(file);
}

/**
 * EXEMPLO 4: Carregamento de Input File
 */
export function exemploComInputFile() {
  console.log('📦 Exemplo 4: Com input file');

  // HTML: <input type="file" id="ifc-file" accept=".ifc" />
  const input = document.getElementById('ifc-file') as HTMLInputElement;

  input.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    console.log(`📂 Arquivo selecionado: ${file.name}`);

    // Obter referências do seu app
    const { scene, camera, entityManager, lodSystem } = getAppReferences();

    // Criar loader
    const loader = new IFCOptimizedLoader(scene, camera, lodSystem, entityManager);

    // Carregar
    try {
      await loader.loadOptimized(file);
      console.log('✅ Arquivo carregado!');
    } catch (error) {
      console.error('❌ Erro ao carregar:', error);
    }
  });
}

/**
 * EXEMPLO 5: Drag & Drop
 */
export function exemploDragDrop() {
  console.log('📦 Exemplo 5: Drag & Drop');

  const dropZone = document.getElementById('drop-zone')!;

  // Prevenir comportamento padrão
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  // Processar arquivo dropado
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const file = e.dataTransfer?.files[0];
    if (!file || !file.name.endsWith('.ifc')) {
      alert('Por favor, arraste um arquivo IFC');
      return;
    }

    console.log(`📂 Arquivo dropado: ${file.name}`);

    // Carregar
    const { scene, camera, entityManager, lodSystem } = getAppReferences();
    const loader = new IFCOptimizedLoader(scene, camera, lodSystem, entityManager);

    try {
      await loader.loadOptimized(file);
      console.log('✅ Sucesso!');
    } catch (error) {
      console.error('❌ Erro:', error);
      alert(`Erro ao carregar: ${error}`);
    }
  });
}

/**
 * EXEMPLO 6: Com Progress Bar
 */
export async function exemploComProgressBar(
  scene: THREE.Scene,
  camera: THREE.Camera,
  file: File
) {
  console.log('📦 Exemplo 6: Com progress bar');

  // HTML: <progress id="progress" value="0" max="100"></progress>
  const progressBar = document.getElementById('progress') as HTMLProgressElement;

  const entityManager = new EntityManager();
  const lodSystem = new LODSystem(camera, entityManager);
  const loader = new IFCOptimizedLoader(scene, camera, lodSystem, entityManager);

  // Escutar progresso
  const { eventBus, EventType } = await import('./core');

  eventBus.on(EventType.MODEL_LOAD_PROGRESS, (data: any) => {
    progressBar.value = data.progress;
    progressBar.textContent = `${Math.round(data.progress)}%`;
  });

  await loader.loadOptimized(file);
  progressBar.value = 100;
}

/**
 * EXEMPLO 7: Com Tratamento de Erros Completo
 */
export async function exemploComErros(
  scene: THREE.Scene,
  camera: THREE.Camera,
  file: File
) {
  console.log('📦 Exemplo 7: Tratamento de erros');

  const entityManager = new EntityManager();
  const lodSystem = new LODSystem(camera, entityManager);
  const loader = new IFCOptimizedLoader(scene, camera, lodSystem, entityManager);

  try {
    // Validar arquivo
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      throw new Error('Arquivo deve ter extensão .ifc');
    }

    if (file.size > 500 * 1024 * 1024) { // 500 MB
      console.warn('⚠️ Arquivo muito grande (> 500 MB), pode demorar...');
    }

    // Carregar
    console.log('⏳ Carregando...');
    await loader.loadOptimized(file);
    console.log('✅ Carregado com sucesso!');

    // Verificar se tem elementos
    const stats = loader.getStats();
    if (stats.loading.totalElements === 0) {
      console.warn('⚠️ Nenhum elemento encontrado no arquivo!');
    }

  } catch (error: any) {
    // Tratamento de erro específico
    if (error.message.includes('WASM')) {
      console.error('❌ Erro ao carregar WASM. Verifique se os arquivos estão em /wasm/');
    } else if (error.message.includes('memory')) {
      console.error('❌ Memória insuficiente. Tente um arquivo menor.');
    } else {
      console.error('❌ Erro desconhecido:', error);
    }

    // Mostrar para usuário
    alert(`Erro ao carregar IFC: ${error.message}`);
  }
}

/**
 * EXEMPLO 8: Carregando Múltiplos Arquivos
 */
export async function exemploMultiplosArquivos(
  scene: THREE.Scene,
  camera: THREE.Camera,
  files: File[]
) {
  console.log('📦 Exemplo 8: Múltiplos arquivos');

  const entityManager = new EntityManager();
  const lodSystem = new LODSystem(camera, entityManager);

  // Carregar em sequência
  for (const file of files) {
    console.log(`📂 Carregando ${file.name}...`);
    
    const loader = new IFCOptimizedLoader(scene, camera, lodSystem, entityManager);
    
    try {
      await loader.loadOptimized(file);
      console.log(`✅ ${file.name} carregado!`);
    } catch (error) {
      console.error(`❌ Erro em ${file.name}:`, error);
      continue; // Pular para próximo
    }
  }

  console.log('🎉 Todos os arquivos processados!');
}

/**
 * Helper: Obter referências do app
 * (Adaptar para sua estrutura específica)
 */
function getAppReferences() {
  // Exemplo - ajustar para seu código
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
  const entityManager = new EntityManager();
  const lodSystem = new LODSystem(camera, entityManager);

  return { scene, camera, entityManager, lodSystem };
}

/**
 * COMO USAR ESTE ARQUIVO:
 * 
 * 1. Importe a função que você precisa:
 *    import { exemploBasico } from './exemplo-uso-loader';
 * 
 * 2. Chame com seus parâmetros:
 *    await exemploBasico(scene, camera, file);
 * 
 * 3. Adapte o código para suas necessidades específicas
 */

// Export padrão com todos os exemplos
export default {
  exemploBasico,
  exemploComEventos,
  exemploCustomizado,
  exemploComInputFile,
  exemploDragDrop,
  exemploComProgressBar,
  exemploComErros,
  exemploMultiplosArquivos
};
