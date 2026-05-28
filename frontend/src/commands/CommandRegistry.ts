import { CommandId, Command, CommandHandler, CommandPayload, CommandResult, RegisteredCommand } from './Command';
import { eventBus, EventType } from '../core/EventBus';

/**
 * CommandRegistry - Registro centralizado de comandos
 * 
 * Responsável por:
 * - Registrar comandos com handlers
 * - Executar comandos
 * - Validar comandos
 * - Emitir eventos de comando
 * 
 * Segue Command Pattern + Registry Pattern
 */
export class CommandRegistry {
  private static instance: CommandRegistry;
  
  private commands: Map<CommandId, RegisteredCommand> = new Map();
  private history: Array<{ id: CommandId; payload?: CommandPayload; timestamp: number }> = [];
  private maxHistorySize: number = 100;
  
  private constructor() {
    console.log('📋 CommandRegistry initialized');
  }
  
  /**
   * Singleton instance
   */
  public static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    return CommandRegistry.instance;
  }
  
  /**
   * Registra um comando
   */
  public register(command: Command, handler: CommandHandler): void {
    const registered: RegisteredCommand = {
      ...command,
      handler,
      enabled: command.enabled !== false,
      visible: command.visible !== false
    };
    
    this.commands.set(command.id, registered);
    console.log(`✅ Command registered: ${command.id}`);
  }
  
  /**
   * Remove um comando
   */
  public unregister(id: CommandId): void {
    this.commands.delete(id);
    console.log(`❌ Command unregistered: ${id}`);
  }
  
  /**
   * Executa um comando
   */
  public async execute(id: CommandId, payload?: CommandPayload): Promise<CommandResult> {
    // Valida se é um CommandId válido (não um evento ou objeto)
    if (!id || typeof id !== 'string') {
      console.error(`❌ Invalid command ID:`, id);
      return {
        success: false,
        error: `Invalid command ID: ${typeof id}`
      };
    }

    const command = this.commands.get(id);
    
    if (!command) {
      console.error(`❌ Command not found: ${id}`);
      return {
        success: false,
        error: `Command not found: ${id}`
      };
    }
    
    if (command.enabled === false) {
      console.warn(`⚠️  Command disabled: ${id}`);
      return {
        success: false,
        error: `Command disabled: ${id}`
      };
    }
    
    try {
      // Emit BEFORE event
      eventBus.emit(EventType.COMMAND_EXECUTE_BEFORE, { id, payload });
      
      // Execute handler
      const startTime = performance.now();
      await command.handler(payload);
      const duration = performance.now() - startTime;
      
      // Add to history
      this.addToHistory(id, payload);
      
      // Emit SUCCESS event
      eventBus.emit(EventType.COMMAND_EXECUTE_SUCCESS, { id, payload, duration });
      
      console.log(`✅ Command executed: ${id} (${duration.toFixed(2)}ms)`);
      
      return {
        success: true,
        message: `Command executed: ${command.label}`,
        data: { duration }
      };
      
    } catch (error: any) {
      console.error(`❌ Command execution failed: ${id}`, error);
      
      // Emit FAIL event
      eventBus.emit(EventType.COMMAND_EXECUTE_FAIL, { id, payload, error: error.message });
      
      return {
        success: false,
        error: error.message || 'Unknown error',
        data: { originalError: error }
      };
    }
  }
  
  /**
   * Obtém um comando registrado
   */
  public get(id: CommandId): RegisteredCommand | undefined {
    return this.commands.get(id);
  }
  
  /**
   * Lista todos os comandos
   */
  public getAll(): RegisteredCommand[] {
    return Array.from(this.commands.values());
  }
  
  /**
   * Obtém comandos por categoria
   */
  public getByCategory(category: string): RegisteredCommand[] {
    return this.getAll().filter((cmd) => cmd.id.startsWith(category));
  }
  
  /**
   * Habilita/desabilita comando
   */
  public setEnabled(id: CommandId, enabled: boolean): void {
    const command = this.commands.get(id);
    if (command) {
      command.enabled = enabled;
      eventBus.emit(EventType.COMMAND_STATE_CHANGED, { id, enabled });
    }
  }
  
  /**
   * Mostra/esconde comando
   */
  public setVisible(id: CommandId, visible: boolean): void {
    const command = this.commands.get(id);
    if (command) {
      command.visible = visible;
      eventBus.emit(EventType.COMMAND_STATE_CHANGED, { id, visible });
    }
  }
  
  /**
   * Adiciona ao histórico
   */
  private addToHistory(id: CommandId, payload?: CommandPayload): void {
    this.history.push({
      id,
      payload,
      timestamp: Date.now()
    });
    
    // Mantém tamanho máximo
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
  
  /**
   * Retorna histórico
   */
  public getHistory(): Array<{ id: CommandId; payload?: CommandPayload; timestamp: number }> {
    return [...this.history];
  }
  
  /**
   * Limpa histórico
   */
  public clearHistory(): void {
    this.history = [];
    console.log('🧹 Command history cleared');
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    totalCommands: number;
    enabledCommands: number;
    visibleCommands: number;
    historySize: number;
  } {
    const commands = this.getAll();
    return {
      totalCommands: commands.length,
      enabledCommands: commands.filter((c) => c.enabled).length,
      visibleCommands: commands.filter((c) => c.visible).length,
      historySize: this.history.length
    };
  }
}

// Export singleton instance
export const commandRegistry = CommandRegistry.getInstance();
