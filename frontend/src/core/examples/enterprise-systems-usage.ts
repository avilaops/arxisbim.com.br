/**
 * Enterprise Systems Usage Examples
 * Demonstra como usar os sistemas de nível mundial implementados
 */

import {
  // Performance Monitoring
  performanceMonitor,
  
  // Feature Flags
  featureFlags,
  useFeatureFlag,
  
  // Component Registry
  componentRegistry,
  Component,
  
  // Analytics
  analytics,
  ConsoleAnalyticsProvider,
  LocalStorageAnalyticsProvider
} from '@/core';

/**
 * EXEMPLO 1: Performance Monitoring
 */
export function setupPerformanceMonitoring() {
  // Inicializa o monitor
  performanceMonitor.start();
  
  // Define thresholds customizados
  performanceMonitor.setThresholds({
    minFps: 30,
    maxMemoryMB: 1024,
    maxDrawCalls: 2000
  });
  
  // Registra callback para warnings
  performanceMonitor.onWarning((warning) => {
    console.warn('Performance Warning:', warning);
    
    // Poderia notificar usuário ou enviar para analytics
    analytics.track('performance_warning', {
      metric: warning.metric,
      value: warning.value,
      threshold: warning.threshold
    });
  });
  
  // Obtém stats em tempo real
  const stats = performanceMonitor.getStats();
  console.log('Current Performance:', stats);
  
  // Export para análise
  const report = performanceMonitor.export();
  console.log('Performance Report:', report);
}

/**
 * EXEMPLO 2: Feature Flags
 */
export function setupFeatureFlags() {
  // Inicializa com configuração
  featureFlags.initialize({
    userId: 'user_123',
    userSegments: ['beta', 'premium'],
    enableLogging: true
  });
  
  // Verifica se feature está habilitada
  if (featureFlags.isEnabled('bim.4d-planning')) {
    console.log('BIM 4D Planning enabled!');
  }
  
  // Usa feature flag como hook
  const hasVRSupport = useFeatureFlag('vr.enabled');
  if (hasVRSupport) {
    // Inicializar VR
  }
  
  // Override para testes
  featureFlags.setOverride('experimental.webgpu', true);
  
  // Listener para mudanças
  const unsubscribe = featureFlags.onChange('ui.dark-mode', (value) => {
    console.log('Dark mode changed:', value);
    // Atualizar UI
  });
  
  // Avaliar flag com detalhes
  const evaluation = featureFlags.evaluate('multiplayer.voice-chat');
  console.log('Flag evaluation:', evaluation);
  
  // Cleanup
  // unsubscribe();
}

/**
 * EXEMPLO 3: Component Registry
 */

// Define componente com decorator
@Component({
  name: 'DatabaseService',
  lifecycle: 'singleton',
  tags: ['database', 'service']
})
class DatabaseService {
  connect() {
    console.log('Database connected');
  }
}

// Componente com dependências
@Component({
  name: 'UserRepository',
  lifecycle: 'singleton',
  dependencies: ['DatabaseService'],
  tags: ['repository']
})
class UserRepository {
  constructor(private db: DatabaseService) {}
  
  findAll() {
    this.db.connect();
    console.log('Finding users...');
  }
}

export function setupComponentRegistry() {
  // Registro manual
  componentRegistry.register('Logger', class Logger {
    log(msg: string) {
      console.log(`[LOG] ${msg}`);
    }
  });
  
  // Registro com factory
  componentRegistry.registerFactory('Config', () => {
    return {
      apiUrl: 'https://api.example.com',
      timeout: 5000
    };
  });
  
  // Registro de instância
  const cache = new Map();
  componentRegistry.registerInstance('Cache', cache);
  
  // Resolve componente
  const db = componentRegistry.resolve<DatabaseService>('DatabaseService');
  db.connect();
  
  // Resolve com dependências automáticas
  const userRepo = componentRegistry.resolve<UserRepository>('UserRepository');
  userRepo.findAll();
  
  // Valida dependências (detecta ciclos)
  const validation = componentRegistry.validateDependencies();
  if (!validation.valid) {
    console.error('Dependency errors:', validation.errors);
  }
  
  // Scoped instances
  componentRegistry.createScope('request-1');
  const scopedService = componentRegistry.resolve('SomeService', 'request-1');
  componentRegistry.destroyScope('request-1');
  
  // Debug
  console.log('Registry export:', componentRegistry.export());
}

/**
 * EXEMPLO 4: Analytics
 */
export function setupAnalytics() {
  // Adiciona providers
  analytics.addProvider(new ConsoleAnalyticsProvider());
  analytics.addProvider(new LocalStorageAnalyticsProvider());
  
  // Inicializa
  analytics.initialize({
    enabled: true,
    debug: true,
    trackPageViews: true,
    trackErrors: true,
    trackPerformance: true,
    samplingRate: 1.0 // 100% dos eventos
  });
  
  // Identifica usuário
  analytics.identify('user_123', {
    name: 'John Doe',
    email: 'john@example.com',
    plan: 'premium'
  });
  
  // Track events
  analytics.track('button_clicked', {
    buttonId: 'save-project',
    location: 'toolbar'
  });
  
  // Track page view
  analytics.page('/projects/123', {
    projectName: 'My Project'
  });
  
  // Track user action
  analytics.trackAction('click', 'save-button');
  
  // Track feature usage
  analytics.trackFeature('bim-viewer', {
    modelSize: '25MB',
    loadTime: 1234
  });
  
  // Track error
  try {
    throw new Error('Something went wrong');
  } catch (error) {
    analytics.trackError(error as Error, {
      component: 'ModelLoader'
    });
  }
  
  // Track performance
  analytics.trackPerformance('model_load_time', 1234, 'ms');
  
  // Timer
  const endTimer = analytics.startTimer('api_request');
  // ... fazer requisição
  endTimer(); // Automaticamente envia duração
  
  // Stats
  console.log('Analytics stats:', analytics.getStats());
}

/**
 * EXEMPLO 5: Integração Completa
 */
export function setupEnterpriseInfrastructure() {
  // 1. Inicializa Performance Monitoring
  performanceMonitor.start();
  
  // 2. Inicializa Feature Flags
  featureFlags.initialize({
    userId: 'user_123',
    userSegments: ['beta'],
    enableLogging: import.meta.env.DEV
  });
  
  // 3. Inicializa Analytics (se feature habilitada)
  if (featureFlags.isEnabled('analytics.enabled')) {
    analytics.initialize({
      enabled: true,
      debug: import.meta.env.DEV,
      providers: [
        new ConsoleAnalyticsProvider(),
        new LocalStorageAnalyticsProvider()
      ]
    });
    
    analytics.identify('user_123');
  }
  
  // 4. Setup Component Registry
  componentRegistry.setLogging(import.meta.env.DEV);
  
  // 5. Integra Performance Monitoring com Analytics
  performanceMonitor.onWarning((warning) => {
    analytics.track('performance_warning', warning);
  });
  
  // 6. Integra Feature Flags com Analytics
  featureFlags.onChange('experimental.webgpu', (enabled) => {
    analytics.trackFeature('webgpu', { enabled });
  });
  
  console.log('Enterprise infrastructure initialized!');
}

/**
 * EXEMPLO 6: Uso em Componente Real
 */
export class BIMViewer {
  private perfMonitor = performanceMonitor;
  
  async loadModel(url: string) {
    // Check feature flag
    const useOptimizedLoader = useFeatureFlag('performance.lod-system');
    
    // Track timing
    const endTimer = analytics.startTimer('model_load');
    
    try {
      // Carrega modelo
      if (useOptimizedLoader) {
        // Usar loader otimizado
      }
      
      // Success
      analytics.track('model_loaded', {
        url,
        optimized: useOptimizedLoader
      });
      
    } catch (error) {
      // Error
      analytics.trackError(error as Error, {
        url,
        component: 'BIMViewer'
      });
      
    } finally {
      endTimer();
    }
  }
  
  update() {
    // Atualiza performance monitor
    this.perfMonitor.update();
    
    // Check performance
    const stats = this.perfMonitor.getStats();
    if (stats.current.fps < 30) {
      // Degradar qualidade
      analytics.track('quality_degraded', {
        fps: stats.current.fps
      });
    }
  }
}

/**
 * EXEMPLO 7: A/B Testing com Feature Flags
 */
export function abTestExample() {
  // Flag com rollout de 50%
  const useNewUI = featureFlags.isEnabled('ui.new-layout');
  
  if (useNewUI) {
    // Versão A
    analytics.track('ab_test_variant', { variant: 'new_layout' });
  } else {
    // Versão B
    analytics.track('ab_test_variant', { variant: 'old_layout' });
  }
}

/**
 * EXEMPLO 8: Kill Switch
 */
export function killSwitchExample() {
  // Se multiplayer estiver com problemas, desabilita via feature flag
  if (featureFlags.isEnabled('multiplayer.enabled')) {
    // Inicializar multiplayer
  } else {
    console.log('Multiplayer disabled via feature flag');
  }
}
