/**
 * ArxisVR - Browser-compatible EventEmitter
 * Copyright © 2024-2026 AvilaOps. All Rights Reserved.
 * 
 * Simple EventEmitter implementation for browser compatibility
 */

export class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: (...args: any[]) => void): this {
    if (!this.events.has(event)) return this;
    
    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    
    if (listeners.length === 0) {
      this.events.delete(event);
    }
    
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.events.has(event)) return false;
    
    const listeners = this.events.get(event)!.slice(); // Copy array to avoid issues if listeners are removed during emit
    listeners.forEach(listener => {
      listener(...args);
    });
    
    return true;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    
    return this.on(event, onceWrapper);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return this.events.get(event)?.length ?? 0;
  }

  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

export default EventEmitter;
