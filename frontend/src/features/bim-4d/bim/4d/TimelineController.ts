/**
 * TimelineController - Controle de Playback Temporal
 * 
 * Responsável por:
 * - Controlar reprodução da timeline (play, pause, seek)
 * - Gerenciar velocidade de simulação
 * - Emitir eventos de mudança de data
 * 
 * @module bim/4d/TimelineController
 */

import { EventEmitter } from '../../../../shared/utils/EventEmitter';
import type { Timeline4DConfig, TimelineChangeEvent } from './types';
import type { ScheduleManager } from './ScheduleManager';

/**
 * Controlador de timeline 4D
 * 
 * @example
 * ```typescript
 * const controller = new TimelineController(scheduleManager);
 * controller.play();
 * controller.setSpeed(10); // 10x faster
 * controller.pause();
 * ```
 */
export class TimelineController extends EventEmitter {
  private scheduleManager: ScheduleManager;
  private config: Required<Timeline4DConfig>;
  
  private isPlaying: boolean = false;
  private currentDate: Date;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  
  // Velocidade: dias por segundo em tempo real
  // Ex: speed=1 significa 1 dia da obra por segundo de playback
  // Ex: speed=10 significa 10 dias da obra por segundo de playback
  private readonly DAYS_PER_SECOND_AT_1X = 1;
  
  constructor(
    scheduleManager: ScheduleManager,
    config: Timeline4DConfig = {}
  ) {
    super();
    
    this.scheduleManager = scheduleManager;
    
    // Configuração padrão
    this.config = {
      autoPlay: config.autoPlay ?? false,
      speed: config.speed ?? 1.0,
      transitionDuration: config.transitionDuration ?? 300,
      loopEnabled: config.loopEnabled ?? false,
      initialDate: config.initialDate
    };
    
    // Data inicial
    const scheduleInfo = this.scheduleManager.getScheduleInfo();
    this.currentDate = this.config.initialDate || scheduleInfo?.startDate || new Date();
    
    // Auto play se configurado
    if (this.config.autoPlay && scheduleInfo) {
      this.play();
    }
  }
  
  /**
   * Inicia reprodução da timeline
   */
  play(): void {
    if (this.isPlaying) return;
    
    const scheduleInfo = this.scheduleManager.getScheduleInfo();
    if (!scheduleInfo) {
      console.warn('No schedule loaded, cannot play timeline');
      return;
    }
    
    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.emit('timeline:play');
    
    this.tick();
  }
  
  /**
   * Pausa reprodução da timeline
   */
  pause(): void {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.emit('timeline:pause');
  }
  
  /**
   * Pula para uma data específica
   * 
   * @param date - Data de destino
   */
  seek(date: Date): void {
    const scheduleInfo = this.scheduleManager.getScheduleInfo();
    if (!scheduleInfo) return;
    
    // Permitir navegar antes/depois do cronograma
    // Útil para visualizar estado "antes de começar" (tudo oculto)
    // e "depois de terminar" (tudo visível)
    this.currentDate = new Date(date.getTime());
    this.emitDateChange();
    this.emit('timeline:seek', { date: this.currentDate });
  }
  
  /**
   * Define velocidade de reprodução
   * 
   * @param multiplier - Multiplicador de velocidade (1.0 = normal, 10.0 = 10x)
   */
  setSpeed(multiplier: number): void {
    if (multiplier <= 0) {
      throw new Error('Speed multiplier must be positive');
    }
    
    this.config.speed = multiplier;
    this.emit('timeline:speed-changed', { speed: multiplier });
  }
  
  /**
   * Retorna a data atual da timeline
   */
  getCurrentDate(): Date {
    return new Date(this.currentDate);
  }
  
  /**
   * Retorna se a timeline está em reprodução
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  /**
   * Retorna velocidade atual
   */
  getSpeed(): number {
    return this.config.speed;
  }
  
  /**
   * Retorna progresso atual (0-100%)
   */
  getProgress(): number {
    return this.scheduleManager.getProgress(this.currentDate);
  }
  
  /**
   * Vai para o início do cronograma
   */
  goToStart(): void {
    const scheduleInfo = this.scheduleManager.getScheduleInfo();
    if (scheduleInfo) {
      this.seek(scheduleInfo.startDate);
    }
  }
  
  /**
   * Vai para o fim do cronograma
   */
  goToEnd(): void {
    const scheduleInfo = this.scheduleManager.getScheduleInfo();
    if (scheduleInfo) {
      this.seek(scheduleInfo.endDate);
    }
  }
  
  /**
   * Loop principal de animação
   */
  private tick(): void {
    if (!this.isPlaying) return;
    
    const now = performance.now();
    const deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    // Calcular incremento de tempo baseado em velocidade
    // deltaMs está em milissegundos
    // Converter para dias da obra
    const deltaSeconds = deltaMs / 1000;
    const deltaDays = deltaSeconds * this.DAYS_PER_SECOND_AT_1X * this.config.speed;
    const deltaMsInTimeline = deltaDays * 24 * 60 * 60 * 1000; // dias -> ms
    
    // Atualizar data atual
    const newTimestamp = this.currentDate.getTime() + deltaMsInTimeline;
    this.currentDate = new Date(newTimestamp);
    
    // Verificar se chegou ao fim
    const scheduleInfo = this.scheduleManager.getScheduleInfo();
    if (scheduleInfo) {
      if (this.currentDate.getTime() >= scheduleInfo.endDate.getTime()) {
        if (this.config.loopEnabled) {
          // Loop: voltar ao início
          this.currentDate = new Date(scheduleInfo.startDate);
        } else {
          // Parar no fim
          this.currentDate = new Date(scheduleInfo.endDate);
          this.pause();
          this.emit('timeline:ended');
        }
      }
    }
    
    // Emitir evento de mudança
    this.emitDateChange();
    
    // Próximo frame
    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }
  
  /**
   * Emite evento de mudança de data
   */
  private emitDateChange(): void {
    const activeTasks = this.scheduleManager.getTasksAtDate(this.currentDate);
    const progress = this.getProgress();
    
    const event: TimelineChangeEvent = {
      currentDate: new Date(this.currentDate),
      progress,
      activeTasks
    };
    
    this.emit('timeline:date-changed', event);
  }
  
  /**
   * Limpa recursos e para animação
   */
  dispose(): void {
    this.pause();
    this.removeAllListeners();
  }
}
