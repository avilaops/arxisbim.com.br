/**
 * SchedulerService
 * Agendamento avançado com suporte a expressões cron-like
 * Permite agendar tarefas recorrentes e pontuais
 */

export interface ScheduledTask {
  id: string;
  name: string;
  cronExpression: string;
  callback: () => void | Promise<void>;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
}

export interface CronExpression {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, number> = new Map();
  private checkInterval: number | null = null;
  private checkIntervalMs: number = 60000; // Verificar a cada minuto

  constructor() {
    this.startScheduler();
  }

  /**
   * Inicia o scheduler
   */
  private startScheduler(): void {
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = window.setInterval(() => {
      this.checkTasks();
    }, this.checkIntervalMs);

    console.log('[SchedulerService] Scheduler started');
  }

  /**
   * Para o scheduler
   */
  stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Limpar todos os timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    console.log('[SchedulerService] Scheduler stopped');
  }

  /**
   * Verifica tarefas agendadas
   */
  private checkTasks(): void {
    const now = new Date();

    this.tasks.forEach(task => {
      if (!task.enabled) {
        return;
      }

      if (this.shouldRun(task, now)) {
        this.executeTask(task);
      }
    });
  }

  /**
   * Verifica se tarefa deve ser executada
   */
  private shouldRun(task: ScheduledTask, now: Date): boolean {
    if (!task.nextRun) {
      return false;
    }

    const nextRun = new Date(task.nextRun);
    return now >= nextRun;
  }

  /**
   * Executa tarefa
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    console.log('[SchedulerService] Executing task:', task.name);

    try {
      await task.callback();
      
      task.lastRun = new Date().toISOString();
      task.runCount++;
      task.nextRun = this.calculateNextRun(task.cronExpression);

      console.log('[SchedulerService] Task executed successfully:', task.name);
    } catch (error) {
      console.error('[SchedulerService] Task execution failed:', task.name, error);
    }
  }

  /**
   * Agenda nova tarefa
   */
  scheduleTask(
    name: string,
    cronExpression: string,
    callback: () => void | Promise<void>
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: this.generateTaskId(),
      name,
      cronExpression,
      callback,
      enabled: true,
      runCount: 0,
      nextRun: this.calculateNextRun(cronExpression),
    };

    this.tasks.set(task.id, task);
    console.log('[SchedulerService] Task scheduled:', task.name, 'next run:', task.nextRun);
    return task;
  }

  /**
   * Agenda tarefa pontual (executa uma vez)
   */
  scheduleOnce(
    name: string,
    delayMs: number,
    callback: () => void | Promise<void>
  ): ScheduledTask {
    const task: ScheduledTask = {
      id: this.generateTaskId(),
      name,
      cronExpression: '',
      callback,
      enabled: true,
      runCount: 0,
      nextRun: new Date(Date.now() + delayMs).toISOString(),
    };

    this.tasks.set(task.id, task);

    const timer = window.setTimeout(() => {
      this.executeTask(task);
      this.unscheduleTask(task.id);
    }, delayMs);

    this.timers.set(task.id, timer);

    console.log('[SchedulerService] One-time task scheduled:', task.name);
    return task;
  }

  /**
   * Cancela tarefa agendada
   */
  unscheduleTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // Limpar timer se existir
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }

    this.tasks.delete(taskId);
    console.log('[SchedulerService] Task unscheduled:', task.name);
    return true;
  }

  /**
   * Habilita tarefa
   */
  enableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.enabled = true;
    task.nextRun = this.calculateNextRun(task.cronExpression);
    console.log('[SchedulerService] Task enabled:', task.name);
    return true;
  }

  /**
   * Desabilita tarefa
   */
  disableTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    task.enabled = false;
    task.nextRun = undefined;
    console.log('[SchedulerService] Task disabled:', task.name);
    return true;
  }

  /**
   * Calcula próxima execução baseado em expressão cron
   */
  private calculateNextRun(cronExpression: string): string {
    if (!cronExpression) {
      return '';
    }

    const cron = this.parseCronExpression(cronExpression);
    const now = new Date();
    const nextRun = new Date(now);

    // Simplificação: calcular próxima execução
    // Em produção, usar biblioteca cron completa
    const parts = cronExpression.split(' ');
    
    if (parts.length >= 2) {
      const minute = parseInt(parts[0]);
      const hour = parseInt(parts[1]);

      if (!isNaN(minute) && !isNaN(hour)) {
        nextRun.setHours(hour, minute, 0, 0);

        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
      }
    }

    return nextRun.toISOString();
  }

  /**
   * Parse de expressão cron simplificado
   */
  private parseCronExpression(expression: string): CronExpression {
    const parts = expression.split(' ');
    
    return {
      minute: parts[0] || '*',
      hour: parts[1] || '*',
      dayOfMonth: parts[2] || '*',
      month: parts[3] || '*',
      dayOfWeek: parts[4] || '*',
    };
  }

  /**
   * Valida expressão cron
   */
  validateCronExpression(expression: string): boolean {
    const parts = expression.split(' ');
    
    if (parts.length !== 5) {
      return false;
    }

    // Validação básica
    const validPatterns = [/^(\*|\d+|\d+-\d+|\d+\/\d+)$/, /^(\*|\d+|\d+-\d+|\d+\/\d+)$/];
    
    return parts.every((part, index) => {
      if (index < 2) {
        // Minuto e hora: 0-59 e 0-23
        const num = parseInt(part);
        return !isNaN(num) && num >= 0 && num <= (index === 0 ? 59 : 23);
      }
      return true;
    });
  }

  /**
   * Retorna tarefa por ID
   */
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Lista todas as tarefas
   */
  listTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Lista tarefas habilitadas
   */
  listEnabledTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(t => t.enabled);
  }

  /**
   * Lista tarefas que devem executar em breve
   */
  listUpcomingTasks(minutes: number = 60): ScheduledTask[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() + minutes * 60000);

    return Array.from(this.tasks.values())
      .filter(t => t.enabled && t.nextRun)
      .filter(t => new Date(t.nextRun!) <= cutoff)
      .sort((a, b) => {
        const dateA = new Date(a.nextRun!);
        const dateB = new Date(b.nextRun!);
        return dateA.getTime() - dateB.getTime();
      });
  }

  /**
   * Gera ID de tarefa
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.stopScheduler();
    this.tasks.clear();
    console.log('[SchedulerService] Disposed');
  }
}

// Singleton instance
let schedulerServiceInstance: SchedulerService | null = null;

export function getSchedulerService(): SchedulerService {
  if (!schedulerServiceInstance) {
    schedulerServiceInstance = new SchedulerService();
  }
  return schedulerServiceInstance;
}

export default SchedulerService;
