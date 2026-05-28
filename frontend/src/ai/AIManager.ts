/**
 * AIManager - Gerenciador de IA
 * Foundation para NPCs adaptativos e ML
 * 
 * Features:
 * - Feature extraction
 * - Behavior tree management
 * - Predictive loading
 * - Simple ML foundation
 * 
 * Preparado para TensorFlow.js integration
 */
export class AIManager {
  private static instance: AIManager;
  
  private isEnabled: boolean = false;
  private features: Map<string, number[][]> = new Map();
  
  // Configurações
  private readonly FEATURE_HISTORY_SIZE = 100;
  
  private constructor() {
    console.log('AI Manager initialized');
  }
  
  /**
   * Retorna instância singleton
   */
  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }
  
  /**
   * Habilita AI
   */
  public enable(): void {
    this.isEnabled = true;
    console.log('AI Manager enabled');
  }
  
  /**
   * Desabilita AI
   */
  public disable(): void {
    this.isEnabled = false;
    console.log('AI Manager disabled');
  }
  
  /**
   * Extrai features do player
   */
  public extractPlayerFeatures(context: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    timestamp: number;
  }): number[] {
    const features = [
      context.position.x,
      context.position.y,
      context.position.z,
      context.rotation.x,
      context.rotation.y,
      context.rotation.z,
      context.velocity.x,
      context.velocity.y,
      context.velocity.z,
      context.timestamp
    ];
    
    // Armazena histórico
    const history = this.features.get('player') || [];
    history.push(features);
    
    if (history.length > this.FEATURE_HISTORY_SIZE) {
      history.shift();
    }
    
    this.features.set('player', history);
    
    return features;
  }
  
  /**
   * Prediz próxima ação do player (simplified)
   */
  public predictNextAction(): string {
    const history = this.features.get('player');
    
    if (!history || history.length < 10) {
      return 'idle';
    }
    
    // Análise simples de movimento
    const recent = history.slice(-10);
    
    // Calcula velocidade média
    let avgVelocity = 0;
    for (const features of recent) {
      const vx = features[6];
      const vy = features[7];
      const vz = features[8];
      avgVelocity += Math.sqrt(vx * vx + vy * vy + vz * vz);
    }
    avgVelocity /= recent.length;
    
    // Predição simples
    if (avgVelocity > 5) {
      return 'running';
    } else if (avgVelocity > 1) {
      return 'walking';
    } else {
      return 'idle';
    }
  }
  
  /**
   * Prediz assets a carregar (predictive loading)
   */
  public predictAssetsToLoad(): string[] {
    const action = this.predictNextAction();
    const assets: string[] = [];
    
    // Baseado na ação, sugere assets
    switch (action) {
      case 'running':
        assets.push('running_animation', 'footstep_sound');
        break;
      case 'walking':
        assets.push('walking_animation');
        break;
      default:
        assets.push('idle_animation');
    }
    
    return assets;
  }
  
  /**
   * Atualiza AI (chamado a cada frame)
   */
  public update(_delta: number): void {
    if (!this.isEnabled) return;
    
    // Em produção, executar behavior trees dos NPCs aqui
  }
  
  /**
   * Retorna features armazenadas
   */
  public getFeatures(key: string): number[][] | undefined {
    return this.features.get(key);
  }
  
  /**
   * Limpa histórico de features
   */
  public clearFeatures(): void {
    this.features.clear();
    console.log('Features cleared');
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    enabled: boolean;
    featureKeys: string[];
    totalFeatures: number;
  } {
    let total = 0;
    this.features.forEach((history) => {
      total += history.length;
    });
    
    return {
      enabled: this.isEnabled,
      featureKeys: Array.from(this.features.keys()),
      totalFeatures: total
    };
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    console.log('AI Manager Stats:');
    console.log(`   Enabled: ${stats.enabled}`);
    console.log(`   Feature Keys: ${stats.featureKeys.join(', ')}`);
    console.log(`   Total Features: ${stats.totalFeatures}`);
  }
}

// Exporta instância global
export const aiManager = AIManager.getInstance();
