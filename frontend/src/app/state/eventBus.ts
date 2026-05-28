/**
 * EventBus - Pub/sub interno (tipo Blazor EventAggregator)
 * Serviços disparam eventos, UI reage
 */

export type AppEvent =
  | { type: 'ModelLoaded'; payload: { fileName: string; triangles: number; memory: number } }
  | { type: 'ModelUnloaded'; payload: { fileName: string } }
  | { type: 'SelectionChanged'; payload: { selectedIds: string[] } }
  | { type: 'LayerVisibilityChanged'; payload: { layerId: string; visible: boolean } }
  | { type: 'ProgressChanged'; payload: { progress: number; message: string } }
  | { type: 'ErrorRaised'; payload: { message: string; error?: any } }
  | { type: 'CommandExecuted'; payload: { commandId: string } }
  | { type: 'ToolChanged'; payload: { toolId: string } }
  | { type: 'QualityChanged'; payload: { quality: string } };

type EventHandler<T extends AppEvent = AppEvent> = (event: T) => void;

/**
 * Type-safe event bus
 */
export class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to event type
   */
  public on<T extends AppEvent['type']>(
    type: T,
    handler: EventHandler<Extract<AppEvent, { type: T }>>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    
    this.handlers.get(type)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler as EventHandler);
      }
    };
  }

  /**
   * Emit event
   */
  public emit<T extends AppEvent>(event: T): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[EventBus] Error in handler for ${event.type}:`, error);
        }
      });
    }
  }

  /**
   * Subscribe once
   */
  public once<T extends AppEvent['type']>(
    type: T,
    handler: EventHandler<Extract<AppEvent, { type: T }>>
  ): void {
    const unsubscribe = this.on(type, (event) => {
      handler(event as any);
      unsubscribe();
    });
  }

  /**
   * Clear all handlers
   */
  public clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
export const eventBus = new EventBus();
