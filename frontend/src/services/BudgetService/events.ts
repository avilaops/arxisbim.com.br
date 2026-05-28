/**
 * BudgetService Events
 * Event system for budget changes and notifications
 */

import type { Budget, TakeoffResult, BudgetSimulationResult } from './types';

export type BudgetEventHandler<T = any> = (data: T) => void;

export class BudgetEventEmitter {
  private listeners: Map<string, Set<BudgetEventHandler>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: BudgetEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: BudgetEventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, data?: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Event names
export const BudgetEvents = {
  BUDGET_CREATED: 'budget:created',
  BUDGET_UPDATED: 'budget:updated',
  BUDGET_DELETED: 'budget:deleted',
  BUDGET_ARCHIVED: 'budget:archived',
  BUDGET_ACTIVATED: 'budget:activated',
  
  ITEM_ADDED: 'budget:item:added',
  ITEM_UPDATED: 'budget:item:updated',
  ITEM_DELETED: 'budget:item:deleted',
  
  TAKEOFF_CALCULATED: 'budget:takeoff:calculated',
  TAKEOFF_APPLIED: 'budget:takeoff:applied',
  
  EXPORT_READY: 'budget:export:ready',
  
  SIMULATION_COMPLETED: 'budget:simulation:completed',
  
  ATTACHMENT_ADDED: 'budget:attachment:added',
  ATTACHMENT_DELETED: 'budget:attachment:deleted',
  
  VERSION_RESTORED: 'budget:version:restored',
  
  ERROR: 'budget:error',
} as const;

// Create global event emitter
export const budgetEvents = new BudgetEventEmitter();

export default BudgetEventEmitter;
