/**
 * HapticFeedback - Sistema de feedback háptico avançado
 * Padrões de vibração para diferentes interações
 * 
 * Features:
 * - Padrões pré-definidos (click, error, success, etc)
 * - Padrões customizados
 * - Intensidade ajustável
 * - Suporte a múltiplos actuators
 */
export class HapticFeedback {
  private session: XRSession | null = null;
  private enabled: boolean = true;
  
  // Padrões de vibração (intensity, duration em ms)
  private readonly PATTERNS = {
    click: [{ intensity: 0.3, duration: 20 }],
    doubleClick: [
      { intensity: 0.3, duration: 20 },
      { intensity: 0, duration: 50 },
      { intensity: 0.3, duration: 20 }
    ],
    error: [
      { intensity: 0.8, duration: 100 },
      { intensity: 0, duration: 50 },
      { intensity: 0.8, duration: 100 }
    ],
    success: [
      { intensity: 0.4, duration: 50 },
      { intensity: 0.6, duration: 50 },
      { intensity: 0.8, duration: 50 }
    ],
    selection: [{ intensity: 0.5, duration: 30 }],
    grab: [{ intensity: 0.6, duration: 50 }],
    release: [{ intensity: 0.3, duration: 30 }],
    collision: [{ intensity: 0.9, duration: 60 }],
    notification: [
      { intensity: 0.5, duration: 40 },
      { intensity: 0, duration: 30 },
      { intensity: 0.5, duration: 40 }
    ],
    heartbeat: [
      { intensity: 0.6, duration: 100 },
      { intensity: 0, duration: 200 },
      { intensity: 0.6, duration: 100 }
    ]
  };
  
  constructor() {
    console.log('📳 Haptic Feedback System initialized');
  }
  
  /**
   * Define sessão XR
   */
  public setSession(session: XRSession | null): void {
    this.session = session;
  }
  
  /**
   * Envia pulso háptico simples
   */
  public pulse(
    controllerId: 'controller1' | 'controller2',
    intensity: number = 1.0,
    duration: number = 100
  ): void {
    if (!this.enabled || !this.session) return;
    
    const index = controllerId === 'controller1' ? 0 : 1;
    const inputSource = this.session.inputSources[index];
    
    this.vibrate(inputSource, intensity, duration);
  }
  
  /**
   * Executa padrão de vibração
   */
  public playPattern(
    controllerId: 'controller1' | 'controller2',
    patternName: keyof typeof this.PATTERNS
  ): void {
    if (!this.enabled || !this.session) return;
    
    const pattern = this.PATTERNS[patternName];
    if (!pattern) {
      console.warn(`⚠️ Pattern not found: ${patternName}`);
      return;
    }
    
    const index = controllerId === 'controller1' ? 0 : 1;
    const inputSource = this.session.inputSources[index];
    
    this.executePattern(inputSource, pattern);
  }
  
  /**
   * Executa padrão customizado
   */
  public playCustomPattern(
    controllerId: 'controller1' | 'controller2',
    pattern: Array<{ intensity: number; duration: number }>
  ): void {
    if (!this.enabled || !this.session) return;
    
    const index = controllerId === 'controller1' ? 0 : 1;
    const inputSource = this.session.inputSources[index];
    
    this.executePattern(inputSource, pattern);
  }
  
  /**
   * Executa sequência de vibrações
   */
  private async executePattern(
    inputSource: XRInputSource,
    pattern: Array<{ intensity: number; duration: number }>
  ): Promise<void> {
    for (const step of pattern) {
      if (step.intensity > 0) {
        await this.vibrate(inputSource, step.intensity, step.duration);
      } else {
        await this.wait(step.duration);
      }
    }
  }
  
  /**
   * Vibração básica
   */
  private async vibrate(
    inputSource: XRInputSource,
    intensity: number,
    duration: number
  ): Promise<void> {
    if (!inputSource || !inputSource.gamepad || !inputSource.gamepad.hapticActuators) {
      return;
    }
    
    const actuator = inputSource.gamepad.hapticActuators[0];
    if (actuator) {
      try {
        await actuator.pulse(Math.min(1.0, intensity), duration);
      } catch (error) {
        console.warn('⚠️ Haptic pulse failed:', error);
      }
    }
  }
  
  /**
   * Aguarda tempo
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  /**
   * Vibração em ambos os controllers
   */
  public pulseBoth(intensity: number = 1.0, duration: number = 100): void {
    this.pulse('controller1', intensity, duration);
    this.pulse('controller2', intensity, duration);
  }
  
  /**
   * Padrão em ambos os controllers
   */
  public playPatternBoth(patternName: keyof typeof this.PATTERNS): void {
    this.playPattern('controller1', patternName);
    this.playPattern('controller2', patternName);
  }
  
  /**
   * Feedback de click
   */
  public click(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'click');
  }
  
  /**
   * Feedback de erro
   */
  public error(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'error');
  }
  
  /**
   * Feedback de sucesso
   */
  public success(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'success');
  }
  
  /**
   * Feedback de seleção
   */
  public selection(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'selection');
  }
  
  /**
   * Feedback de segurar objeto
   */
  public grab(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'grab');
  }
  
  /**
   * Feedback de soltar objeto
   */
  public release(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'release');
  }
  
  /**
   * Feedback de colisão
   */
  public collision(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'collision');
  }
  
  /**
   * Feedback de notificação
   */
  public notification(controllerId: 'controller1' | 'controller2'): void {
    this.playPattern(controllerId, 'notification');
  }
  
  /**
   * Habilita/desabilita feedback háptico
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`📳 Haptic feedback: ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Retorna se está habilitado
   */
  public getEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Retorna padrões disponíveis
   */
  public getAvailablePatterns(): string[] {
    return Object.keys(this.PATTERNS);
  }
}
