/**
 * BIM 4D Integration Example
 * 
 * Exemplo completo de como integrar o sistema BIM 4D Schedule Visualization
 * ao ArxisVR.
 * 
 * Este arquivo demonstra:
 * - Carregamento de cronograma
 * - Configuração de timeline
 * - Integração com visualização 3D
 * - Controles de playback
 */

import { 
  ScheduleManager, 
  TimelineController, 
  VisibilityManager,
  type ScheduleData,
  type Timeline4DConfig 
} from './index';

/**
 * Classe de integração BIM 4D
 * 
 * Conecta ScheduleManager, TimelineController e VisibilityManager
 * para criar experiência completa de visualização temporal
 */
export class BIM4DIntegration {
  private scheduleManager: ScheduleManager;
  private timelineController: TimelineController | null = null;
  private visibilityManager: VisibilityManager;
  
  constructor() {
    this.scheduleManager = new ScheduleManager();
    this.visibilityManager = new VisibilityManager();
  }
  
  /**
   * Carrega cronograma e inicializa timeline
   */
  async loadSchedule(
    scheduleData: ScheduleData, 
    config: Timeline4DConfig = {}
  ): Promise<void> {
    // 1. Carregar cronograma
    await this.scheduleManager.loadSchedule(scheduleData);
    console.log(`Loaded schedule: ${scheduleData.projectName}`);
    console.log(`Tasks: ${scheduleData.tasks.length}`);
    
    // 2. Validar cronograma
    const validation = this.scheduleManager.validate();
    if (!validation.isValid) {
      console.error('Schedule validation failed:', validation.errors);
      throw new Error('Invalid schedule');
    }
    
    if (validation.warnings.length > 0) {
      console.warn('Schedule warnings:', validation.warnings);
    }
    
    // 3. Criar controller de timeline
    this.timelineController = new TimelineController(
      this.scheduleManager, 
      config
    );
    
    // 4. Setup event listeners (ANTES de aplicar estado inicial)
    this.setupEventListeners();
    
    console.log('BIM 4D system ready');
  }
  
  /**
   * Registra objetos Three.js do modelo IFC
   * 
   * @param guidObjectMap - Map de IFC GUID -> Three.js Object3D
   */
  registerIFCObjects(guidObjectMap: Map<string, any>): void {
    this.visibilityManager.registerObjects(guidObjectMap);
    console.log(`Registered ${guidObjectMap.size} IFC objects`);
  }
  
  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    // Quando cronograma carrega
    this.scheduleManager.on('schedule:loaded', (event) => {
      console.log(`Schedule loaded: ${event.taskCount} tasks, ${event.linkedElementsCount} elements`);
    });
    
    // Quando data da timeline muda (principal integração)
    if (this.timelineController) {
      this.timelineController.on('timeline:date-changed', (event) => {
        // Obter estado de visibilidade para esta data
        const visibilityState = this.scheduleManager.getVisibilityState(event.currentDate);
        
        // Aplicar aos objetos 3D
        this.visibilityManager.applyVisibilityState(visibilityState);
        
        // Log de debug
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `Timeline: ${event.currentDate.toLocaleDateString()} | ` +
            `Progress: ${event.progress.toFixed(1)}% | ` +
            `Active tasks: ${event.activeTasks.length}`
          );
        }
      });
      
      // Aplicar estado inicial de visibilidade
      const initialDate = this.timelineController.getCurrentDate();
      const initialState = this.scheduleManager.getVisibilityState(initialDate);
      this.visibilityManager.applyVisibilityState(initialState);
      
      // Outros eventos úteis
      this.timelineController.on('timeline:play', () => {
        console.log('Timeline playback started');
      });
      
      this.timelineController.on('timeline:pause', () => {
        console.log('Timeline playback paused');
      });
      
      this.timelineController.on('timeline:ended', () => {
        console.log('Timeline reached end');
      });
    }
  }
  
  /**
   * Controles de playback
   */
  play(): void {
    this.timelineController?.play();
  }
  
  pause(): void {
    this.timelineController?.pause();
  }
  
  seek(date: Date): void {
    this.timelineController?.seek(date);
    
    // Aplicar visibilidade imediatamente após seek
    if (this.timelineController) {
      const currentDate = this.timelineController.getCurrentDate();
      const state = this.scheduleManager.getVisibilityState(currentDate);
      this.visibilityManager.applyVisibilityState(state);
    }
  }
  
  setSpeed(multiplier: number): void {
    this.timelineController?.setSpeed(multiplier);
  }
  
  goToStart(): void {
    this.timelineController?.goToStart();
  }
  
  goToEnd(): void {
    this.timelineController?.goToEnd();
  }
  
  /**
   * Getters
   */
  getCurrentDate(): Date | null {
    return this.timelineController?.getCurrentDate() || null;
  }
  
  getProgress(): number {
    return this.timelineController?.getProgress() || 0;
  }
  
  isPlaying(): boolean {
    return this.timelineController?.getIsPlaying() || false;
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.timelineController?.dispose();
    this.timelineController = null;
    this.visibilityManager.dispose();
    this.scheduleManager.clear();
  }
}

// ============================================================================
// EXEMPLO DE USO
// ============================================================================

/**
 * Exemplo: Carregar cronograma de construção
 */
export async function example_loadAndPlay() {
  // 1. Criar integração
  const bim4d = new BIM4DIntegration();
  
  // 2. Preparar dados de cronograma (exemplo)
  const scheduleData: ScheduleData = {
    projectName: 'Residencial Heitor - Estrutura',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-06-30'),
    tasks: [
      {
        id: 'T001',
        name: 'Fundação',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-30'),
        duration: 30,
        predecessors: [],
        ifcGuids: ['2O0Mj3fI5DWwy9eKr7xQN1', '1A2B3C4D5E6F7G8H9I0J1K'],
        status: 'not-started'
      },
      {
        id: 'T002',
        name: 'Pilares Térreo',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-15'),
        duration: 15,
        predecessors: ['T001'],
        ifcGuids: ['3P1Nk4gJ6EXxz0fLs8yRO2', '2B3C4D5E6F7G8H9I0J1K2L'],
        status: 'not-started'
      },
      {
        id: 'T003',
        name: 'Laje 1º Pavimento',
        startDate: new Date('2026-02-16'),
        endDate: new Date('2026-03-15'),
        duration: 28,
        predecessors: ['T002'],
        ifcGuids: ['4Q2Om5hK7FYy1gMt9zSP3'],
        status: 'not-started'
      }
    ]
  };
  
  // 3. Carregar cronograma
  await bim4d.loadSchedule(scheduleData, {
    autoPlay: false,
    speed: 30, // 30x mais rápido (1 mês em 1 dia)
    transitionDuration: 500,
    loopEnabled: false
  });
  
  // 4. Registrar objetos IFC (simulado)
  const mockObjects = new Map();
  scheduleData.tasks.forEach(task => {
    task.ifcGuids.forEach(guid => {
      // Em produção, seria o objeto Three.js real
      mockObjects.set(guid, { visible: true, traverse: () => {} });
    });
  });
  bim4d.registerIFCObjects(mockObjects);
  
  // 5. Controles
  console.log('Starting playback...');
  bim4d.play();
  
  // Pausar após 5 segundos
  setTimeout(() => {
    bim4d.pause();
    console.log('Paused at:', bim4d.getCurrentDate());
    console.log('Progress:', bim4d.getProgress() + '%');
  }, 5000);
  
  return bim4d;
}

/**
 * Exemplo: Parser de CSV para ScheduleData
 */
export function parseCSVSchedule(csvContent: string): ScheduleData {
  const lines = csvContent.trim().split('\n');
  const header = lines[0].split(',');
  
  const tasks = lines.slice(1).map(line => {
    const values = line.split(',');
    
    return {
      id: values[0].trim(),
      name: values[1].trim(),
      startDate: new Date(values[2].trim()),
      endDate: new Date(values[3].trim()),
      duration: Math.ceil(
        (new Date(values[3]).getTime() - new Date(values[2]).getTime()) / 
        (1000 * 60 * 60 * 24)
      ),
      predecessors: values[5] ? values[5].split(';').map(s => s.trim()) : [],
      ifcGuids: values[4] ? values[4].split(';').map(s => s.trim()) : [],
      status: 'not-started' as const
    };
  });
  
  // Determinar datas do projeto
  const allDates = tasks.flatMap(t => [t.startDate, t.endDate]);
  const startDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const endDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  
  return {
    projectName: 'Imported Schedule',
    startDate,
    endDate,
    tasks
  };
}
