/**
 * Event Bus Utility
 * Provides a publish-subscribe pattern for component communication
 * Enables decoupled communication between components, controllers, and services
 */

type EventCallback<T = any> = (data: T) => void;

interface EventBusConfig {
  maxListeners?: number;
  enableLogging?: boolean;
}

class EventBus {
  private events: Map<string, Set<EventCallback>>;
  private config: EventBusConfig;

  constructor(config: EventBusConfig = {}) {
    this.events = new Map();
    this.config = {
      maxListeners: 100,
      enableLogging: false,
      ...config,
    };
  }

  /**
   * Subscribe to an event
   * @param event - Event name
   * @param callback - Callback function to execute when event is emitted
   * @returns Unsubscribe function
   */
  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }

    const listeners = this.events.get(event)!;
    
    if (listeners.size >= (this.config.maxListeners || 100)) {
      console.warn(`EventBus: Maximum listeners (${this.config.maxListeners}) reached for event "${event}"`);
    }

    listeners.add(callback);

    if (this.config.enableLogging) {
      console.log(`EventBus: Subscribed to "${event}"`);
    }

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param callback - Callback function to remove
   */
  off<T = any>(event: string, callback: EventCallback<T>): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(callback);
      
      if (listeners.size === 0) {
        this.events.delete(event);
      }

      if (this.config.enableLogging) {
        console.log(`EventBus: Unsubscribed from "${event}"`);
      }
    }
  }

  /**
   * Emit an event
   * @param event - Event name
   * @param data - Data to pass to callbacks
   */
  emit<T = any>(event: string, data?: T): void {
    const listeners = this.events.get(event);
    
    if (listeners && listeners.size > 0) {
      if (this.config.enableLogging) {
        console.log(`EventBus: Emitting "${event}"`, data);
      }

      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`EventBus: Error in callback for event "${event}"`, error);
        }
      });
    } else if (this.config.enableLogging) {
      console.log(`EventBus: No listeners for event "${event}"`);
    }
  }

  /**
   * Subscribe to an event only once
   * @param event - Event name
   * @param callback - Callback function to execute once
   * @returns Unsubscribe function
   */
  once<T = any>(event: string, callback: EventCallback<T>): () => void {
    const wrappedCallback = (data: T) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    
    return this.on(event, wrappedCallback);
  }

  /**
   * Remove all listeners for an event or all events
   * @param event - Optional event name to clear specific event
   */
  clear(event?: string): void {
    if (event) {
      this.events.delete(event);
      if (this.config.enableLogging) {
        console.log(`EventBus: Cleared listeners for "${event}"`);
      }
    } else {
      this.events.clear();
      if (this.config.enableLogging) {
        console.log('EventBus: Cleared all listeners');
      }
    }
  }

  /**
   * Get the number of listeners for an event
   * @param event - Event name
   * @returns Number of listeners
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.size || 0;
  }

  /**
   * Get all event names with listeners
   * @returns Array of event names
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

// Global event bus instance
export const eventBus = new EventBus({
  enableLogging: process.env.NODE_ENV === 'development',
});

// Predefined event names for type safety
export const EventNames = {
  // Toast notifications
  TOAST_SHOW: 'toast:show',
  TOAST_HIDE: 'toast:hide',
  TOAST_CLEAR: 'toast:clear',

  // Dialog/Modal
  DIALOG_OPEN: 'dialog:open',
  DIALOG_CLOSE: 'dialog:close',

  // Theme
  THEME_CHANGE: 'theme:change',

  // Selection
  SELECTION_CHANGE: 'selection:change',
  SELECTION_CLEAR: 'selection:clear',

  // Navigation
  NAVIGATE: 'navigate',
  NAVIGATE_BACK: 'navigate:back',

  // Data loading
  DATA_LOADING: 'data:loading',
  DATA_LOADED: 'data:loaded',
  DATA_ERROR: 'data:error',

  // User actions
  USER_ACTION: 'user:action',
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',

  // 3D Scene
  SCENE_LOADED: 'scene:loaded',
  SCENE_ERROR: 'scene:error',
  SCENE_UPDATE: 'scene:update',

  // IFC specific
  IFC_LOADED: 'ifc:loaded',
  IFC_ERROR: 'ifc:error',
  IFC_PROPERTY_SELECTED: 'ifc:property:selected',
} as const;

export type EventName = typeof EventNames[keyof typeof EventNames];

// Typed event interfaces
export interface ToastEventData {
  id: string;
  title?: string;
  message: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface DialogEventData {
  id: string;
  title: string;
  content: any;
  actions?: any;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ThemeEventData {
  theme: 'light' | 'dark' | 'high-contrast';
}

export interface SelectionEventData {
  id: string;
  type: string;
  data: any;
}

export interface NavigationEventData {
  path: string;
  params?: Record<string, any>;
}

export interface UserActionEventData {
  action: string;
  data?: any;
  timestamp: number;
}

// Convenience functions for common events
export const toast = {
  show: (data: ToastEventData) => eventBus.emit(EventNames.TOAST_SHOW, data),
  hide: (id: string) => eventBus.emit(EventNames.TOAST_HIDE, { id }),
  clear: () => eventBus.emit(EventNames.TOAST_CLEAR),
};

export const dialog = {
  open: (data: DialogEventData) => eventBus.emit(EventNames.DIALOG_OPEN, data),
  close: (id: string) => eventBus.emit(EventNames.DIALOG_CLOSE, { id }),
};

export const theme = {
  change: (data: ThemeEventData) => eventBus.emit(EventNames.THEME_CHANGE, data),
};

export const selection = {
  change: (data: SelectionEventData) => eventBus.emit(EventNames.SELECTION_CHANGE, data),
  clear: () => eventBus.emit(EventNames.SELECTION_CLEAR),
};

export const navigation = {
  navigate: (data: NavigationEventData) => eventBus.emit(EventNames.NAVIGATE, data),
  back: () => eventBus.emit(EventNames.NAVIGATE_BACK),
};

export default eventBus;
