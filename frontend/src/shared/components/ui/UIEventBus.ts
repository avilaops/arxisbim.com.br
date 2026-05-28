/**
 * UIEventBus - Event bus leve para desacoplar UI de viewer
 * Eventos: ui:modal/*, ui:panel/*, ui:tool/*, ui:notify
 */

export type UIEventType = 
  | 'ui:modal/open'
  | 'ui:modal/close'
  | 'ui:panel/open'
  | 'ui:panel/close'
  | 'ui:tool/set'
  | 'ui:notify'
  | 'ui:menu/toggle'
  | 'ui:menu/close';

export interface UIEvent {
  type: UIEventType;
  payload?: any;
}

export interface ModalOpenPayload {
  name: string;
}

export interface ModalClosePayload {
  name: string;
}

export interface PanelOpenPayload {
  name: string;
  dock: 'left' | 'right' | 'bottom';
}

export interface PanelClosePayload {
  dock: 'left' | 'right' | 'bottom';
}

export interface ToolSetPayload {
  tool: string | null;
  previous: string | null;
}

export interface NotifyPayload {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

type EventListener = (event: UIEvent) => void;

class UIEventBusManager {
  private static instance: UIEventBusManager;
  private listeners: Map<UIEventType, Set<EventListener>> = new Map();
  
  private constructor() {}
  
  static getInstance(): UIEventBusManager {
    if (!UIEventBusManager.instance) {
      UIEventBusManager.instance = new UIEventBusManager();
    }
    return UIEventBusManager.instance;
  }
  
  on(type: UIEventType, listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }
  
  once(type: UIEventType, listener: EventListener): void {
    const onceWrapper = (event: UIEvent) => {
      listener(event);
      this.off(type, onceWrapper);
    };
    this.on(type, onceWrapper);
  }
  
  off(type: UIEventType, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }
  
  emit(type: UIEventType, payload?: any): void {
    const event: UIEvent = { type, payload };
    
    // Call listeners for this specific event type
    this.listeners.get(type)?.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${type}:`, error);
      }
    });
    
    // Log event in development
    if (import.meta.env.DEV) {
      console.log(`[UIEventBus] ${type}`, payload);
    }
  }
  
  clear(): void {
    this.listeners.clear();
  }
}

export const uiEventBus = UIEventBusManager.getInstance();
